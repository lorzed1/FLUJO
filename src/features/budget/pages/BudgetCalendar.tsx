import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    CreditCardIcon,
    ArrowPathIcon,
    PlusIcon,
    CalendarDaysIcon,
    PencilIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { useBudgetContext } from '../layouts/BudgetLayout';
import { budgetService } from '../../../services/budget';
import { BudgetCommitment } from '../../../types/budget';
import { startOfMonth, endOfMonth, isSameDay, addDays } from 'date-fns';
import { useData } from '../../../context/DataContext';

import { useUI } from '../../../context/UIContext';
import { BudgetPaymentModal } from '../components/BudgetPaymentModal';

// --- TYPES ---
interface MyEvent {
    id: string;
    title: string;
    start: Date;
    end: Date; // Required by RBC, usually same as start for allDay
    allDay: boolean; // True for budget items
    resource: BudgetCommitment; // Raw data
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
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Week starts Monday
    getDay,
    locales,
});

// --- COMPONENT ---
export const BudgetCalendar: React.FC = () => {
    const { openForm, refreshTrigger } = useBudgetContext();
    const { setAlertModal } = useUI();
    const { categories } = useData();

    // State
    const [events, setEvents] = useState<MyEvent[]>([]);
    const [date, setDate] = useState(new Date()); // Current visible date (controlled)
    const [view, setView] = useState<View>('month'); // Current view (month/week)
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
            // Determine range based on view
            // RBC usually fetches a slightly larger range, but let's approximate
            let startRange: Date, endRange: Date;

            if (view === 'month') {
                // Add padding (previous/next month days)
                startRange = startOfMonth(date);
                startRange.setDate(startRange.getDate() - 7); // Buffer
                endRange = endOfMonth(date);
                endRange.setDate(endRange.getDate() + 7); // Buffer
            } else {
                // Week view
                startRange = startOfWeek(date, { weekStartsOn: 1 });
                endRange = addDays(startRange, 7);
            }

            const startStr = format(startRange, 'yyyy-MM-dd');
            const endStr = format(endRange, 'yyyy-MM-dd');

            console.log("Fetching Calendar Data:", { startStr, endStr });

            const commitments = await budgetService.getCommitments(startStr, endStr);

            // DEBUG: Log raw commitments
            console.log("📊 Raw Commitments from DB:", commitments.length, commitments);

            // MAP TO EVENTS
            const mappedEvents: MyEvent[] = commitments.map(c => {
                // CRITICAL: Manual parsing to enforce LOCAL TIME 00:00:00
                // Prevent timezone offsets (e.g. UTC 00:00 -> Local Previous Day)
                const [y, m, d] = c.dueDate.split('-').map(Number);
                const eventDate = new Date(y, m - 1, d, 0, 0, 0);

                return {
                    id: c.id,
                    title: c.title,
                    start: eventDate,
                    end: eventDate, // Same day for budget items
                    allDay: true,
                    resource: c,
                    isProjected: !!c.id.startsWith('projected-')
                };
            });

            console.log("📅 Mapped Events:", mappedEvents.length, mappedEvents.map(e => ({ id: e.id, title: e.title, date: e.start })));
            setEvents(mappedEvents);
        } catch (error) {
            console.error("Error fetching calendar events:", error);
        } finally {
            setIsLoading(false);
        }
    }, [date, view]);

    // Initial Load & On Change
    useEffect(() => {
        fetchEvents();
    }, [fetchEvents, refreshTrigger]);

    // --- HANDLERS ---

    const onNavigate = useCallback((newDate: Date) => setDate(newDate), []);
    const onView = useCallback((newView: View) => setView(newView), []);

    // CLICK EVENT (Edit) - Date can be changed in the edit modal
    const onSelectEvent = useCallback((event: MyEvent) => {
        // Open Form with data
        // If projected, we clone data to form
        openForm(undefined, event.resource);
    }, [openForm]);

    // CLICK SLOT (Create New)
    const onSelectSlot = useCallback(({ start }: { start: Date }) => {
        // Open Form pre-filled date
        openForm(start);
    }, [openForm]);

    // --- RENDERERS ---

    const eventPropGetter = useCallback((event: MyEvent) => {
        const isPaid = event.resource.status === 'paid';
        const isProjected = event.isProjected;
        const isOverdue = !isPaid && event.start < new Date(new Date().setHours(0, 0, 0, 0));

        // Using inline styles because Tailwind classes get overridden by RBC CSS
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
            // Pending / Default
            style = { ...style, backgroundColor: '#fffbeb', borderLeftColor: '#f59e0b', color: '#b45309' };
        }

        return { style };
    }, []);

    const components = useMemo(() => ({
        event: ({ event }: { event: MyEvent }) => {
            const isPaid = event.resource.status === 'paid';
            const isProjected = event.isProjected;
            const isOverdue = !isPaid && event.start < new Date(new Date().setHours(0, 0, 0, 0));

            // Determine colors based on status
            let bgColor = '#fffbeb';  // amber-50
            let borderColor = '#f59e0b';  // amber-500
            let textColor = '#b45309';  // amber-700

            if (isPaid) {
                bgColor = '#ecfdf5';   // emerald-50
                borderColor = '#10b981';  // emerald-500
                textColor = '#047857';  // emerald-700
            } else if (isOverdue) {
                bgColor = '#fef2f2';   // rose-50
                borderColor = '#ef4444';  // rose-500
                textColor = '#b91c1c';  // rose-700
            } else if (isProjected) {
                bgColor = '#f8fafc';   // slate-50
                borderColor = '#94a3b8';  // slate-400
                textColor = '#64748b';  // slate-500
            }

            return (
                <div
                    style={{
                        backgroundColor: bgColor,
                        borderLeft: `4px solid ${borderColor}`,
                        color: textColor,
                        borderRadius: '6px',
                        padding: '6px 10px',
                        marginBottom: '3px',
                        fontSize: '13px',
                        fontWeight: 700,
                        opacity: isProjected ? 0.85 : 1,
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                    className="flex flex-col leading-tight gap-1 relative group hover:shadow-md transition-all"
                    onClick={() => onSelectEvent(event)} // Click anywhere to edit
                >
                    <div className="flex justify-between items-start">
                        <span className="truncate flex-1 font-bold pr-10">{event.title}</span>

                        {/* Action Buttons - Top Right */}
                        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!isPaid && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Open payment modal with date selector
                                        setPaymentModal({
                                            isOpen: true,
                                            commitment: event.resource
                                        });
                                    }}
                                    className="p-1 px-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded shadow-sm"
                                    title="Marcar como Pagado"
                                >
                                    <CreditCardIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onSelectEvent(event); }}
                                className="p-1 px-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded shadow-sm"
                                title="Editar"
                            >
                                <PencilIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {isPaid && <CreditCardIcon className="w-3.5 h-3.5 flex-shrink-0 ml-1 text-emerald-600" />}
                    </div>
                    <span className="font-mono text-[12px] font-bold opacity-100 block bg-black/5 dark:bg-white/5 rounded px-1 w-fit">
                        ${event.resource.amount.toLocaleString()}
                    </span>
                </div>
            )
        },
        toolbar: (props: any) => {
            const label = () => {
                const date = props.date;
                return <span className="capitalize font-bold text-lg text-slate-800 dark:text-white">
                    {format(date, 'MMMM yyyy', { locale: es })}
                </span>;
            };

            return (
                <div className="flex items-center justify-between mb-6 p-1">
                    <div className="flex items-center gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-1 flex items-center gap-1">
                            <button onClick={() => props.onNavigate('PREV')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-400">
                                <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => props.onNavigate('TODAY')} className="px-3 py-1 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-400">
                                Hoy
                            </button>
                            <button onClick={() => props.onNavigate('NEXT')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-400">
                                <ChevronRightIcon className="w-5 h-5" />
                            </button>
                        </div>
                        {label()}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => props.onView('month')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'month' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <CalendarDaysIcon className="w-4 h-4 inline mr-1.5" />
                                Mes
                            </button>
                            <button
                                onClick={() => props.onView('week')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'week' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Semana
                            </button>
                        </div>
                        <button
                            onClick={() => openForm(date)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Nuevo <span className="hidden sm:inline">Gasto</span>
                        </button>
                    </div>
                </div>
            );
        },
        week: {
            header: ({ date, localizer }: any) => (
                <div className="flex flex-col items-center py-2 gap-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {localizer.format(date, 'EEE', locales['es'])}
                    </span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isSameDay(date, new Date())
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-700 dark:text-slate-300'
                        }`}>
                        {localizer.format(date, 'dd')}
                    </div>
                </div>
            )
        },
        month: {
            header: ({ date, localizer }: any) => (
                <div className="py-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                    {localizer.format(date, 'EEEE', locales['es'])}
                </div>
            )
        }
    }), [view, openForm, onSelectEvent, fetchEvents, setAlertModal, setPaymentModal]);

    return (
        <>
            <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 overflow-auto">
                <div className="flex-1 min-h-0 relative">
                    <style>{`
                    /* SKILL: calendar-full-view - Force relative layout */
                    .rbc-calendar { 
                        font-family: inherit;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .rbc-month-view { 
                        border: none;
                        display: flex;
                        flex-direction: column;
                        flex: 1;
                    }
                    
                    /* Header row - STICKY */
                    .rbc-month-header {
                        position: sticky;
                        top: 0;
                        z-index: 10;
                        background: white;
                    }
                    
                    .dark .rbc-month-header {
                        background: #1e293b;
                    }
                    
                    .rbc-header { 
                        border-bottom: 2px solid #f1f5f9; 
                        padding: 0.5rem;
                        background: inherit;
                    }
                    
                    /* Month rows - AUTO height without DnD constraints */
                    .rbc-month-row {
                        display: flex !important;
                        flex-direction: column !important;
                        position: relative !important;
                        border-top: 1px solid #f1f5f9;
                        min-height: 80px; /* Minimum height */
                        height: auto !important; /* Allow growth based on content */
                        flex: 0 0 auto !important; /* Don't stretch, size to content */
                    }
                    
                    /* Row backgrounds - absolute behind content */
                    .rbc-row-bg {
                        display: flex;
                        position: absolute !important;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        z-index: 0;
                    }
                    
                    .rbc-day-bg { flex: 1; }
                    
                    /* Content area - CRITICAL overflow visible */
                    .rbc-row-content {
                        position: relative !important;
                        display: flex;
                        flex-direction: column;
                        z-index: 1;
                        min-height: auto;
                        overflow: visible !important;
                    }
                    
                    /* Event rows - no height limit */
                    .rbc-row-content > .rbc-row {
                        position: relative !important;
                        display: flex;
                        height: auto !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                    }
                    
                    /* Event segments */
                    .rbc-row-segment {
                        padding: 1px 3px;
                    }
                    
                    /* showMore component styling */
                    .rbc-show-more {
                        display: block !important;
                        background: none !important;
                        color: inherit !important;
                        font-size: inherit !important;
                        padding: 0 3px !important;
                        cursor: default !important;
                        width: 100% !important;
                        overflow: visible !important;
                    }
                    
                    /* Event wrapper */
                    .rbc-event {
                        position: relative !important;
                        padding: 0 !important;
                        background: transparent !important;
                        border: none !important;
                        outline: none !important;
                        box-shadow: none !important;
                        margin-bottom: 2px;
                        overflow: visible !important;
                    }
                    
                    .rbc-event-content {
                        overflow: visible !important;
                    }
                    
                    .rbc-event-label { display: none; }
                    
                    /* Day backgrounds */
                    .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #f1f5f9; }
                    .rbc-off-range-bg { background-color: #f8fafc; }
                    .rbc-today { background-color: #f0f9ff !important; }
                    
                    /* Week View Fixes */
                    .rbc-time-view { border: none; }
                    .rbc-time-header.rbc-overflowing { border-right: none; }
                    .rbc-time-content { border-top: 1px solid #f1f5f9; }
                    .rbc-timeslot-group { border-bottom: 1px solid #f1f5f9; }
                    .rbc-day-slot { border-left: 1px solid #f1f5f9; }
                    .rbc-time-view .rbc-time-gutter { display: none; }
                    .rbc-time-view .rbc-allday-cell { display: none; }
                    
                    .rbc-day-slot .rbc-event {
                        border: none !important;
                    }
                `}</style>

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
                        onSelectEvent={onSelectEvent} // Click to edit (date can be changed in modal)
                        onSelectSlot={onSelectSlot} // Click blank to create
                        selectable
                        eventPropGetter={eventPropGetter}
                        components={components}
                        style={{
                            height: 'auto',
                            minHeight: 500
                        }}
                        showAllEvents // Show ALL events without "+X more" button
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

            {/* Payment Modal */}
            <BudgetPaymentModal
                isOpen={paymentModal.isOpen}
                onClose={() => setPaymentModal({ isOpen: false, commitment: null })}
                commitment={paymentModal.commitment || undefined}
                onSuccess={() => {
                    fetchEvents();
                    setAlertModal({ isOpen: true, type: 'success', title: 'Pago Registrado', message: 'El compromiso ha sido marcado como pagado exitosamente.' });
                }}
            />
        </>
    );
};

export default BudgetCalendar;
