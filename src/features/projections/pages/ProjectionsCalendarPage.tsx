import React, { useMemo } from 'react';
import { SalesEvent, SalesProjection } from '../../../types';
import { ProjectionResult } from '../../../utils/projections';
import { ProjectionsCalendar } from '../components/ProjectionsCalendar';
import { useExpenseProjections } from '../hooks/useExpenseProjections';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PageHeader } from '../../../components/layout/PageHeader';
import { CalendarIcon, QuestionMarkCircleIcon } from '../../../components/ui/Icons';
import { DateNavigator } from '../../../components/ui/DateNavigator';

interface ProjectionsCalendarPageProps {
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    setIsHelpOpen: (open: boolean) => void;
    setIsConfigOpen: (open: boolean) => void;
    events: SalesEvent[];
    calculatedProjections: Record<string, ProjectionResult>;
    storedProjections: Record<string, SalesProjection>;
    realSales: Record<string, number>;
    loading: boolean;
    onAddEvent: (event: Omit<SalesEvent, 'id'>) => Promise<void>;
    onDeleteEvent: (id: string) => Promise<void>;
}

export const ProjectionsCalendarPage: React.FC<ProjectionsCalendarPageProps> = ({
    currentDate,
    setCurrentDate,
    setIsHelpOpen,
    setIsConfigOpen,
    events,
    calculatedProjections,
    storedProjections,
    realSales,
    loading,
    onAddEvent,
    onDeleteEvent
}) => {
    // Cargar proyecciones financieras (PE) para el calendario
    const { projections: expenseProjections } = useExpenseProjections(currentDate);

    // Convertir array de gastos a un mapa por fecha para acceso rápido
    const financialProjections = useMemo(() => {
        const map: Record<string, number> = {};
        expenseProjections.forEach(p => {
            map[format(p.date, 'yyyy-MM-dd')] = p.amount;
        });
        return map;
    }, [expenseProjections]);

    return (
        <div className="flex flex-col space-y-6">
            <PageHeader
                title="Calendario de Metas de Venta"
                breadcrumbs={[
                    { label: 'Proyección de ventas', path: '/projections' },
                    { label: 'Calendario' }
                ]}
                icon={<CalendarIcon className="h-6 w-6" />}
                actions={
                    <div className="flex flex-wrap items-center gap-3 h-10">
                        {/* Indicadores de Categoría – Aliaddo §4 Z1 (Contextual) */}
                        <div className="hidden xl:flex items-center gap-4 px-4 h-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md">
                            {[
                                { dot: 'bg-amber-400', label: 'Quincenal' },
                                { dot: 'bg-red-400', label: 'Festivo' },
                                { dot: 'bg-purple-400', label: 'Evento' },
                            ].map(item => (
                                <span key={item.label} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                                    {item.label}
                                </span>
                            ))}
                        </div>

                        {/* Selector de Mes – Aliaddo §4 Z2 (Centro) */}
                        <DateNavigator
                            value={currentDate}
                            onChange={setCurrentDate}
                        />

                        {/* Botones de Acción – Aliaddo §4 Z3 (Derecha) */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsConfigOpen(true)}
                                className="h-10 flex items-center gap-2 px-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md hover:bg-slate-50 hover:text-purple-600 text-[13px] font-semibold text-slate-600 dark:text-slate-300 transition-all shadow-sm active:scale-95"
                                title="Configuración de metas"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                <span>Configurar</span>
                            </button>

                            <button
                                onClick={() => setIsHelpOpen(true)}
                                className="h-10 w-10 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 hover:text-purple-600 dark:hover:bg-slate-700 transition-all"
                                title="Ayuda"
                            >
                                <QuestionMarkCircleIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                }
            />

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6 flex flex-col">
                <ProjectionsCalendar
                    currentDate={currentDate}
                    events={events}
                    calculatedProjections={calculatedProjections}
                    financialProjections={financialProjections}
                    storedProjections={storedProjections}
                    realSales={realSales}
                    loading={loading}
                    onAddEvent={onAddEvent}
                    onDeleteEvent={onDeleteEvent}
                />
            </div>
        </div>
    );
};
