import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Event, View, Views, Navigate } from 'react-big-calendar';
import withDragAndDrop, { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, parseISO, startOfMonth, endOfMonth, isSameDay, getISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { useBudgetContext } from '../layouts/BudgetLayout';
import { budgetService } from '../../../services/budgetService';
import { useUI } from '../../../context/UIContext';
import { BudgetCommitment } from '../../../types/budget';
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    CalendarDaysIcon,
    ViewColumnsIcon,
    ListBulletIcon,
    TrashIcon
} from '@heroicons/react/24/outline';

// --- Context Bridge for Calendar Actions ---
// Hack to pass actions to CustomEvent component which is rendered by RBC
const CalendarActionsContext = React.createContext<{
    onDelete: (event: MyEvent) => void;
}>({ onDelete: () => { } });


const locales = {
    'es': es,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

interface MyEvent extends Event {
    id: string;
    status: 'pending' | 'paid' | 'overdue';
    amount: number;
    resource: BudgetCommitment;
    isProjected: boolean;
}

// --- Custom Components ---

const CustomToolbar = (toolbar: any) => {
    const goToBack = () => { toolbar.onNavigate(Navigate.PREVIOUS); };
    const goToNext = () => { toolbar.onNavigate(Navigate.NEXT); };
    const goToCurrent = () => { toolbar.onNavigate(Navigate.TODAY); };

    const label = () => {
        const date = toolbar.date;
        const baseLabel = format(date, 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase());

        if (toolbar.view === 'week') {
            const weekNumber = getISOWeek(date);
            return (
                <div className="flex flex-col items-center">
                    <span>{baseLabel}</span>
                    <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full mt-1">
                        Semana {weekNumber}
                    </span>
                </div>
            );
        }

        return baseLabel;
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 bg-white dark:bg-slate-800 p-1 relative z-10">
            {/* Left: Hoy Button */}
            <div className="flex items-center">
                <button
                    type="button"
                    onClick={goToCurrent}
                    className="px-4 py-2 text-xs font-bold uppercase text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-all shadow-sm hover:shadow"
                >
                    Hoy
                </button>
            </div>

            {/* Center: Title with Arrows */}
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={goToBack}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                    title="Mes Anterior"
                >
                    <ChevronLeftIcon className="w-6 h-6" />
                </button>

                <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight capitalize min-w-[160px] text-center select-none">
                    {label()}
                </h2>

                <button
                    type="button"
                    onClick={goToNext}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                    title="Mes Siguiente"
                >
                    <ChevronRightIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Right: View Switcher */}
            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl shadow-inner">
                {['month', 'week'].map(view => (
                    <button
                        type="button"
                        key={view}
                        onClick={() => toolbar.onView(view)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${toolbar.view === view
                            ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        {view === 'month' && <CalendarDaysIcon className="w-3.5 h-3.5" />}
                        {view === 'week' && <ViewColumnsIcon className="w-3.5 h-3.5" />}
                        <span className="capitalize">{view === 'month' ? 'Mes' : 'Semana'}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const CustomEvent = ({ event }: { event: MyEvent }) => {
    const isProjected = event.isProjected;
    const { onDelete } = React.useContext(CalendarActionsContext);

    // Configuración de colores según estado
    let bgClass = 'bg-amber-100 dark:bg-amber-900/40 border-l-4 border-amber-400 text-amber-900 dark:text-amber-100';
    if (event.status === 'paid') {
        bgClass = 'bg-emerald-100 dark:bg-emerald-900/40 border-l-4 border-emerald-500 text-emerald-900 dark:text-emerald-100';
    } else if (event.status === 'overdue') {
        bgClass = 'bg-rose-100 dark:bg-rose-900/40 border-l-4 border-rose-500 text-rose-900 dark:text-rose-100';
    }

    if (isProjected) {
        bgClass += ' opacity-75';
    }

    return (
        <div className={`group flex flex-col justify-between px-2 py-1 h-full w-full rounded-md shadow-sm text-[10px] leading-tight overflow-hidden transition-all hover:scale-[1.02] hover:shadow-md hover:z-10 relative ${bgClass}`}>
            {isProjected && <div className="absolute top-0 right-0 w-2 h-2 border-t-4 border-r-4 border-slate-400/30 rounded-bl-md"></div>}

            <div className="flex justify-between items-start">
                <div className="font-bold truncate pr-1">
                    {event.resource.title}
                </div>
                {!isProjected && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent opening form
                            onDelete(event);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-black/10 rounded"
                        title="Eliminar"
                    >
                        <TrashIcon className="w-3 h-3 text-current" />
                    </button>
                )}
            </div>
            <div className="font-mono font-medium opacity-90">
                ${event.resource.amount.toLocaleString()}
            </div>
        </div>
    );
};

const CustomShowMore = ({ events }: { events: MyEvent[] }) => {
    return (
        <div className="flex flex-col gap-[2px] w-full" onClick={(e) => e.stopPropagation()}>
            {events.map((evt) => (
                <div key={evt.id} className="rbc-event">
                    <CustomEvent event={evt} />
                </div>
            ))}
        </div>
    );
};

// --- Main Component ---

export const BudgetCalendar: React.FC = () => {
    const { openForm } = useBudgetContext();
    const { setAlertModal } = useUI();
    const [events, setEvents] = useState<MyEvent[]>([]);
    const [currentRange, setCurrentRange] = useState<{ start: Date; end: Date }>({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
    });
    const [view, setView] = useState<View>(Views.MONTH);
    const [date, setDate] = useState(new Date());

    const handleNavigate = useCallback((newDate: Date) => {
        setDate(newDate);
    }, []);

    const fetchEvents = useCallback(async () => {
        try {
            const commitments = await budgetService.getCommitments(
                format(currentRange.start, 'yyyy-MM-dd'),
                format(currentRange.end, 'yyyy-MM-dd')
            );
            const mappedEvents: MyEvent[] = commitments.map(c => {
                const date = parseISO(c.dueDate);
                return {
                    id: c.id,
                    title: c.title,
                    start: date,
                    end: date,
                    status: c.status,
                    amount: c.amount,
                    allDay: true,
                    resource: c,
                    isProjected: !!c.id.startsWith('projected-')
                };
            });
            setEvents(mappedEvents);
        } catch (error) {
            console.error("Error loading calendar events:", error);
        }
    }, [currentRange]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const onEventDrop: withDragAndDropProps['onEventDrop'] = async (data) => {
        const { start, event } = data;
        const myEvent = event as MyEvent;
        const newDate = format(new Date(start), 'yyyy-MM-dd');
        const oldEvents = [...events];
        setEvents(prev => prev.map(ev =>
            ev.id === myEvent.id ? { ...ev, start: new Date(start), end: new Date(start) } : ev
        ));
        try {
            if (myEvent.id.startsWith('projected-')) {
                const { title, amount, status, category, recurrenceRuleId } = myEvent.resource;
                await budgetService.addCommitment({ title, amount, status, category, recurrenceRuleId, dueDate: newDate });
            } else {
                await budgetService.updateCommitment(myEvent.id, { dueDate: newDate });
            }
            await fetchEvents();
        } catch (error) {
            console.error("Error updating event drop:", error);
            setEvents(oldEvents);
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error al mover el evento' });
        }
    };

    const handleSelectSlot = useCallback(({ start }: { start: Date }) => { openForm(start); }, [openForm]);
    const handleSelectEvent = useCallback((event: MyEvent) => { openForm(undefined, event.resource); }, [openForm]);

    const handleRangeChange = (range: Date[] | { start: Date; end: Date }) => {
        if (Array.isArray(range)) {
            const sorted = range.sort((a, b) => a.getTime() - b.getTime());
            setCurrentRange({ start: sorted[0], end: sorted[sorted.length - 1] });
        } else {
            setCurrentRange(range);
        }
    };

    const handleDeleteEvent = useCallback((event: MyEvent) => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Confirmar Eliminación',
            message: `¿Eliminar "${event.resource.title}"?`,
            showCancel: true,
            confirmText: 'Eliminar',
            onConfirm: async () => {
                try {
                    await budgetService.deleteCommitment(event.resource.id);
                    await fetchEvents();
                    setAlertModal({ isOpen: false, message: '' });
                } catch (error) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo eliminar el evento' });
                }
            }
        });
    }, [fetchEvents, setAlertModal]);

    const handleViewChange = (v: View) => { setView(v); };

    return (
        <div className="h-full bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
            <CalendarActionsContext.Provider value={{ onDelete: handleDeleteEvent }}>
                <div className="flex-1 min-h-0 calendar-wrapper overflow-y-auto">
                    <DnDCalendar
                        localizer={localizer}
                        events={events}
                        startAccessor={(e: any) => e.start}
                        endAccessor={(e: any) => e.end}
                        draggableAccessor={() => true}
                        onEventDrop={onEventDrop}
                        selectable
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={handleSelectEvent}
                        onRangeChange={handleRangeChange}
                        onView={handleViewChange}
                        view={view}
                        date={date}
                        onNavigate={handleNavigate}
                        popup={true}
                        resizable={false}
                        style={{ height: view === Views.MONTH ? 'auto' : '100%', minHeight: view === Views.MONTH ? '800px' : '600px' }}
                        culture='es'
                        components={{
                            toolbar: CustomToolbar,
                            event: CustomEvent as any,
                            month: {
                                dateHeader: ({ label }) => <span className="rbc-date-cell">{label}</span>,
                            },
                            showMore: CustomShowMore as any
                        }}
                        eventPropGetter={() => ({
                            style: { backgroundColor: 'transparent', boxShadow: 'none' } // Remove default styles effectively
                        })}
                    />
                </div>
            </CalendarActionsContext.Provider>
            <style>{`
                /* -------------------------------------------------------------------------- */
                /*                         BUDGET CALENDAR CUSTOM STYLES                      */
                /* -------------------------------------------------------------------------- */
                
                .rbc-calendar { 
                    font-family: inherit; 
                    height: auto !important; 
                    min-height: 100%; 
                    overflow: visible !important;
                }
                
                /* --- MONTH VIEW LAYOUT --- */
                /* Allow cells to grow vertically */
                .rbc-month-view { 
                    border: 1px solid #e2e8f0; 
                    flex: unset !important; 
                    height: auto !important; 
                    display: block !important; 
                    overflow: visible !important;
                }
                
                .rbc-month-row { 
                    border-bottom: 1px solid #e2e8f0;
                    overflow: visible !important; 
                    height: auto !important; 
                    min-height: 100px; 
                    flex: unset !important; 
                    max-height: none !important;
                    position: relative !important;
                }
                
                .rbc-row-bg {
                    height: 100% !important;
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 1;
                }

                /* --- ROW CONTENT WRAPPER --- */
                /* Critical for DnD: Must span full width so mouse coordinates map correctly */
                .rbc-row-content { 
                    position: relative !important;
                    height: auto !important; 
                    overflow: visible !important;
                    width: 100% !important; 
                    z-index: 4;
                    pointer-events: auto !important; 
                }
                
                .rbc-row-content .rbc-row {
                    display: flex !important;
                    flex-direction: row !important;
                    height: auto !important;
                    align-items: flex-start;
                    width: 100% !important;
                }
                
                /* --- COLUMN SEGMENTS (DAYS) --- */
                .rbc-row-segment {
                    padding: 2px 4px;
                    width: 14.2857% !important; /* Fixed 7-col grid */
                    max-width: 14.2857% !important;
                    flex: unset !important;
                    overflow: visible !important;
                }

                /* --- EVENTS --- */
                .rbc-event { 
                    background: transparent; 
                    padding: 0; 
                    outline: none; 
                    position: relative !important; /* Stack vertically in flow */
                    display: block !important;
                    pointer-events: auto;
                    margin-bottom: 2px;
                    transition: transform 0.1s ease, box-shadow 0.1s ease;
                }

                .rbc-event:hover {
                    z-index: 60 !important;
                }

                .rbc-event-content { font-size: 10px; }

                /* --- DRAG AND DROP (DND) --- */
                /* The "Ghost" element following the mouse */
                .rbc-addons-dnd-drag-preview {
                    position: absolute !important; /* Float freely */
                    z-index: 100 !important;
                    width: auto !important;
                    pointer-events: none !important;
                    opacity: 0.9;
                    transform: scale(1.05);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    left: auto !important; /* Don't force left align */
                    top: auto !important;
                }

                /* The original event being moved */
                .rbc-addons-dnd-dragged-event {
                    opacity: 0.3 !important;
                }
                
                /* Highlight drop target */
                .rbc-addons-dnd-over {
                    background-color: rgba(99, 102, 241, 0.1) !important;
                    border: 2px dashed #6366f1 !important;
                    z-index: 50 !important;
                }

                /* --- WEEK VIEW (NO AGENDA) --- */
                .rbc-time-view .rbc-time-content,
                .rbc-time-view .rbc-time-gutter, 
                .rbc-time-view .rbc-header-gutter { 
                    display: none !important; 
                }

                .rbc-time-view {
                    border: none !important;
                    display: flex !important;
                    flex-direction: column;
                    height: 100%;
                }

                .rbc-time-view .rbc-time-header {
                    flex: 1;
                    height: 100% !important;
                    border: none;
                }

                .rbc-time-view .rbc-time-header-content {
                    flex: 1;
                    height: 100% !important;
                    border-left: 1px solid #e2e8f0;
                }
                
                .rbc-time-view .rbc-time-header-content > .rbc-row:last-child {
                    flex: 1;
                    overflow-y: auto;
                    align-items: flex-start;
                }
                
                /* Unlock width for Week View segments to flex */
                .rbc-time-view .rbc-row .rbc-row-segment {
                    width: auto !important;
                    max-width: none !important;
                    flex: 1 !important;
                }

                /* --- HEADERS & THEME --- */
                .rbc-header { 
                    padding: 12px; 
                    font-weight: 700; 
                    font-size: 0.75rem; 
                    color: #64748b; 
                    border-bottom: 1px solid #e2e8f0; 
                    text-transform: uppercase; 
                    letter-spacing: 0.05em; 
                    text-align: center;
                    background: white;
                }

                .rbc-date-cell {
                    padding: 8px;
                    font-weight: 600;
                    font-size: 0.75rem;
                    text-align: right;
                    color: #64748b;
                    z-index: 10;
                    position: relative;
                }

                .rbc-day-bg { border-left: 1px solid #f1f5f9; }
                .rbc-off-range-bg { background-color: #f8fafc; }
                .rbc-today { background-color: #f0f9ff; }

                /* Dark Mode */
                :global(.dark) .rbc-month-row,
                :global(.dark) .rbc-month-view,
                :global(.dark) .rbc-header,
                :global(.dark) .rbc-time-view .rbc-time-header-content,
                :global(.dark) .rbc-time-header-content > .rbc-row:first-child { 
                    border-color: #334155; 
                }
                :global(.dark) .rbc-header,
                :global(.dark) .rbc-today { background: #1e293b; }
                :global(.dark) .rbc-date-cell,
                :global(.dark) .rbc-header { color: #94a3b8; }
                :global(.dark) .rbc-day-bg { border-color: #334155; }
                :global(.dark) .rbc-off-range-bg { background-color: #0f172a; }
            `}</style>
        </div >
    );
};
