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
        <div className="flex-1 overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col mb-3">
            {/* Scrollable Area */}
            <div className="flex-1 overflow-y-auto pr-1">
                {loading ? (
                    <div className="flex h-full items-center justify-center bg-white">
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-100 border-t-primary mb-3"></div>
                            <span className="text-primary font-bold text-xs">Calculando...</span>
                        </div>
                    </div>
                ) : (
                    <ProjectionsDataTable
                        currentDate={currentDate}
                        events={events}
                        calculatedProjections={calculatedProjections}
                        storedProjections={storedProjections}
                        realSales={realSales}
                    />
                )}
            </div>
        </div>
    );
};
