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
        <div className="flex flex-col w-full h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Contenedor Principal (Card) - Grows with content */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                    {loading ? (
                        <div className="flex p-12 items-center justify-center">
                            <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-100 border-t-indigo-600 mb-3"></div>
                                <span className="text-indigo-600 font-bold text-xs">Calculando...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4">
                            <ProjectionsDataTable
                                currentDate={currentDate}
                                events={events}
                                calculatedProjections={calculatedProjections}
                                storedProjections={storedProjections}
                                realSales={realSales}
                                containerClassName=""
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
