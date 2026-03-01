import React, { useEffect, useState } from 'react';
import {
    CurrencyDollarIcon,
    ShoppingCartIcon,
    ChartBarIcon,
    UsersIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon
} from '../../../components/ui/Icons';
import { dashboardService } from '../../../services/dashboardService';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Line, Legend } from 'recharts';
import { BulletChart, BulletChartItem } from '../components/BulletChart';

const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
        minimumFractionDigits: 0
    }).format(value);
};

const formatCompact = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value.toFixed(0)}`;
};

// Componente para anillo circular de porcentaje
const GaugeRing = ({ label, percentage }: { label: string, percentage: number }) => {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    // Limit to block svg wrap around if > 100%
    const visualP = Math.min(percentage, 100);
    const strokeDashoffset = circumference - (visualP / 100) * circumference;

    // Color: Verde si estás lejos de superarlo o cerca del 100 (dependiendo de la métrica). 
    // Como es presupuesto de gastos, sobrepasar 100% es malo (rojo). Menos de 100% es verde.
    let color = 'text-emerald-500'; // Bien (debajo del ppto)
    if (percentage > 90 && percentage <= 100) color = 'text-amber-500'; // Cuidado
    if (percentage > 100) color = 'text-rose-500'; // Excedido

    return (
        <div className="flex flex-col items-center justify-center p-2">
            <div className="relative w-[70px] h-[70px]">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r={radius} className="text-gray-100 dark:text-gray-700 stroke-current" strokeWidth="6" fill="transparent" />
                    <circle
                        cx="40" cy="40" r={radius}
                        className={`${color} stroke-current transition-all duration-1000 ease-out`}
                        strokeWidth="6" strokeLinecap="round" fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-[12px] font-bold text-gray-700 dark:text-gray-200">{percentage.toFixed(0)}%</span>
                </div>
            </div>
            <span className="mt-2 text-[10px] font-bold uppercase text-gray-400 tracking-wider whitespace-nowrap">{label}</span>
        </div>
    );
};

export const PurchasesView: React.FC<{ selectedDate: Date }> = ({ selectedDate }) => {
    const [weeklyPurchases, setWeeklyPurchases] = useState<any[]>([]);
    const [monthlyKPI, setMonthlyKPI] = useState({ total: 0, change: 0, isUp: true });
    const [percentageKPI, setPercentageKPI] = useState({ percentage: 0, change: 0, isUp: true });
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const fetchData = async () => {
            setLoading(true);
            try {
                const year = selectedDate.getFullYear();
                const month = selectedDate.getMonth() + 1;

                const [weeklyData, kpiData, kpiPercentage] = await Promise.all([
                    dashboardService.getWeeklyPurchasesSummary(year, month),
                    dashboardService.getMonthlyPurchasesKPI(year, month),
                    dashboardService.getMonthlyPurchasesPercentageKPI(year, month)
                ]);

                setWeeklyPurchases(weeklyData);
                setMonthlyKPI(kpiData);
                setPercentageKPI(kpiPercentage);

            } catch (error) {
                console.error('Error fetching purchases data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedDate]);

    // KPIs
    const kpis = [
        {
            title: 'Total Compras',
            value: formatCOP(monthlyKPI.total),
            change: `${Math.abs(monthlyKPI.change).toFixed(1)}%`,
            isUp: monthlyKPI.isUp,
            icon: <CurrencyDollarIcon className="w-5 h-5 text-purple-600" />
        },
        {
            title: '% Compras vs Ventas',
            // Invertimos isUp visualmente para este KPI:
            // Si sube el %, gastamos más proporción de lo que vendimos, que suele ser negativo.
            // Si consideramos que bajarlo es bueno: isUp = false para rojo. El backend devuelve isUp=true si el porcentaje subió.
            value: `${Math.max(0, percentageKPI.percentage).toFixed(1)}%`,
            change: `${Math.abs(percentageKPI.change).toFixed(2)} pp`,
            isUp: !percentageKPI.isUp, // verde si baja
            icon: <ChartBarIcon className="w-5 h-5 text-indigo-500" />
        },
        { title: 'Ticket Promedio (Draft)', value: '$ 0', change: '0.0%', isUp: false, icon: <ShoppingCartIcon className="w-5 h-5 text-emerald-500" /> },
        { title: 'Proveedores Activos', value: '0', change: '0.0%', isUp: true, icon: <UsersIcon className="w-5 h-5 text-amber-500" /> },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-3 text-gray-500">Cargando datos reales...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* ── KPI Row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <div
                        key={i}
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                                    {kpi.title}
                                </p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {kpi.value}
                                </h3>
                            </div>
                            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                                {kpi.icon}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                            <span
                                className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${kpi.isUp
                                    ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400'
                                    : 'text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400'
                                    }`}
                            >
                                {kpi.isUp ? (
                                    <ArrowTrendingUpIcon className="w-3 h-3" />
                                ) : (
                                    <ArrowTrendingDownIcon className="w-3 h-3" />
                                )}
                                {kpi.change}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                vs mes anterior
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Charts Row ── */}
            <div className="flex flex-col gap-4">
                {/* Main Graph: Weekly Purchases */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col min-h-[300px]">
                    <div className="mb-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Evolución de Compras por Semana
                        </h3>
                    </div>
                    <div className="w-full h-[280px]">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={weeklyPurchases} margin={{ top: 15, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis
                                        dataKey="week"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#6b7280', fontSize: 10 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={formatCOP}
                                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                                        width={80}
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
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar
                                        dataKey="amount"
                                        name="Total Compras"
                                        fill="#7c3aed"
                                        radius={[4, 4, 0, 0]}
                                        barSize={30}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="budget"
                                        name="Presupuesto"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Cumplimiento de Presupuesto — Bullet Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                    <div className="mb-3">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Cumplimiento de Presupuesto
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            Compras reales vs presupuesto (40% de ventas semana anterior)
                        </p>
                    </div>
                    {weeklyPurchases.length > 0 ? (
                        <BulletChart
                            items={weeklyPurchases.map((w) => ({
                                label: w.week,
                                actual: w.amount,
                                target: w.budget,
                            } as BulletChartItem))}
                            formatValue={(v) => formatCompact(v)}
                            inverted={true}
                            actualLabel="Gasto"
                            targetLabel="Presupuesto"
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center py-8">
                            <p className="text-[11px] text-gray-400">No hay datos esta semana.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {/* Table Placeholder */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col min-h-[250px]">
                    <div className="mb-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Tabla de Detalles
                        </h3>
                    </div>
                    <div className="flex-1 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                            Área para tabla detallada próxima a construir...
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
