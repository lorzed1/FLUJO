import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart, ComposedChart } from 'recharts';
import { formatCurrency } from '../../../components/ui/Input';

const COLORS = {
    primary: '#4f46e5',
    secondary: '#10b981',
    tertiary: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    purple: '#8b5cf6',
    pink: '#ec4899',
    teal: '#14b8a6'
};

const CHART_COLORS = [COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.info, COLORS.purple, COLORS.pink, COLORS.teal];

interface TooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
}

const CustomTooltip: React.FC<TooltipProps & { valueFormatter?: (val: number) => string }> = ({ active, payload, label, valueFormatter = formatCurrency }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700">
                <p className="text-sm font-bold text-slate-700 dark:text-white mb-2">{label}</p>
                {payload.map((entry, idx) => (
                    <p key={idx} className="text-xs text-slate-600 dark:text-slate-300">
                        <span style={{ color: entry.color }} className="font-bold">{entry.name}: </span>
                        {valueFormatter(entry.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// 1. GRÁFICA DE VENTAS DIARIAS DEL MES
interface DailySalesChartProps {
    data: Array<{ day: number; date: string; sales: number; visits: number; ticket: number }>;
    viewMode: 'sales' | 'visits' | 'combined';
}

export const DailySalesChart: React.FC<DailySalesChartProps> = ({ data, viewMode }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    label={{ value: 'Día del Mes', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: '#6b7280' } }}
                    padding={{ left: 20, right: 20 }}
                />
                <YAxis
                    width={80}
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    tickFormatter={(val) => viewMode === 'visits' ? val.toString() : formatCurrency(val)}
                />
                <Tooltip content={<CustomTooltip valueFormatter={viewMode === 'visits' ? (v) => v.toString() : formatCurrency} />} />
                <Legend />

                {(viewMode === 'sales' || viewMode === 'combined') && (
                    <Bar dataKey="sales" name="Ventas" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
                )}
                {(viewMode === 'visits' || viewMode === 'combined') && (
                    <Line type="monotone" dataKey="visits" name="Visitas" stroke={COLORS.secondary} strokeWidth={3} dot={{ r: 4 }} />
                )}
            </ComposedChart>
        </ResponsiveContainer>
    );
};

// 2. GRÁFICA DE VENTAS POR SEMANA DEL MES
interface WeeklySalesChartProps {
    data: Array<{ weekLabel: string; totalSales: number; totalVisits: number; avgTicket: number }>;
    viewMode: 'sales' | 'visits' | 'combined';
}

export const WeeklySalesChart: React.FC<WeeklySalesChartProps> = ({ data, viewMode }) => {
    return (
        <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="weekLabel" tick={{ fontSize: 12 }} stroke="#6b7280" padding={{ left: 20, right: 20 }} />
                <YAxis
                    width={80}
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    tickFormatter={(val) => viewMode === 'visits' ? val.toString() : formatCurrency(val)}
                />
                <Tooltip content={<CustomTooltip valueFormatter={viewMode === 'visits' ? (v) => v.toString() : formatCurrency} />} />
                <Legend />

                {(viewMode === 'sales' || viewMode === 'combined') && (
                    <Bar dataKey="totalSales" name="Ventas" fill={COLORS.tertiary} radius={[8, 8, 0, 0]} />
                )}
                {(viewMode === 'visits' || viewMode === 'combined') && (
                    <Line
                        type="monotone"
                        dataKey="totalVisits"
                        name="Visitas"
                        stroke={COLORS.secondary}
                        strokeWidth={3}
                        dot={{ r: 5, fill: COLORS.secondary }}
                    />
                )}
            </ComposedChart>
        </ResponsiveContainer>
    );
};

// 3. GRÁFICA DE DÍA DE LA SEMANA POR SEMANA (Comparativa)
interface DayOfWeekByWeekChartProps {
    data: Array<{ dayName: string;[weekKey: string]: any }>;
    weeks: string[];
    viewMode: 'sales' | 'visits' | 'combined';
}

export const DayOfWeekByWeekChart: React.FC<DayOfWeekByWeekChartProps> = ({ data, weeks, viewMode }) => {
    // Invertir el orden de las semanas para que las más recientes se vean adelante
    const reversedWeeks = [...weeks].reverse();

    // Determinar el sufijo según el viewMode
    const dataSuffix = viewMode === 'visits' ? '_visits' : '_sales';

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart
                data={data}
                barCategoryGap="15%"
                barGap={-50}
                barSize={50}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="dayName" tick={{ fontSize: 11 }} stroke="#6b7280" padding={{ left: 20, right: 20 }} />
                <YAxis
                    width={80}
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    tickFormatter={viewMode === 'visits' ? (val) => val.toString() : formatCurrency}
                />
                <Tooltip content={<CustomTooltip valueFormatter={viewMode === 'visits' ? (v) => v.toString() : formatCurrency} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />

                {reversedWeeks.map((week, idx) => {
                    const originalIdx = weeks.length - 1 - idx;
                    return (
                        <Bar
                            key={week}
                            dataKey={`${week}${dataSuffix}`}
                            name={week}
                            fill={CHART_COLORS[originalIdx % CHART_COLORS.length]}
                            fillOpacity={0.65}
                            radius={[6, 6, 0, 0]}
                        />
                    );
                })}
            </BarChart>
        </ResponsiveContainer>
    );
};

// 4. GRÁFICA MENSUAL AÑO SOBRE AÑO
interface MonthlyYearOverYearChartProps {
    data: Array<{ month: string; currentYear: number; previousYear: number }>;
    viewMode: 'sales' | 'visits' | 'combined';
}

export const MonthlyYearOverYearChart: React.FC<MonthlyYearOverYearChartProps> = ({ data, viewMode }) => {
    if (viewMode === 'visits') return <p className="text-center text-gray-500">No disponible para visitas</p>;

    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    return (
        <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#6b7280" padding={{ left: 20, right: 20 }} />
                <YAxis width={80} tick={{ fontSize: 12 }} stroke="#6b7280" tickFormatter={formatCurrency} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                <Bar dataKey="currentYear" name={`${currentYear}`} fill={COLORS.primary} radius={[8, 8, 0, 0]} />
                <Area
                    type="monotone"
                    dataKey="previousYear"
                    name={`${previousYear}`}
                    fill={COLORS.secondary}
                    fillOpacity={0.3}
                    stroke={COLORS.secondary}
                    strokeWidth={2}
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
};

// 5. GRÁFICA DE TORTA - MIX DE PAGOS
interface PaymentMixPieChartProps {
    data: Array<{ name: string; value: number; percentage: number }>;
}

export const PaymentMixPieChart: React.FC<PaymentMixPieChartProps> = ({ data }) => {
    const RADIAN = Math.PI / 180;

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (percent < 0.05) return null;

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="font-bold text-xs"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="flex items-center justify-center gap-8">
            <ResponsiveContainer width="60%" height={280}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="space-y-2">
                {data.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                        <div className="text-xs">
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{entry.name}</p>
                            <p className="text-slate-500 dark:text-slate-400">{formatCurrency(entry.value)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 6. GRÁFICA COMBINADA DE PROMEDIOS POR DÍA DE SEMANA (Ventas y/o Visitas)
interface AvgByDayOfWeekChartProps {
    data: Array<{ dayName: string; avgSales: number; avgPax: number }>;
    viewMode: 'sales' | 'visits' | 'combined';
}

export const AvgByDayOfWeekChart: React.FC<AvgByDayOfWeekChartProps> = ({ data, viewMode }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    dataKey="dayName"
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    label={{ value: 'Día de la Semana', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: '#6b7280' } }}
                    padding={{ left: 20, right: 20 }}
                />
                <YAxis
                    yAxisId="left"
                    width={80}
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    tickFormatter={(val) => viewMode === 'visits' ? Math.round(val).toString() : formatCurrency(val)}
                />
                {viewMode === 'combined' && (
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                        tickFormatter={(val) => Math.round(val).toString()}
                    />
                )}
                <Tooltip content={<CustomTooltip valueFormatter={viewMode === 'visits' ? (v) => Math.round(v).toString() + ' visitas' : formatCurrency} />} />
                <Legend />

                {(viewMode === 'sales' || viewMode === 'combined') && (
                    <Bar
                        yAxisId="left"
                        dataKey="avgSales"
                        name="Venta Promedio"
                        fill={COLORS.purple}
                        radius={[8, 8, 0, 0]}
                    />
                )}
                {(viewMode === 'visits' || viewMode === 'combined') && (
                    <Line
                        yAxisId={viewMode === 'combined' ? 'right' : 'left'}
                        type="monotone"
                        dataKey="avgPax"
                        name="Visitas Promedio"
                        stroke={COLORS.secondary}
                        strokeWidth={3}
                        dot={{ r: 5, fill: COLORS.secondary }}
                    />
                )}
            </ComposedChart>
        </ResponsiveContainer>
    );
};

// 7. GRÁFICA DE RESUMEN MENSUAL DEL AÑO
interface MonthlySummaryChartProps {
    data: Array<{ month: string; monthIndex: number; sales: number; visits: number }>;
    viewMode: 'sales' | 'visits' | 'combined';
}

export const MonthlySummaryChart: React.FC<MonthlySummaryChartProps> = ({ data, viewMode }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    padding={{ left: 20, right: 20 }}
                />
                <YAxis
                    width={80}
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                    tickFormatter={(val) => viewMode === 'visits' ? val.toString() : formatCurrency(val)}
                />
                <Tooltip content={<CustomTooltip valueFormatter={viewMode === 'visits' ? (v) => v.toString() : formatCurrency} />} />
                <Legend />

                {(viewMode === 'sales' || viewMode === 'combined') && (
                    <Bar
                        dataKey="sales"
                        name="Ventas"
                        fill={COLORS.primary}
                        radius={[8, 8, 0, 0]}
                    />
                )}
                {(viewMode === 'visits' || viewMode === 'combined') && (
                    <Line
                        type="monotone"
                        dataKey="visits"
                        name="Visitas"
                        stroke={COLORS.secondary}
                        strokeWidth={3}
                        dot={{ r: 5, fill: COLORS.secondary }}
                    />
                )}
            </ComposedChart>
        </ResponsiveContainer>
    );
};
