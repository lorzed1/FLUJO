import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BanknotesIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { Column } from '../../../components/ui/SmartDataTable';
import { CategoryBadge } from '../../../components/ui/CategoryBadge';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { budgetService } from '../../../services/budget';
import { useBudgetContext } from '../layouts/BudgetLayout';
import { BudgetCommitment } from '../../../types/budget';
import { endOfYear, startOfYear, format } from 'date-fns';
import { useUI } from '../../../context/UIContext';
import { DateSelectionModal } from '../components/DateSelectionModal';
import { SmartDataPage } from '../../../components/layout/SmartDataPage';

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
            render: (value: string) => (
                <span className="block">{value}</span>
            )
        },
        {
            key: 'amount',
            label: 'Monto',
            type: 'currency',
            sortable: true,
            align: 'text-right' as const,
        },
        {
            key: 'dueDate',
            label: 'Vencimiento',
            sortable: true,
            filterable: true,
            width: 'w-24',
            render: (value: string) => {
                if (!value) return <span className="text-slate-300">-</span>;
                try {
                    const parts = value.split('T')[0].split('-');
                    if (parts.length === 3) return <span>{parts[2]}/{parts[1]}/{parts[0]}</span>;
                } catch (e) { }
                return <span>{value}</span>;
            }
        },
        {
            key: 'paidDate',
            label: 'Fecha Pago',
            sortable: true,
            filterable: true,
            width: 'w-24',
            render: (value: string, item: BudgetCommitment) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (item.status === 'paid') handleQuickPay(item);
                    }}
                    className={`transition-colors border-b border-transparent hover:border-current ${value
                        ? 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 cursor-pointer'
                        : 'text-gray-400 dark:text-gray-500 cursor-default'
                        }`}
                    disabled={item.status !== 'paid'}
                    title={item.status === 'paid' ? "Cambiar fecha de pago" : ""}
                >
                    {value ? (() => {
                        try {
                            const parts = value.split('T')[0].split('-');
                            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                        } catch (e) { }
                        return value;
                    })() : '-'}
                </button>
            )
        },
        {
            key: 'category',
            label: 'Categoría',
            sortable: true,
            filterable: true,
            render: (value: string) => <CategoryBadge>{value}</CategoryBadge>
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            filterable: true,
            align: 'text-center' as const,
            render: (value: string) => {
                const statusMap: Record<string, { variant: 'success' | 'warning' | 'danger' | 'neutral'; label: string }> = {
                    paid: { variant: 'success', label: 'Pagado' },
                    pending: { variant: 'warning', label: 'Pendiente' },
                    overdue: { variant: 'danger', label: 'Vencido' }
                };
                const s = statusMap[value] || { variant: 'neutral' as const, label: value };
                return <StatusBadge variant={s.variant} label={s.label} />;
            }
        },
        {
            key: 'quickPay',
            label: '',
            width: 'w-10',
            align: 'text-center' as const,
            filterable: false,
            sortable: false,
            render: (_: any, item: BudgetCommitment) => (
                item.status !== 'paid' ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleQuickPay(item); }}
                        className="text-emerald-400 hover:text-emerald-600 dark:text-emerald-500 dark:hover:text-emerald-300 transition-all p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        title="Marcar como Pagado"
                    >
                        <BanknotesIcon className="w-4 h-4" />
                    </button>
                ) : null
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

    // --- RENDER ---
    return (
        <>
            <SmartDataPage<BudgetCommitment>
                title="BD de gastos"
                icon={<TableCellsIcon className="h-6 w-6 text-purple-600" />}
                breadcrumbs={[
                    { label: 'Egresos', href: '/budget' },
                    { label: 'Tabla' }
                ]}
                supabaseTableName="budget_commitments"
                fetchData={loadData as any} // Use internal loader for custom date ranges
                columns={columns}
                enableAdd={true}
                onAdd={() => openForm()}
                onEdit={handleEdit}
                searchPlaceholder="Buscar por proveedor, categoría..."
                infoDefinitions={[
                    {
                        label: 'Descripción / Proveedor',
                        description: 'Indica el concepto del gasto o el nombre del tercero a quien se adeuda el pago.',
                        origin: 'Registro de Compromiso'
                    },
                    {
                        label: 'Monto',
                        description: 'Valor monetario total de la obligación registrada.',
                        origin: 'Factura / Cotización'
                    },
                    {
                        label: 'Vencimiento',
                        description: 'Fecha límite estipulada para cumplir con el pago sin generar intereses o moras.',
                        origin: 'Términos de Pago'
                    },
                    {
                        label: 'Fecha Pago',
                        description: 'Día exacto en que se registró la salida de dinero en el sistema.',
                        origin: 'Comprobante de Pago'
                    },
                    {
                        label: 'Categoría',
                        description: 'Clasificación administrativa para agrupar los gastos (ej. Operativos, Fijos, Nómina).',
                        origin: 'Configuración de Categorías'
                    },
                    {
                        label: 'Estado',
                        description: 'Muestra si el gasto está al día (Pagado), pendiente de pago o si ya superó su fecha límite (Vencido).',
                        calculation: 'Filtro por Fecha de Vencimiento vs Fecha Actual'
                    }
                ]}
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
        </>
    );
};
