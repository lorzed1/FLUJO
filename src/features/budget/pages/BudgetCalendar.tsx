import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    CreditCardIcon,
    PlusIcon,
    CalendarDaysIcon,
    PencilIcon,
    TrashIcon,
    BanknotesIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useBudgetContext } from '../layouts/BudgetLayout';
import { budgetService } from '../../../services/budget';
import { BudgetCommitment } from '../../../types/budget';
import { startOfMonth, endOfMonth, endOfWeek, isSameDay, isSameMonth, addDays } from 'date-fns';
import { useData } from '../../../context/DataContext';
import { useUI } from '../../../context/UIContext';
import { BudgetPaymentModal } from '../components/BudgetPaymentModal';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';
import { DateNavigator } from '../../../components/ui/DateNavigator';

// --- TYPES ---
interface MyEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    resource: BudgetCommitment;
    isProjected: boolean;
}

// --- LOCALIZER SETUP ---
const locales = {
    'es': es,
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales,
});

export const BudgetCalendar: React.FC = () => {
    const { openForm, refreshTrigger } = useBudgetContext();
    const { setAlertModal } = useUI();
    const { categories } = useData();

    // State
    const [events, setEvents] = useState<MyEvent[]>([]);
    const [date, setDate] = useState(new Date());
    const [view, setView] = useState<View>('month');
    const [isLoading, setIsLoading] = useState(false);

    // Payment Modal State
    const [paymentModal, setPaymentModal] = useState<{
        isOpen: boolean;
        commitment: BudgetCommitment | null;
    }>({
        isOpen: false,
        commitment: null
    });

    // --- DATA FETCHING ---
    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            let startRange: Date, endRange: Date;

            if (view === 'month') {
                startRange = startOfMonth(date);
                startRange.setDate(startRange.getDate() - 7);
                endRange = endOfMonth(date);
                endRange.setDate(endRange.getDate() + 7);
            } else {
                startRange = startOfWeek(date, { weekStartsOn: 1 });
                endRange = addDays(startRange, 7);
            }

            const startStr = format(startRange, 'yyyy-MM-dd');
            const endStr = format(endRange, 'yyyy-MM-dd');

            const commitments = await budgetService.getCommitments(startStr, endStr);

            const mappedEvents: MyEvent[] = commitments.map(c => {
                const [y, m, d] = c.dueDate.split('-').map(Number);
                const eventDate = new Date(y, m - 1, d, 0, 0, 0);

                return {
                    id: c.id,
                    title: c.title,
                    start: eventDate,
                    end: eventDate,
                    allDay: true,
                    resource: c,
                    isProjected: !!c.id.startsWith('projected-')
                };
            });

            setEvents(mappedEvents);
        } catch (error) {
            console.error("Error fetching calendar events:", error);
        } finally {
            setIsLoading(false);
        }
    }, [date, view]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents, refreshTrigger]);

    const onNavigate = useCallback((newDate: Date) => setDate(newDate), []);
    const onView = useCallback((newView: View) => setView(newView), []);

    const onSelectEvent = useCallback((event: MyEvent) => {
        openForm(undefined, event.resource);
    }, [openForm]);

    const onSelectSlot = useCallback(({ start }: { start: Date }) => {
        openForm(start);
    }, [openForm]);

    const eventPropGetter = useCallback((event: MyEvent) => {
        const isPaid = event.resource.status === 'paid';
        const isProjected = event.isProjected;
        const isOverdue = !isPaid && event.start < new Date(new Date().setHours(0, 0, 0, 0));

        let style: React.CSSProperties = {
            borderRadius: '4px',
            borderLeft: '4px solid',
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 6px',
            marginBottom: '2px',
            cursor: 'pointer',
        };

        if (isPaid) {
            style = { ...style, backgroundColor: '#ecfdf5', borderLeftColor: '#10b981', color: '#047857' };
        } else if (isOverdue) {
            style = { ...style, backgroundColor: '#fef2f2', borderLeftColor: '#ef4444', color: '#b91c1c' };
        } else if (isProjected) {
            style = { ...style, backgroundColor: '#f8fafc', borderLeftColor: '#94a3b8', color: '#64748b', opacity: 0.85, borderStyle: 'dashed' };
        } else {
            style = { ...style, backgroundColor: '#fffbeb', borderLeftColor: '#f59e0b', color: '#b45309' };
        }

        return { style };
    }, []);

    const components = useMemo(() => ({
        event: ({ event }: { event: MyEvent }) => {
            const isPaid = event.resource.status === 'paid';
            const isProjected = event.isProjected;
            const isOverdue = !isPaid && event.start < new Date(new Date().setHours(0, 0, 0, 0));

            let bgColor = '#fffbeb';
            let borderColor = '#f59e0b';
            let textColor = '#b45309';

            if (isPaid) {
                bgColor = '#ecfdf5';
                borderColor = '#10b981';
                textColor = '#047857';
            } else if (isOverdue) {
                bgColor = '#fef2f2';
                borderColor = '#ef4444';
                textColor = '#b91c1c';
            } else if (isProjected) {
                bgColor = '#f8fafc';
                borderColor = '#94a3b8';
                textColor = '#64748b';
            }

            return (
                <div
                    style={{
                        backgroundColor: bgColor,
                        borderLeft: `3px solid ${borderColor}`,
                        color: textColor,
                        borderRadius: '4px',
                        padding: '4px 8px',
                        marginBottom: '2px',
                        fontSize: '11px',
                        fontWeight: 700,
                        opacity: isProjected ? 0.85 : 1,
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                    className="flex flex-col leading-tight gap-0.5 relative group hover:shadow-md transition-all uppercase tracking-tighter"
                    onClick={() => onSelectEvent(event)}
                >
                    <div className="flex justify-between items-start">
                        <span className="truncate flex-1 font-bold pr-6">{event.title}</span>
                        <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!isPaid && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPaymentModal({ isOpen: true, commitment: event.resource });
                                    }}
                                    className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded shadow-sm transition-colors"
                                >
                                    <CreditCardIcon className="w-3 h-3" />
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onSelectEvent(event); }}
                                className="p-1 bg-purple-600 hover:bg-purple-700 text-white rounded shadow-sm transition-colors"
                            >
                                <PencilIcon className="w-3 h-3" />
                            </button>
                        </div>
                        {isPaid && <CheckCircleIcon className="w-3 h-3 flex-shrink-0 ml-1 text-emerald-600" />}
                    </div>
                    <span className="font-bold tabular-nums opacity-80 block w-fit">
                        ${event.resource.amount.toLocaleString('es-CO')}
                    </span>
                </div>
            )
        },
        toolbar: (props: any) => {
            return null; // Handle manually in PageHeader
        },
        week: {
            header: ({ date, localizer }: any) => (
                <div className="flex flex-col items-center py-2 gap-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {localizer.format(date, 'EEE', locales['es'])}
                    </span>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${isSameDay(date, new Date())
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-gray-900 dark:text-gray-100'
                        }`}>
                        {localizer.format(date, 'dd')}
                    </div>
                </div>
            )
        },
        month: {
            header: ({ date, localizer }: any) => (
                <div className="py-2 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center border-b border-gray-100 dark:border-slate-700">
                    {localizer.format(date, 'EEEE', locales['es'])}
                </div>
            )
        }
    }), [openForm, onSelectEvent, setPaymentModal]);

    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title="Calendario de pagos"
                breadcrumbs={[
                    { label: 'Egresos', path: '/budget' },
                    { label: 'Calendario' }
                ]}
                icon={<CalendarDaysIcon className="h-6 w-6" />}
                actions={
                    <div className="flex flex-wrap items-center gap-4 h-10">
                        {/* Segmented Control Mes/Semana – Aliaddo §4 Z1 (View Modes) */}
                        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm overflow-hidden h-full">
                            <button
                                onClick={() => setView('month')}
                                className={`flex items-center justify-center px-4 h-full text-[13px] font-semibold transition-colors border-r border-slate-200 dark:border-slate-700 ${view === 'month'
                                    ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                    : 'bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700'
                                    }`}
                            >
                                Mes
                            </button>
                            <button
                                onClick={() => setView('week')}
                                className={`flex items-center justify-center px-4 h-full text-[13px] font-semibold transition-colors ${view === 'week'
                                    ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                    : 'bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700'
                                    }`}
                            >
                                Semana
                            </button>
                        </div>

                        {/* Selector de Fecha Aliaddo §4 Z2 (Centro/Filtro Temporal) */}
                        <DateNavigator
                            value={date}
                            onChange={(newDate) => setDate(newDate)}
                        />

                        {/* Botón Primario – Aliaddo §3/§4 Z3 (Acciones) */}
                        <Button
                            onClick={() => openForm(date)}
                            variant="primary"
                            size="md"
                        >
                            <PlusIcon className="h-4 w-4 mr-1.5" />
                            Registrar Gasto
                        </Button>
                    </div>
                }
            />

            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 overflow-visible flex flex-col mt-2">
                <style>{`
                    .rbc-calendar { font-family: inherit; }
                    .rbc-time-view { border: none; }
                    .rbc-time-content { border-top: 1px solid #f1f5f9; }
                `}</style>
                <div className="flex-1 relative overflow-auto">
                    <div className="flex flex-col h-full min-w-[800px]">
                        {/* Header Días Semana – Aliaddo §4 Style */}
                        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day) => (
                                <div key={day} className="py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Grid Días */}
                        <div className="grid grid-cols-7 auto-rows-auto bg-slate-200 dark:bg-slate-700 gap-px border border-slate-200 dark:border-slate-700">
                            {(() => {
                                let days: Date[] = [];
                                if (view === 'month') {
                                    const startMonth = startOfMonth(date);
                                    const endMonth = endOfMonth(date);
                                    const startDate = startOfWeek(startMonth, { weekStartsOn: 1 });
                                    const endDate = endOfWeek(endMonth, { weekStartsOn: 1 });

                                    let day = startDate;
                                    while (day <= endDate) {
                                        days.push(day);
                                        day = addDays(day, 1);
                                    }
                                } else {
                                    // Vista Semana: 7 días exactos
                                    const startDate = startOfWeek(date, { weekStartsOn: 1 });
                                    for (let i = 0; i < 7; i++) {
                                        days.push(addDays(startDate, i));
                                    }
                                }

                                return days.map((dayItem, idx) => {
                                    const dayEvents = events.filter(e => isSameDay(e.start, dayItem));
                                    const isCurrentMonth = isSameMonth(dayItem, date);
                                    const isSelectedMonth = view === 'month' ? isCurrentMonth : true;
                                    const isToday = isSameDay(dayItem, new Date());
                                    const dailyTotal = dayEvents.reduce((sum, e) => sum + e.resource.amount, 0);

                                    return (
                                        <div
                                            key={idx}
                                            className={`
                                                  min-h-[120px] p-2 bg-white dark:bg-slate-800 flex flex-col gap-1 transition-colors
                                                  ${!isSelectedMonth ? '!bg-slate-50/50 dark:!bg-slate-900/50' : ''}
                                                  ${isToday ? '!bg-purple-50/20 dark:!bg-purple-900/10' : ''}
                                                  hover:bg-slate-50 dark:hover:bg-slate-750/50
                                                `}
                                            onClick={() => openForm(dayItem)}
                                        >
                                            <div className="flex justify-between items-start mb-1 h-8">
                                                <div className="flex flex-col items-center">
                                                    <span className={`
                                                          text-[13px] font-semibold w-6 h-6 flex items-center justify-center rounded-lg transition-all
                                                          ${isToday
                                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                                            : isSelectedMonth ? 'text-slate-600 dark:text-gray-300' : 'text-slate-300 dark:text-slate-600'}
                                                        `}>
                                                        {format(dayItem, 'd')}
                                                    </span>
                                                    {isToday && <span className="text-[8px] font-bold text-purple-600 uppercase tracking-widest mt-0.5">Hoy</span>}
                                                </div>

                                                {dailyTotal > 0 && (
                                                    <div className="flex flex-col items-end pt-0.5">
                                                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Total</span>
                                                        <span className="text-[12px] font-bold text-slate-600 dark:text-slate-200 tabular-nums leading-none">
                                                            ${dailyTotal.toLocaleString('es-CO')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                {dayEvents.map((event) => {
                                                    const isPaid = event.resource.status === 'paid';
                                                    const isProjected = event.isProjected;
                                                    const isOverdue = !isPaid && event.start < new Date(new Date().setHours(0, 0, 0, 0));

                                                    let bgColor = '#fffbeb';
                                                    let borderColor = '#f59e0b';
                                                    let textColor = '#b45309';

                                                    if (isPaid) {
                                                        bgColor = '#ecfdf5';
                                                        borderColor = '#10b981';
                                                        textColor = '#047857';
                                                    } else if (isOverdue) {
                                                        bgColor = '#fef2f2';
                                                        borderColor = '#ef4444';
                                                        textColor = '#b91c1c';
                                                    } else if (isProjected) {
                                                        bgColor = '#f8fafc';
                                                        borderColor = '#94a3b8';
                                                        textColor = '#64748b';
                                                    }

                                                    return (
                                                        <div
                                                            key={event.id}
                                                            style={{
                                                                backgroundColor: bgColor,
                                                                borderLeft: `3px solid ${borderColor}`,
                                                                color: textColor,
                                                            }}
                                                            className={`
                                                              rounded-md px-2 py-0.5 text-[11px] font-semibold cursor-pointer
                                                              hover:shadow-sm transition-all relative group flex flex-col gap-0
                                                              ${isProjected ? 'opacity-85' : 'opacity-100'}
                                                              leading-tight
                                                            `}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSelectEvent(event);
                                                            }}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <span className="truncate leading-tight pr-4 font-semibold">{event.title}</span>
                                                                {isPaid && <CheckCircleIcon className="w-3 h-3 flex-shrink-0 text-emerald-600 mt-0.5" />}
                                                            </div>
                                                            <span className="opacity-80 tabular-nums text-[10px] font-medium">
                                                                ${event.resource.amount.toLocaleString('es-CO')}
                                                            </span>

                                                            {/* Actions Hover */}
                                                            <div className="absolute top-1 right-1 hidden group-hover:flex gap-1 bg-inherit pl-2">
                                                                {!isPaid && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setPaymentModal({ isOpen: true, commitment: event.resource });
                                                                        }}
                                                                        className="text-emerald-600 hover:text-emerald-700 bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm"
                                                                        title="Pagar"
                                                                    >
                                                                        <CreditCardIcon className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            <BudgetPaymentModal
                isOpen={paymentModal.isOpen}
                onClose={() => setPaymentModal({ isOpen: false, commitment: null })}
                commitment={paymentModal.commitment || undefined}
                onSuccess={() => {
                    fetchEvents();
                    setAlertModal({ isOpen: true, type: 'success', title: 'Operación Exitosa', message: 'El pago ha sido conciliado en el calendario.' });
                }}
            />
        </div >
    );
};

export default BudgetCalendar;
