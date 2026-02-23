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
            const weekKey = format(weekStart, 'RRRR-II'); // ISO Year and ISO Week

            if (!weeks[weekKey]) {
                weeks[weekKey] = {
                    weekLabel: `Sem ${format(weekStart, 'I')} (${format(weekStart, 'd')})`,
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
                <div className="bg-white dark:bg-slate-800 p-3.5 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl text-[11px] w-52">
                    <p className="font-bold text-slate-700 dark:text-slate-200 mb-3 capitalize text-xs tracking-tight">{data.weekLabel}</p>
                    <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-slate-500">
                            <span className="font-medium">Meta:</span>
                            <span className="font-bold text-slate-600 dark:text-slate-400 tabular-nums">{formatMoney(data.meta)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Real:</span>
                            <span className={`font-bold tabular-nums ${data.percent >= 100 ? 'text-emerald-500' : 'text-indigo-500'}`}>
                                {formatMoney(data.real)}
                            </span>
                        </div>
                        <div className="border-t border-slate-100 dark:border-slate-700 pt-2.5 flex justify-between items-center">
                            <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Cumplimiento</span>
                            <span className={`font-bold ${data.percent >= 100 ? 'text-emerald-500' : 'text-amber-500'} text-xs`}>
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
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
                <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
                <h3 className="text-[13px] font-bold text-slate-700 dark:text-white uppercase tracking-wider">
                    Cumplimiento Semanal
                </h3>
            </div>

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
