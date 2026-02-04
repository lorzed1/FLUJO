import React, { useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { SmartDataTable, Column } from '../../components/ui/SmartDataTable';
import { formatDateToDisplay } from '../../utils/dateUtils';
import { useUI } from '../../context/UIContext';
import { TrashIcon } from '../../components/ui/Icons';
import * as XLSX from 'xlsx';

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

            // User Rule: Descuadre = Total Egresos - (Total Ingresos + Covers)
            // Esto asegura que el dinero del cover se descuente del recaudo para ver el sobrante real (ej: 350 pesos).
            const descuadreCalculado = item.totalRecaudado - (totalIngresosCalculado + (item.ingresoCovers || 0));

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
        // Columna Calculada Virtual: TOTAL INGRESOS (Venta + Propina)
        {
            key: 'totalIngresos' as any,
            label: 'TOTAL INGRESOS',
            width: 'w-28',
            align: 'text-right',
            render: (_, item) => (
                <span className="text-gray-900 dark:text-white tabular-nums border-b-2 border-gray-900/10">
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
                <span className="text-gray-900 dark:text-white tabular-nums border-b-2 border-gray-900/10">
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
                <span className={`tabular-nums px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-slate-700`}>
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
            width: 'w-10',
            align: 'text-right',
            render: (_, item) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
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
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                    <TrashIcon className="h-4 w-4" />
                </button>
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
            <div className="h-[600px] flex flex-col">
                <SmartDataTable
                    data={dataWithTotals}
                    columns={columns}
                    enableSearch={true}
                    enableSelection={true}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    enableExport={true}
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
