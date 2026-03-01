import React, { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, Legend } from 'recharts';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon, BanknotesIcon, ChartBarIcon } from '../../../components/ui/Icons';
import { ShoppingCartIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { dashboardService } from '../../../services/dashboardService';
import { InfoTooltip } from '../components/InfoTooltip';

const COLORS = ['#059669', '#e11d48', '#7c3aed', '#d97706']; // emerald-600, rose-600, purple-600, amber-600

export const OverviewView: React.FC<{ selectedDate: Date }> = ({ selectedDate }) => {
    const [isLoading, setIsLoading] = useState(true);

    // KPI States
    const [purchasesKpi, setPurchasesKpi] = useState({ amount: 0, budget: 0, percentage: 0 });
    const [salesKpi, setSalesKpi] = useState({ amount: 0, goal: 0, percentage: 0 });
    const [incomeKpi, setIncomeKpi] = useState({ total_income: 0 });
    const [expenseKpi, setExpenseKpi] = useState({ total_expense: 0 });
    const [unpaidKpi, setUnpaidKpi] = useState({ amount: 0 });

    // Chart States
    const [yearlySalesOptions, setYearlySalesOptions] = useState<any[]>([]);
    const [yearlyWeeklySalesOptions, setYearlyWeeklySalesOptions] = useState<any[]>([]);

    useEffect(() => {
        const loadDashboard = async () => {
            setIsLoading(true);
            try {
                const year = selectedDate.getFullYear();
                const month = selectedDate.getMonth() + 1;

                // Fetch KPIs
                let purchasesPerf = { amount: 0, budget: 0, percentage: 0 };
                let salesPerf = { amount: 0, goal: 0, percentage: 0 };
                let financials = { total_income: 0, total_expense: 0 };
                let unpaid = { amount: 0 };
                let yearlySales: any[] = [];
                let yearlyWeeklySales: any[] = [];

                try { purchasesPerf = await dashboardService.getMonthlyPurchasesPerformanceKPI(year, month); } catch (e) { console.error("purchasesPerf error", e); }
                try { salesPerf = await dashboardService.getMonthlySalesPerformanceKPI(year, month); } catch (e) { console.error("salesPerf error", e); }
                try { financials = await dashboardService.getMonthlyIncomeAndExpensesKPI(year, month); } catch (e) { console.error("financials error", e); }
                try { unpaid = await dashboardService.getMonthlyUnpaidCommitmentsKPI(year, month); } catch (e) { console.error("unpaid error", e); }

                // Fetch Charts
                try { yearlySales = await dashboardService.getYearlySalesAndVisits(year); } catch (e) { console.error("yearlySales error", e); }
                try { yearlyWeeklySales = await dashboardService.getYearlyWeeklySalesAndVisits(year); } catch (e) { console.error("yearlyWeeklySales error", e); }

                setPurchasesKpi(purchasesPerf);
                setSalesKpi(salesPerf);
                setIncomeKpi({ total_income: financials.total_income });
                setExpenseKpi({ total_expense: financials.total_expense });
                setUnpaidKpi(unpaid);

                setYearlySalesOptions(yearlySales);
                setYearlyWeeklySalesOptions(yearlyWeeklySales);

            } catch (error) {
                console.error("Error loading Overview data", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadDashboard();
    }, [selectedDate]);

    const formatCurrency = (val: number) => `$${val.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const formatPercent = (val: number) => `${val.toFixed(1)}%`;

    const kpis = [
        {
            title: "Cumplimiento Ventas",
            value: formatPercent(salesKpi.percentage),
            trend: salesKpi.percentage >= 100 ? 'up' : 'down',
            change: formatCurrency(salesKpi.amount),
            period: `Meta: ${formatCurrency(salesKpi.goal)}`,
            icon: <ChartBarIcon className="w-5 h-5 text-emerald-500" />,
            tooltip: {
                title: "Cumplimiento Ventas",
                description: "Compara el ingreso real (Venta Bruta) con la proyección (Crecimiento lineal con respecto al mes pasado).",
                formula: "(Ventas Reales / Venta Proyectada)",
                source: "Módulo Cierres + Config. Sistema"
            }
        },
        {
            title: "Cumplimiento Compras",
            value: formatPercent(purchasesKpi.percentage),
            trend: purchasesKpi.percentage <= 100 ? 'up' : 'down',
            change: formatCurrency(purchasesKpi.amount),
            period: `Pto: ${formatCurrency(purchasesKpi.budget)}`,
            icon: <ShoppingCartIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
            tooltip: {
                title: "Cumplimiento Compras",
                description: "Mide lo gastado/causado real (Costo y Gasto) frente al presupuesto máximo del mes.",
                formula: "(Gastado Real / Presupuesto Meta)",
                source: "Presupuesto mes actual (Meta M)"
            }
        },
        {
            title: "Ingresos Mes",
            value: formatCurrency(incomeKpi.total_income),
            trend: 'up',
            change: 'General',
            period: 'Todos medios pago',
            icon: <CurrencyDollarIcon className="w-5 h-5 text-emerald-600" />,
            tooltip: {
                title: "Ingresos Mes",
                description: "Corresponde a la suma de la venta bruta total del mes ingresada a través de todos los medios y las plataformas disponibles.",
                source: "Módulo Ventas -> Arqueos Diarios"
            }
        },
        {
            title: "Egresos Mes",
            value: formatCurrency(expenseKpi.total_expense),
            trend: 'down',
            change: 'Efectivos',
            period: 'Pagos realizados',
            icon: <BanknotesIcon className="w-5 h-5 text-rose-500" />,
            tooltip: {
                title: "Egresos Mes",
                description: "Corresponde a la suma de todos los compromisos presupuestarios cuyo estado está marcado como 'Pagado' dentro de este mes.",
                source: "Módulo Compras -> Compromisos M"
            }
        },
        {
            title: "Cartera no Pagada",
            value: formatCurrency(unpaidKpi.amount),
            trend: unpaidKpi.amount > 0 ? 'down' : 'up',
            change: 'Mes Actual',
            period: 'Compromisos de mes',
            icon: <ExclamationCircleIcon className="w-5 h-5 text-amber-500" />,
            tooltip: {
                title: "Cartera no Pagada",
                description: "Suma de los compromisos pendientes por pagar (créditos) con fecha de vencimiento dentro del mes en curso.",
                source: "Módulo Compras -> Compromisos (Pendiente/Atrasado)"
            }
        },
    ];

    if (isLoading) return (
        <div className="flex h-[400px] items-center justify-center p-6">
            <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-100 border-t-purple-600"></div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Analizando Datos...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* KPI Grid — animación escalonada */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {kpis.map((kpi, index) => (
                    <div
                        key={index}
                        className="relative group bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 hover:z-20"
                        style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{kpi.title}</p>
                                    {kpi.tooltip && (
                                        <div className="relative z-50">
                                            <InfoTooltip
                                                title={kpi.tooltip.title}
                                                description={kpi.tooltip.description}
                                                formula={kpi.tooltip.formula}
                                                source={kpi.tooltip.source}
                                            />
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                                    {kpi.value}
                                </h3>
                            </div>
                            <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-900/40 shrink-0`}>
                                {kpi.icon}
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-1 overflow-hidden">
                            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${kpi.trend === 'up'
                                ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : 'text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400'
                                }`}>
                                {kpi.trend === 'up' ? <ArrowTrendingUpIcon className="w-3 h-3 shrink-0" /> : <ArrowTrendingDownIcon className="w-3 h-3 shrink-0" />}
                                {kpi.change}
                            </span>
                            <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate">{kpi.period}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                {/* Yearly Sales and Visits Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm w-full">
                    <div className="mb-4 flex items-start gap-2">
                        <div>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Ventas vs Visitas (Año)</h3>
                            <p className="text-[10px] text-gray-400 mt-0.5">Evolución mensual</p>
                        </div>
                        <InfoTooltip
                            title="Ventas vs Visitas"
                            description="Tendencia mensual que cruza los ingresos comerciales totales alcanzados (barras) frente al número absoluto de visitas registradas a partir del reporte diario."
                            source="Consolidado Mensual de Ventas"
                        />
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={yearlySalesOptions} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} tickFormatter={(val) => `$${val / 1000000}M`} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    formatter={(val: number, name: string) => [name === 'Ventas' ? formatCurrency(val) : val, name]}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                <Bar yAxisId="left" dataKey="sales" name="Ventas" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="visits" name="Visitas" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Yearly Weekly Sales and Visits Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm w-full">
                    <div className="mb-4 flex items-start gap-2">
                        <div>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Ventas vs Visitas (Semanas)</h3>
                            <p className="text-[10px] text-gray-400 mt-0.5">Evolución semanal</p>
                        </div>
                        <InfoTooltip
                            title="Ventas vs Visitas SEMANAL"
                            description="Una mirada detallada y micro segmentada que separa las tendencias no por meses genéricos (Ej. Enero/Febrero), sino por las 52 semanas tributarias del año."
                            source="Ventas Diarias agregadas por Semana(ISO-8601)"
                        />
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={yearlyWeeklySalesOptions} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} minTickGap={20} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} tickFormatter={(val) => `$${val / 1000000}M`} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    formatter={(val: number, name: string) => [name === 'Ventas' ? formatCurrency(val) : val, name]}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                <Bar yAxisId="left" dataKey="sales" name="Ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Line yAxisId="right" type="monotone" dataKey="visits" name="Visitas" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};

