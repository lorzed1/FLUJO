import React, { useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { SmartDataTable, Column } from '../../components/ui/SmartDataTable';
import { formatDateToDisplay } from '../../utils/dateUtils';
import { useUI } from '../../context/UIContext';
import { TrashIcon, PencilIcon } from '../../components/ui/Icons';
import * as XLSX from 'xlsx';
import { cn } from '../../lib/utils';

import { ArqueoRecord } from '../../types';
import CashBaseModal from './CashBaseModal';
import { EyeIcon } from '../../components/ui/Icons';

interface ArqueosTableProps {
    arqueos: ArqueoRecord[];
    onUpdate: (id: string, field: string, value: number | string) => void;
    onDelete: (id: string) => void;
    userRole?: string | null;
    extraActions?: React.ReactNode;
}

export interface ArqueosTableHandle {
    exportToExcel: () => void;
    exportToPDF: () => void;
    exportToCSV: () => void;
}

// Formateador compacto
const formatCompact = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(val);
};

// Componente para celda editable
const EditableCell = ({
    value,
    type,
    isEditing,
    onStartEdit,
    onSave,
    onCancel,
    displayValue
}: {
    value: string | number;
    type: string;
    isEditing: boolean;
    onStartEdit: () => void;
    onSave: (val: string) => void;
    onCancel: () => void;
    displayValue?: React.ReactNode;
}) => {
    const [tempValue, setTempValue] = useState(String(value));

    if (isEditing) {
        return (
            <input
                type={type}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={() => onSave(tempValue)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onSave(tempValue);
                    if (e.key === 'Escape') onCancel();
                }}
                className={`w-full px-2 py-1 rounded border border-purple-500 bg-white dark:bg-slate-800 text-[13px] font-normal tabular-nums text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-sm z-50`}
                autoFocus
                onClick={(e) => e.stopPropagation()}
            />
        );
    }

    return (
        <div onDoubleClick={onStartEdit} className="cursor-text w-full h-full flex items-center justify-end hover:bg-slate-50 dark:hover:bg-white/5 rounded px-1 transition-colors -mr-1">
            {displayValue || value}
        </div>
    );
};


