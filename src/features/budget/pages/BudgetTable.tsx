import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { BudgetCommitment } from '../../../types/budget';
import { budgetService } from '../../../services/budgetService';
import { useBudgetContext } from '../layouts/BudgetLayout';
import { SmartDataTable } from '../../../components/ui/SmartDataTable';
import { startOfMonth, endOfMonth, endOfYear, format } from 'date-fns';
import { useUI } from '../../../context/UIContext';

export const BudgetTable: React.FC = () => {
    const { openForm } = useBudgetContext();
    const { setAlertModal } = useUI();
    const [commitments, setCommitments] = useState<BudgetCommitment[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
            const end = format(endOfYear(new Date()), 'yyyy-MM-dd');
            const data = await budgetService.getCommitments(start, end);
            setCommitments(data.map(d => ({ ...d, id: d.id || Math.random().toString() })));
        } catch (error) {
            console.error("Error loading commitments:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleEdit = (item: BudgetCommitment) => {
        openForm(undefined, item);
    };

    const handleDelete = async (id: string, isProjected: boolean = false) => {
        if (isProjected || id.startsWith('virtual-')) {
            setAlertModal({ isOpen: true, type: 'warning', title: 'Acción no permitida', message: 'No se puede eliminar una proyección futura directa. Debes editar o eliminar la Regla Recurrente asociada.' });
            return;
        }

        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Confirmar Eliminación',
            message: '¿Eliminar este compromiso?',
            showCancel: true,
            confirmText: 'Eliminar',
            onConfirm: async () => {
                try {
                    await budgetService.deleteCommitment(id);
                    loadData();
                    setAlertModal({ isOpen: false, message: '' });
                } catch (error) {
                    console.error(error);
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error al eliminar' });
                }
            }
        });
    };

    const handleBulkDelete = async (ids: Set<string>) => {
        const idArray = Array.from(ids);
        const virtuals = idArray.filter(id => id.startsWith('virtual-'));
        const reals = idArray.filter(id => !id.startsWith('virtual-'));

        if (reals.length === 0) {
            if (virtuals.length > 0) {
                setAlertModal({ isOpen: true, type: 'info', title: 'Información', message: `Solo se seleccionaron proyecciones virtuales, que no se pueden eliminar directamente.` });
            }
            return;
        }

        const message = virtuals.length > 0
            ? `Se omitirán ${virtuals.length} proyecciones virtuales. ¿Eliminar los ${reals.length} compromisos reales seleccionados?`
            : `¿Eliminar ${reals.length} compromisos seleccionados?`;

        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Confirmar Eliminación Masiva',
            message,
            showCancel: true,
            confirmText: 'Eliminar',
            onConfirm: async () => {
                try {
                    await Promise.all(reals.map(id => budgetService.deleteCommitment(id)));
                    loadData();
                    setSelectedIds(new Set());
                    setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Compromisos eliminados.' });
                } catch (error) {
                    console.error("Error deleting commitments:", error);
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error al eliminar compromisos seleccionados.' });
                }
            }
        });
    };

    const columns = useMemo(() => [
        {
            key: 'title',
            label: 'Descripción / Proveedor',
            sortable: true,
            filterable: true,
            render: (value: string, item: BudgetCommitment) => (
                <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 block">{value}</span>
                    {item.recurrenceRuleId && (
                        <span className="text-[10px] uppercase bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold tracking-wider">
                            {item.id.startsWith('virtual-') ? 'Proyectado' : 'Recurrente'}
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'amount',
            label: 'Monto',
            sortable: true,
            align: 'text-right' as const,
            render: (value: number) => (
                <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                    ${value.toLocaleString()}
                </span>
            )
        },
        {
            key: 'dueDate',
            label: 'Vencimiento',
            sortable: true,
            filterable: true,
            width: 'w-32',
            render: (value: string) => (
                <span className="text-slate-500 text-sm font-medium">
                    {value}
                </span>
            )
        },
        {
            key: 'category',
            label: 'Categoría',
            sortable: true,
            filterable: true,
            render: (value: string) => (
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-bold uppercase tracking-wider">
                    {value}
                </span>
            )
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            filterable: true,
            align: 'text-center' as const,
            render: (value: string) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider
                    ${value === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
                    ${value === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : ''}
                    ${value === 'overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : ''}
                `}>
                    {value === 'paid' ? 'Pagado' : value === 'pending' ? 'Pendiente' : 'Vencido'}
                </span>
            )
        },
        {
            key: 'actions',
            label: '',
            width: 'w-20',
            align: 'text-right' as const,
            render: (_: any, item: BudgetCommitment) => (
                <div className="flex justify-end gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Editar"
                    >
                        <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    {!item.id.startsWith('virtual-') && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Eliminar"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )
        }
    ], [openForm, loadData]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center text-slate-400">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Cargando presupuesto...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col p-4">
            <SmartDataTable
                data={commitments}
                columns={columns}
                enableSearch={true}
                enableColumnConfig={true}
                enableExport={true}
                enableSelection={true}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onBulkDelete={handleBulkDelete}
                onRowClick={handleEdit}
                searchPlaceholder="Buscar por proveedor, categoría..."
                containerClassName="h-full"
            />
        </div>
    );
};
