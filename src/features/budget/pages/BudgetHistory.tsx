import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    ClockIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ArrowTrendingDownIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { BudgetExecutionLog } from '../../../types/budget';
import { budgetService } from '../../../services/budget';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '@/components/ui/Button';

export const BudgetHistory: React.FC = () => {
    const [logs, setLogs] = useState<BudgetExecutionLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

    const handleReconcileToday = async () => {
        if (!confirm('¿Intentar reconstruir el historial de pagos de HOY basado en los registros existentes?')) return;

        setLoading(true);
        try {
            const result = await budgetService.reconcileTodayLog();
            if (result === 'exists') {
                alert('Ya existe un registro de ejecución para hoy.');
            } else if (result === 'no_payments') {
                alert('No se encontraron pagos con fecha de hoy para registrar.');
            } else if (result) {
                alert('Registro reconstruido exitosamente.');
                await loadLogs(); // Reload table
            }
        } catch (error: any) {
            console.error("Error reconciling:", error);
            alert(`Error al intentar reconstruir el registro: ${error.message || JSON.stringify(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedIds(newSet);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <PageHeader
                title="Historial de Ejecuciones"
                breadcrumbs={[
                    { label: 'Finanzas', path: '/budget' },
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

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden p-4 sm:p-6 flex-1 relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex justify-center items-center z-10 backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}

                {logs.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 h-full flex flex-col items-center justify-center">
                        <p>No hay registros de ejecución aún.</p>
                        <button
                            onClick={handleReconcileToday}
                            className="mt-4 text-purple-600 hover:underline text-sm font-medium"
                        >
                            Verificar pagos recientes
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-4">Fecha Ejecución</th>
                                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-4">Semana Del</th>
                                    <th className="text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-4">Items</th>
                                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-4">Total Pagado</th>
                                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-4">Saldo Final</th>
                                    <th className="text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-4">Detalle</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors border-b border-gray-50 dark:border-slate-800">
                                            <td className="px-4 py-3.5 font-medium text-[13px] text-gray-900 dark:text-white whitespace-nowrap">
                                                {format(parseISO(log.executionDate), 'dd MMM yyyy, HH:mm', { locale: es })}
                                            </td>
                                            <td className="px-4 py-3.5 text-[13px] text-gray-600 dark:text-gray-400">
                                                {format(parseISO(log.weekStartDate), 'dd MMM yyyy', { locale: es })}
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full text-[11px] font-medium">
                                                    {log.itemsCount}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-medium text-[13px] text-rose-600">
                                                - {formatCurrency(log.totalPaid)}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-medium text-[13px]">
                                                <span className={log.finalBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                                    {formatCurrency(log.finalBalance)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <button
                                                    onClick={() => toggleExpand(log.id)}
                                                    className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-400"
                                                >
                                                    {expandedIds.has(log.id)
                                                        ? <ChevronUpIcon className="h-4 w-4" />
                                                        : <ChevronDownIcon className="h-4 w-4" />
                                                    }
                                                </button>
                                            </td>
                                        </tr>

                                        {/* EXPANDED DETAILS ROW */}
                                        {expandedIds.has(log.id) && (
                                            <tr className="bg-gray-50/50 dark:bg-slate-900/30">
                                                <td colSpan={6} className="px-4 py-4 border-b border-gray-50">
                                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                                                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm">
                                                            <span className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">Cta Corriente</span>
                                                            <span className="font-mono font-medium text-[13px] text-gray-900 dark:text-white">
                                                                {formatCurrency(log.initialState?.ctaCorriente || 0)}
                                                            </span>
                                                        </div>
                                                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm">
                                                            <span className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">Cta Ahorros J</span>
                                                            <span className="font-mono font-medium text-[13px] text-gray-900 dark:text-white">
                                                                {formatCurrency(log.initialState?.ctaAhorrosJ || 0)}
                                                            </span>
                                                        </div>
                                                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm">
                                                            <span className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">Cta Ahorros N</span>
                                                            <span className="font-mono font-medium text-[13px] text-gray-900 dark:text-white">
                                                                {formatCurrency(log.initialState?.ctaAhorrosN || 0)}
                                                            </span>
                                                        </div>
                                                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 shadow-sm">
                                                            <span className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">Efectivo</span>
                                                            <span className="font-mono font-medium text-[13px] text-gray-900 dark:text-white">
                                                                {formatCurrency(log.initialState?.efectivo || 0)}
                                                            </span>
                                                        </div>
                                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-800/30 shadow-sm">
                                                            <span className="block text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">Disponibilidad Total</span>
                                                            <span className="font-mono font-bold text-[13px] text-emerald-700 dark:text-emerald-300">
                                                                {formatCurrency(log.initialState?.totalAvailable || 0)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
