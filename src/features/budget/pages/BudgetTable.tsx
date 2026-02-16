import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PencilSquareIcon, TrashIcon, BanknotesIcon, TableCellsIcon, PlusIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../../components/layout/PageHeader';
import { BudgetCommitment } from '../../../types/budget';
import { budgetService } from '../../../services/budgetService';
import { useBudgetContext } from '../layouts/BudgetLayout';
import { SmartDataTable } from '../../../components/ui/SmartDataTable';
import { startOfMonth, endOfMonth, endOfYear, startOfYear, format } from 'date-fns';
import { useUI } from '../../../context/UIContext';
import { DateSelectionModal } from '../components/DateSelectionModal';

export const BudgetTable: React.FC = () => {
    const { openForm, refreshTrigger } = useBudgetContext();
    const { setAlertModal } = useUI();
    const [commitments, setCommitments] = useState<BudgetCommitment[]>([]);
    const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; item: BudgetCommitment | null }>({ isOpen: false, item: null });
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const start = format(startOfYear(new Date()), 'yyyy-MM-dd');
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
    }, [loadData, refreshTrigger]);

    const handleEdit = (item: BudgetCommitment) => {
        openForm(undefined, item);
    };

    const handleQuickPay = async (item: BudgetCommitment) => {
        setPaymentModal({ isOpen: true, item });
    };

    const handleConfirmPayment = async (dateStr: string) => {
        if (!paymentModal.item) return;
        const item = paymentModal.item;

        try {
            if (item.id.startsWith('projected-')) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, isProjected, ...data } = item;
                await budgetService.addCommitment({
                    ...data,
                    status: 'paid',
                    paidDate: dateStr,
                    recurrenceRuleId: item.recurrenceRuleId
                });
            } else {
                await budgetService.updateCommitment(item.id, {
                    status: 'paid',
                    paidDate: dateStr
                });
            }

            await loadData();
            setPaymentModal({ isOpen: false, item: null });
        } catch (error) {
            console.error("Error paying commitment:", error);
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo registrar el pago.' });
        }
    };


    const handleDelete = async (id: string, isProjected: boolean = false) => {
        if (isProjected || id.startsWith('projected-')) {
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
        const virtuals = idArray.filter(id => id.startsWith('projected-'));
        const reals = idArray.filter(id => !id.startsWith('projected-'));

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
                            {item.id.startsWith('projected-') ? 'Proyectado' : 'Recurrente'}
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
            key: 'paidDate',
            label: 'Fecha Pago',
            sortable: true,
            filterable: true,
            width: 'w-32',
            render: (value: string, item: BudgetCommitment) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (item.status === 'paid') handleQuickPay(item);
                    }}
                    className={`text-sm font-medium transition-colors border-b border-transparent hover:border-current ${value
                        ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer'
                        : 'text-slate-300 dark:text-slate-600 cursor-default'
                        }`}
                    disabled={item.status !== 'paid'}
                    title={item.status === 'paid' ? "Cambiar fecha de pago" : ""}
                >
                    {value || '-'}
                </button>
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
            width: 'w-24',
            align: 'text-right' as const,
            render: (_: any, item: BudgetCommitment) => (
                <div className="flex justify-end gap-1">
                    {item.status !== 'paid' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleQuickPay(item); }}
                            className="text-emerald-400 hover:text-emerald-600 dark:text-emerald-500 dark:hover:text-emerald-300 transition-colors p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            title="Marcar como Pagado Hoy"
                        >
                            <BanknotesIcon className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Editar"
                    >
                        <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    {!item.id.startsWith('projected-') && (
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
            <PageHeader
                title="Listado de Pasivos"
                breadcrumbs={[
                    { label: 'Finanzas', path: '/budget' },
                    { label: 'Tabla' }
                ]}
                icon={<TableCellsIcon className="h-6 w-6" />}
                actions={
                    <button
                        onClick={() => openForm()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Nuevo</span>
                    </button>
                }
            />

            <DateSelectionModal
                isOpen={paymentModal.isOpen}
                onClose={() => setPaymentModal({ isOpen: false, item: null })}
                onConfirm={handleConfirmPayment}
                title="Registrar Pago"
                description={<p>Estás registrando el pago de <span className="font-semibold text-slate-800 dark:text-slate-100 block mt-1">"{paymentModal.item?.title || ''}"</span></p>}
                label="Fecha del Pago"
                confirmText="Confirmar"
                initialDate={paymentModal.item?.paidDate}
            />
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
                containerClassName="flex-1 min-h-0"
                exportDateField="dueDate"
            />
        </div>
    );
};
