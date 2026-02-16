import React from 'react';
import { SalesProjection } from '../../../types';
import { ProjectionResult } from '../../../utils/projections';
import { ProjectionsKPIs } from '../components/ProjectionsKPIs';
import { ProjectionsChart } from '../components/ProjectionsChart';
import { ProjectionsHeatmap } from '../components/ProjectionsHeatmap';
import { DailySalesVsGoalChart } from '../components/DailySalesVsGoalChart';
import { WeeklySalesVsGoalChart } from '../components/WeeklySalesVsGoalChart';

interface ProjectionsDashboardProps {
    currentDate: Date;
    calculatedProjections: Record<string, ProjectionResult>;
    storedProjections: Record<string, SalesProjection>;
    realSales: Record<string, number>;
}

export const ProjectionsDashboardPage: React.FC<ProjectionsDashboardProps> = ({
    currentDate,
    calculatedProjections,
    storedProjections,
    realSales
}) => {
    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 pb-20 w-full h-full">
            {/* KPI Cards */}
            <ProjectionsKPIs
                currentDate={currentDate}
                calculatedProjections={calculatedProjections}
                storedProjections={storedProjections}
                realSales={realSales}
            />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart (Takes 2 columns) */}
                <div className="lg:col-span-2">
                    <ProjectionsChart
                        currentDate={currentDate}
                        calculatedProjections={calculatedProjections}
                        storedProjections={storedProjections}
                        realSales={realSales}
                    />
                </div>

                {/* Heatmap (Takes 1 column) */}
                <div className="lg:col-span-1">
                    <ProjectionsHeatmap
                        currentDate={currentDate}
                        calculatedProjections={calculatedProjections}
                        storedProjections={storedProjections}
                    />
                </div>
            </div>

            {/* Second Row Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Chart (Takes 2 columns) */}
                <div className="lg:col-span-2 min-h-[350px]">
                    <DailySalesVsGoalChart
                        currentDate={currentDate}
                        calculatedProjections={calculatedProjections}
                        storedProjections={storedProjections}
                        realSales={realSales}
                    />
                </div>

                {/* Weekly Chart (Takes 1 column) */}
                <div className="lg:col-span-1 min-h-[350px]">
                    <WeeklySalesVsGoalChart
                        currentDate={currentDate}
                        calculatedProjections={calculatedProjections}
                        storedProjections={storedProjections}
                        realSales={realSales}
                    />
                </div>
            </div>
        </div>
    );
};