const ArqueosTable = forwardRef<ArqueosTableHandle, ArqueosTableProps>(({ arqueos, onUpdate, onDelete, userRole, extraActions }, ref) => {

    const dataWithTotals = useMemo(() => {
        return arqueos.map(item => {
            const totalIngresosCalculado = (item.ventaBruta || 0) + (item.propina || 0);

            // User Rule: Descuadre = Total Egresos - Total Ingresos
            const descuadreCalculado = item.totalRecaudado - totalIngresosCalculado;

            // Columnas calculadas contables
            const ventaBrutaCalc = (item.ventaBruta || 0) - (item.ingresoCovers || 0);
            const ventaBase = ventaBrutaCalc / 1.108;
            const inc = ventaBrutaCalc - ventaBase; // Para que Venta Base + INC = Venta Bruta

            return {
                ...item,
                totalIngresos: totalIngresosCalculado,
                descuadre: descuadreCalculado,
                ventaBrutaCalc,
                ventaBase,
                inc
            };
        });
    }, [arqueos]);

    const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
    const { setAlertModal } = useUI();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<{
        detail: Record<string, number>,
        total: number,
        title: string
    } | null>(null);

    const handleViewDetail = (item: ArqueoRecord, type: 'base' | 'cuadre') => {
        const detail = type === 'base' ? item.baseDetail : item.cuadreDetail;
        const title = type === 'base' ? 'Detalle de Base de Caja' : 'Detalle de Cuadre de Venta';

        if (detail) {
            const total = Object.entries(detail).reduce((acc, [denom, cant]) => acc + (Number(denom) * Number(cant)), 0);
            setSelectedDetail({ detail, total, title });
            setDetailModalOpen(true);
        }
    };

    const columns: Column<ArqueoRecord>[] = [
        {
            key: 'fecha',
            label: 'Fecha',
            width: 'w-24',
            filterable: true,
            sortable: true,
            render: (_, item) => (
                <div className="flex items-center h-full">
                    <EditableCell
                        value={item.fecha}
                        type="date"
                        isEditing={editingCell?.id === item.id && editingCell?.field === 'fecha'}
                        onStartEdit={() => setEditingCell({ id: item.id, field: 'fecha' })}
                        onSave={(val) => { onUpdate(item.id, 'fecha', val); setEditingCell(null); }}
                        onCancel={() => setEditingCell(null)}
                        displayValue={
                            <span className="whitespace-nowrap">
                                {formatDateToDisplay(item.fecha)}
                            </span>
                        }
                    />
                </div>
            )
        },
        // Sección VERDE: Conceptos de Venta
        {
            key: 'ingresoCovers',
            label: 'COVERS',
            width: 'w-24',
            align: 'text-right',
            sortable: true,
            render: (_, item) => (
                <EditableCell
                    value={item.ingresoCovers}
                    type="number"
                    isEditing={editingCell?.id === item.id && editingCell?.field === 'ingresoCovers'}
                    onStartEdit={() => setEditingCell({ id: item.id, field: 'ingresoCovers' })}
                    onSave={(val) => { onUpdate(item.id, 'ingresoCovers', parseFloat(val) || 0); setEditingCell(null); }}
                    onCancel={() => setEditingCell(null)}
                    displayValue={<span className="tabular-nums">{formatCompact(item.ingresoCovers)}</span>}
                />
            )
        },
        {
            key: 'ventaBruta',
            label: 'VENTA POS',
            width: 'w-28',
            align: 'text-right',
            sortable: true,
            render: (_, item) => (
                <EditableCell
                    value={item.ventaBruta}
                    type="number"
                    isEditing={editingCell?.id === item.id && editingCell?.field === 'ventaBruta'}
                    onStartEdit={() => setEditingCell({ id: item.id, field: 'ventaBruta' })}
                    onSave={(val) => { onUpdate(item.id, 'ventaBruta', parseFloat(val) || 0); setEditingCell(null); }}
                    onCancel={() => setEditingCell(null)}
                    displayValue={<span className="tabular-nums">{formatCompact(item.ventaBruta)}</span>}
                />
            )
        },
        // Columnas Calculadas Contables
        {
            key: 'ventaBrutaCalc',
            label: 'VENTA BRUTA',
            width: 'w-28',
            align: 'text-right',
            sortable: true,
            render: (_, item) => (
                <span className="tabular-nums text-blue-700 dark:text-blue-400">
                    {formatCompact(item.ventaBrutaCalc || 0)}
                </span>
            )
        },
        {
            key: 'ventaBase',
            label: 'VENTA BASE',
            width: 'w-28',
            align: 'text-right',
            sortable: true,
            render: (_, item) => (
                <span className="tabular-nums text-violet-700 dark:text-violet-400">
                    {formatCompact(Math.round(item.ventaBase || 0))}
                </span>
            )
        },
        {
            key: 'inc',
            label: 'INC (8%)',
            width: 'w-24',
            align: 'text-right',
            sortable: true,
            render: (_, item) => (
                <span className="tabular-nums text-amber-700 dark:text-amber-400">
                    {formatCompact(Math.round(item.inc || 0))}
                </span>
            )
        },
        {
            key: 'propina',
            label: 'PROPINA',
            width: 'w-24',
            align: 'text-right',
            sortable: true,
            render: (_, item) => (
                <EditableCell
                    value={item.propina}
                    type="number"
                    isEditing={editingCell?.id === item.id && editingCell?.field === 'propina'}
                    onStartEdit={() => setEditingCell({ id: item.id, field: 'propina' })}
                    onSave={(val) => { onUpdate(item.id, 'propina', parseFloat(val) || 0); setEditingCell(null); }}
                    onCancel={() => setEditingCell(null)}
                    displayValue={<span className="tabular-nums">{formatCompact(item.propina)}</span>}
                />
            )
        },
        // Columna Calculada Virtual: TOTAL INGRESOS (Venta + Propina)
        {
            key: 'totalIngresos' as any,
            label: 'TOTAL INGRESOS',
            width: 'w-32',
            align: 'text-right',
            render: (_, item) => (
                <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCompact(item.totalIngresos || 0)}
                </span>
            )
        },
        // Sección NARANJA: Medios de Pago
        {
            key: 'efectivo',
            label: 'EFECTIVO',
            width: 'w-24',
            align: 'text-right',
            sortable: true,
            render: (_, item) => (
                <EditableCell
                    value={item.efectivo}
                    type="number"
                    isEditing={editingCell?.id === item.id && editingCell?.field === 'efectivo'}
                    onStartEdit={() => setEditingCell({ id: item.id, field: 'efectivo' })}
                    onSave={(val) => { onUpdate(item.id, 'efectivo', parseFloat(val) || 0); setEditingCell(null); }}
                    onCancel={() => setEditingCell(null)}
                    displayValue={<span className="tabular-nums">{formatCompact(item.efectivo)}</span>}
                />
            )
        },
        {
            key: 'datafonoDavid',
            label: 'DATAFONO 1',
            width: 'w-24',
            align: 'text-right',
            sortable: true,
            render: (_, item) => (
                <EditableCell
                    value={item.datafonoDavid}
                    type="number"
                    isEditing={editingCell?.id === item.id && editingCell?.field === 'datafonoDavid'}
                    onStartEdit={() => setEditingCell({ id: item.id, field: 'datafonoDavid' })}
                    onSave={(val) => { onUpdate(item.id, 'datafonoDavid', parseFloat(val) || 0); setEditingCell(null); }}
                    onCancel={() => setEditingCell(null)}
                    displayValue={<span className="tabular-nums">{formatCompact(item.datafonoDavid)}</span>}
                />
            )
        },
        {
            key: 'datafonoJulian',
            label: 'DATAFONO 2',
            width: 'w-24',
            align: 'text-right',
            sortable: true,
            render: (_, item) => (
                <EditableCell
                    value={item.datafonoJulian}
                    type="number"
                    isEditing={editingCell?.id === item.id && editingCell?.field === 'datafonoJulian'}
                    onStartEdit={() => setEditingCell({ id: item.id, field: 'datafonoJulian' })}
                    onSave={(val) => { onUpdate(item.id, 'datafonoJulian', parseFloat(val) || 0); setEditingCell(null); }}
                    onCancel={() => setEditingCell(null)}
                    displayValue={<span className="tabular-nums">{formatCompact(item.datafonoJulian)}</span>}
                />
            )
        },
        {
            key: 'transfBancolombia',
            label: 'BANCOLOMBIA',
            width: 'w-28',
            align: 'text-right',
            sortable: true,
            render: (_, item) => (
                <EditableCell
                    value={item.transfBancolombia}
                    type="number"
                    isEditing={editingCell?.id === item.id && editingCell?.field === 'transfBancolombia'}
                    onStartEdit={() => setEditingCell({ id: item.id, field: 'transfBancolombia' })}
                    onSave={(val) => { onUpdate(item.id, 'transfBancolombia', parseFloat(val) || 0); setEditingCell(null); }}
                    onCancel={() => setEditingCell(null)}
                    displayValue={<span className="tabular-nums">{formatCompact(item.transfBancolombia)}</span>}
                />
            )
        },
        {
            key: 'nequi',
            label: 'NEQUI',
            width: 'w-24',
            align: 'text-right',
            sortable: true,
            render: (_, item) => (
                <EditableCell
                    value={item.nequi}
                    type="number"
                    isEditing={editingCell?.id === item.id && editingCell?.field === 'nequi'}
                    onStartEdit={() => setEditingCell({ id: item.id, field: 'nequi' })}
                    onSave={(val) => { onUpdate(item.id, 'nequi', parseFloat(val) || 0); setEditingCell(null); }}
                    onCancel={() => setEditingCell(null)}
                    displayValue={<span className="tabular-nums">{formatCompact(item.nequi)}</span>}
                />
            )
        },
        {
            key: 'rappi',
            label: 'RAPPI',
            width: 'w-24',
            align: 'text-right',
            sortable: true,
            render: (_, item) => (
                <EditableCell
                    value={item.rappi}
                    type="number"
                    isEditing={editingCell?.id === item.id && editingCell?.field === 'rappi'}
                    onStartEdit={() => setEditingCell({ id: item.id, field: 'rappi' })}
                    onSave={(val) => { onUpdate(item.id, 'rappi', parseFloat(val) || 0); setEditingCell(null); }}
                    onCancel={() => setEditingCell(null)}
                    displayValue={<span className="tabular-nums">{formatCompact(item.rappi)}</span>}
                />
            )
        },
        {
            key: 'totalRecaudado',
            label: 'TOTAL EGRESOS',
            width: 'w-32',
            align: 'text-right',
            sortable: true,
            render: (_, item) => (
                <span className="tabular-nums font-bold text-slate-800 dark:text-white">
                    {formatCompact(item.totalRecaudado)}
                </span>
            )
        },
        {
            key: 'descuadre',
            label: 'DESCUADRE',
            width: 'w-28',
            align: 'text-right',
            sortable: true,
            render: (_, item) => {
                const isPositive = item.descuadre > 0;
                const isZero = item.descuadre === 0;
                const isNegative = item.descuadre < 0;

                let styles = "bg-gray-50 text-gray-600 border-gray-200";
                if (isPositive) styles = "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800";
                if (isNegative) styles = "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800";

                return (
                    <span className={cn(
                        "tabular-nums px-2.5 py-1 rounded-md text-[11px] font-black inline-block min-w-[70px] text-center border shadow-sm",
                        styles
                    )}>
                        {formatCompact(item.descuadre)}
                    </span>
                );
            }
        },
        {
            key: 'cajero',
            label: 'CAJERO',
            width: 'w-24',
            align: 'text-center',
            filterable: true,
            sortable: true,
            render: (_, item) => (
                <EditableCell
                    value={item.cajero}
                    type="text"
                    isEditing={editingCell?.id === item.id && editingCell?.field === 'cajero'}
                    onStartEdit={() => setEditingCell({ id: item.id, field: 'cajero' })}
                    onSave={(val) => { onUpdate(item.id, 'cajero', val); setEditingCell(null); }}
                    onCancel={() => setEditingCell(null)}
                    displayValue={<span className="capitalize truncate block max-w-[80px]">{item.cajero}</span>}
                />
            )
        },
        {
            key: 'visitas',
            label: 'VISITAS',
            width: 'w-20',
            align: 'text-center',
            sortable: true,
            render: (_, item) => (
                <EditableCell
                    value={item.visitas}
                    type="number"
                    isEditing={editingCell?.id === item.id && editingCell?.field === 'visitas'}
                    onStartEdit={() => setEditingCell({ id: item.id, field: 'visitas' })}
                    onSave={(val) => { onUpdate(item.id, 'visitas', parseFloat(val) || 0); setEditingCell(null); }}
                    onCancel={() => setEditingCell(null)}
                    displayValue={<span className="tabular-nums">{item.visitas}</span>}
                />
            )
        },
        {
            key: 'actions',
            label: '',
            width: 'w-32',
            align: 'text-right',
            filterable: false,
            render: (_, item) => (
                <div className="flex items-center gap-1 justify-end">
                    {item.baseDetail && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleViewDetail(item, 'base'); }}
                            className="mr-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 text-slate-500 hover:bg-purple-100 hover:text-purple-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-purple-900/40 dark:hover:text-purple-300 transition-colors"
                            title="Ver detalle de base"
                        >
                            BASE
                        </button>
                    )}
                    {item.cuadreDetail && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleViewDetail(item, 'cuadre'); }}
                            className="mr-2 px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-100 text-slate-500 hover:bg-purple-100 hover:text-purple-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-purple-900/40 dark:hover:text-purple-300 transition-colors"
                            title="Ver detalle de cuadre"
                        >
                            CUADRE
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setAlertModal({
                                isOpen: true,
                                type: 'info',
                                title: 'Editar Arqueo',
                                message: 'Para editar, haz doble clic directamente sobre la celda.',
                                confirmText: 'Entendido',
                                showCancel: false,
                            });
                        }}
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all"
                        title="Editar arqueo"
                    >
                        <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setAlertModal({
                                isOpen: true,
                                type: 'warning',
                                title: 'Eliminar Arqueo',
                                message: '¿Eliminar este arqueo?',
                                confirmText: 'Eliminar',
                                showCancel: true,
                                onConfirm: () => {
                                    onDelete(item.id);
                                    setAlertModal({ isOpen: false, message: '' });
                                }
                            });
                        }}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        title="Eliminar arqueo"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            )
        }
    ];

    // Exportaciones (Mantenidas por compatibilidad con ref)
    const exportToExcel = () => {
        const data = arqueos.map(a => ({
            ...a,
            fecha: formatDateToDisplay(a.fecha)
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Arqueos");
        XLSX.writeFile(wb, `arqueos_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    useImperativeHandle(ref, () => ({
        exportToExcel,
        // Wrappers para cumplir con la interfaz, aunque SmartDataTable tiene su propio export interno visual
        exportToPDF: () => { },
        exportToCSV: () => { }
    }));

    return (
        <>
            {/* Removed h-[600px] to allow natural height and prevent double scroll */}
            <div className="flex flex-col">
                <SmartDataTable
                    id="arqueos_history"
                    data={dataWithTotals}
                    columns={columns}
                    containerClassName="border-none shadow-none"
                    enableSearch={true}
                    enableSelection={true}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    enableExport={true}
                    exportDateField="fecha"
                    onBulkDelete={(ids) => {
                        setAlertModal({
                            isOpen: true,
                            type: 'warning',
                            title: 'Confirmar Eliminación Masiva',
                            message: `¿Eliminar ${ids.size} arqueos seleccionados?`,
                            showCancel: true,
                            confirmText: 'Eliminar',
                            onConfirm: async () => {
                                try {
                                    // onDelete might be sync or async. Usually sync state update in parent.
                                    // But we can't await it easily unless signature changes.
                                    // Assuming safe to run in loop.
                                    ids.forEach(id => onDelete(id));
                                    setSelectedIds(new Set());
                                    setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Arqueos eliminados.' });
                                } catch (e) {
                                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error durante la eliminación.' });
                                }
                            }
                        });
                    }}
                    searchPlaceholder="Buscar arqueos..."
                    renderExtraFilters={() => extraActions}
                    footerMessage="Doble clic en las celdas para editar valores"
                />
            </div>

            {/* Local AlertModal removed in favor of UIContext */}

            <CashBaseModal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                title={selectedDetail?.title}
                baseDetail={selectedDetail?.detail || {}}
                total={selectedDetail?.total || 0}
            />
        </>
    );
});

export default ArqueosTable;
