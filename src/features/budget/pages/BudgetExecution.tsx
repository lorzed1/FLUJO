import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    format,
    startOfWeek,
    endOfWeek,
    addWeeks,
    subWeeks,
    isSameDay,
    parseISO,
    isBefore,
    startOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
    BanknotesIcon,
    BuildingLibraryIcon,
    CalculatorIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CheckCircleIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { BudgetCommitment } from '../../../types/budget';
import { budgetService } from '../../../services/budgetService';
import { useUI } from '../../../context/UIContext';
import { BudgetContextType } from '../layouts/BudgetLayout';

export const BudgetExecution: React.FC = () => {
    const { refreshTrigger } = useOutletContext<BudgetContextType>();
    const { setAlertModal } = useUI();

    // Estado de Fecha (Semana Actual)
    const [currentDate, setCurrentDate] = useState(new Date());

    // Estado de Datos
    const [commitments, setCommitments] = useState<BudgetCommitment[]>([]);
    const [loading, setLoading] = useState(false);

    // Estado de "Tanque" (Disponibilidad Detallada)
    const [ctaCorriente, setCtaCorriente] = useState<string>('');
    const [ctaAhorrosJ, setCtaAhorrosJ] = useState<string>('');
    const [ctaAhorrosN, setCtaAhorrosN] = useState<string>('');
    const [efectivo, setEfectivo] = useState<string>('');

    // Estado para debounce
    const [isSaving, setIsSaving] = useState(false);

    // Estado de Selección
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Computed Values
    const startDate = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]); // Lunes
    const endDate = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]); // Domingo

    // Cargar Datos
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const startStr = format(startDate, 'yyyy-MM-dd');
                const endStr = format(endDate, 'yyyy-MM-dd');

                // 1. Cargar Compromisos de la Semana y Vencidos
                const [weekData, overdueData] = await Promise.all([
                    budgetService.getCommitments(startStr, endStr),
                    budgetService.getOverduePendingCommitments(startStr)
                ]);

                // Combinar y ordenar: Primero Vencidos, luego Semana
                // Los vencidos van primero para alertar
                setCommitments([...overdueData, ...weekData]);

                // 2. Cargar Disponibilidad Guardada
                const availability = await budgetService.getWeeklyAvailability(startStr);
                if (availability) {
                    setCtaCorriente(availability.ctaCorriente.toString());
                    setCtaAhorrosJ(availability.ctaAhorrosJ.toString());
                    setCtaAhorrosN(availability.ctaAhorrosN.toString());
                    setEfectivo(availability.efectivo.toString());
                } else {
                    // Reset fields if no data
                    setCtaCorriente('');
                    setCtaAhorrosJ('');
                    setCtaAhorrosN('');
                    setEfectivo('');
                }

                // Resetear selección al cambiar de semana - ELIMINADO para permitir persistencia
                // setSelectedIds(new Set());
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [currentDate, refreshTrigger]);

    // Cargar Selección Persistente
    useEffect(() => {
        try {
            const startStr = format(startDate, 'yyyy-MM-dd');
            const saved = localStorage.getItem(`budget_selection_${startStr}`);
            if (saved) {
                const ids = JSON.parse(saved);
                if (Array.isArray(ids)) {
                    setSelectedIds(new Set(ids));
                }
            } else {
                setSelectedIds(new Set());
            }
        } catch (e) {
            console.error("Error loading saved selection:", e);
        }
    }, [startDate]);

    // Guardar Selección cuando cambia
    useEffect(() => {
        try {
            const startStr = format(startDate, 'yyyy-MM-dd');
            localStorage.setItem(`budget_selection_${startStr}`, JSON.stringify(Array.from(selectedIds)));
        } catch (e) {
            console.error("Error saving selection:", e);
        }
    }, [selectedIds, startDate]);

    // Helpers de Cálculo
    const totalAvailable = useMemo(() => {
        const cc = parseFloat(ctaCorriente) || 0;
        const caj = parseFloat(ctaAhorrosJ) || 0;
        const can = parseFloat(ctaAhorrosN) || 0;
        const ef = parseFloat(efectivo) || 0;
        return cc + caj + can + ef;
    }, [ctaCorriente, ctaAhorrosJ, ctaAhorrosN, efectivo]);

    // Persistencia Automática (onBlur)
    const handleSaveAvailability = async () => {
        setIsSaving(true);
        try {
            const startStr = format(startDate, 'yyyy-MM-dd');
            await budgetService.saveWeeklyAvailability({
                weekStartDate: startStr,
                ctaCorriente: parseFloat(ctaCorriente) || 0,
                ctaAhorrosJ: parseFloat(ctaAhorrosJ) || 0,
                ctaAhorrosN: parseFloat(ctaAhorrosN) || 0,
                efectivo: parseFloat(efectivo) || 0,
                totalAvailable: totalAvailable
            });
            // Optional: Show subtle toast or indicator
        } catch (error) {
            console.error("Error saving availability:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const totalSelected = useMemo(() => {
        return commitments
            .filter(c => selectedIds.has(c.id))
            .reduce((sum, c) => sum + c.amount, 0);
    }, [commitments, selectedIds]);

    const remainingBalance = totalAvailable - totalSelected;
    const isDeficit = remainingBalance < 0;

    // Handlers
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleExecute = () => {
        if (selectedIds.size === 0) return;

        setAlertModal({
            isOpen: true,
            type: 'info',
            title: 'Confirmar Pagos',
            message: `Vas a registrar el pago de ${selectedIds.size} compromisos por un total de $${totalSelected.toLocaleString('es-CO')}. ¿Confirmar?`,
            showCancel: true,
            confirmText: 'Ejecutar Pagos',
            onConfirm: async () => {
                setAlertModal({ isOpen: false, message: '' }); // Close modal

                // Asegurar que guardamos el saldo actual antes de ejecutar
                await handleSaveAvailability();

                try {
                    // Ejecutar actualizaciones en paralelo
                    const promises = Array.from(selectedIds).map(async (id) => {
                        const commitment = commitments.find(c => c.id === id);
                        if (!commitment) return;

                        if (id.startsWith('projected-')) {
                            // Si es proyectado, creamos el compromiso REAL como pagado
                            const cleanTitle = commitment.title.replace(' (Proyectado)', '');

                            return budgetService.addCommitment({
                                title: cleanTitle,
                                amount: commitment.amount,
                                dueDate: commitment.dueDate,
                                status: 'paid',
                                category: commitment.category,
                                recurrenceRuleId: commitment.recurrenceRuleId,
                                paidDate: format(new Date(), 'yyyy-MM-dd'),
                                description: commitment.description
                            });
                        } else {
                            // Si ya existe, solo actualizamos estado
                            return budgetService.updateCommitment(id, {
                                status: 'paid',
                                paidDate: format(new Date(), 'yyyy-MM-dd')
                            });
                        }
                    });

                    await Promise.all(promises);

                    // --- LOG EXECUTION HISTORY ---
                    const startStr = format(startDate, 'yyyy-MM-dd');
                    await budgetService.addExecutionLog({
                        executionDate: new Date().toISOString(),
                        weekStartDate: startStr,
                        initialState: {
                            ctaCorriente: parseFloat(ctaCorriente) || 0,
                            ctaAhorrosJ: parseFloat(ctaAhorrosJ) || 0,
                            ctaAhorrosN: parseFloat(ctaAhorrosN) || 0,
                            efectivo: parseFloat(efectivo) || 0,
                            totalAvailable: totalAvailable
                        },
                        totalPaid: totalSelected,
                        finalBalance: remainingBalance,
                        itemsCount: selectedIds.size
                    });

                    setAlertModal({
                        isOpen: true,
                        type: 'success',
                        title: 'Éxito',
                        message: 'Pagos registrados y snapshot guardado.'
                    });

                    // Clear selection local storage
                    localStorage.removeItem(`budget_selection_${startStr}`);

                    // Recargar datos
                    const endStr = format(endDate, 'yyyy-MM-dd');
                    const [weekData, overdueData] = await Promise.all([
                        budgetService.getCommitments(startStr, endStr),
                        budgetService.getOverduePendingCommitments(startStr)
                    ]);
                    setCommitments([...overdueData, ...weekData]);

                    setSelectedIds(new Set());

                } catch (error) {
                    console.error("Error executing payments:", error);
                    setAlertModal({
                        isOpen: true,
                        type: 'error',
                        title: 'Error',
                        message: 'Hubo un problema al registrar los pagos.'
                    });
                }
            }
        });
    };

    // Render Helpers
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Agrupación por días para la lista
    const activeCommitments = useMemo(() => {
        return commitments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }, [commitments]);

    // Filtrar pagados vs pendientes para facilitar la vista
    const pendingCommitments = activeCommitments.filter(c => c.status === 'pending');
    const paidCommitments = activeCommitments.filter(c => c.status === 'paid');

    return (
        <div className="flex flex-col h-full space-y-6">

            {/* --- HEADER: CONTROL DE CAJA --- */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">

                    {/* Selector de Semana */}
                    <div className="flex items-center space-x-4 bg-gray-50 dark:bg-slate-900 p-2 rounded-lg border border-gray-200 dark:border-slate-700 w-full lg:w-auto justify-between lg:justify-start">
                        <button
                            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-slate-400" />
                        </button>
                        <div className="text-center min-w-[140px]">
                            <span className="block text-xs text-gray-500 uppercase font-bold tracking-wider">Semana del</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {format(startDate, 'dd MMM', { locale: es })} - {format(endDate, 'dd MMM', { locale: es })}
                            </span>
                        </div>
                        <button
                            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-slate-400" />
                        </button>
                    </div>

                    {/* Inputs de Disponibilidad Detallada */}
                    <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 lg:flex gap-3 items-end">

                        {/* Cta Corriente */}
                        <div className="min-w-[120px] flex-1">
                            <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Cta Corriente</label>
                            <div className="relative">
                                <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                                <input
                                    type="number"
                                    value={ctaCorriente}
                                    onChange={(e) => setCtaCorriente(e.target.value)}
                                    onBlur={handleSaveAvailability}
                                    placeholder="0"
                                    className="w-full pl-5 pr-2 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-right text-sm font-mono focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Cta Ahorros J */}
                        <div className="min-w-[120px] flex-1">
                            <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Cta Ahorros J</label>
                            <div className="relative">
                                <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                                <input
                                    type="number"
                                    value={ctaAhorrosJ}
                                    onChange={(e) => setCtaAhorrosJ(e.target.value)}
                                    onBlur={handleSaveAvailability}
                                    placeholder="0"
                                    className="w-full pl-5 pr-2 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-right text-sm font-mono focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Cta Ahorros N */}
                        <div className="min-w-[120px] flex-1">
                            <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Cta Ahorros N</label>
                            <div className="relative">
                                <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                                <input
                                    type="number"
                                    value={ctaAhorrosN}
                                    onChange={(e) => setCtaAhorrosN(e.target.value)}
                                    onBlur={handleSaveAvailability}
                                    placeholder="0"
                                    className="w-full pl-5 pr-2 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-right text-sm font-mono focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Efectivo */}
                        <div className="min-w-[120px] flex-1">
                            <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Efectivo</label>
                            <div className="relative">
                                <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                                <input
                                    type="number"
                                    value={efectivo}
                                    onChange={(e) => setEfectivo(e.target.value)}
                                    onBlur={handleSaveAvailability}
                                    placeholder="0"
                                    className="w-full pl-5 pr-2 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded text-right text-sm font-mono focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Total Label */}
                        <div className="flex flex-col items-end pl-4 py-1 border-l border-gray-100 dark:border-slate-700 min-w-[140px]">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">Total Disponible</span>
                                {isSaving && <div className="animate-spin h-3 w-3 border-b-2 border-green-500 rounded-full"></div>}
                            </div>
                            <span className="text-lg font-bold text-green-700 dark:text-green-300 truncate w-full text-right">
                                {formatCurrency(totalAvailable)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">

                {/* --- LEFT COLUMN: LISTA DE COMPROMISOS --- */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col min-h-0 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <CalculatorIcon className="h-5 w-5 text-primary" /> Compromisos de la Semana
                        </h3>
                        <span className="text-xs bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                            {pendingCommitments.length} Pendientes
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {loading ? (
                            <div className="flex justify-center items-center h-40">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : pendingCommitments.length === 0 && paidCommitments.length === 0 ? (
                            <div className="text-center p-10 text-gray-400">
                                No hay compromisos registrados para esta semana.
                            </div>
                        ) : (
                            <>
                                {/* Lista de Pendientes */}
                                {pendingCommitments.map(commitment => {
                                    const isSelected = selectedIds.has(commitment.id);
                                    // Detectar si está vencido (antes de hoy y pendiente)
                                    const isOverdue = isBefore(parseISO(commitment.dueDate), startOfDay(new Date()));

                                    return (
                                        <div
                                            key={commitment.id}
                                            onClick={() => toggleSelection(commitment.id)}
                                            className={`
                                                group relative flex items-center p-4 rounded-lg border transition-all cursor-pointer select-none
                                                ${isSelected
                                                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                                                    : 'bg-white border-gray-100 dark:bg-slate-800 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center h-5">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    readOnly
                                                    className="h-5 w-5 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                                                />
                                            </div>
                                            <div className="ml-4 flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className={`text-sm font-medium ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'}`}>
                                                            {commitment.title}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate">
                                                            {commitment.category} {commitment.providerName ? `• ${commitment.providerName}` : ''}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-sm font-bold font-mono ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                                                            {formatCurrency(commitment.amount)}
                                                        </p>
                                                        <div className="flex items-center justify-end gap-1 text-xs mt-1">
                                                            {isOverdue && (
                                                                <span className="flex items-center text-red-500 font-medium">
                                                                    <ExclamationCircleIcon className="h-3 w-3 mr-1" /> Vencido
                                                                </span>
                                                            )}
                                                            <span className={`${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
                                                                {format(parseISO(commitment.dueDate), 'EEEE d', { locale: es })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Separador si hay historicos */}
                                {paidCommitments.length > 0 && pendingCommitments.length > 0 && (
                                    <div className="relative py-4">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-200 dark:border-slate-700"></div>
                                        </div>
                                        <div className="relative flex justify-center">
                                            <span className="bg-gray-50 dark:bg-slate-900 px-2 text-xs text-gray-400 uppercase tracking-widest">
                                                Ya Pagados
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Lista de Pagados (Visualmente atenuados) */}
                                {paidCommitments.map(commitment => (
                                    <div
                                        key={commitment.id}
                                        className="flex items-center p-4 rounded-lg border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 opacity-60 grayscale hover:grayscale-0 transition-all"
                                    >
                                        <div className="flex items-center h-5">
                                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                        </div>
                                        <div className="ml-4 flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 line-through">
                                                        {commitment.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {commitment.category}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold font-mono text-gray-500">
                                                        {formatCurrency(commitment.amount)}
                                                    </p>
                                                    <span className="text-xs text-green-600 font-medium">Pagado</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* --- RIGHT COLUMN: RESUMEN STICKY --- */}
                <div className="lg:w-96 flex-shrink-0">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 sticky top-6">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">
                            Resumen de Ejecución
                        </h4>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Disponibilidad Inicial</span>
                                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(totalAvailable)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Seleccionado para Pago</span>
                                <span className="font-bold text-red-500">
                                    - {formatCurrency(totalSelected)}
                                </span>
                            </div>
                            <div className="my-2 border-t border-gray-200 dark:border-slate-600 border-dashed"></div>
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-800 dark:text-gray-200">Saldo Final Proyectado</span>
                                <span className={`text-xl font-bold ${isDeficit ? 'text-red-500' : 'text-green-500'}`}>
                                    {formatCurrency(remainingBalance)}
                                </span>
                            </div>
                        </div>

                        {/* Indicador Visual de Presupuesto */}
                        <div className="mb-6">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Uso del Presupuesto</span>
                                <span>{totalAvailable > 0 ? Math.round((totalSelected / totalAvailable) * 100) : 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className={`h-2.5 rounded-full transition-all duration-500 ${isDeficit ? 'bg-red-500' : 'bg-primary'}`}
                                    style={{ width: `${Math.min((totalSelected / (totalAvailable || 1)) * 100, 100)}%` }}
                                ></div>
                            </div>
                            {isDeficit && (
                                <p className="text-xs text-red-500 mt-2 flex items-center">
                                    <ExclamationCircleIcon className="h-3 w-3 mr-1" />
                                    Has excedido tu disponibilidad.
                                </p>
                            )}
                        </div>

                        <button
                            onClick={handleExecute}
                            disabled={selectedIds.size === 0 || isDeficit}
                            className={`
                                w-full py-4 rounded-lg font-bold text-sm shadow-md transition-all flex justify-center items-center gap-2
                                ${selectedIds.size === 0
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500'
                                    : isDeficit
                                        ? 'bg-red-50 text-red-400 cursor-not-allowed border border-red-200'
                                        : 'bg-primary text-white hover:bg-primary-dark hover:shadow-lg transform active:scale-95'
                                }
                            `}
                        >
                            {selectedIds.size === 0
                                ? 'Selecciona pagos...'
                                : `Pagar ${selectedIds.size} Items`
                            }
                        </button>

                        <p className="text-xs text-center text-gray-400 mt-4">
                            Al confirmar, los gastos seleccionados se marcarán como pagados con fecha de hoy.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};
