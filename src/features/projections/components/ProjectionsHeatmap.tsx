import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProjectionResult } from '../../../utils/projections';
import { SalesProjection } from '../../../types';

interface ProjectionsHeatmapProps {
    currentDate: Date;
    calculatedProjections: Record<string, ProjectionResult>;
    storedProjections: Record<string, SalesProjection>;
}

export const ProjectionsHeatmap: React.FC<ProjectionsHeatmapProps> = ({
    currentDate,
    calculatedProjections,
    storedProjections
}) => {

    // Generar datos del calendario
    const { calendarDays, maxVal, totalMonth } = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

        // Encontrar padding inicial (días vacíos antes del 1ro)
        const startDay = getDay(monthStart); // 0=Domingo, 1=Lunes...
        // Ajuste para que Lunes sea 0 si queremos semana europea, pero date-fns usa 0=Dom por defecto.
        // Asumiremos vista de calendario estándar (Dom-Sab).

        let max = 0;
        let total = 0;

        const days = daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const projection = calculatedProjections[dateStr];
            const stored = storedProjections[dateStr];

            // Valor a usar: Proyección Final (o Ajustada)
            const value = stored?.amountAdjusted ?? projection?.final ?? 0;

            if (value > max) max = value;
            total += value;

            return {
                date: day,
                dateStr,
                value,
                isCurrentMonth: true
            };
        });

        // Rellenar días previos para cuadrar la grilla
        const paddingDays = Array(startDay).fill(null);

        return { calendarDays: [...paddingDays, ...days], maxVal: max, totalMonth: total };
    }, [currentDate, calculatedProjections, storedProjections]);

    // Función para determinar color basado en intensidad relativo al máximo del mes
    const getIntensityColor = (value: number, max: number) => {
        if (value === 0) return 'bg-slate-50 dark:bg-slate-800/50 text-slate-300';

        const ratio = value / max;

        // Escala de azules/morados (o Indigo primario)
        // < 20% -> muy bajo
        // > 80% -> muy alto (Hot)

        if (ratio < 0.2) return 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-300 border border-indigo-100 dark:border-indigo-900/20';
        if (ratio < 0.4) return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 border border-indigo-200 dark:border-indigo-800/30';
        if (ratio < 0.6) return 'bg-indigo-200 dark:bg-indigo-800/50 text-indigo-700 border border-indigo-300 dark:border-indigo-700/50';
        if (ratio < 0.8) return 'bg-indigo-400 dark:bg-indigo-600 text-white shadow-sm';
        return 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md font-bold ring-1 ring-indigo-300 dark:ring-indigo-400';
    };

    const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-[13px] font-bold text-slate-700 dark:text-white uppercase tracking-wider">
                        Mapa de Intensidad
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Distribución de metas</p>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5">
                {/* Headers */}
                {weekDays.map((d, index) => (
                    <div key={`${d}-${index}`} className="text-center text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase py-1">
                        {d}
                    </div>
                ))}

                {/* Days */}
                {calendarDays.map((dayObj, i) => {
                    if (!dayObj) return <div key={`pad-${i}`} />;

                    const colorClass = getIntensityColor(dayObj.value, maxVal);
                    const isTodayDay = isToday(dayObj.date);

                    return (
                        <div
                            key={dayObj.dateStr}
                            className={`
                                relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all cursor-default group
                                ${colorClass}
                                ${isTodayDay ? 'ring-2 ring-emerald-400 ring-offset-1 dark:ring-offset-slate-800' : ''}
                            `}
                            title={`${format(dayObj.date, 'EEEE d', { locale: es })}: $ ${dayObj.value.toLocaleString()}`}
                        >
                            <span className="text-[10px] font-medium leading-none">
                                {format(dayObj.date, 'd')}
                            </span>
                            {/* Visual Bar Indicator for high values */}
                            {/* {dayObj.value / maxVal > 0.6 && (
                                <div className="absolute bottom-1 w-1 h-1 bg-white rounded-full opacity-50"></div>
                            )} */}
                        </div>
                    );
                })}
            </div>

            {/* Legend / Footer info */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-50 dark:border-slate-700 pt-3">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-indigo-50 border border-indigo-100"></div>
                    <span className="text-[9px] text-slate-400">Bajo</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="h-1 w-16 bg-gradient-to-r from-indigo-50 via-indigo-300 to-indigo-600 rounded-full"></div>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[9px] text-slate-400">Alto</span>
                    <div className="w-2 h-2 rounded-sm bg-indigo-600"></div>
                </div>
            </div>
        </div>
    );
};
