import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { SalesProjection } from '../../../types';
import { ProjectionResult } from '../../../utils/projections';
import { formatMoney } from '../../../utils/formatters';

interface DailySalesVsGoalProps {
    currentDate: Date;
    calculatedProjections: Record<string, ProjectionResult>;
    storedProjections: Record<string, SalesProjection>;
    realSales: Record<string, number>;
}

export const DailySalesVsGoalChart: React.FC<DailySalesVsGoalProps> = ({
    currentDate,
    calculatedProjections,
    storedProjections,
    realSales
}) => {
    const data = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const days = eachDayOfInterval({ start, end });

        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            // Prioridad: Proyección Guardada > Calculada
            const goal = storedProjections[dateStr]?.amountAdjusted ?? calculatedProjections[dateStr]?.final ?? 0;
            const real = realSales[dateStr] || 0;

            // Cumplimiento para color
            const achievement = goal > 0 ? (real / goal) : 0;
            let color = '#94a3b8'; // Slate 400 (Default/Low)
            if (achievement >= 1) color = '#10b981'; // Green 500
            else if (achievement >= 0.8) color = '#f59e0b'; // Amber 500
            else if (real > 0) color = '#ef4444'; // Red 500

            return {
                date: dateStr,
                day: format(day, 'd', { locale: es }),
                fullDate: format(day, 'EEEE d de MMMM', { locale: es }),
                meta: goal,
                real: real,
                color
            };
        });
    }, [currentDate, calculatedProjections, storedProjections, realSales]);

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const diff = data.real - data.meta;
            const percent = data.meta > 0 ? ((data.real / data.meta) * 100).toFixed(1) : '0';

            return (
                <div className="bg-white dark:bg-slate-800 p-3 border border-gray-100 dark:border-slate-700 shadow-xl rounded-lg text-xs">
                    <p className="font-bold text-gray-700 dark:text-gray-200 mb-2 capitalize">{data.fullDate}</p>
                    <div className="space-y-1">
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-500">Meta:</span>
                            <span className="font-mono font-medium">{formatMoney(data.meta)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-500">Real:</span>
                            <span className={`font-mono font-bold ${data.real >= data.meta ? 'text-green-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                {formatMoney(data.real)}
                            </span>
                        </div>
                        <div className="border-t border-gray-100 dark:border-slate-700 my-1 pt-1 flex justify-between gap-4">
                            <span className="text-gray-500">Diferencia:</span>
                            <span className={`font-mono font-bold ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {diff > 0 ? '+' : ''}{formatMoney(diff)}
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-500">Cumplimiento:</span>
                            <span className={`font-mono font-bold ${Number(percent) >= 100 ? 'text-green-600' : 'text-amber-500'}`}>
                                {percent}%
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 h-full flex flex-col">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                Cumplimiento Diario (Real vs Meta)
            </h3>

            <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        barGap={-20} // Trick: Negative gap equal to the wider bar makes them overlap
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                        <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#64748B' }}
                            interval={0}
                        />
                        <YAxis hide={true} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9', opacity: 0.5 }} />

                        {/* Meta (Background Bar) - Wider and taller if goal is higher */}
                        <Bar
                            dataKey="meta"
                            fill="#F1F5F9" // Very light slate
                            barSize={20} // Wider bar
                            radius={[4, 4, 4, 4]}
                            name="Meta"
                            minPointSize={2} // Ensure visible even if 0? No, 0 is 0.
                        />

                        {/* Real (Foreground Bar) - Thinner */}
                        <Bar
                            dataKey="real"
                            barSize={8} // Thin bar inside
                            radius={[4, 4, 4, 4]}
                            name="Real"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            {/* Legend manual */}
            <div className="flex justify-center gap-4 mt-2 text-[10px] text-slate-500">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-slate-200"></div>
                    <span>Meta</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-green-500"></div>
                    <span>Meta Cumplida</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-amber-500"></div>
                    <span>Cerca (80-99%)</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-red-500"></div>
                    <span>Bajo (&lt;80%)</span>
                </div>
            </div>
        </div>
    );
};
