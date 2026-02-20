
import React, { useMemo } from 'react';
import { useProjections } from '../../projections/hooks/useProjections';
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getISOWeek, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon,
    ChartBarIcon, CalendarDaysIcon, ScaleIcon,
} from '../../../components/ui/Icons';

const formatCOP = (value: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
    }).format(value);

const formatCompact = (value: number): string => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
};

export const ProjectionsView: React.FC<{ selectedDate: Date }> = ({ selectedDate }) => {
    const {
        currentDate,
        setCurrentDate,
        calculatedProjections,
        realSales,
        projections: storedProjections,
        loading,
    } = useProjections();

    const [isMounted, setIsMounted] = React.useState(false);
    React.useEffect(() => { setIsMounted(true); }, []);

    // Sincronizar mes
    React.useEffect(() => {
        const selM = selectedDate.getMonth();
        const selY = selectedDate.getFullYear();
        if (selM !== currentDate.getMonth() || selY !== currentDate.getFullYear()) {
            setCurrentDate(new Date(selY, selM, 1));
        }
    }, [selectedDate]);

    // ── Datos diarios ──
    const dailyData = useMemo(() => {
        const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
        return days.map(day => {
            const ds = format(day, 'yyyy-MM-dd');
            const proj = calculatedProjections[ds];
            const stored = storedProjections[ds];
            const real = realSales[ds] || 0;
            const meta = stored?.amountAdjusted ?? proj?.final ?? 0;
            const hasReal = realSales[ds] !== undefined;
            return {
                day: format(day, 'd'),
                real: hasReal ? real : 0,
                meta,
                hasReal,
            };
        });
    }, [currentDate, calculatedProjections, storedProjections, realSales]);

    // ── Datos semanales ──
    const weeklyData = useMemo(() => {
        const wm = new Map<number, { week: string; real: number; meta: number; days: number; daysWithReal: number }>();
        dailyData.forEach((d, i) => {
            const dayDate = new Date(startOfMonth(currentDate));
            dayDate.setDate(dayDate.getDate() + i);
            const wn = getISOWeek(dayDate);
            const ws = startOfWeek(dayDate, { weekStartsOn: 1 });
            const we = endOfWeek(dayDate, { weekStartsOn: 1 });
            if (!wm.has(wn)) {
                wm.set(wn, {
                    week: `S${wn} (${format(ws, 'dd/MM')}–${format(we, 'dd/MM')})`,
                    real: 0, meta: 0, days: 0, daysWithReal: 0,
                });
            }
            const w = wm.get(wn)!;
            w.meta += d.meta;
            w.real += d.real;
            w.days += 1;
            if (d.hasReal) w.daysWithReal += 1;
        });
        return Array.from(wm.values());
    }, [dailyData, currentDate]);

    // ── KPIs ──
    const summary = useMemo(() => {
        const totalMeta = dailyData.reduce((s, d) => s + d.meta, 0);
        const totalReal = dailyData.filter(d => d.hasReal).reduce((s, d) => s + d.real, 0);
        const totalMetaReal = dailyData.filter(d => d.hasReal).reduce((s, d) => s + d.meta, 0);
        const daysWithData = dailyData.filter(d => d.hasReal).length;
        const totalDays = dailyData.length;
        const compliance = totalMetaReal > 0 ? ((totalReal / totalMetaReal) * 100) : 0;
        const diff = totalReal - totalMetaReal;
        return { totalMeta, totalReal, daysWithData, totalDays, compliance, diff };
    }, [dailyData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                <span className="ml-3 text-gray-500">Cargando proyecciones...</span>
            </div>
        );
    }

    const kpis = [
        {
            title: 'META DEL MES',
            value: formatCOP(summary.totalMeta),
            icon: <CurrencyDollarIcon className="w-5 h-5 text-purple-600" />,
            trend: null,
            sub: format(currentDate, "MMMM yyyy", { locale: es }),
        },
        {
            title: 'VENTA REAL ACUM.',
            value: formatCOP(summary.totalReal),
            icon: <ChartBarIcon className="w-5 h-5 text-indigo-500" />,
            trend: null,
            sub: `${summary.daysWithData} de ${summary.totalDays} días`,
        },
        {
            title: 'CUMPLIMIENTO',
            value: `${summary.compliance.toFixed(1)}%`,
            icon: <ScaleIcon className="w-5 h-5 text-emerald-500" />,
            trend: summary.compliance >= 100 ? summary.compliance - 100 : -(100 - summary.compliance),
            sub: 'Sobre días con datos',
        },
        {
            title: 'DIFERENCIA',
            value: `${summary.diff >= 0 ? '+' : '-'} ${formatCOP(Math.abs(summary.diff)).replace('$', '').trim()}`,
            icon: <CalendarDaysIcon className="w-5 h-5 text-amber-500" />,
            trend: null,
            sub: summary.diff >= 0 ? 'Por encima de la meta' : 'Por debajo de la meta',
            valueColor: summary.diff >= 0 ? 'text-emerald-600' : 'text-rose-600',
        },
    ];

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ── KPI Row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <div
                        key={i}
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                                    {kpi.title}
                                </p>
                                <h3 className={`text-2xl font-bold ${(kpi as any).valueColor || 'text-gray-900 dark:text-white'}`}>
                                    {kpi.value}
                                </h3>
                            </div>
                            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                {kpi.icon}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                            {kpi.trend !== null && (
                                <span
                                    className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${kpi.trend >= 0
                                        ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400'
                                        : 'text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400'
                                        }`}
                                >
                                    {kpi.trend >= 0
                                        ? <ArrowTrendingUpIcon className="w-3 h-3" />
                                        : <ArrowTrendingDownIcon className="w-3 h-3" />
                                    }
                                    {Math.abs(kpi.trend).toFixed(1)}%
                                </span>
                            )}
                            <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                                {kpi.sub}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Row 2: Weekly + Daily Charts ── */}
            <div className="grid grid-cols-1 gap-4">

                {/* Gráfica Semanal */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="mb-2 flex justify-between items-center">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Venta Real vs Meta — Semanal
                        </h3>
                        <div className="flex gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                <span className="text-[10px] text-gray-500">Meta</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] text-gray-500">Venta Real</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[200px] w-full">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={weeklyData}
                                    margin={{ top: 15, right: 10, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                    <XAxis
                                        dataKey="week"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 9 }}
                                        padding={{ left: 10, right: 10 }}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                                        tickFormatter={formatCompact}
                                        width={55}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={false}
                                        width={5}
                                    />
                                    <Tooltip
                                        formatter={(value: number, name: string) => formatCOP(value)}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        }}
                                        labelStyle={{ fontWeight: 600, color: '#1f2937' }}
                                    />
                                    <Bar
                                        yAxisId="left"
                                        dataKey="meta"
                                        name="Meta"
                                        fill="#7c3aed"
                                        radius={[2, 2, 0, 0]}
                                        barSize={20}
                                        fillOpacity={0.3}
                                    />
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="real"
                                        name="Venta Real"
                                        stroke="#059669"
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: '#059669' }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Gráfica Diaria */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="mb-2 flex justify-between items-center">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Venta Real vs Meta — Diario
                        </h3>
                        <div className="flex gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                <span className="text-[10px] text-gray-500">Meta</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] text-gray-500">Venta Real</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[200px] w-full">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={dailyData}
                                    margin={{ top: 15, right: 10, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                    <XAxis
                                        dataKey="day"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 9 }}
                                        interval={0}
                                        padding={{ left: 5, right: 5 }}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                                        tickFormatter={formatCompact}
                                        width={55}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={false}
                                        width={5}
                                    />
                                    <Tooltip
                                        formatter={(value: number) => formatCOP(value)}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        }}
                                        labelStyle={{ fontWeight: 600, color: '#1f2937' }}
                                    />
                                    <Bar
                                        yAxisId="left"
                                        dataKey="meta"
                                        name="Meta"
                                        fill="#7c3aed"
                                        radius={[2, 2, 0, 0]}
                                        barSize={12}
                                        fillOpacity={0.3}
                                    />
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="real"
                                        name="Venta Real"
                                        stroke="#059669"
                                        strokeWidth={1.5}
                                        dot={{ r: 2, fill: '#059669' }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
