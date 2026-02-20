
import React from 'react';
import { MOCK_SALES_DATA } from '../dashboard-mock-data';
import {
    ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart,
} from 'recharts';
import {
    ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon,
    ChartBarIcon, UsersIcon, CreditCardIcon,
} from '../../../components/ui/Icons';
import { dashboardService } from '../../../services/dashboardService';

const PAYMENT_COLORS = ['#059669', '#7c3aed', '#3b82f6', '#d97706', '#e11d48', '#0d9488', '#4f46e5'];

const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
        minimumFractionDigits: 0
    }).format(value);
};

export const SalesView: React.FC<{ selectedDate: Date }> = ({ selectedDate }) => {
    const [realTotalSales, setRealTotalSales] = React.useState<number | null>(null);
    const [realTicketAverage, setRealTicketAverage] = React.useState<number | null>(null);
    const [realTotalVisits, setRealTotalVisits] = React.useState<number | null>(null);
    const [realTrends, setRealTrends] = React.useState({ salesTrend: 0, visitsTrend: 0, ticketTrend: 0 });
    const [realDailySales, setRealDailySales] = React.useState<any[]>([]);
    const [realWeeklySales, setRealWeeklySales] = React.useState<any[]>([]);
    const [realPaymentMethods, setRealPaymentMethods] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
        const fetchSales = async () => {
            setLoading(true);
            try {
                const year = selectedDate.getFullYear();
                const month = selectedDate.getMonth() + 1;

                // Fetch KPI data
                const { totalSales, totalVisits, salesTrend, visitsTrend, ticketTrend } = await dashboardService.getSalesSummary(year, month);
                setRealTotalSales(totalSales);
                setRealTotalVisits(totalVisits);
                setRealTrends({ salesTrend, visitsTrend, ticketTrend });

                const ticketAvg = totalVisits > 0 ? totalSales / totalVisits : 0;
                setRealTicketAverage(ticketAvg);

                // Fetch Daily Data
                const dailyData = await dashboardService.getDailySalesSummary(year, month);
                setRealDailySales(dailyData);

                // Fetch Payment Methods
                const paymentData = await dashboardService.getPaymentMethodsSummary(year, month);
                setRealPaymentMethods(paymentData);

                // Fetch Weekly Sales
                const weeklyData = await dashboardService.getWeeklySalesSummary(year, month);
                setRealWeeklySales(weeklyData);
            } catch (err) {
                console.error("Error al cargar datos de ventas:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSales();
    }, [selectedDate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-3 text-gray-500">Cargando datos reales...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ── KPI Row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {MOCK_SALES_DATA.kpis.map((kpi, i) => {
                    const icons = [
                        <CurrencyDollarIcon key="ic0" className="w-5 h-5 text-purple-600" />,
                        <ChartBarIcon key="ic1" className="w-5 h-5 text-indigo-500" />,
                        <UsersIcon key="ic2" className="w-5 h-5 text-emerald-500" />,
                        <CreditCardIcon key="ic3" className="w-5 h-5 text-amber-500" />,
                    ];
                    return (
                        <div
                            key={i}
                            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                                        {kpi.title}
                                    </p>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {i === 0 && realTotalSales !== null
                                            ? formatCOP(realTotalSales)
                                            : i === 1 && realTicketAverage !== null
                                                ? formatCOP(realTicketAverage)
                                                : i === 2 && realTotalVisits !== null
                                                    ? realTotalVisits
                                                    : kpi.value
                                        }
                                    </h3>
                                </div>
                                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                    {icons[i]}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                {(() => {
                                    let trendVal = 0;
                                    if (i === 0) trendVal = realTrends.salesTrend;
                                    else if (i === 1) trendVal = realTrends.ticketTrend;
                                    else if (i === 2) trendVal = realTrends.visitsTrend;

                                    const isUp = trendVal >= 0;
                                    const formattedTrend = `${Math.abs(trendVal).toFixed(1)}%`;

                                    // For Conversion (index 3), kept static or need logic
                                    if (i === 3) return (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            {kpi.change} vs mes anterior
                                        </span>
                                    );

                                    return (
                                        <span
                                            className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isUp
                                                ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                : 'text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400'
                                                }`}
                                        >
                                            {isUp ? (
                                                <ArrowTrendingUpIcon className="w-3 h-3" />
                                            ) : (
                                                <ArrowTrendingDownIcon className="w-3 h-3" />
                                            )}
                                            {formattedTrend}
                                        </span>
                                    );
                                })()}
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                    vs mes anterior
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Row 2: Daily Sales + Payment Mix ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Daily Sales Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                    <div className="mb-2 flex justify-between items-center">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Ventas Diarias
                        </h3>
                        <div className="flex gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                <span className="text-[10px] text-gray-500">Ventas</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px] text-gray-500">Visitas</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 h-[180px] w-full">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={realDailySales}
                                    margin={{ top: 15, right: 10, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                    <XAxis
                                        dataKey="day"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 9 }}
                                        dy={0}
                                        padding={{ left: 10, right: 10 }}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                                        tickFormatter={formatCOP}
                                        width={80}
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
                                        formatter={(value: number, name: string) => {
                                            if (name === 'Ventas') return formatCOP(value);
                                            return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);
                                        }}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        }}
                                        labelStyle={{ fontWeight: 600, color: '#1f2937' }}
                                    />
                                    <Bar
                                        yAxisId="left"
                                        dataKey="sales"
                                        name="Ventas"
                                        fill="#7c3aed"
                                        radius={[2, 2, 0, 0]}
                                        barSize={15}
                                    />
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="visits"
                                        name="Visitas"
                                        stroke="#059669"
                                        strokeWidth={1.5}
                                        dot={{ r: 2, fill: '#059669' }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Payment Mix Donut */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                        Mix Pagos
                    </h3>

                    <div className="relative h-[140px] w-full">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <Pie
                                        data={realPaymentMethods}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={65}
                                        paddingAngle={4}
                                        dataKey="amount"
                                        stroke="none"
                                    >
                                        {realPaymentMethods.map((_, idx) => (
                                            <Cell
                                                key={`cell-${idx}`}
                                                fill={PAYMENT_COLORS[idx % PAYMENT_COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(val: number) => formatCOP(val)}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <span className="text-xl font-bold text-gray-800 dark:text-white">
                                {realPaymentMethods.length > 0 ? realPaymentMethods.length : '---'}
                            </span>
                            <p className="text-[10px] text-gray-500">Métodos</p>
                        </div>
                    </div>

                    <div className="space-y-2 mt-2">
                        {realPaymentMethods.map((pm, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between group cursor-default"
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{ backgroundColor: PAYMENT_COLORS[idx % PAYMENT_COLORS.length] }}
                                    ></div>
                                    <span className="text-xs text-gray-600 dark:text-gray-300">
                                        {pm.method}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                        {formatCOP(pm.amount)}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                        {pm.percentage.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Row 3: Resumen Semanal ── */}
            <div className="grid grid-cols-1 gap-4">

                {/* Weekly Sales vs Target */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                        Resumen Semanal
                    </h3>

                    <div className="h-[140px] w-full">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={realWeeklySales} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="#f3f4f6"
                                    />
                                    <XAxis
                                        dataKey="week"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#6b7280', fontSize: 10 }}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 9 }}
                                        tickFormatter={formatCOP}
                                        width={80}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9ca3af', fontSize: 9 }}
                                        width={30}
                                    />
                                    <Tooltip
                                        formatter={(value: number, name: string) => {
                                            if (name === 'Ventas') return formatCOP(value);
                                            return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);
                                        }}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        }}
                                        labelStyle={{ fontWeight: 600, color: '#1f2937' }}
                                    />
                                    <Legend
                                        iconType="circle"
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                                    />
                                    <Bar
                                        yAxisId="left"
                                        name="Ventas"
                                        dataKey="sales"
                                        fill="#7c3aed"
                                        radius={[4, 4, 0, 0]}
                                        barSize={20}
                                    />
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="visits"
                                        name="Visitas"
                                        stroke="#059669"
                                        strokeWidth={2}
                                        dot={{ r: 3, fill: '#059669' }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Top Products Table */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800 dark:text-white mb-4">
                        Productos Más Vendidos
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-4 py-3">
                                        Producto
                                    </th>
                                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-4 py-3">
                                        Cant.
                                    </th>
                                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-4 py-3">
                                        Ingresos
                                    </th>
                                    <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-4 py-3">
                                        Participación
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {MOCK_SALES_DATA.topProducts.map((prod, idx) => (
                                    <tr
                                        key={idx}
                                        className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                    >
                                        <td className="px-4 py-3.5 text-[13px] font-medium text-gray-900 dark:text-gray-100">
                                            {prod.product}
                                        </td>
                                        <td className="px-4 py-3.5 text-[13px] text-gray-600 dark:text-gray-300 text-right">
                                            {prod.quantity.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3.5 text-[13px] text-gray-600 dark:text-gray-300 text-right">
                                            {formatCOP(prod.revenue)}
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            {/* Mini bar indicator */}
                                            <div className="inline-flex items-center gap-2">
                                                <div className="w-16 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                                    <div
                                                        className="bg-purple-600 h-1.5 rounded-full"
                                                        style={{ width: `${prod.share}%` }}
                                                    />
                                                </div>
                                                <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">
                                                    {prod.share}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div >
    );
};
