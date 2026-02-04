import React, { useState, useCallback, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Event, View, Views } from 'react-big-calendar';
import withDragAndDrop, { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay, parseISO, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
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
    ListBulletIcon
} from '@heroicons/react/24/outline';

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
    const goToBack = () => { toolbar.onNavigate('PREV'); };
    const goToNext = () => { toolbar.onNavigate('NEXT'); };
    const goToCurrent = () => { toolbar.onNavigate('TODAY'); };

    const label = () => {
        const date = toolbar.date;
        return format(date, 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 bg-white dark:bg-slate-800 p-1">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl shadow-inner">
                <button
                    onClick={goToBack}
                    className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-lg text-slate-600 dark:text-slate-300 transition-all shadow-sm hover:shadow"
                    title="Mes Anterior"
                >
                    <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <button onClick={goToCurrent} className="px-3 py-1.5 text-xs font-bold uppercase text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-all shadow-sm hover:shadow">
                    Hoy
                </button>
                <button
                    onClick={goToNext}
                    className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-lg text-slate-600 dark:text-slate-300 transition-all shadow-sm hover:shadow"
                    title="Mes Siguiente"
                >
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
            </div>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight capitalize">
                {label()}
            </h2>

            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl shadow-inner">
                {['month', 'week'].map(view => (
                    <button
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
        <div className={`flex flex-col justify-between px-2 py-1 h-full w-full rounded-md shadow-sm text-[10px] leading-tight overflow-hidden transition-all hover:scale-[1.02] hover:shadow-md hover:z-10 relative ${bgClass}`}>
            {isProjected && <div className="absolute top-0 right-0 w-2 h-2 border-t-4 border-r-4 border-slate-400/30 rounded-bl-md"></div>}

            <div className="font-bold truncate pr-1">
                {event.resource.title}
            </div>
            <div className="font-mono font-medium opacity-90">
                ${event.resource.amount.toLocaleString()}
            </div>
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

    const fetchEvents = useCallback(async () => {
        try {
            const commitments = await budgetService.getCommitments(
                format(currentRange.start, 'yyyy-MM-dd'),
                format(currentRange.end, 'yyyy-MM-dd')
            );

            // Filtrar eventos de la regla si ya existe uno real para la misma fecha (esto ya lo hace getCommitments en parte, pero aseguramos visualmente)
            // getCommitments ya maneja la prioridad Real > Virtual

            const mappedEvents: MyEvent[] = commitments.map(c => {
                const date = parseISO(c.dueDate);
                return {
                    id: c.id,
                    title: c.title, // Keep simple title for internal use
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

        // Optimistic UI Update
        const oldEvents = [...events];
        setEvents(prev => prev.map(ev =>
            ev.id === myEvent.id ? { ...ev, start: new Date(start), end: new Date(start) } : ev
        ));

        try {
            if (myEvent.id.startsWith('projected-')) {
                // Si movemos un virtual, lo materializamos
                // Necesitamos cleanear los datos para crear un compromiso nuevo
                const { id, title, amount, status, category, recurrenceRuleId } = myEvent.resource;
                await budgetService.addCommitment({
                    title,
                    amount,
                    status,
                    category,
                    recurrenceRuleId,
                    dueDate: newDate, // Nueva fecha
                });
                // Recargamos porque ahora es real 
                // (fetchEvents se encargará de ocultar el virtual original si coincide fecha o simplemente mostrar el nuevo)
                // getCommitments logic might show BOTH if date logic isn't perfect, but usually virtuals exclude dates where reals exist for same rule?
                // Step 393: getCommitments excludes virtual if `realCommitments.some(rc => rc.recurrenceRuleId === rule.id && rc.dueDate === dateStr)`
                // Si movemos el virtual a una FECHA NUEVA, el virtual de la FECHA VIEJA volverá a aparecer (porque no hay real ahí).
                // Y el real nuevo aparecerá en la FECHA NUEVA.
                // Esto es CORRECTO: "Movi este pago para el dia 15". El sistema dice "Ok, pagas el 15. Pero la regla dice que debias pagar el 5. Entonces el 5 queda pendiente? O se asume movido?"
                // Generalmente se asume movido. Pero la logica virtual es rígida.
                // Por ahora, asumimos que MATERIALIZARLO es lo correcto.
            } else {
                await budgetService.updateCommitment(myEvent.id, {
                    dueDate: newDate
                });
            }
            await fetchEvents(); // Sync final
        } catch (error) {
            console.error("Error updating event drop:", error);
            setEvents(oldEvents); // Rollback
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error al mover el evento' });
        }
    };

    const handleSelectSlot = useCallback(
        ({ start }: { start: Date }) => {
            openForm(start);
        },
        [openForm]
    );

    const handleSelectEvent = useCallback(
        (event: MyEvent) => {
            openForm(undefined, event.resource);
        },
        [openForm]
    );

    const handleRangeChange = (range: Date[] | { start: Date; end: Date }) => {
        if (Array.isArray(range)) {
            // If array, it's usually day/week view context, grab min/max
            const sorted = range.sort((a, b) => a.getTime() - b.getTime());
            setCurrentRange({ start: sorted[0], end: sorted[sorted.length - 1] });
        } else {
            setCurrentRange(range);
        }
    };

    const handleViewChange = (v: View) => {
        setView(v);
    };

    return (
        <div className="h-full bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
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
                    resizable={false}
                    style={{ height: view === Views.MONTH ? 'auto' : '100%', minHeight: '600px' }}
                    culture='es'
                    components={{
                        toolbar: CustomToolbar,
                        event: CustomEvent as any
                    }}
                    eventPropGetter={() => ({
                        style: { backgroundColor: 'transparent', boxShadow: 'none' } // Remove default styles effectively
                    })}
                />
            </div>
            <style>{`
                .rbc-calendar { font-family: inherit; height: auto !important; min-height: 100%; }
                
                /* ALLOW CELLS TO GROW */
                .rbc-month-view { 
                    border: none; 
                    flex: unset !important; 
                    height: auto !important; 
                    display: block !important; 
                    overflow: visible !important;
                }
                
                .rbc-month-row { 
                    border-bottom: 1px solid #e2e8f0;
                    overflow: visible !important; 
                    height: auto !important; /* Let it grow */
                    min-height: 120px; /* Minimum height for empty cells */
                    flex: unset !important; 
                    max-height: none !important;
                }
                
                :global(.dark) .rbc-month-row { border-color: #334155; }

                /* FORCE CONTENT TO STACK */
                .rbc-row-content { 
                    position: static !important; /* Disable absolute positioning logic */
                    height: auto !important; 
                    overflow: visible !important;
                    z-index: 4;
                    pointer-events: none; /* Let clicks pass through if needed, though RBC handles events */
                }
                
                /* EVENTS STACKING */
                .rbc-row-content .rbc-row {
                    display: flex !important;
                    flex-direction: row !important;
                    height: auto !important;
                    position: static !important;
                }

                /* DATE CELL HEADER */
                .rbc-date-cell {
                    padding: 4px 8px;
                    font-weight: 600;
                    font-size: 0.75rem;
                    text-align: right;
                    color: #64748b;
                }
                :global(.dark) .rbc-date-cell { color: #94a3b8; }

                /* SEGMENTS override */
                .rbc-row-segment {
                    padding: 2px 4px;
                    width: 100%; /* Ensure full width in daily slot if needed */
                    max-width: 14.28%; /* 1/7th width per day approx */
                    flex: 1 1 0px; /* Flex basis */
                    overflow: visible !important;
                }

                /* HIDE Background grid logic that conflicts with growing rows */
                .rbc-row-bg { 
                    display: flex;
                    flex-direction: row;
                    height: 100%;
                    overflow: hidden;
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 1;
                }
                
                /* Sticky Header */
                .rbc-header { 
                    padding: 8px; 
                    font-weight: 600; 
                    font-size: 0.75rem; 
                    color: #64748b; 
                    border-bottom: 1px solid #e2e8f0; 
                    text-transform: uppercase; 
                    letter-spacing: 0.05em; 
                    position: sticky;
                    top: 0;
                    z-index: 50; /* Higher z-index for sticky */
                    background: white;
                }
                :global(.dark) .rbc-header { background: #1e293b; color: #94a3b8; border-color: #334155; }

                .rbc-day-bg { border-left: 1px solid #f1f5f9; }
                .rbc-off-range-bg { background-color: #f8fafc; }
                .rbc-today { background-color: #f0f9ff; }
                
                /* Event Styling */
                .rbc-event { 
                    background: transparent; 
                    padding: 0; 
                    outline: none; 
                    position: relative !important; /* Force static flow */
                    display: block !important;
                    width: 100% !important;
                    left: 0 !important;
                    top: 0 !important;
                    pointer-events: auto;
                    margin-bottom: 2px;
                }
                
                .rbc-event-content { font-size: 10px; }
                
                :global(.dark) .rbc-day-bg { border-color: #334155; }
                :global(.dark) .rbc-off-range-bg { background-color: #0f172a; }
                :global(.dark) .rbc-today { background-color: #1e293b; }
            `}</style>
        </div>
    );
};
