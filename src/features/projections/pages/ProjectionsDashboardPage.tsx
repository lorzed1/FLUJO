import React, { useState, useMemo } from 'react';
import { SalesProjection } from '../../../types';
import { ProjectionResult } from '../../../utils/projections';
import { ProjectionsKPIs } from '../components/ProjectionsKPIs';
import { ProjectionsChart } from '../components/ProjectionsChart';
import { ProjectionsHeatmap } from '../components/ProjectionsHeatmap';
import { DailySalesVsGoalChart } from '../components/DailySalesVsGoalChart';
import { WeeklySalesVsGoalChart } from '../components/WeeklySalesVsGoalChart';
import { useExpenseProjections } from '../hooks/useExpenseProjections';
import { format, isSameMonth, parseISO } from 'date-fns';
import { DraggableDashboardGrid } from '../components/DraggableDashboardGrid';
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline'; // Asegurar import de iconos

interface ProjectionsDashboardProps {
    currentDate: Date;
    calculatedProjections: Record<string, ProjectionResult>; // Statistical Projections
    storedProjections: Record<string, SalesProjection>;
    realSales: Record<string, number>;
}

type DashboardMode = 'statistical' | 'financial';

export const ProjectionsDashboardPage: React.FC<ProjectionsDashboardProps> = ({
    currentDate,
    calculatedProjections: statisticalProjections,
    storedProjections,
    realSales
}) => {
    const [dashboardMode, setDashboardMode] = useState<DashboardMode>('statistical');
    const [isEditingLayout, setIsEditingLayout] = useState(false);

    const {
        projections: expenseProjections,
        weeks: expenseWeeks,
        totalMonthlyExpenses,
        isLoading: isLoadingExpenses
    } = useExpenseProjections(currentDate);

    // Adaptador: Convierte ExpenseProjectionDay[] a Record<string, ProjectionResult>
    const financialProjections = useMemo(() => {
        const adapted: Record<string, ProjectionResult> = {};
        expenseProjections.forEach(dayProj => {
            const dateKey = format(dayProj.date, 'yyyy-MM-dd');
            adapted[dateKey] = {
                final: dayProj.amount,
                baseline: dayProj.amount,
                rawAverage: dayProj.amount,
                range: {
                    lower: dayProj.amount,
                    upper: dayProj.amount,
                    stdDev: 0
                },
                historicalComparisons: {
                    avg4WeeksSale: 0,
                    avg4WeeksVisits: 0,
                    avg8WeeksSale: 0,
                    avg8WeeksVisits: 0,
                    recordsUsedCount: 0
                },
                traffic: {
                    avgVisits: 0,
                    avgTransactions: 0,
                    avgTicket: 0,
                    projectedVisits: 0,
                    projectedTransactions: 0,
                    projectedTicket: 0
                },
                adjustments: {
                    inflationAmount: 0,
                    growthAmount: 0,
                    eventsImpactAmount: 0
                },
                rawAverageTickets: 0,
                baselineTickets: 0,
                finalTickets: 0,
                factors: {
                    inflation: 1,
                    growth: 1,
                    eventModifier: 1,
                    weightingApplied: false
                },
                usedHistory: [],
                excludedHistory: [],
                confidence: 'high'
            };
        });
        return adapted;
    }, [expenseProjections]);

    // Selección de datos activa
    const activeProjections = dashboardMode === 'statistical'
        ? statisticalProjections
        : financialProjections;

    // Selección filtrada SOLO MES ACTUAL para KPIs
    const activeProjectionsForKPIs = useMemo(() => {
        const source = dashboardMode === 'statistical' ? statisticalProjections : financialProjections;
        const monthPrefix = format(currentDate, 'yyyy-MM'); // "2026-02"

        const filtered: Record<string, ProjectionResult> = {};
        Object.keys(source).forEach(key => {
            if (key.startsWith(monthPrefix)) {
                filtered[key] = source[key];
            }
        });
        return filtered;
    }, [dashboardMode, statisticalProjections, financialProjections, currentDate]);

    // Configuración del Layout por defecto
    const defaultLayouts = {
        lg: [
            { i: 'kpis', x: 0, y: 0, w: 3, h: 4 }, // KPIs ocupan todo el ancho arriba
            { i: 'chart_main', x: 0, y: 4, w: 2, h: 10 }, // Chart principal 2/3 ancho
            { i: 'heatmap', x: 2, y: 4, w: 1, h: 10 }, // Heatmap 1/3 ancho
            { i: 'chart_weekly', x: 0, y: 14, w: 3, h: 8 } // Chart semanal abajo full width
        ],
        md: [
            { i: 'kpis', x: 0, y: 0, w: 3, h: 4 },
            { i: 'chart_main', x: 0, y: 4, w: 3, h: 10 },
            { i: 'heatmap', x: 0, y: 14, w: 3, h: 10 },
            { i: 'chart_weekly', x: 0, y: 24, w: 3, h: 8 }
        ],
        sm: [
            { i: 'kpis', x: 0, y: 0, w: 1, h: 6 },
            { i: 'chart_main', x: 0, y: 6, w: 1, h: 10 },
            { i: 'heatmap', x: 0, y: 16, w: 1, h: 10 },
            { i: 'chart_weekly', x: 0, y: 26, w: 1, h: 8 }
        ]
    };

    // Definición de Items para el Grid
    const gridItems = useMemo(() => {
        const items = [];

        // 1. KPIs
        if (dashboardMode === 'statistical') {
            items.push({
                key: 'kpis',
                component: (
                    <div className="h-full overflow-hidden">
                        <ProjectionsKPIs
                            currentDate={currentDate}
                            calculatedProjections={activeProjectionsForKPIs}
                            storedProjections={storedProjections}
                            realSales={realSales}
                            mode={dashboardMode}
                        />
                    </div>
                )
            });
        } else {
            items.push({
                key: 'kpis',
                component: (
                    <div className="h-full w-full border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                        Espacio reservado para nuevos KPIs Financieros
                    </div>
                )
            });
        }

        // 2. Chart Principal
        items.push({
            key: 'chart_main',
            component: (
                <ProjectionsChart
                    currentDate={currentDate}
                    calculatedProjections={activeProjections}
                    storedProjections={storedProjections}
                    realSales={realSales}
                />
            )
        });

        // 3. Heatmap
        items.push({
            key: 'heatmap',
            component: (
                <ProjectionsHeatmap
                    currentDate={currentDate}
                    calculatedProjections={activeProjections}
                    storedProjections={storedProjections}
                />
            )
        });

        // 4. Chart Semanal
        items.push({
            key: 'chart_weekly',
            component: (
                <WeeklySalesVsGoalChart
                    currentDate={currentDate}
                    calculatedProjections={activeProjections}
                    storedProjections={storedProjections}
                    realSales={realSales}
                />
            )
        });

        return items;
    }, [dashboardMode, currentDate, activeProjectionsForKPIs, storedProjections, realSales, activeProjections]);

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-20 w-full h-full relative p-4">

            {/* Toolbar: Toggle Mode + Lock Layout */}
            <div className="flex justify-between items-center sticky top-0 z-20 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-all -mx-4 px-6 shadow-sm border-b border-slate-100 dark:border-slate-800">

                {/* Center: Mode Switch */}
                <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1.5 rounded-xl shadow-inner mx-auto border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setDashboardMode('statistical')}
                        className={`px-6 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${dashboardMode === 'statistical'
                            ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm transform scale-[1.02]'
                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                    >
                        📊 Estadística
                    </button>
                    <button
                        onClick={() => setDashboardMode('financial')}
                        className={`px-6 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${dashboardMode === 'financial'
                            ? 'bg-emerald-500 text-white shadow-sm transform scale-[1.02]'
                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                    >
                        💰 Punto de Equilibrio
                    </button>
                </div>

                {/* Right: Layout Lock */}
                <div className="absolute right-4 top-3">
                    <button
                        onClick={() => setIsEditingLayout(!isEditingLayout)}
                        title={isEditingLayout ? "Bloquear Diseño" : "Editar Diseño"}
                        className={`p-2.5 rounded-lg transition-all border ${isEditingLayout
                            ? 'bg-purple-100 text-purple-700 border-purple-200 shadow-inner'
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-purple-600 dark:hover:text-purple-400 shadow-sm hover:shadow active:scale-95'
                            }`}
                    >
                        {isEditingLayout ? <LockOpenIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Draggable Dashboard Grid */}
            <DraggableDashboardGrid
                items={gridItems}
                layoutId="projections_dashboard_v1"
                defaultLayouts={defaultLayouts}
                isEditing={isEditingLayout}
                rowHeight={30} // Row height base para granularidad fina
            />

        </div>
    );
};
