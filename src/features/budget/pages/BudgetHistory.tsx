import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    ClockIcon,
    BanknotesIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { BudgetExecutionLog } from '../../../types/budget';
import { budgetService } from '../../../services/budgetService';

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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClockIcon className="h-8 w-8 text-primary" /> Historial de Ejecuciones
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Registro de pagos semanales y estados de disponibilidad.
                    </p>
                </div>
                <div>
                    <button
                        onClick={handleReconcileToday}
                        className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        title="Buscar pagos hechos hoy que no tengan log"
                    >
                        <ArrowTrendingDownIcon className="h-4 w-4" />
                        Sincronizar Hoy
                    </button>
                    <button
                        onClick={loadLogs}
                        className="ml-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Actualizar
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex-1 relative">
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
                            className="mt-4 text-primary hover:underline text-sm"
                        >
                            Verificar pagos recientes
                        </button>
                    </div>
                ) : (
                    <div className="overflow-y-auto h-full">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-400 sticky top-0 bg-opacity-95 backdrop-blur">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Fecha Ejecución</th>
                                    <th scope="col" className="px-6 py-3">Semana Del</th>
                                    <th scope="col" className="px-6 py-3 text-right">Items</th>
                                    <th scope="col" className="px-6 py-3 text-right">Total Pagado</th>
                                    <th scope="col" className="px-6 py-3 text-right">Saldo Final</th>
                                    <th scope="col" className="px-6 py-3 text-center">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                {logs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                                {format(parseISO(log.executionDate), 'dd MMM yyyy, HH:mm', { locale: es })}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {format(parseISO(log.weekStartDate), 'dd MMM yyyy', { locale: es })}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                                    {log.itemsCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-red-500">
                                                - {formatCurrency(log.totalPaid)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold">
                                                <span className={log.finalBalance < 0 ? 'text-red-500' : 'text-green-500'}>
                                                    {formatCurrency(log.finalBalance)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => toggleExpand(log.id)}
                                                    className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full transition-colors"
                                                >
                                                    {expandedIds.has(log.id)
                                                        ? <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                                                        : <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                                                    }
                                                </button>
                                            </td>
                                        </tr>

                                        {/* EXPANDED DETAILS ROW */}
                                        {expandedIds.has(log.id) && (
                                            <tr className="bg-gray-50 dark:bg-slate-900/50">
                                                <td colSpan={6} className="px-6 py-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                                                        <div className="p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                                                            <span className="block text-gray-500 mb-1">Cta Corriente</span>
                                                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                                                                {formatCurrency(log.initialState?.ctaCorriente || 0)}
                                                            </span>
                                                        </div>
                                                        <div className="p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                                                            <span className="block text-gray-500 mb-1">Cta Ahorros J</span>
                                                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                                                                {formatCurrency(log.initialState?.ctaAhorrosJ || 0)}
                                                            </span>
                                                        </div>
                                                        <div className="p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                                                            <span className="block text-gray-500 mb-1">Cta Ahorros N</span>
                                                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                                                                {formatCurrency(log.initialState?.ctaAhorrosN || 0)}
                                                            </span>
                                                        </div>
                                                        <div className="p-3 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                                                            <span className="block text-gray-500 mb-1">Efectivo</span>
                                                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                                                                {formatCurrency(log.initialState?.efectivo || 0)}
                                                            </span>
                                                        </div>
                                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                                                            <span className="block text-green-600 dark:text-green-400 mb-1">Disponibilidad Total</span>
                                                            <span className="font-mono font-bold text-green-700 dark:text-green-300">
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
