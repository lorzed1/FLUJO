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
                className={`w-full px-2 py-1 border-2 border-indigo-500 rounded text-xs font-semibold focus:outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 z-50`}
                autoFocus
                onClick={(e) => e.stopPropagation()} // Stop propagation to avoid interfering with row click
            />
        );
    }

    return (
        <div onDoubleClick={onStartEdit} className="cursor-text w-full h-full">
            {displayValue || value}
        </div>
    );
};


const ArqueosTable = forwardRef<ArqueosTableHandle, ArqueosTableProps>(({ arqueos, onUpdate, onDelete, userRole }, ref) => {

    // Pre-calculate totals for robust rendering based on USER RULES
    // User Rule: Ingresos Total = Venta POS + Propina
    // User Rule: Descuadre = Total Egresos - Total Ingresos
    const dataWithTotals = useMemo(() => {
        return arqueos.map(item => {
            const totalIngresosCalculado = (item.ventaBruta || 0) + (item.propina || 0);

            // User Rule: Descuadre = Total Egresos - Total Ingresos
            // Los covers son informativos y no afectan el cálculo del descuadre.
            const descuadreCalculado = item.totalRecaudado - totalIngresosCalculado;

            return {
                ...item,
                totalIngresos: totalIngresosCalculado,
                descuadre: descuadreCalculado
            };
        });
    }, [arqueos]);

    // Estado para edición
    const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
    const { setAlertModal } = useUI();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Modal State para ver Detalle (Base o Cuadre)
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

    // Definición de Columnas
    const columns: Column<ArqueoRecord>[] = [
        {
            key: 'fecha',
            label: 'Fecha',
            width: 'w-24',
            filterable: true,
            sortable: true,
            render: (_, item) => (
                <EditableCell
                    value={item.fecha}
                    type="date"
                    isEditing={editingCell?.id === item.id && editingCell?.field === 'fecha'}
                    onStartEdit={() => setEditingCell({ id: item.id, field: 'fecha' })}
                    onSave={(val) => { onUpdate(item.id, 'fecha', val); setEditingCell(null); }}
                    onCancel={() => setEditingCell(null)}
                    displayValue={
                        <div className="flex flex-col items-start gap-1">
                            <span className="text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                                {formatDateToDisplay(item.fecha)}
                            </span>
                            {item.baseDetail && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleViewDetail(item, 'base'); }}
                                    className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600 transition-colors flex items-center gap-1 whitespace-nowrap"
                                    title="Ver detalle de base de caja"
                                >
                                    <EyeIcon className="h-3 w-3" /> Base
                                </button>
                            )}
                            {item.cuadreDetail && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleViewDetail(item, 'cuadre'); }}
                                    className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600 transition-colors flex items-center gap-1 whitespace-nowrap"
                                    title="Ver detalle de cuadre de venta"
                                >
                                    <EyeIcon className="h-3 w-3" /> Cuadre
                                </button>
                            )}
                        </div>
                    }
                />
            )
        },
        // Sección VERDE: Conceptos de Venta
        {
            key: 'ingresoCovers',
            label: 'COVERS',
            width: 'w-20',
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
                    displayValue={<span className="text-gray-900 dark:text-gray-100 font-medium tabular-nums">{formatCompact(item.ingresoCovers)}</span>}
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
                    displayValue={<span className="text-gray-900 dark:text-gray-100 tabular-nums">{formatCompact(item.ventaBruta)}</span>}
                />
            )
        },
        {
            key: 'propina',
            label: 'PROPINA',
            width: 'w-20',
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
                    displayValue={<span className="text-gray-900 dark:text-gray-100 font-medium tabular-nums">{formatCompact(item.propina)}</span>}
                />
            )
        },
        {
            key: 'ventaSC' as any,
            label: 'VENTA SC',
            width: 'w-24',
            align: 'text-right',
            defaultHidden: true,
            render: (_, item) => {
                const ventaSC = (item.ventaBruta || 0) - (item.ingresoCovers || 0);
                return (
                    <span className="text-purple-600 dark:text-purple-400 font-bold tabular-nums">
                        {formatCompact(ventaSC)}
                    </span>
                );
            }
        },
        {
            key: 'baseImpuesto' as any,
            label: 'BASE',
            width: 'w-24',
            align: 'text-right',
            defaultHidden: true,
            render: (_, item) => {
                const ventaSC = (item.ventaBruta || 0) - (item.ingresoCovers || 0);
                const base = ventaSC / 1.08;
                return (
                    <span className="text-purple-600 dark:text-purple-400 tabular-nums">
                        {formatCompact(Math.round(base))}
                    </span>
                );
            }
        },
        {
            key: 'impuestoConsumo' as any,
            label: 'INC (8%)',
            width: 'w-24',
            align: 'text-right',
            defaultHidden: true,
            render: (_, item) => {
                const ventaSC = (item.ventaBruta || 0) - (item.ingresoCovers || 0);
                // INC logic based on request: Venta SC * 8% (which implies Base * 8% actually, but request said Venta SC * 8? usually INC is Base * 8%. Let's check math)
                // Request said: INC = "Venta SC * 8%".
                // Usually VentaTotal = Base + INC. If INC is 8% of Base, then Base = VentaTotal / 1.08.
                // And INC = VentaTotal - Base OR Base * 0.08.
                // Let's use Base * 0.08 for consistency with accounting, derived from the Base calculation.
                const base = ventaSC / 1.08;
                const inc = base * 0.08;
                return (
                    <span className="text-purple-600 dark:text-purple-400 tabular-nums">
                        {formatCompact(Math.round(inc))}
                    </span>
                );
            }
        },
        // Columna Calculada Virtual: TOTAL INGRESOS (Venta + Propina)
        {
            key: 'totalIngresos' as any,
            label: 'TOTAL INGRESOS',
            width: 'w-28',
            align: 'text-right',
            render: (_, item) => (
                <span className="text-purple-600 dark:text-purple-500 font-bold tabular-nums border-b-2 border-purple-200 dark:border-purple-900/30">
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
                    displayValue={<span className="text-gray-900 dark:text-gray-100 tabular-nums">{formatCompact(item.efectivo)}</span>}
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
                    displayValue={<span className="text-gray-900 dark:text-gray-100 tabular-nums">{formatCompact(item.datafonoDavid)}</span>}
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
                    displayValue={<span className="text-gray-900 dark:text-gray-100 tabular-nums">{formatCompact(item.datafonoJulian)}</span>}
                />
            )
        },
        {
            key: 'transfBancolombia',
            label: 'BANCOLOMBIA',
            width: 'w-24',
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
                    displayValue={<span className="text-gray-900 dark:text-gray-100 tabular-nums">{formatCompact(item.transfBancolombia)}</span>}
                />
            )
        },
        {
            key: 'nequi',
            label: 'NEQUI',
            width: 'w-20',
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
                    displayValue={<span className="text-gray-900 dark:text-gray-100 tabular-nums">{formatCompact(item.nequi)}</span>}
                />
            )
        },
        {
            key: 'rappi',
            label: 'RAPPI',
            width: 'w-20',
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
                    displayValue={<span className="text-gray-900 dark:text-gray-100 tabular-nums">{formatCompact(item.rappi)}</span>}
                />
            )
        },
        {
            key: 'totalRecaudado',
            label: 'TOTAL EGRESOS', // Nombre confuso mantenido por la imagen (Total Recaudado)
            width: 'w-28',
            align: 'text-right',
            sortable: true,
            render: (_, item) => (
                <span className="text-purple-600 dark:text-purple-500 font-bold tabular-nums border-b-2 border-purple-200 dark:border-purple-900/30">
                    {formatCompact(item.totalRecaudado)}
                </span>
            )
        },
        {
            key: 'descuadre',
            label: 'DESCUADRE',
            width: 'w-24',
            align: 'text-right',
            sortable: true,
            render: (_, item) => (
                <span className={cn(
                    "tabular-nums px-2 py-0.5 rounded-lg border font-bold",
                    item.descuadre < 0
                        ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50"
                        : "bg-gray-50 text-gray-900 border-gray-200 dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700"
                )}>
                    {formatCompact(item.descuadre)}
                </span>
            )
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
                    displayValue={<span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide">{item.cajero}</span>}
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
                    displayValue={<span className="text-gray-500 dark:text-gray-400 font-medium tabular-nums">{item.visitas}</span>}
                />
            )
        },
        {
            key: 'actions',
            label: '',
            width: 'w-16',
            align: 'text-right',
            render: (_, item) => (
                <div className="flex items-center gap-1 justify-end">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setAlertModal({
                                isOpen: true,
                                type: 'info',
                                title: 'Editar Arqueo',
                                message: 'Para editar un valor, haz doble clic directamente sobre la celda que deseas modificar. Puedes editar cualquier campo numérico (Covers, Venta POS, Propina, medios de pago, Cajero, Visitas) haciendo doble clic en la celda correspondiente.',
                                confirmText: 'Entendido',
                                showCancel: false,
                            });
                        }}
                        className="p-1.5 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
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
                                message: '¿Estás seguro que deseas eliminar este arqueo?',
                                confirmText: 'Sí, Eliminar',
                                showCancel: true,
                                onConfirm: () => {
                                    onDelete(item.id);
                                    setAlertModal({ isOpen: false, message: '' }); // Or success
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
                />

                <div className="mt-2 text-xs text-center text-gray-400">
                    Doble clic en las celdas para editar valores
                </div>
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
