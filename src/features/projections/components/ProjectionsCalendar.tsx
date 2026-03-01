import React, { useState, useMemo } from 'react';
import {
    format, startOfMonth, endOfMonth, eachDayOfInterval,
    startOfWeek, endOfWeek, isSameMonth, isToday, parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { SalesEvent, SalesProjection } from '../../../types';
import { ProjectionResult } from '../../../utils/projections';
import { XMarkIcon, PlusIcon, TrashIcon, CalendarIcon } from '../../../components/ui/Icons';

// ─── Categorías de eventos ────────────────────────────────────────────────────
type EventCategory = 'quincenal' | 'festivo' | 'musica' | 'evento_especial' | 'cierre' | 'otro';

interface EventCategoryConfig {
    label: string;
    dotColor: string;       // Color del punto indicador
    badgeBg: string;        // Fondo del badge en la celda
    badgeText: string;      // Texto del badge
    badgeBorder: string;
    buttonActive: string;   // Estilo botón activo en el form
    defaultImpact: number;
    defaultType: 'boost' | 'drag' | 'neutral';
}

const EVENT_CATEGORIES: Record<EventCategory, EventCategoryConfig> = {
    quincenal: {
        label: 'Quincenal',
        dotColor: 'bg-amber-400',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-700',
        badgeBorder: 'border-amber-200',
        buttonActive: 'border-amber-400 bg-amber-50 text-amber-700',
        defaultImpact: 15,
        defaultType: 'boost'
    },
    festivo: {
        label: 'Festivo',
        dotColor: 'bg-red-400',
        badgeBg: 'bg-red-50',
        badgeText: 'text-red-700',
        badgeBorder: 'border-red-200',
        buttonActive: 'border-red-400 bg-red-50 text-red-700',
        defaultImpact: 20,
        defaultType: 'boost'
    },
    musica: {
        label: 'Música en Vivo',
        dotColor: 'bg-purple-400',
        badgeBg: 'bg-purple-50',
        badgeText: 'text-purple-700',
        badgeBorder: 'border-purple-200',
        buttonActive: 'border-purple-500 bg-purple-50 text-purple-700',
        defaultImpact: 18,
        defaultType: 'boost'
    },
    evento_especial: {
        label: 'Evento Especial',
        dotColor: 'bg-orange-400',
        badgeBg: 'bg-orange-50',
        badgeText: 'text-orange-700',
        badgeBorder: 'border-orange-200',
        buttonActive: 'border-orange-400 bg-orange-50 text-orange-700',
        defaultImpact: 25,
        defaultType: 'boost'
    },
    cierre: {
        label: 'Cierre',
        dotColor: 'bg-gray-400',
        badgeBg: 'bg-gray-100',
        badgeText: 'text-gray-600',
        badgeBorder: 'border-gray-300',
        buttonActive: 'border-gray-400 bg-gray-100 text-gray-700',
        defaultImpact: 0,
        defaultType: 'drag'
    },
    otro: {
        label: 'Otro',
        dotColor: 'bg-blue-400',
        badgeBg: 'bg-blue-50',
        badgeText: 'text-blue-700',
        badgeBorder: 'border-blue-200',
        buttonActive: 'border-blue-400 bg-blue-50 text-blue-700',
        defaultImpact: 10,
        defaultType: 'neutral'
    }
};

function detectCategory(name: string, type: string): EventCategory {
    const n = name.toLowerCase();
    if (n.includes('quincena')) return 'quincenal';
    if (n.includes('festivo') || n.includes('feriado') || n.includes('holiday')) return 'festivo';
    if (n.includes('música') || n.includes('musica') || n.includes('live') || n.includes('vivo')) return 'musica';
    if (n.includes('cierre') || n.includes('cerrado') || type === 'drag') return 'cierre';
    if (n.includes('especial') || n.includes('lanzamiento') || n.includes('show')) return 'evento_especial';
    return 'otro';
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ProjectionsCalendarProps {
    currentDate: Date;
    events: SalesEvent[];
    calculatedProjections: Record<string, ProjectionResult>;
    financialProjections?: Record<string, number>; // Nuevo: Metas basadas en gastos Punto de Equilibrio
    storedProjections: Record<string, SalesProjection>;
    realSales: Record<string, number>;
    loading: boolean;
    onAddEvent: (event: Omit<SalesEvent, 'id'>) => Promise<void>;
    onDeleteEvent: (id: string) => Promise<void>;
}

const fmt = (v: number) =>
    v > 0 ? `$${Math.round(v).toLocaleString('es-CO')}` : '$0';

// ─── Componente ───────────────────────────────────────────────────────────────
export const ProjectionsCalendar: React.FC<ProjectionsCalendarProps> = ({
    currentDate,
    events,
    calculatedProjections,
    financialProjections = {},
    storedProjections,
    realSales,
    loading,
    onAddEvent,
    onDeleteEvent
}) => {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [showFinancial, setShowFinancial] = useState(true);

    // Estado del formulario
    const [formCategory, setFormCategory] = useState<EventCategory>('quincenal');
    const [formName, setFormName] = useState('');
    const [formImpact, setFormImpact] = useState(15);
    const [saving, setSaving] = useState(false);

    // Mapa de eventos por fecha
    const eventsByDate = useMemo(() => {
        const map: Record<string, SalesEvent[]> = {};
        events.forEach(ev => {
            if (!map[ev.date]) map[ev.date] = [];
            map[ev.date].push(ev);
        });
        return map;
    }, [events]);

    // Días del calendario (semanas completas)
    const calendarDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    const openModal = (dateStr: string) => {
        setSelectedDate(dateStr);
        setModalOpen(true);
        const cfg = EVENT_CATEGORIES['quincenal'];
        setFormCategory('quincenal');
        setFormName('');
        setFormImpact(cfg.defaultImpact);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedDate(null);
    };

    const handleCategoryChange = (cat: EventCategory) => {
        setFormCategory(cat);
        setFormImpact(EVENT_CATEGORIES[cat].defaultImpact);
        setFormName('');
    };

    const handleSaveEvent = async () => {
        if (!selectedDate || !formName.trim()) return;
        setSaving(true);
        const cfg = EVENT_CATEGORIES[formCategory];
        const impactFactor = formCategory === 'cierre' ? 0 : 1 + (formImpact / 100);
        try {
            await onAddEvent({
                date: selectedDate,
                name: formName.trim(),
                type: cfg.defaultType,
                impactFactor,
                isRecurring: false
            });
            setFormName('');
            setFormImpact(cfg.defaultImpact);
        } finally {
            setSaving(false);
        }
    };

    // Datos del día seleccionado
    const selectedProjection = selectedDate ? calculatedProjections[selectedDate] : null;
    const selectedFinancial = selectedDate ? (financialProjections[selectedDate] || 0) : 0;
    const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];
    const selectedReal = selectedDate ? (realSales[selectedDate] || 0) : 0;

    const selectedIsClosed = selectedEvents.some(e => detectCategory(e.name, e.type) === 'cierre');
    const selectedStored = selectedDate ? storedProjections[selectedDate] : null;
    const selectedFinal = selectedIsClosed ? 0 : (selectedStored?.amountAdjusted ?? selectedProjection?.final ?? 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-7 w-7 border-4 border-gray-100 border-t-purple-600" />
                    <span className="text-[13px] text-purple-600 font-semibold">Calculando proyecciones...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* ── Grilla del calendario ─────────────────────────────────── */}
            <div className="flex flex-col h-full min-h-0">

                {/* Sub-Toolbar superior del calendario para Toggles — Aliaddo §4 Z1 */}
                <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${showFinancial ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={showFinancial}
                                    onChange={() => setShowFinancial(!showFinancial)}
                                />
                                <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform shadow-sm ${showFinancial ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-purple-600 transition-colors uppercase tracking-[0.1em]">Punto de Equilibrio</span>
                        </label>

                        {/* Leyenda Visual Minimalista — Aliaddo Premium §1 */}
                        <div className="hidden sm:flex items-center gap-4 border-l border-slate-100 dark:border-slate-700 pl-6">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Estadística</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-200/60" />
                                <span className="text-[9px] font-bold text-purple-400 uppercase tracking-tighter">Meta PE</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Venta Real</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Cabecera días de la semana */}
                <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                        <div key={d} className="py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Celdas */}
                <div className="flex-1 overflow-auto">
                    <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
                        {calendarDays.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const inMonth = isSameMonth(day, currentDate);
                            const today = isToday(day);
                            const dayEvents = eventsByDate[dateStr] || [];
                            const proj = calculatedProjections[dateStr];
                            const finProj = financialProjections[dateStr] || 0;
                            const stored = storedProjections[dateStr];
                            const real = realSales[dateStr];
                            const baseSale = proj?.rawAverage ?? 0;
                            const isClosed = dayEvents.some(e => detectCategory(e.name, e.type) === 'cierre');
                            // Si está cerrado, la meta es 0. Si no, usamos el valor ajustado manual o el del sistema.
                            const finalSale = isClosed ? 0 : (stored?.amountAdjusted ?? proj?.final ?? 0);
                            const isSelected = selectedDate === dateStr && modalOpen;
                            const targetSale = (showFinancial && finProj > 0) ? finProj : finalSale;
                            const isSuccess = real > 0 && real >= targetSale;
                            const progressPercent = targetSale > 0 ? Math.min(100, Math.round((real / targetSale) * 100)) : (real > 0 ? 100 : 0);

                            return (
                                <div
                                    key={dateStr}
                                    onClick={() => inMonth && openModal(dateStr)}
                                    className={`
                                        min-h-[110px] p-2.5 group relative transition-all duration-300
                                        ${inMonth ? 'cursor-pointer' : 'cursor-default'}
                                        ${!inMonth ? 'bg-slate-50/50 dark:bg-slate-900/50 opacity-40' : 'bg-white dark:bg-slate-800/50'}
                                        ${isClosed && inMonth ? 'bg-slate-50 dark:bg-slate-900/30' : ''}
                                        ${isSelected ? 'bg-purple-50/40 dark:bg-purple-900/10 ring-2 ring-inset ring-purple-400/30' : inMonth ? 'hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:bg-white dark:hover:bg-slate-700/30 hover:z-10' : ''}
                                        ${today && !isSelected ? '!bg-purple-50/20 dark:!bg-purple-900/10' : ''}
                                    `}
                                >
                                    {/* Número del día */}
                                    <div className="flex items-start justify-between mb-2">
                                        <span className={`
                                            text-[13px] font-bold leading-none w-6 h-6 flex items-center justify-center rounded-lg transition-all
                                            ${today
                                                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                                : inMonth ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'
                                            }
                                        `}>
                                            {format(day, 'd')}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-0.5 mt-auto relative z-10">
                                        {/* Valor Histórico / Estadística — Aliaddo Premium §1 */}
                                        {inMonth && (baseSale > 0 || isClosed) && (
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="text-slate-400 font-medium tabular-nums flex items-center gap-1">
                                                    <span>{fmt(finalSale)}</span>
                                                    <span className="text-[8px] text-slate-300 dark:text-slate-500 font-normal tracking-wide">(Est.)</span>
                                                </span>
                                            </div>
                                        )}

                                        {/* Meta Financiera (PE) — Aliaddo Premium §1 */}
                                        {inMonth && showFinancial && finProj > 0 && (
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="text-purple-600/70 dark:text-purple-400/70 font-bold tabular-nums flex items-center gap-1">
                                                    <span>{fmt(finProj)}</span>
                                                    <span className="text-[8px] text-purple-300 dark:text-purple-500/50 font-normal tracking-wide">(PE)</span>
                                                </span>
                                            </div>
                                        )}

                                        {/* Venta Real — Protagonista con color semántico calibrado */}
                                        {inMonth && real > 0 && (
                                            <div className="mt-1 pt-1.5 border-t border-slate-50 dark:border-slate-800/50 relative">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-[12px] font-black tabular-nums block leading-none ${isSuccess
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-rose-500 dark:text-rose-400'
                                                        }`}>
                                                        {fmt(real)}
                                                    </span>
                                                    {!isSuccess && targetSale > 0 && (
                                                        <span className="text-[8px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/30 px-1 py-0.5 rounded flex items-center gap-0.5 leading-none">
                                                            <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                                            {100 - progressPercent}%
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="w-full h-1 bg-slate-100 dark:bg-slate-700/50 rounded-full mt-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${isSuccess ? 'bg-emerald-400 dark:bg-emerald-500' : 'bg-rose-400 dark:bg-rose-500'}`}
                                                        style={{ width: `${progressPercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Cierre */}
                                    {isClosed && inMonth && (
                                        <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-gray-400 animate-pulse" />
                                    )}

                                    {/* Badges de eventos — estilo Dot */}
                                    {inMonth && !isClosed && dayEvents.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-auto pt-2">
                                            {dayEvents.slice(0, 2).map(ev => {
                                                const cat = detectCategory(ev.name, ev.type);
                                                const cfg = EVENT_CATEGORIES[cat];
                                                return (
                                                    <span
                                                        key={ev.id}
                                                        className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none uppercase tracking-tighter ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} truncate max-w-full`}
                                                        title={ev.name}
                                                    >
                                                        <span className="truncate">{ev.name}</span>
                                                    </span>
                                                );
                                            })}
                                            {dayEvents.length > 2 && (
                                                <span className="text-[9px] text-slate-400 font-bold">
                                                    +{dayEvents.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Modal Aliaddo ─────────────────────────────────────────── */}
            {modalOpen && selectedDate && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
                    onClick={closeModal}
                >
                    <div
                        className="bg-white rounded-lg shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header – Aliaddo Premium Style */}
                        <div className="bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-50 dark:bg-slate-700 rounded-lg">
                                    <CalendarIcon className="h-5 w-5 text-purple-600" />
                                </div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-white capitalize">
                                    {format(parseISO(selectedDate), "EEEE d 'de' MMMM yyyy", { locale: es })}
                                </h3>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-all"
                            >
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Contenido */}
                        <div className="px-5 py-4 space-y-4">

                            {/* Resumen financiero */}
                            <div className="grid grid-cols-4 gap-2">
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                                    <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-1">Histórico</p>
                                    <p className="text-[12px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                                        {fmt(selectedProjection?.rawAverage ?? 0)}
                                    </p>
                                </div>
                                <div className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-100 dark:border-indigo-800">
                                    <p className="text-[9px] uppercase tracking-widest font-bold text-indigo-400 mb-1">Estadística</p>
                                    <p className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                                        {fmt(selectedFinal)}
                                    </p>
                                </div>
                                <div className="bg-purple-50/50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-100 dark:border-purple-800">
                                    <p className="text-[9px] uppercase tracking-widest font-bold text-purple-400 mb-1">Punto PE</p>
                                    <p className="text-[12px] font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                                        {fmt(selectedFinancial)}
                                    </p>
                                </div>
                                <div className={`rounded-lg p-3 border ${selectedReal > 0
                                    ? (selectedReal >= (showFinancial && selectedFinancial > 0 ? selectedFinancial : selectedFinal) ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800')
                                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700'
                                    }`}>
                                    <p className={`text-[9px] uppercase tracking-widest font-bold mb-1 ${selectedReal > 0
                                        ? (selectedReal >= (showFinancial && selectedFinancial > 0 ? selectedFinancial : selectedFinal) ? 'text-emerald-500' : 'text-rose-500')
                                        : 'text-slate-400'
                                        }`}>Venta Real</p>
                                    <p className={`text-[12px] font-bold tabular-nums ${selectedReal > 0
                                        ? (selectedReal >= (showFinancial && selectedFinancial > 0 ? selectedFinancial : selectedFinal) ? 'text-emerald-700' : 'text-rose-700')
                                        : 'text-slate-400'
                                        }`}>
                                        {selectedReal > 0 ? fmt(selectedReal) : '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Lista de eventos del día */}
                            {selectedEvents.length > 0 && (
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-2">
                                        Eventos registrados
                                    </p>
                                    <div className="space-y-1.5">
                                        {selectedEvents.map(ev => {
                                            const cat = detectCategory(ev.name, ev.type);
                                            const cfg = EVENT_CATEGORIES[cat];
                                            const impactPct = ev.impactFactor === 0
                                                ? 'Cierre'
                                                : `${ev.impactFactor > 1 ? '+' : ''}${Math.round((ev.impactFactor - 1) * 100)}%`;
                                            return (
                                                <div key={ev.id} className={`flex items-center gap-2.5 px-3 py-2 rounded border ${cfg.badgeBg} ${cfg.badgeBorder}`}>
                                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <span className={`text-[12px] font-semibold ${cfg.badgeText}`}>
                                                            {ev.name}
                                                        </span>
                                                        <span className="text-[11px] text-gray-400 ml-2">
                                                            {cfg.label} · {impactPct}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => onDeleteEvent(ev.id)}
                                                        className="flex-shrink-0 p-1 rounded hover:bg-red-100 text-gray-300 hover:text-red-500 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <TrashIcon className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Separador */}
                            <div className="border-t border-gray-100" />

                            {/* Formulario: Agregar evento */}
                            <div className="space-y-3">
                                <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                                    Agregar evento
                                </p>

                                {/* Selector de categoría */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                                        Tipo de evento
                                    </label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {(Object.entries(EVENT_CATEGORIES) as [EventCategory, EventCategoryConfig][]).map(([key, cfg]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => handleCategoryChange(key)}
                                                className={`
                                                    flex items-center gap-2 px-2.5 py-2 rounded border text-left text-[11px] font-semibold transition-all
                                                    ${formCategory === key
                                                        ? cfg.buttonActive + ' ring-1 ring-current'
                                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                                    }
                                                `}
                                            >
                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dotColor}`} />
                                                <span className="truncate">{cfg.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Nombre */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-wide mb-1">
                                        Nombre
                                    </label>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={e => setFormName(e.target.value)}
                                        placeholder={`Ej: ${EVENT_CATEGORIES[formCategory].label}`}
                                        className="w-full h-9 px-3 text-[13px] border border-gray-300 rounded bg-white focus:ring-1 focus:ring-purple-600 focus:border-purple-600 outline-none"
                                        onKeyDown={e => e.key === 'Enter' && handleSaveEvent()}
                                    />
                                </div>

                                {/* Impacto */}
                                {formCategory !== 'cierre' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[11px] font-medium text-slate-500 tracking-wide uppercase tracking-widest">
                                                Impacto sobre la venta base
                                            </label>
                                            <span className={`text-[13px] font-bold ${formImpact >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                {formImpact >= 0 ? '+' : ''}{formImpact}%
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-50"
                                            max="100"
                                            step="5"
                                            value={formImpact}
                                            onChange={e => setFormImpact(parseInt(e.target.value))}
                                            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-purple-600 bg-slate-100 dark:bg-slate-700"
                                        />
                                        <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
                                            <span>-50%</span>
                                            <span>Neutral (0%)</span>
                                            <span>+100%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-white dark:bg-slate-800 px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="h-10 px-6 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-[12px] font-semibold text-slate-500 transition-all active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEvent}
                                disabled={saving || !formName.trim()}
                                className="h-10 px-8 rounded-md bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-[12px] font-bold text-white shadow-md shadow-purple-500/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                {saving ? (
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <PlusIcon className="h-4 w-4" />
                                )}
                                <span>{saving ? 'Guardando...' : 'Confirmar evento'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
