import React from 'react';
import { Card } from '../../../components/ui/Card';
import { ChartBarIcon, CalendarIcon } from '../../../components/ui/Icons';
import {
    DailySalesChart,
    WeeklySalesChart,
    DayOfWeekByWeekChart,
    MonthlyYearOverYearChart,
    AvgByDayOfWeekChart,
    MonthlySummaryChart
} from '../components/NewCharts';
import { ViewModeSelector } from './ViewModeSelector';

interface SalesAnalyticsSectionProps {
    charts: any;
    filters: any;
    weekKeys: string[];
    viewMode: 'sales' | 'visits' | 'combined';
    onViewModeChange: (mode: 'sales' | 'visits' | 'combined') => void;
}

export const SalesAnalyticsSection: React.FC<SalesAnalyticsSectionProps> = ({
    charts,
    filters,
    weekKeys,
    viewMode,
    onViewModeChange
}) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">📈 Análisis de Ventas y Visitas</h2>
                <ViewModeSelector viewMode={viewMode} onChange={onViewModeChange} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Ventas Diarias del Mes */}
                {filters.periodMode === 'month' && (
                    <Card className="p-3">
                        <div className="mb-2">
                            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <ChartBarIcon className="w-5 h-5 text-indigo-600" />
                                Ventas Diarias del Mes
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Evolución día a día (1-31)</p>
                        </div>
                        <DailySalesChart data={charts.dailySales} viewMode={viewMode} />
                    </Card>
                )}

                {/* Ventas por Semana */}
                {filters.periodMode === 'month' && charts.weeklySales.length > 0 && (
                    <Card className="p-3">
                        <div className="mb-2">
                            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-amber-600" />
                                Ventas por Semana
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Total acumulado por semana del mes</p>
                        </div>
                        <WeeklySalesChart data={charts.weeklySales} viewMode={viewMode} />
                    </Card>
                )}

                {/* Día de Semana por Semana */}
                {filters.periodMode === 'month' && weekKeys.length > 0 && (
                    <Card className="p-3 lg:col-span-2">
                        <div className="mb-2">
                            <h3 className="text-base font-bold text-slate-800 dark:text-white">Comparación Semanal por Día</h3>
                            <p className="text-xs text-slate-400 mt-1">Lunes de semana 1 vs Lunes de semana 2, etc.</p>
                        </div>
                        <DayOfWeekByWeekChart data={charts.dayOfWeekByWeek} weeks={weekKeys} viewMode={viewMode} />
                    </Card>
                )}

                {/* Resumen Mensual Año sobre Año */}
                {filters.periodMode === 'year' && (
                    <Card className="p-3 lg:col-span-2">
                        <div className="mb-2">
                            <h3 className="text-base font-bold text-slate-800 dark:text-white">Resumen Anual vs Año Anterior</h3>
                            <p className="text-xs text-slate-400 mt-1">Comparación mes a mes</p>
                        </div>
                        <MonthlyYearOverYearChart data={charts.monthlyYearOverYear} viewMode={viewMode} />
                    </Card>
                )}

                {/* Promedio por Día de Semana */}
                <Card className="p-3">
                    <div className="mb-2">
                        <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <ChartBarIcon className="w-5 h-5 text-purple-600" />
                            Promedio por Día de Semana
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            {viewMode === 'sales' && 'Ventas promedio según el día de la semana'}
                            {viewMode === 'visits' && 'Visitas promedio según el día de la semana'}
                            {viewMode === 'combined' && 'Ventas y visitas promedio según el día de la semana'}
                        </p>
                    </div>
                    <AvgByDayOfWeekChart data={charts.avgSalesByDayOfWeek} viewMode={viewMode} />
                </Card>

                {/* Resumen Anual */}
                <Card className="p-3">
                    <div className="mb-2">
                        <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-indigo-600" />
                            Resumen Anual {filters.selectedDate.getFullYear()}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            {viewMode === 'sales' && 'Ventas totales por mes del año'}
                            {viewMode === 'visits' && 'Visitas totales por mes del año'}
                            {viewMode === 'combined' && 'Ventas y visitas totales por mes del año'}
                        </p>
                    </div>
                    <MonthlySummaryChart data={charts.monthlySummary} viewMode={viewMode} />
                </Card>
            </div>
        </div>
    );
};
