import React, { useMemo } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    Cell
} from 'recharts';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProjectionResult } from '../../../utils/projections';
import { SalesProjection } from '../../../types';

interface ProjectionsChartProps {
    currentDate: Date;
    calculatedProjections: Record<string, ProjectionResult>;
    storedProjections: Record<string, SalesProjection>;
    realSales: Record<string, number>;
}

export const ProjectionsChart: React.FC<ProjectionsChartProps> = ({
    currentDate,
    calculatedProjections,
    storedProjections,
    realSales
}) => {

    // Preparar datos para el gráfico
    const data = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        // Visualmente mostramos solo el mes actual, sin relleno de semanas completas
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const projection = calculatedProjections[dateStr];
            const stored = storedProjections[dateStr];
            const real = realSales[dateStr]; // undefined si no hay registro

            // Prioridad de meta: Manual > Calculada
            const meta = stored?.amountAdjusted ?? projection?.final ?? 0;

            return {
                day: format(day, "d", { locale: es }), // Etiqueta eje X (Día)
                fullDate: format(day, "EEEE d", { locale: es }),
                dateStr,
                meta: Math.round(meta),
                real: real !== undefined ? Math.round(real) : null, // null para que no pinte 0 si no hay dato
                // Deltas para colorear (opcional)
                diff: real !== undefined ? real - meta : 0
            };
        });
    }, [currentDate, calculatedProjections, storedProjections, realSales]);

    // Custom Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg text-xs">
                    <p className="font-bold text-slate-700 dark:text-slate-200 mb-2 capitalize">{payload[0].payload.fullDate}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4 mb-1">
                            <span className="text-slate-500 capitalize" style={{ color: entry.color }}>
                                {entry.name}:
                            </span>
                            <span className="font-mono font-bold text-slate-700 dark:text-white">
                                $ {entry.value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    ))}
                    {/* Diff Calculation */}
                    {payload.find((p: any) => p.dataKey === 'real')?.value !== null && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <span className="font-bold text-slate-500">Diferencia:</span>
                            <span className={`font-mono font-bold ${payload[0].payload.diff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {payload[0].payload.diff >= 0 ? '+' : ''}$ {payload[0].payload.diff.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm mb-4 h-[350px]">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-white flex items-center gap-2">
                        Tendencia de Ventas
                    </h3>
                    <p className="text-[10px] text-slate-400">Real (Barras) vs Meta (Línea)</p>
                </div>
                {/* Leyenda Custom simple */}
                <div className="flex gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                        <span className="text-xs text-slate-500 font-medium">Real</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-8 h-0.5 border-t-2 border-slate-400 border-dashed"></span>
                        <span className="text-xs text-slate-500 font-medium">Meta</span>
                    </div>
                </div>
            </div>

            <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                        <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#64748B' }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#64748B' }}
                            tickFormatter={(value) => `$${value / 1000000}M`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9', opacity: 0.4 }} />

                        {/* Meta Line (Reference) */}
                        <Area
                            type="monotone"
                            dataKey="meta"
                            stroke="#94A3B8"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            fill="url(#colorMeta)"
                            fillOpacity={0.05}
                            name="Meta"
                            activeDot={false}
                        />
                        <defs>
                            <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        {/* Real Sales (Bars) */}
                        <Bar
                            dataKey="real"
                            name="Venta Real"
                            radius={[4, 4, 0, 0]}
                            barSize={12}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={
                                        entry.real === null
                                            ? 'transparent'
                                            : (entry.real >= entry.meta ? '#10B981' : '#3B82F6')
                                    }
                                />
                            ))}
                        </Bar>
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
