import React from 'react';
import { SalesProjection, SalesEvent } from '../../../types';
import { ProjectionResult } from '../../../utils/projections';
import { ProjectionsDataTable } from '../components/ProjectionsDataTable';

interface ProjectionsDatabaseProps {
    currentDate: Date;
    events: SalesEvent[];
    calculatedProjections: Record<string, ProjectionResult>;
    storedProjections: Record<string, SalesProjection>;
    realSales: Record<string, number>;
    loading: boolean;
}

export const ProjectionsDatabasePage: React.FC<ProjectionsDatabaseProps> = ({
    currentDate,
    events,
    calculatedProjections,
    storedProjections,
    realSales,
    loading
}) => {
    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Header de la Sección */}
            <div className="flex-none pb-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    Base de Datos
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Detalle diario de proyecciones y ventas.
                </p>
            </div>

            {/* Contenedor Principal (Card) */}
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-100 border-t-indigo-600 mb-3"></div>
                            <span className="text-indigo-600 font-bold text-xs">Calculando...</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col p-4">
                        <ProjectionsDataTable
                            currentDate={currentDate}
                            events={events}
                            calculatedProjections={calculatedProjections}
                            storedProjections={storedProjections}
                            realSales={realSales}
                            containerClassName="h-full"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
