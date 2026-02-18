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
    ExclamationCircleIcon,
    ArrowPathIcon,
    CreditCardIcon,
    WalletIcon
} from '@heroicons/react/24/outline';
import { BudgetCommitment } from '../../../types/budget';
import { budgetService } from '../../../services/budget';
import { useUI } from '../../../context/UIContext';
import { BudgetContextType } from '../layouts/BudgetLayout';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { CurrencyInput } from '../../../components/ui/CurrencyInput';

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

                const [weekData, overdueData] = await Promise.all([
                    budgetService.getCommitments(startStr, endStr),
                    budgetService.getOverduePendingCommitments(startStr)
                ]);

                setCommitments([...overdueData, ...weekData]);

                const availability = await budgetService.getWeeklyAvailability(startStr);
                if (availability) {
                    setCtaCorriente(availability.ctaCorriente.toString());
                    setCtaAhorrosJ(availability.ctaAhorrosJ.toString());
                    setCtaAhorrosN(availability.ctaAhorrosN.toString());
                    setEfectivo(availability.efectivo.toString());
                } else {
                    setCtaCorriente('');
                    setCtaAhorrosJ('');
                    setCtaAhorrosN('');
                    setEfectivo('');
                }
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
                setAlertModal({ isOpen: false, message: '' });

                await handleSaveAvailability();

                try {
                    const promises = Array.from(selectedIds).map(async (id) => {
                        const commitment = commitments.find(c => c.id === id);
                        if (!commitment) return;

                        if (id.startsWith('projected-')) {
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
                            return budgetService.updateCommitment(id, {
                                status: 'paid',
                                paidDate: format(new Date(), 'yyyy-MM-dd')
                            });
                        }
                    });

                    await Promise.all(promises);

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

                    localStorage.removeItem(`budget_selection_${startStr}`);

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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const activeCommitments = useMemo(() => {
        return commitments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }, [commitments]);

    const pendingCommitments = activeCommitments.filter(c => c.status === 'pending');
    const paidCommitments = activeCommitments.filter(c => c.status === 'paid');

    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title="Ejecución de Presupuesto"
                breadcrumbs={[
                    { label: 'Finanzas', path: '/budget' },
                    { label: 'Ejecución' }
                ]}
                icon={<BanknotesIcon className="h-6 w-6" />}
                actions={
                    <div className="flex items-center bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                        <Button
                            variant="secondary"
                            className="!h-8 !p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
                            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </Button>
                        <div className="px-4 text-center min-w-[160px]">
                            <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider leading-tight">Semana</span>
                            <span className="text-[13px] font-semibold text-gray-900 dark:text-white">
                                {format(startDate, 'dd MMM', { locale: es })} — {format(endDate, 'dd MMM', { locale: es })}
                            </span>
                        </div>
                        <Button
                            variant="secondary"
                            className="!h-8 !p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
                            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </Button>
                    </div>
                }
            />

            <div className="space-y-6">
                {/* --- SECCIÓN 1: DISPONIBILIDAD (TANK) --- */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5 sm:p-6 transition-all">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1 w-full">
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Cta Corriente</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <CreditCardIcon className="h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <Input
                                        type="number"
                                        value={ctaCorriente}
                                        onChange={(e) => setCtaCorriente(e.target.value)}
                                        onBlur={handleSaveAvailability}
                                        className="!pl-9 !h-10 font-medium !text-gray-900 dark:!text-white"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Cta Ahorros J</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <BuildingLibraryIcon className="h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <Input
                                        type="number"
                                        value={ctaAhorrosJ}
                                        onChange={(e) => setCtaAhorrosJ(e.target.value)}
                                        onBlur={handleSaveAvailability}
                                        className="!pl-9 !h-10 font-medium !text-gray-900 dark:!text-white"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Cta Ahorros N</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <BuildingLibraryIcon className="h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <Input
                                        type="number"
                                        value={ctaAhorrosN}
                                        onChange={(e) => setCtaAhorrosN(e.target.value)}
                                        onBlur={handleSaveAvailability}
                                        className="!pl-9 !h-10 font-medium !text-gray-900 dark:!text-white"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Efectivo</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <WalletIcon className="h-4 w-4 text-gray-300 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <Input
                                        type="number"
                                        value={efectivo}
                                        onChange={(e) => setEfectivo(e.target.value)}
                                        onBlur={handleSaveAvailability}
                                        className="!pl-9 !h-10 font-medium !text-gray-900 dark:!text-white"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center md:items-end justify-center px-6 py-2 border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-700 min-w-[200px] w-full md:w-auto">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] text-green-600 dark:text-green-400 font-bold uppercase tracking-widest">Total Disponible</span>
                                {isSaving && <ArrowPathIcon className="animate-spin h-3.5 w-3.5 text-green-500" />}
                            </div>
                            <span className="text-2xl font-bold text-green-600 dark:text-green-400 font-sans tracking-tight">
                                {totalAvailable.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* --- COLUMNA IZQUIERDA: LISTADO --- */}
                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <CalculatorIcon className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold text-gray-900 dark:text-white text-[15px]">Compromisos Pendientes</h3>
                            </div>
                            <span className="text-[11px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 px-2.5 py-1 rounded-full uppercase tracking-tighter">
                                {pendingCommitments.length} por pagar
                            </span>
                        </div>

                        <div className="p-2 overflow-y-auto max-h-[600px] divide-y divide-gray-50 dark:divide-slate-700/50">
                            {loading ? (
                                <div className="flex flex-col justify-center items-center h-48 gap-3">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    <span className="text-xs text-gray-400 font-medium">Cargando compromisos...</span>
                                </div>
                            ) : pendingCommitments.length === 0 && paidCommitments.length === 0 ? (
                                <div className="flex flex-col justify-center items-center h-48 text-gray-400">
                                    <span className="text-sm">No se encontraron registros para esta semana.</span>
                                </div>
                            ) : (
                                <>
                                    {pendingCommitments.map(commitment => {
                                        const isSelected = selectedIds.has(commitment.id);
                                        const isOverdue = isBefore(parseISO(commitment.dueDate), startOfDay(new Date()));

                                        return (
                                            <div
                                                key={commitment.id}
                                                onClick={() => toggleSelection(commitment.id)}
                                                className={`
                                                    group flex items-center p-4 cursor-pointer transition-all border-l-4
                                                    ${isSelected
                                                        ? 'bg-blue-50/70 dark:bg-blue-900/10 border-blue-500'
                                                        : isOverdue
                                                            ? 'bg-red-50/30 dark:bg-red-900/5 border-red-400 hover:bg-red-50/50'
                                                            : 'bg-white dark:bg-slate-800 border-transparent hover:bg-gray-50 dark:hover:bg-slate-700/50'
                                                    }
                                                `}
                                            >
                                                <div className={`
                                                    flex items-center justify-center h-5 w-5 rounded border transition-all
                                                    ${isSelected
                                                        ? 'bg-blue-600 border-blue-600'
                                                        : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                                    }
                                                `}>
                                                    {isSelected && <CheckCircleIcon className="h-4 w-4 text-white" />}
                                                </div>

                                                <div className="ml-4 flex-1">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className={`text-[14px] font-semibold tracking-tight ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                                                                {commitment.title}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[11px] text-gray-400 font-medium">{commitment.category}</span>
                                                                {isOverdue && (
                                                                    <span className="flex items-center text-[10px] text-red-500 font-bold uppercase tracking-tighter">
                                                                        <ExclamationCircleIcon className="h-3 w-3 mr-0.5" /> Vencido
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`text-[15px] font-bold ${isSelected ? 'text-blue-800 dark:text-blue-200' : 'text-gray-900 dark:text-white'}`}>
                                                                {formatCurrency(commitment.amount)}
                                                            </p>
                                                            <p className={`text-[11px] font-medium mt-0.5 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                                                                {format(parseISO(commitment.dueDate), 'EEE d MMM', { locale: es }).toUpperCase()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {paidCommitments.length > 0 && (
                                        <div className="py-2 px-5 bg-gray-50/30 dark:bg-slate-900/20 text-[10px] uppercase font-bold text-gray-400 tracking-[0.2em] border-y border-gray-100 dark:border-slate-700/50">
                                            Historial Semanal (Pagados)
                                        </div>
                                    )}

                                    {paidCommitments.map(commitment => (
                                        <div key={commitment.id} className="flex items-center p-4 bg-white dark:bg-slate-800 opacity-50 grayscale hover:grayscale-0 transition-all">
                                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                            <div className="ml-4 flex-1">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 line-through tracking-tight">
                                                            {commitment.title}
                                                        </p>
                                                        <p className="text-[11px] text-gray-400">{commitment.category}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[13px] font-bold text-gray-400">{formatCurrency(commitment.amount)}</p>
                                                        <span className="text-[10px] text-green-600 font-bold uppercase tracking-tighter">Liquidado</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* --- BARRA LATERAL: RESUMEN --- */}
                    <div className="lg:w-96">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 sticky top-6">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-6">Resumen de Operación</h4>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-gray-500 font-medium">Disponible para esta semana</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totalAvailable)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-gray-500 font-medium">Compromisos seleccionados</span>
                                    <span className="font-bold text-red-500">− {formatCurrency(totalSelected)}</span>
                                </div>
                                <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[12px] font-bold text-gray-800 dark:text-gray-200 uppercase">Balance Residual</span>
                                        <span className={`text-2xl font-bold font-sans tracking-tighter ${isDeficit ? 'text-red-600' : 'text-green-600'}`}>
                                            {formatCurrency(remainingBalance)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Progreso de Disponibilidad */}
                            <div className="mb-8">
                                <div className="flex justify-between text-[11px] mb-2 font-bold uppercase tracking-wider">
                                    <span className="text-gray-400">Uso de recursos</span>
                                    <span className={isDeficit ? 'text-red-500' : 'text-primary'}>
                                        {totalAvailable > 0 ? Math.round((totalSelected / totalAvailable) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-700 rounded-full ${isDeficit ? 'bg-red-500' : 'bg-primary'}`}
                                        style={{ width: `${Math.min((totalSelected / (totalAvailable || 1)) * 100, 100)}%` }}
                                    />
                                </div>
                                {isDeficit && (
                                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg flex items-start gap-2 border border-red-100 dark:border-red-900/20">
                                        <ExclamationCircleIcon className="h-5 w-5 text-red-500 shrink-0" />
                                        <p className="text-[11px] text-red-600 dark:text-red-400 font-medium leading-relaxed">
                                            ALERTA: Los pagos seleccionados superan tu liquidez disponible.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <Button
                                variant="primary"
                                onClick={handleExecute}
                                disabled={selectedIds.size === 0 || isDeficit}
                                className={`w-full !py-6 !rounded-xl !text-sm font-bold shadow-indigo-200 dark:shadow-none transition-all
                                    ${selectedIds.size === 0 || isDeficit ? 'grayscale opacity-80' : 'hover:scale-[1.02] active:scale-[0.98]'}
                                `}
                            >
                                {selectedIds.size === 0
                                    ? 'Seleccionar para pagar'
                                    : `Ejecutar ${selectedIds.size} Pagos (${formatCurrency(totalSelected)})`
                                }
                            </Button>

                            <p className="text-[11px] text-center text-gray-400 mt-5 leading-relaxed italic">
                                Al confirmar, los registros se actualizarán permanentemente en el historial.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
