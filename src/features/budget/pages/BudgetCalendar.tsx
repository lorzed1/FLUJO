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
import { startOfMonth, endOfMonth, isSameDay, addDays } from 'date-fns';
import { useData } from '../../../context/DataContext';
import { useUI } from '../../../context/UIContext';
import { BudgetPaymentModal } from '../components/BudgetPaymentModal';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui/Button';

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
                                className="p-1 bg-primary hover:bg-primary-dark text-white rounded shadow-sm transition-colors"
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
                        ? 'bg-primary text-white shadow-sm'
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
                title="Calendario Presupuestal"
                breadcrumbs={[
                    { label: 'Finanzas', path: '/budget' },
                    { label: 'Calendario' }
                ]}
                icon={<CalendarDaysIcon className="h-6 w-6" />}
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Selector de Mes/Hoy */}
                        <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                            <Button
                                variant="secondary"
                                className="!h-8 !w-8 !p-0 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
                                onClick={() => setDate(addDays(date, view === 'month' ? -30 : -7))}
                            >
                                <ChevronLeftIcon className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="secondary"
                                className="!h-8 !px-3 !py-0 mx-1 text-xs font-bold uppercase tracking-wider rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
                                onClick={() => setDate(new Date())}
                            >
                                Hoy
                            </Button>
                            <Button
                                variant="secondary"
                                className="!h-8 !w-8 !p-0 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
                                onClick={() => setDate(addDays(date, view === 'month' ? 30 : 7))}
                            >
                                <ChevronRightIcon className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="px-4 text-center min-w-[140px]">
                            <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                {format(date, view === 'month' ? 'MMMM yyyy' : 'MMM yyyy', { locale: es })}
                            </span>
                        </div>

                        {/* Switch Month/Week */}
                        <div className="flex items-center bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-1 rounded-lg">
                            <button
                                onClick={() => setView('month')}
                                className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all ${view === 'month' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            >
                                Mes
                            </button>
                            <button
                                onClick={() => setView('week')}
                                className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all ${view === 'week' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            >
                                Semana
                            </button>
                        </div>

                        <Button
                            onClick={() => openForm(date)}
                            className="!h-10 !px-5 font-bold text-[12px] uppercase tracking-wider shadow-lg shadow-primary/20"
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Registrar Gasto
                        </Button>
                    </div>
                }
            />

            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 min-h-[600px] overflow-hidden flex flex-col mt-2">
                <style>{`
                    .rbc-calendar { font-family: inherit; }
                    .rbc-month-view { border: none; }
                    .rbc-month-row { border-top: 1px solid #f8fafc; overflow: visible !important; min-height: 100px; height: auto !important; }
                    .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #f8fafc; }
                    .rbc-header { border-bottom: none !important; }
                    .rbc-row-content { z-index: 2; overflow: visible !important; }
                    .rbc-row { overflow: visible !important; }
                    .rbc-off-range-bg { background-color: #fbfcfd; }
                    .rbc-today { background-color: #f0f7ff !important; }
                    .dark .rbc-off-range-bg { background-color: #0f172a / 5; }
                    .dark .rbc-today { background-color: #1e293b / 50 !important; }
                    .rbc-event { padding: 0 !important; background: transparent !important; border: none !important; margin: 1px 2px !important; }
                    .rbc-show-more { font-size: 10px; font-bold: 600; color: #6366f1; background: transparent !important; }
                    .rbc-time-view { border: none; }
                    .rbc-time-content { border-top: 1px solid #f1f5f9; }
                    .rbc-timeslot-group { border-bottom: 1px solid #f1f5f9; }
                    .rbc-day-slot .rbc-event-label { display: none; }
                `}</style>
                <div className="flex-1 relative">
                    <Calendar
                        localizer={localizer}
                        culture='es'
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        date={date}
                        view={view}
                        views={['month', 'week']}
                        onNavigate={onNavigate}
                        onView={onView}
                        onSelectEvent={onSelectEvent}
                        onSelectSlot={onSelectSlot}
                        selectable
                        eventPropGetter={eventPropGetter}
                        components={components}
                        style={{ height: '100%' }}
                        showAllEvents
                        messages={{
                            today: 'Hoy',
                            previous: 'Anterior',
                            next: 'Siguiente',
                            month: 'Mes',
                            week: 'Semana',
                            day: 'Día'
                        }}
                    />
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
        </div>
    );
};

export default BudgetCalendar;
