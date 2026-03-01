import React, { useState, useEffect } from 'react';
import {
    ClockIcon,
    ArrowTrendingDownIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { BudgetExecutionLog } from '../../../types/budget';
import { budgetService } from '../../../services/budget';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { SmartDataTable, Column } from '../../../components/ui/SmartDataTable';
import { useUI } from '../../../context/UIContext';

interface BudgetHistoryProps {
    hideHeader?: boolean;
}

export const BudgetHistory: React.FC<BudgetHistoryProps> = ({ hideHeader = false }) => {
    const { setAlertModal } = useUI();
    const [logs, setLogs] = useState<BudgetExecutionLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [detailLog, setDetailLog] = useState<BudgetExecutionLog | null>(null);

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
            label: 'Fecha Ejecución',
            sortable: true,
            width: 'w-32',
            render: (value: string) => {
                try {
                    const parts = value.split('T')[0].split('-');
                    if (parts.length === 3) return <span className="whitespace-nowrap">{parts[2]}/{parts[1]}/{parts[0]}</span>;
                } catch (e) { }
                return <span className="whitespace-nowrap">{value}</span>;
            }
        },
        {
            key: 'weekStartDate',
            label: 'Semana Del',
            sortable: true,
            width: 'w-24',
            render: (value: string) => {
                try {
                    const parts = value.split('T')[0].split('-');
                    if (parts.length === 3) return <span>{parts[2]}/{parts[1]}/{parts[0]}</span>;
                } catch (e) { }
                return <span>{value}</span>;
            }
        },
        {
            key: 'itemsCount',
            label: 'Items',
            align: 'text-center',
            sortable: true,
            render: (value: number) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-blue-200 bg-blue-50 text-[10px] font-semibold text-blue-600 tracking-widest dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400">
                    {value} ITEMS
                </span>
            )
        },
        {
            key: 'totalPaid',
            label: 'Total Pagado',
            align: 'text-right',
            sortable: true,
            render: (value: number) => (
                <span className="tabular-nums text-rose-600 dark:text-rose-400">
                    - {formatCurrency(value)}
                </span>
            )
        },
        {
            key: 'finalBalance',
            label: 'Saldo Final',
            align: 'text-right',
            sortable: true,
            render: (value: number) => (
                <span className={`tabular-nums ${value < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: 'id',
            label: 'Detalle',
            align: 'text-center',
            width: 'w-16',
            filterable: false,
            render: (_, item) => (
                <button
                    onClick={() => setDetailLog(item)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-purple-600 dark:text-purple-400 group"
                    title="Ver saldos iniciales"
                >
                    <ClockIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                </button>
            )
        }
    ];

    return (
        <div className="flex flex-col h-full space-y-6">
            {!hideHeader && (
                <PageHeader
                    title="Historial de Pagos"
                    breadcrumbs={[
                        { label: 'Egresos', path: '/budget' },
                        { label: 'Historial' }
                    ]}
                    icon={<ClockIcon className="h-6 w-6" />}
                    actions={
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                onClick={handleReconcileToday}
                                className="bg-white border-gray-200 text-gray-600 hover:text-purple-600 hover:border-purple-200"
                                title="Buscar pagos hechos hoy que no tengan log"
                            >
                                <ArrowTrendingDownIcon className="h-4 w-4 mr-2" />
                                Sincronizar Hoy
                            </Button>
                            <Button
                                onClick={loadLogs}
                                variant="primary"
                            >
                                <ArrowPathIcon className="h-4 w-4 mr-2" />
                                Actualizar
                            </Button>
                        </div>
                    }
                />
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex-1 relative flex flex-col">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex justify-center items-center z-20 backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}

                <SmartDataTable
                    data={logs}
                    columns={columns}
                    enableSearch={true}
                    enableColumnConfig={true}
                    enableExport={true}
                    searchPlaceholder="Buscar por fecha..."
                    containerClassName="border-none shadow-none"
                    id="budget-history-table"
                />
            </div>

            {/* Modal de Detalle Manual */}
            {detailLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                                <ClockIcon className="h-5 w-5 text-purple-600" />
                                Saldos Iniciales
                            </h3>
                            <button onClick={() => setDetailLog(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900/30 rounded-lg border border-gray-100 dark:border-slate-700">
                                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Cta Corriente</span>
                                <span className="font-mono font-bold text-[13px] text-gray-900 dark:text-white">{formatCurrency(detailLog.initialState?.ctaCorriente || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900/30 rounded-lg border border-gray-100 dark:border-slate-700">
                                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Cta Ahorros J</span>
                                <span className="font-mono font-bold text-[13px] text-gray-900 dark:text-white">{formatCurrency(detailLog.initialState?.ctaAhorrosJ || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900/30 rounded-lg border border-gray-100 dark:border-slate-700">
                                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Cta Ahorros N</span>
                                <span className="font-mono font-bold text-[13px] text-gray-900 dark:text-white">{formatCurrency(detailLog.initialState?.ctaAhorrosN || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900/30 rounded-lg border border-gray-100 dark:border-slate-700">
                                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Efectivo</span>
                                <span className="font-mono font-bold text-[13px] text-gray-900 dark:text-white">{formatCurrency(detailLog.initialState?.efectivo || 0)}</span>
                            </div>
                            <div className="mt-4 flex justify-between items-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30 shadow-sm">
                                <div className="flex flex-col">
                                    <span className="text-[9px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-black">Disponibilidad Total</span>
                                    <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/50">Al momento del pago</span>
                                </div>
                                <span className="font-mono font-black text-lg text-emerald-700 dark:text-emerald-300">
                                    {formatCurrency(detailLog.initialState?.totalAvailable || 0)}
                                </span>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                            <Button variant="secondary" onClick={() => setDetailLog(null)} className="h-9 px-6 text-xs font-bold">
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
