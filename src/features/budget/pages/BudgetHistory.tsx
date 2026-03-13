import React, { useState, useEffect } from 'react';
import { getISOWeek, parseISO } from 'date-fns';
import {
    ClockIcon,
    ArrowTrendingDownIcon,
    ArrowPathIcon,
    EyeIcon
} from '../../../components/ui/Icons';
import { BudgetExecutionLog } from '../../../types/budget';
import { budgetService } from '../../../services/budget';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { SmartDataTable, Column } from '../../../components/ui/SmartDataTable';
import { useUI } from '../../../context/UIContext';
import { Spinner } from '../../../components/ui/Spinner';
import { PaymentGroupDetailModal } from '../components/PaymentGroupDetailModal';

interface BudgetHistoryProps {
    hideHeader?: boolean;
}

export const BudgetHistory: React.FC<BudgetHistoryProps> = ({ hideHeader = false }) => {
    const { setAlertModal } = useUI();
    const [logs, setLogs] = useState<BudgetExecutionLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [paymentGroupDetail, setPaymentGroupDetail] = useState<{ id: string, dateText: string } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await budgetService.getExecutionLogs();
            setLogs(data);
        } catch (error) {
            console.error("Error loading logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const handleReconcileToday = () => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Sincronizar Pagos de Hoy',
            message: '¿Intentar reconstruir el historial de pagos de HOY basado en los registros existentes?',
            showCancel: true,
            confirmText: 'Sincronizar',
            onConfirm: async () => {
                setAlertModal({ isOpen: false, message: '' });
                setLoading(true);
                try {
                    const result = await budgetService.reconcileTodayLog();
                    if (result === 'exists') {
                        setAlertModal({ isOpen: true, type: 'info', title: 'Sin Cambios', message: 'Ya existe un registro de ejecución para hoy.' });
                    } else if (result === 'no_payments') {
                        setAlertModal({ isOpen: true, type: 'info', title: 'Sin Pagos', message: 'No se encontraron pagos con fecha de hoy para registrar.' });
                    } else if (result) {
                        await loadLogs();
                        setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Registro reconstruido exitosamente.' });
                    }
                } catch (error: any) {
                    console.error("Error reconciling:", error);
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: `Error al reconstruir el registro: ${error.message || 'Error desconocido'}` });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleDeleteLog = async (log: BudgetExecutionLog) => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Eliminar Registro',
            message: `¿Estás seguro de eliminar el registro de ejecución de la fecha ${formatCurrency(log.totalPaid)}? Esta acción no se puede deshacer.`,
            showCancel: true,
            confirmText: 'Eliminar',
            onConfirm: async () => {
                setAlertModal({ isOpen: false, message: '' });
                setLoading(true);
                try {
                    await budgetService.deleteExecutionLog(log.id);
                    await loadLogs();
                    setSelectedIds(prev => {
                        const next = new Set(prev);
                        next.delete(log.id);
                        return next;
                    });
                    setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Registro eliminado exitosamente.' });
                } catch (error: any) {
                    console.error("Error deleting log:", error);
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: `Error al eliminar el registro: ${error.message || 'Error desconocido'}` });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleBulkDelete = async (ids: Set<string>) => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Eliminar Registros',
            message: `¿Estás seguro de eliminar los ${ids.size} registros seleccionados? Esta acción no se puede deshacer.`,
            showCancel: true,
            confirmText: 'Eliminar',
            onConfirm: async () => {
                setAlertModal({ isOpen: false, message: '' });
                setLoading(true);
                try {
                    await Promise.all(Array.from(ids).map(id => budgetService.deleteExecutionLog(id)));
                    await loadLogs();
                    setSelectedIds(new Set());
                    setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Registros eliminados exitosamente.' });
                } catch (error: any) {
                    console.error("Error deleting logs:", error);
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: `Error al eliminar registros: ${error.message || 'Error desconocido'}` });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const columns: Column<BudgetExecutionLog>[] = [
        {
            key: 'executionDate',
            label: 'Fecha',
            sortable: true,
            width: 'w-24',
            render: (value: string) => {
                try {
                    const parts = value.split('T')[0].split('-');
                    if (parts.length === 3) return <span className="whitespace-nowrap">{parts[2]}/{parts[1]}/{parts[0]}</span>;
                } catch (e) { }
                return <span className="whitespace-nowrap">{value}</span>;
            }
        },
        {
            key: 'week_number',
            label: 'Semana',
            sortable: true,
            width: 'w-20',
            align: 'text-center',
            getValue: (item) => {
                try {
                    return getISOWeek(parseISO(item.weekStartDate || item.executionDate));
                } catch (e) {
                    return 0;
                }
            },
            render: (_, item) => {
                try {
                    const week = getISOWeek(parseISO(item.weekStartDate || item.executionDate));
                    return <span>{week}</span>;
                } catch (e) {
                    return <span>-</span>;
                }
            }
        },
        {
            key: 'cta_corriente',
            label: 'Cta Corriente',
            align: 'text-right',
            sortable: true,
            getValue: (item) => item.initialState?.ctaCorriente || 0,
            render: (_, item) => (
                <span className="tabular-nums">
                    {formatCurrency(item.initialState?.ctaCorriente || 0)}
                </span>
            )
        },
        {
            key: 'cta_ahorros_j',
            label: 'Cta Ahorros J',
            align: 'text-right',
            sortable: true,
            getValue: (item) => item.initialState?.ctaAhorrosJ || 0,
            render: (_, item) => (
                <span className="tabular-nums">
                    {formatCurrency(item.initialState?.ctaAhorrosJ || 0)}
                </span>
            )
        },
        {
            key: 'cta_ahorros_n',
            label: 'Cta Ahorros N',
            align: 'text-right',
            sortable: true,
            getValue: (item) => item.initialState?.ctaAhorrosN || 0,
            render: (_, item) => (
                <span className="tabular-nums">
                    {formatCurrency(item.initialState?.ctaAhorrosN || 0)}
                </span>
            )
        },
        {
            key: 'cta_nequi',
            label: 'Cta Nequi',
            align: 'text-right',
            sortable: true,
            getValue: (item) => item.initialState?.ctaNequi || 0,
            render: (_, item) => (
                <span className="tabular-nums">
                    {formatCurrency(item.initialState?.ctaNequi || 0)}
                </span>
            )
        },
        {
            key: 'efectivo',
            label: 'Efectivo',
            align: 'text-right',
            sortable: true,
            getValue: (item) => item.initialState?.efectivo || 0,
            render: (_, item) => (
                <span className="tabular-nums">
                    {formatCurrency(item.initialState?.efectivo || 0)}
                </span>
            )
        },
        {
            key: 'otros_ingresos',
            label: 'Otros Ingresos',
            align: 'text-right',
            sortable: true,
            getValue: (item) => item.initialState?.otrosIngresos || 0,
            render: (_, item) => (
                <span className="tabular-nums">
                    {formatCurrency(item.initialState?.otrosIngresos || 0)}
                </span>
            )
        },
        {
            key: 'total_disponible',
            label: 'Total Disponible',
            align: 'text-right',
            sortable: true,
            getValue: (item) => item.initialState?.totalAvailable || 0,
            render: (_, item) => (
                <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(item.initialState?.totalAvailable || 0)}
                </span>
            )
        },
        {
            key: 'totalPaid',
            label: 'Total Pagado',
            align: 'text-right',
            sortable: true,
            render: (value: number) => (
                <span className="tabular-nums text-rose-600 dark:text-rose-400 font-medium">
                    {formatCurrency(value)}
                </span>
            )
        }
    ];

    return (
        <div className="flex flex-col h-full bg-transparent dark:bg-slate-900/20 overflow-hidden">
            {!hideHeader && (
                <div className="px-6 pt-4 shrink-0 mb-4">
                    <PageHeader
                        title="Historial de Pagos"
                        breadcrumbs={[
                            { label: 'Egresos', path: '/budget' },
                            { label: 'Historial' }
                        ]}
                        icon={<ClockIcon className="h-6 w-6" />}
                    />
                </div>
            )}

            <main className="flex-1 px-4 pb-4 overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 flex flex-col font-sans bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex justify-center items-center z-20 backdrop-blur-sm">
                            <Spinner size="md" />
                        </div>
                    )}

                    <SmartDataTable
                        data={logs}
                        columns={columns}
                        enableSearch={true}
                        enableColumnConfig={true}
                        enableExport={true}
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                        onView={(item) => {
                            let dText = item.executionDate;
                            try {
                                const parts = item.executionDate.split('T')[0].split('-');
                                if (parts.length === 3) dText = `${parts[2]}/${parts[1]}/${parts[0]}`;
                            } catch (e) { }
                            setPaymentGroupDetail({ id: item.id, dateText: dText });
                        }}
                        onDelete={handleDeleteLog}
                        onBulkDelete={handleBulkDelete}
                        searchPlaceholder="Buscar por fecha..."
                        containerClassName="border-none shadow-none"
                        id="budget-history-table"
                    />
                </div>
            </main>

            {/* Modal de Detalle de Pagos de la Transacción */}
            <PaymentGroupDetailModal
                isOpen={!!paymentGroupDetail}
                onClose={() => setPaymentGroupDetail(null)}
                transactionId={paymentGroupDetail?.id || ''}
                dateText={paymentGroupDetail?.dateText}
                onUpdate={loadLogs}
            />
        </div>
    );
};
