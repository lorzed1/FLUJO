import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PencilSquareIcon, TrashIcon, BanknotesIcon, TableCellsIcon, PlusIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../../components/layout/PageHeader';
import { BudgetCommitment } from '../../../types/budget';
import { budgetService } from '../../../services/budget';
import { useBudgetContext } from '../layouts/BudgetLayout';
import { SmartDataTable, Column } from '../../../components/ui/SmartDataTable';
import { startOfMonth, endOfMonth, endOfYear, startOfYear, format } from 'date-fns';
import { useUI } from '../../../context/UIContext';
import { DateSelectionModal } from '../components/DateSelectionModal';
import { Button } from '@/components/ui/Button';

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


    const handleDelete = async (id: string) => {
        const item = commitments.find(c => c.id === id);
        if (!item) return;

        const isRecurring = item.recurrenceRuleId && (item.status === 'pending' || item.id.startsWith('projected-'));

        if (isRecurring && item.recurrenceRuleId) {
            setAlertModal({
                isOpen: true,
                type: 'warning',
                title: 'Eliminar Gasto Recurrente',
                message: 'Este gasto pertenece a una regla recurrente. ¿Deseas eliminar la regla completa? Esto borrará todas las proyecciones futuras pendientes.',
                showCancel: true,
                confirmText: 'Eliminar Regla y Futuros',
                onConfirm: async () => {
                    try {
                        if (item.recurrenceRuleId) {
                            await budgetService.deleteRecurrenceRule(item.recurrenceRuleId);
                        }
                        loadData();
                        setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Regla recurrente eliminada.' });
                    } catch (error) {
                        console.error("Error deleting rule:", error);
                        setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error al eliminar la regla recurrente.' });
                    }
                }
            });
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

    // Bulk delete logic...
    const handleBulkDelete = async (ids: Set<string>) => {
        const selectedItems = commitments.filter(c => ids.has(c.id));
        const ruleIds = new Set<string>();
        const standaloneIds: string[] = [];

        selectedItems.forEach(item => {
            if (item.recurrenceRuleId && (item.status === 'pending' || item.id.startsWith('projected-'))) {
                ruleIds.add(item.recurrenceRuleId);
            } else {
                standaloneIds.push(item.id);
            }
        });

        const messages = [];
        if (ruleIds.size > 0) messages.push(`Se eliminarán ${ruleIds.size} reglas recurrentes y sus proyecciones futuras.`);
        if (standaloneIds.length > 0) messages.push(`Se eliminarán ${standaloneIds.length} compromisos individuales.`);

        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Confirmar Eliminación Masiva',
            message: messages.join(' ') || '¿Eliminar elementos seleccionados?',
            showCancel: true,
            confirmText: 'Eliminar Todo',
            onConfirm: async () => {
                try {
                    const promises: Promise<any>[] = [];
                    // Delete rules
                    ruleIds.forEach(ruleId => {
                        promises.push(budgetService.deleteRecurrenceRule(ruleId));
                    });
                    // Delete standalone
                    standaloneIds.forEach(id => {
                        promises.push(budgetService.deleteCommitment(id));
                    });
                    await Promise.all(promises);
                    loadData();
                    setSelectedIds(new Set());
                    setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Elementos eliminados correctamente.' });
                } catch (error) {
                    console.error("Error deleting commitments:", error);
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error al eliminar elementos seleccionados.' });
                }
            }
        });
    };

    const columns: Column<BudgetCommitment>[] = useMemo(() => [
        {
            key: 'title',
            label: 'Descripción / Proveedor',
            sortable: true,
            filterable: true,
            render: (value: string, item: BudgetCommitment) => (
                <div>
                    <span className="font-semibold text-[13px] text-gray-800 dark:text-gray-200 block">{value}</span>
                    {item.recurrenceRuleId && (
                        <div className="inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded-full border border-indigo-100 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-800 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            <span className="text-[10px] font-medium uppercase text-indigo-700 dark:text-indigo-300 tracking-wide">
                                {item.id.startsWith('projected-') ? 'Proyectado' : 'Recurrente'}
                            </span>
                        </div>
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
                <span className="font-medium text-[13px] text-gray-900 dark:text-white">
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
                <span className="text-gray-500 text-[13px] font-normal">
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
                    className={`text-[13px] font-medium transition-colors border-b border-transparent hover:border-current ${value
                        ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer'
                        : 'text-gray-300 dark:text-gray-600 cursor-default'
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
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-gray-200 bg-gray-50 text-gray-600 uppercase tracking-wide">
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
            render: (value: string) => {
                let dotColor = 'bg-gray-400';
                let textColor = 'text-gray-700';
                let borderColor = 'border-gray-200';
                let label = '';

                switch (value) {
                    case 'paid':
                        dotColor = 'bg-emerald-500';
                        label = 'Pagado';
                        break;
                    case 'pending':
                        dotColor = 'bg-amber-400';
                        label = 'Pendiente';
                        break;
                    case 'overdue':
                        dotColor = 'bg-rose-500';
                        label = 'Vencido';
                        break;
                }

                return (
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${borderColor} bg-white dark:bg-slate-800 shadow-sm w-fit mx-auto`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                        <span className={`text-[11px] font-medium uppercase tracking-wide ${textColor} dark:text-gray-300`}>
                            {label}
                        </span>
                    </div>
                );
            }
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
                        className="text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors p-1 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        title="Editar"
                    >
                        <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Eliminar"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
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
        <div className="space-y-6">
            <PageHeader
                title="Listado de Pasivos"
                breadcrumbs={[
                    { label: 'Finanzas', path: '/budget' },
                    { label: 'Tabla' }
                ]}
                icon={<TableCellsIcon className="h-6 w-6" />}
                actions={
                    <Button
                        onClick={() => openForm()}
                        variant="primary"
                        className="gap-2"
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Nuevo Gasto</span>
                    </Button>
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

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden p-4 sm:p-6">
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
                    containerClassName="border-none shadow-none"
                    exportDateField="dueDate"
                />
            </div>
        </div>
    );
};
