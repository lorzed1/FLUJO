import React from 'react';
import { SalesEvent, SalesProjection } from '../../../types';
import { ProjectionResult } from '../../../utils/projections';
import { ProjectionsDataTable } from '../components/ProjectionsDataTable';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ChartBarIcon, QuestionMarkCircleIcon, InformationCircleIcon } from '../../../components/ui/Icons';
import { DateNavigator } from '../../../components/ui/DateNavigator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProjectionsTablePageProps {
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    setIsHelpOpen: (open: boolean) => void;
    setIsConfigOpen: (open: boolean) => void;
    events: SalesEvent[];
    calculatedProjections: Record<string, ProjectionResult>;
    storedProjections: Record<string, SalesProjection>;
    realSales: Record<string, number>;
}

export const ProjectionsTablePage: React.FC<ProjectionsTablePageProps> = ({
    currentDate,
    setCurrentDate,
    setIsHelpOpen,
    setIsConfigOpen,
    events,
    calculatedProjections,
    storedProjections,
    realSales
}) => {
    return (
        <div className="flex flex-col space-y-6">
            <PageHeader
                title="Base de Datos de Proyecciones"
                breadcrumbs={[
                    { label: 'Proyeccion de ventas', path: '/projections' },
                    { label: 'Base de Datos' }
                ]}
                icon={<ChartBarIcon className="h-6 w-6" />}
                actions={
                    <div className="flex flex-wrap items-center gap-2 h-10">
                        {/* Selector de Mes – Aliaddo §4 Z2 */}
                        <DateNavigator
                            value={currentDate}
                            onChange={setCurrentDate}
                        />

                        {/* Config Button */}
                        <button
                            onClick={() => setIsConfigOpen(true)}
                            className="h-full flex items-center gap-2 px-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md hover:bg-slate-50 hover:text-purple-600 text-[13px] font-semibold text-slate-600 dark:text-slate-300 transition-all shadow-sm active:scale-95"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            Configurar
                        </button>
                    </div>
                }
            />

            <div>
                <ProjectionsDataTable
                    currentDate={currentDate}
                    events={events}
                    calculatedProjections={calculatedProjections}
                    storedProjections={storedProjections}
                    realSales={realSales}
                    onInfoClick={() => setIsHelpOpen(true)}
                />
            </div>
        </div>
    );
};
