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
    Line
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, getWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { SalesProjection } from '../../../types';
import { ProjectionResult } from '../../../utils/projections';
import { formatMoney } from '../../../utils/formatters';

interface WeeklySalesVsGoalProps {
    currentDate: Date;
    calculatedProjections: Record<string, ProjectionResult>;
    storedProjections: Record<string, SalesProjection>;
    realSales: Record<string, number>;
}

export const WeeklySalesVsGoalChart: React.FC<WeeklySalesVsGoalProps> = ({
    currentDate,
    calculatedProjections,
    storedProjections,
    realSales
}) => {
    const data = useMemo(() => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const days = eachDayOfInterval({ start, end });

        // Group by Week Number
        const weeks: Record<string, { weekLabel: string, startDate: Date, endDate: Date, meta: number, real: number }> = {};

        days.forEach(day => {
            const weekStart = startOfWeek(day, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(day, { weekStartsOn: 1 });
            const weekKey = format(weekStart, 'yyyy-w'); // Unique Week ID

            if (!weeks[weekKey]) {
                weeks[weekKey] = {
                    weekLabel: `Sem ${format(weekStart, 'w')} (${format(weekStart, 'd')})`,
                    startDate: weekStart,
                    endDate: weekEnd,
                    meta: 0,
                    real: 0
                };
            }

            const dateStr = format(day, 'yyyy-MM-dd');
            const goal = storedProjections[dateStr]?.amountAdjusted ?? calculatedProjections[dateStr]?.final ?? 0;
            const real = realSales[dateStr] || 0;

            weeks[weekKey].meta += goal;
            weeks[weekKey].real += real;
        });

        return Object.values(weeks).map(w => {
            const diff = w.real - w.meta;
            const percent = w.meta > 0 ? (w.real / w.meta) * 100 : 0;

            return {
                ...w,
                diff,
                percent,
                fillColor: percent >= 100 ? '#10b981' : (percent >= 80 ? '#f59e0b' : '#ef4444')
            };
        });
    }, [currentDate, calculatedProjections, storedProjections, realSales]);

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white dark:bg-slate-800 p-3 border border-gray-100 dark:border-slate-700 shadow-xl rounded-lg text-xs w-48">
                    <p className="font-bold text-gray-700 dark:text-gray-200 mb-2 capitalize">{data.weekLabel}</p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-slate-500">
                            <span>Meta:</span>
                            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{formatMoney(data.meta)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">Real:</span>
                            <span className={`font-mono font-bold ${data.percent >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                                {formatMoney(data.real)}
                            </span>
                        </div>
                        <div className="border-t border-slate-100 dark:border-slate-700 pt-2 flex justify-between items-center">
                            <span className="text-slate-500 text-[10px]">Cumplimiento</span>
                            <span className={`font-bold ${data.percent >= 100 ? 'text-green-600' : 'text-amber-500'}`}>
                                {data.percent.toFixed(1)}%
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
                <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                Cumplimiento Semanal
            </h3>

            <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                        barGap={-20} // Trick: Negative gap equal to the wider bar makes them overlap
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                        <XAxis
                            dataKey="weekLabel"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#64748B' }}
                            interval={0}
                        />
                        <YAxis hide={true} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9', opacity: 0.5 }} />

                        {/* Meta (Background Bar) */}
                        <Bar
                            dataKey="meta"
                            fill="#F1F5F9"
                            barSize={30} // Wider bar for weeks
                            radius={[4, 4, 4, 4]}
                            name="Meta"
                            minPointSize={2}
                        />

                        {/* Real (Foreground Bar) */}
                        <Bar
                            dataKey="real"
                            barSize={12} // Thinner bar
                            radius={[4, 4, 4, 4]}
                            name="Real"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fillColor} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
