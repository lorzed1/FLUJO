import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    format,
    startOfWeek,
    endOfWeek,
    addWeeks,
    subWeeks,
    parseISO,
    isBefore,
    startOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
    BanknotesIcon,
    ExclamationCircleIcon,
    ArrowPathIcon,
    CurrencyDollarIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { BudgetCommitment } from '../../../types/budget';
import { budgetService } from '../../../services/budget';
import { useUI } from '../../../context/UIContext';
import { BudgetContextType } from '../layouts/BudgetLayout';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { BudgetHistory } from './BudgetHistory';
import { CurrencyInput } from '../../../components/ui/CurrencyInput';
import { calculateTotalAvailable, isCommitmentOverdue } from '../../../utils/budgetCalculations';

/* ──────────────────────────────────────────────────────────
   BudgetExecutionContent – Vista principal de pagos semanales
   Sigue: Design System Aliaddo (SKILL.md)
   ────────────────────────────────────────────────────────── */

const BudgetExecutionContent: React.FC = () => {
    const { refreshTrigger } = useOutletContext<BudgetContextType>();
    const { setAlertModal } = useUI();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [commitments, setCommitments] = useState<BudgetCommitment[]>([]);
    const [loading, setLoading] = useState(false);

    const [ctaCorriente, setCtaCorriente] = useState<string>('');
    const [ctaAhorrosJ, setCtaAhorrosJ] = useState<string>('');
    const [ctaAhorrosN, setCtaAhorrosN] = useState<string>('');
    const [ctaNequi, setCtaNequi] = useState<string>('');
    const [otrosIngresos, setOtrosIngresos] = useState<string>('');
    const [efectivo, setEfectivo] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
        try {
            const initialStartDate = startOfWeek(new Date(), { weekStartsOn: 1 });
            const key = `budget_selection_${format(initialStartDate, 'yyyy-MM-dd')}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                const ids = JSON.parse(saved);
                return Array.isArray(ids) ? new Set(ids) : new Set();
            }
        } catch (e) { }
        return new Set();
    });

    const startDate = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
    const endDate = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

    /* ── Data Loading ── */
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

                const uniqueCommitments = [...overdueData, ...weekData].reduce((acc, cur) => {
                    if (!acc.find(i => i.id === cur.id)) acc.push(cur);
                    return acc;
                }, [] as BudgetCommitment[]);

                setCommitments(uniqueCommitments);

                const availability = await budgetService.getWeeklyAvailability(startStr);
                if (availability) {
                    setCtaCorriente(availability.ctaCorriente.toString());
                    setCtaAhorrosJ(availability.ctaAhorrosJ.toString());
                    setCtaAhorrosN(availability.ctaAhorrosN.toString());
                    setCtaNequi(availability.ctaNequi?.toString() || '0');
                    setOtrosIngresos(availability.otrosIngresos?.toString() || '0');
                    setEfectivo(availability.efectivo.toString());
                } else {
                    setCtaCorriente(''); setCtaAhorrosJ('');
                    setCtaAhorrosN(''); setCtaNequi(''); setOtrosIngresos(''); setEfectivo('');
                }
            } catch (err) { console.error("Error loading data:", err); }
            finally { setLoading(false); }
        };
        loadData();
    }, [currentDate, refreshTrigger]);

    /* ── Persistent Selection ── */
    const firstRender = React.useRef(true);
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        try {
            const key = `budget_selection_${format(startDate, 'yyyy-MM-dd')}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                const ids = JSON.parse(saved);
                setSelectedIds(Array.isArray(ids) ? new Set(ids) : new Set());
            } else {
                setSelectedIds(new Set());
            }
        } catch (e) { console.error("Error loading saved selection:", e); }
    }, [startDate]);

    const savingEnabled = React.useRef(false);
    useEffect(() => {
        if (savingEnabled.current || !firstRender.current) {
            try {
                localStorage.setItem(
                    `budget_selection_${format(startDate, 'yyyy-MM-dd')}`,
                    JSON.stringify(Array.from(selectedIds))
                );
            } catch (e) { console.error("Error saving selection:", e); }
        }
        savingEnabled.current = true;
    }, [selectedIds, startDate]);

    /* ── Calculations ── */
    const totalAvailable = useMemo(() => {
        return calculateTotalAvailable({
            ctaCorriente, ctaAhorrosJ, ctaAhorrosN,
            ctaNequi, otrosIngresos, efectivo
        });
    }, [ctaCorriente, ctaAhorrosJ, ctaAhorrosN, ctaNequi, otrosIngresos, efectivo]);

    const handleSaveAvailability = async () => {
        setIsSaving(true);
        try {
            await budgetService.saveWeeklyAvailability({
                weekStartDate: format(startDate, 'yyyy-MM-dd'),
                ctaCorriente: parseFloat(ctaCorriente) || 0,
                ctaAhorrosJ: parseFloat(ctaAhorrosJ) || 0,
                ctaAhorrosN: parseFloat(ctaAhorrosN) || 0,
                ctaNequi: parseFloat(ctaNequi) || 0,
                otrosIngresos: parseFloat(otrosIngresos) || 0,
                efectivo: parseFloat(efectivo) || 0,
                totalAvailable
            });
        } catch (err) { console.error("Error saving availability:", err); }
        finally { setIsSaving(false); }
    };

    const totalSelected = useMemo(() => {
        return commitments
            .filter(c => selectedIds.has(c.id) && c.status === 'pending')
            .reduce((sum, c) => sum + c.amount, 0);
    }, [commitments, selectedIds]);

    const remainingBalance = totalAvailable - totalSelected;
    const isDeficit = remainingBalance < 0;

    /* ── Handlers ── */
    const toggleSelection = (id: string, status: string) => {
        if (status !== 'pending') return;
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const handleExecute = () => {
        if (selectedIds.size === 0) return;

        setAlertModal({
            isOpen: true, type: 'info',
            title: 'Confirmar Pagos',
            message: `Vas a registrar el pago de ${selectedIds.size} compromisos por un total de $${totalSelected.toLocaleString('es-CO')}. ¿Confirmar?`,
            showCancel: true, confirmText: 'Ejecutar Pagos',
            onConfirm: async () => {
                setAlertModal({ isOpen: false, message: '' });
                await handleSaveAvailability();
                try {
                    const promises = Array.from(selectedIds).map(async (id) => {
                        const c = commitments.find(x => x.id === id);
                        if (!c || c.status !== 'pending') return;
                        if (id.startsWith('projected-')) {
                            return budgetService.addCommitment({
                                title: c.title.replace(' (Proyectado)', ''),
                                amount: c.amount, dueDate: c.dueDate,
                                status: 'paid', category: c.category,
                                recurrenceRuleId: c.recurrenceRuleId,
                                paidDate: format(new Date(), 'yyyy-MM-dd'),
                                description: c.description
                            });
                        }
                        return budgetService.updateCommitment(id, {
                            status: 'paid', paidDate: format(new Date(), 'yyyy-MM-dd')
                        });
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
                            ctaNequi: parseFloat(ctaNequi) || 0,
                            otrosIngresos: parseFloat(otrosIngresos) || 0,
                            efectivo: parseFloat(efectivo) || 0,
                            totalAvailable
                        },
                        totalPaid: totalSelected,
                        finalBalance: remainingBalance,
                        itemsCount: selectedIds.size
                    });

                    setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Pagos registrados y snapshot guardado.' });
                    localStorage.removeItem(`budget_selection_${startStr}`);
                    setSelectedIds(new Set());

                    // Resetear los datos
                    setCtaCorriente('');
                    setCtaAhorrosJ('');
                    setCtaAhorrosN('');
                    setCtaNequi('');
                    setOtrosIngresos('');
                    setEfectivo('');

                    const endStr = format(endDate, 'yyyy-MM-dd');
                    const [w, o] = await Promise.all([
                        budgetService.getCommitments(startStr, endStr),
                        budgetService.getOverduePendingCommitments(startStr)
                    ]);
                    setCommitments([...o, ...w].reduce((acc, cur) => {
                        if (!acc.find(i => i.id === cur.id)) acc.push(cur);
                        return acc;
                    }, [] as BudgetCommitment[]));
                } catch (err) {
                    console.error("Error executing payments:", err);
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Hubo un problema al registrar los pagos.' });
                }
            }
        });
    };

    const fmt = (n: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

    const sorted = useMemo(() => [...commitments].sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [commitments]);
    const pending = sorted.filter(c => c.status === 'pending');
    const paid = sorted.filter(c => c.status === 'paid');
    const overdue = pending.filter(c => isCommitmentOverdue(c.status, c.dueDate));
    const upcoming = pending.filter(c => !isCommitmentOverdue(c.status, c.dueDate));

    /* ════════════════════════════════════════════════════════
       RENDER – Aliaddo Design System
       ════════════════════════════════════════════════════════ */
    return (
        <div className="flex flex-col h-full space-y-4">
            {/* ── Week Navigator (Zona A-inline para sub-contenido) ── */}
            <div className="flex items-center justify-end">
                <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm h-10">
                    <button
                        onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
                        className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-purple-600 transition-colors"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="px-3 text-center min-w-[140px]">
                        <span className="block text-[10px] text-purple-500 uppercase font-bold tracking-widest leading-tight">Semana</span>
                        <span className="text-[13px] font-bold text-slate-800 dark:text-white">
                            {format(startDate, 'd MMM', { locale: es })} — {format(endDate, 'd MMM', { locale: es })}
                        </span>
                    </div>
                    <button
                        onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
                        className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-purple-600 transition-colors"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Disponibilidad (Tank) ─ Card Aliaddo ── */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
                    <div>
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Cta Corriente</label>
                        <CurrencyInput value={ctaCorriente} onChange={val => setCtaCorriente(val.toString())} onBlur={handleSaveAvailability} placeholder="0" />
                    </div>
                    <div>
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Cta Ahorros J</label>
                        <CurrencyInput value={ctaAhorrosJ} onChange={val => setCtaAhorrosJ(val.toString())} onBlur={handleSaveAvailability} placeholder="0" />
                    </div>
                    <div>
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Cta Ahorros N</label>
                        <CurrencyInput value={ctaAhorrosN} onChange={val => setCtaAhorrosN(val.toString())} onBlur={handleSaveAvailability} placeholder="0" />
                    </div>
                    <div>
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Cta Nequi</label>
                        <CurrencyInput value={ctaNequi} onChange={val => setCtaNequi(val.toString())} onBlur={handleSaveAvailability} placeholder="0" />
                    </div>
                    <div>
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Otros Ingresos</label>
                        <CurrencyInput value={otrosIngresos} onChange={val => setOtrosIngresos(val.toString())} onBlur={handleSaveAvailability} placeholder="0" />
                    </div>
                    <div>
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Efectivo</label>
                        <CurrencyInput value={efectivo} onChange={val => setEfectivo(val.toString())} onBlur={handleSaveAvailability} placeholder="0" />
                    </div>
                    {/* Total disponible - inline summary */}
                    <div className="flex items-center justify-center md:justify-end gap-2 py-1">
                        {isSaving && <ArrowPathIcon className="animate-spin h-3.5 w-3.5 text-purple-600" />}
                        <div className="text-right">
                            <span className="block text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Disponible</span>
                            <span className="text-lg font-bold text-emerald-600 font-mono tracking-tight">{fmt(totalAvailable)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Content: Table (2/3) + Summary Panel (1/3) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">

                {/* ── Tabla de Compromisos ── */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col">
                    {/* Card Header (Section 5 / Aliaddo) */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800 dark:text-white">
                            Compromisos Pendientes
                        </h3>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-[11px] font-medium text-gray-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            {pending.length} por pagar
                        </span>
                    </div>

                    {/* Table (Section 6 / Aliaddo) */}
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 py-3 px-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 w-10"></th>
                                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 py-3 px-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">Concepto</th>
                                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 py-3 px-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">Categoría</th>
                                    <th className="text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 py-3 px-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">Vencimiento</th>
                                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 py-3 px-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">Monto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                                                <span className="text-xs text-gray-400">Cargando compromisos...</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {!loading && pending.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center text-sm text-gray-400">
                                            No hay compromisos pendientes para esta semana.
                                        </td>
                                    </tr>
                                )}

                                {!loading && [...overdue, ...upcoming].map(c => {
                                    const sel = selectedIds.has(c.id);
                                    const late = isBefore(parseISO(c.dueDate), startOfDay(new Date()));
                                    return (
                                        <tr
                                            key={c.id}
                                            onClick={() => toggleSelection(c.id, c.status)}
                                            className={`
                                                cursor-pointer transition-colors border-b border-gray-50 dark:border-slate-800
                                                ${sel
                                                    ? 'bg-purple-50/70 dark:bg-purple-900/10 hover:bg-purple-50 dark:hover:bg-purple-900/15'
                                                    : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                                                }
                                            `}
                                        >
                                            {/* Checkbox */}
                                            <td className="px-4 py-3.5">
                                                <div className={`
                                                    h-4 w-4 rounded border flex items-center justify-center transition-colors
                                                    ${sel ? 'bg-purple-600 border-purple-600' : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900'}
                                                `}>
                                                    {sel && (
                                                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Concepto */}
                                            <td className="px-4 py-3.5">
                                                <span className={`text-[13px] font-medium ${sel ? 'text-purple-800' : 'text-gray-900 dark:text-white'}`}>
                                                    {c.title}
                                                </span>
                                            </td>
                                            {/* Categoría */}
                                            <td className="px-4 py-3.5 text-[13px] text-gray-600 dark:text-gray-400">
                                                {c.category}
                                            </td>
                                            {/* Vencimiento */}
                                            <td className="px-4 py-3.5 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {late && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-white text-[10px] font-semibold border-red-200 text-red-600">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                            Vencido
                                                        </span>
                                                    )}
                                                    <span className={`text-[13px] font-medium ${late ? 'text-red-500' : 'text-gray-600'}`}>
                                                        {format(parseISO(c.dueDate), 'EEE d MMM', { locale: es })}
                                                    </span>
                                                </div>
                                            </td>
                                            {/* Monto */}
                                            <td className="px-4 py-3.5 text-right">
                                                <span className={`text-[13px] font-bold ${sel ? 'text-purple-700' : 'text-gray-900 dark:text-white'}`}>
                                                    {fmt(c.amount)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* ── Separador Pagados ── */}
                                {!loading && paid.length > 0 && (
                                    <>
                                        <tr>
                                            <td colSpan={5} className="py-2 px-4 bg-gray-50/30 dark:bg-slate-900/20 text-[10px] uppercase font-bold text-gray-400 tracking-[0.15em] border-y border-gray-100 dark:border-slate-700/50">
                                                Historial Semanal (Pagados)
                                            </td>
                                        </tr>
                                        {paid.map(c => (
                                            <tr key={c.id} className="bg-white dark:bg-slate-800 opacity-50 hover:opacity-80 transition-opacity border-b border-gray-50">
                                                <td className="px-4 py-3">
                                                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                                </td>
                                                <td className="px-4 py-3 text-[13px] font-medium text-gray-500 line-through">{c.title}</td>
                                                <td className="px-4 py-3 text-[13px] text-gray-400">{c.category}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-[10px] text-green-600 font-bold uppercase tracking-tighter">Liquidado</span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-[13px] font-bold text-gray-400">{fmt(c.amount)}</td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Panel Resumen (Sticky) ── */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-6 flex items-center gap-2">
                            <CurrencyDollarIcon className="h-4 w-4" />
                            Resumen de Operación
                        </h4>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center text-[13px]">
                                <span className="text-gray-500 font-medium">Disponible esta semana</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{fmt(totalAvailable)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[13px]">
                                <span className="text-gray-500 font-medium">Seleccionado para pagar</span>
                                <span className="font-bold text-red-500">− {fmt(totalSelected)}</span>
                            </div>
                            <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                                <div className="flex justify-between items-end">
                                    <span className="text-[12px] font-bold text-gray-800 dark:text-gray-200 uppercase">Balance Residual</span>
                                    <span className={`text-2xl font-bold font-mono tracking-tighter ${isDeficit ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {fmt(remainingBalance)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Progreso */}
                        <div className="mb-6">
                            <div className="flex justify-between text-[11px] mb-2 font-bold uppercase tracking-wider">
                                <span className="text-gray-400">Uso de recursos</span>
                                <span className={isDeficit ? 'text-red-500' : 'text-purple-600'}>
                                    {totalAvailable > 0 ? Math.round((totalSelected / totalAvailable) * 100) : 0}%
                                </span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-700 rounded-full ${isDeficit ? 'bg-red-500' : 'bg-purple-600'}`}
                                    style={{ width: `${Math.min((totalSelected / (totalAvailable || 1)) * 100, 100)}%` }}
                                />
                            </div>

                            {isDeficit && (
                                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg flex items-start gap-2 border border-red-100 dark:border-red-900/20">
                                    <ExclamationCircleIcon className="h-5 w-5 text-red-500 shrink-0" />
                                    <p className="text-[11px] text-red-600 dark:text-red-400 font-medium leading-relaxed">
                                        Los pagos seleccionados superan tu liquidez disponible por <strong>{fmt(Math.abs(remainingBalance))}</strong>.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Primary Action – Aliaddo §5 Zona C */}
                        <Button
                            variant="primary"
                            onClick={handleExecute}
                            disabled={selectedIds.size === 0 || isDeficit}
                            className="w-full"
                        >
                            {selectedIds.size === 0
                                ? 'Seleccionar para pagar'
                                : `Ejecutar ${selectedIds.size} Pagos (${fmt(totalSelected)})`
                            }
                        </Button>

                        <p className="text-[11px] text-center text-gray-400 mt-4 leading-relaxed italic">
                            Al confirmar, los registros se actualizarán en el historial permanente.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════════════════
   BudgetExecution – Wrapper con Tabs en PageHeader Actions
   Design System §5: Sub-Navigation en el área de Actions
   ══════════════════════════════════════════════════════════ */
export const BudgetExecution: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'execution' | 'history'>('execution');

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* PageHeader con ZONA A: Segmented Control + Week Nav (§5) */}
            <PageHeader
                title="Ejecución Presupuestal"
                breadcrumbs={[
                    { label: 'Egresos', path: '/budget' },
                    { label: 'Pagos Semanales' }
                ]}
                icon={<BanknotesIcon className="h-6 w-6" />}
                actions={
                    <div className="flex items-center gap-2 h-10">
                        {/* Segmented Control – Aliaddo §4 */}
                        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm overflow-hidden h-full">
                            <button
                                onClick={() => setActiveTab('execution')}
                                className={`
                                    flex items-center justify-center px-4 h-full text-[13px] font-semibold transition-colors border-r border-slate-200 dark:border-slate-700
                                    ${activeTab === 'execution'
                                        ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                        : 'bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700'
                                    }
                                `}
                            >
                                Pagos Semanal
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`
                                    flex items-center justify-center px-4 h-full text-[13px] font-semibold transition-colors
                                    ${activeTab === 'history'
                                        ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                        : 'bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700'
                                    }
                                `}
                            >
                                Historial de Pagos
                            </button>
                        </div>
                    </div>
                }
            />

            {/* Content */}
            <div className="flex-1 overflow-hidden h-full">
                {activeTab === 'execution' ? <BudgetExecutionContent /> : <BudgetHistory hideHeader={false} />}
            </div>
        </div>
    );
};
