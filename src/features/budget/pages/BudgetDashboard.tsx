import React, { useEffect, useState, useMemo } from 'react';
import {
    CurrencyDollarIcon,
    ExclamationCircleIcon,
    BanknotesIcon,
    CheckCircleIcon,
    CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { budgetService } from '../../../services/budget';
import { BudgetCommitment } from '../../../types/budget';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval, parseISO, addDays, differenceInCalendarDays, subMonths, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useData } from '../../../context/DataContext';
import { useBudgetContext } from '../layouts/BudgetLayout';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PresentationChartLineIcon, PlusIcon } from '../../../components/ui/Icons';
import { DateNavigator } from '../../../components/ui/DateNavigator';
import { GhostBuster } from '../components/GhostBuster';
import { Button } from '../../../components/ui/Button';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export const BudgetDashboard: React.FC = () => {
    const { categories, transactions } = useData();
    const { openForm } = useBudgetContext();
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [commitments, setCommitments] = useState<BudgetCommitment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const getCategoryName = (idOrName: string) => {
        const category = categories.find(c => c.id === idOrName);
        return category ? category.name : (idOrName || 'Sin Categoría');
    };

    const textIsDataLoaded = () => transactions.length > 0;

    const [monthlyStats, setMonthlyStats] = useState<{
        summary: { totalMes: number, pagado: number, pendiente: number, vencido: number };
        weeklyChart: { name: string; amount: number; fullLabel: string }[];
        categoryChart: { name: string; value: number }[];
    } | null>(null);

    // Cargar datos optimizados desde Vistas SQL
    useEffect(() => {
        const loadDashboardMetrics = async () => {
            setIsLoading(true);
            try {
                const start = startOfMonth(selectedMonth);
                const end = endOfMonth(selectedMonth);

                // 1. Cargar Compromisos (Detalle para lista "Próximos")
                const commitmentsData = await budgetService.getCommitments(
                    format(start, 'yyyy-MM-dd'),
                    format(end, 'yyyy-MM-dd')
                );
                setCommitments(commitmentsData); // Mantenemos el detalle solo para la lista "Próximos"

                // 2. Calcular KPIs sobre los datos filtrados (Más rápido que antes, pero idealmente sería otra Vista si crece mucho)
                // Usamos la lógica de negocio existente sobre los compromisos ya traídos (que incluyen proyecciones virtuales)
                const currentMonthItems = commitmentsData;

                const totalPending = currentMonthItems
                    .filter(c => c.status === 'pending' || c.status === 'overdue')
                    .reduce((sum, c) => sum + c.amount, 0);

                const totalPaid = currentMonthItems
                    .filter(c => c.status === 'paid')
                    .reduce((sum, c) => sum + c.amount, 0);

                const totalOverdue = currentMonthItems
                    .filter(c => c.status === 'overdue')
                    .reduce((sum, c) => sum + c.amount, 0);

                // 3. Preparar Gráfico Semanal (Client-Side aggregation sobre el set reducido es aceptable por ahora para soportar proyecciones virtuales)
                const weeks: { name: string; amount: number; fullLabel: string }[] = [];
                let weekStart = startOfWeek(start, { weekStartsOn: 1 });
                while (weekStart <= end) {
                    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                    const weekTotal = currentMonthItems
                        .filter(c => isWithinInterval(parseISO(c.dueDate), { start: weekStart, end: weekEnd }))
                        .reduce((sum, c) => sum + c.amount, 0);

                    weeks.push({
                        name: `Sem ${format(weekStart, 'I', { locale: es })}`,
                        fullLabel: `${format(weekStart, 'd MMM')} - ${format(weekEnd, 'd MMM')}`,
                        amount: weekTotal
                    });
                    weekStart = addDays(weekStart, 7);
                }

                // 4. Preparar Gráfico Categorías
                const categoryMap = new Map<string, number>();
                currentMonthItems.forEach(item => {
                    const catName = getCategoryName(item.category || '');
                    const current = categoryMap.get(catName) || 0;
                    categoryMap.set(catName, current + item.amount);
                });
                const catChart = Array.from(categoryMap.entries())
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value);

                setMonthlyStats({
                    summary: {
                        totalMes: totalPending + totalPaid,
                        pagado: totalPaid,
                        pendiente: totalPending,
                        vencido: totalOverdue
                    },
                    weeklyChart: weeks,
                    categoryChart: catChart
                });

            } catch (error) {
                console.error("Error loading dashboard metrics:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadDashboardMetrics();
    }, [selectedMonth]); // Solo recargar cuando cambie el mes seleccionado


    // --- Lógica Legacy de Fallback eliminada para simplificar limpieza ---
    // El servicio getCommitments ya maneja la fusión de reales + virtuales.

    const [overdueItems, setOverdueItems] = useState<BudgetCommitment[]>([]);

    // Carga de Vencidos (Mantiene lógica de negocio compleja de "Mora")
    useEffect(() => {
        const loadOverdue = async () => {
            // ... (Optimizado: ahora getOverduePendingCommitments usa índices)
            try {
                // Usamos la función dedicada del servicio que ya optimizamos con índices
                const overdue = await budgetService.getOverduePendingCommitments(format(new Date(), 'yyyy-MM-dd'));
                setOverdueItems(overdue);
            } catch (e) {
                console.error("Error loading overdue", e);
            }
        };
        loadOverdue();
    }, []);

    const overdueStats = useMemo(() => {
        const total = overdueItems.reduce((acc, curr) => acc + curr.amount, 0);
        const count = overdueItems.length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const chartData = overdueItems.map(item => {
            const d = parseISO(item.dueDate);
            d.setHours(0, 0, 0, 0);
            return {
                name: item.title,
                amount: item.amount,
                days: differenceInCalendarDays(today, d),
                date: item.dueDate
            };
        }).sort((a, b) => b.days - a.days);

        return { total, count, chartData };
    }, [overdueItems]);

    const stats = useMemo(() => {
        if (!monthlyStats) return [];
        const { summary } = monthlyStats;

        return [
            { name: 'Total Mes', value: summary.totalMes, icon: BanknotesIcon, color: 'text-gray-600', bg: 'bg-gray-100', colorDark: 'dark:text-gray-400', bgDark: 'dark:bg-slate-700/50' },
            { name: 'Pagado', value: summary.pagado, icon: CheckCircleIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', colorDark: 'dark:text-emerald-400', bgDark: 'dark:bg-emerald-900/20' },
            { name: 'Pendiente', value: summary.pendiente, icon: CurrencyDollarIcon, color: 'text-indigo-600', bg: 'bg-indigo-50', colorDark: 'dark:text-indigo-400', bgDark: 'dark:bg-indigo-900/20' },
            {
                name: overdueStats.count > 0 ? 'Mora Consolidada' : 'Vencido (Mes)',
                value: overdueStats.count > 0 ? overdueStats.total : summary.vencido,
                icon: ExclamationCircleIcon,
                color: 'text-rose-600',
                bg: 'bg-rose-50',
                colorDark: 'dark:text-rose-400',
                bgDark: 'dark:bg-rose-900/20'
            },
        ];
    }, [monthlyStats, overdueStats]);

    const chartData = monthlyStats?.weeklyChart || [];
    const categoryData = monthlyStats?.categoryChart || [];

    const upcomingList = useMemo(() => {
        const now = new Date();
        return commitments
            .filter(c => (c.status === 'pending' || c.status === 'overdue') && new Date(c.dueDate) >= now)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 5);
    }, [commitments]);

    if (isLoading) return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600"></div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Analizando Datos...</p>
            </div>
        </div>
    );

    const formatCurrency = (val: number) => {
        return `$${val.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pr-2 pb-10">
            <PageHeader
                title="BI Egresos"
                breadcrumbs={[
                    { label: 'Egresos', path: '/budget' },
                    { label: 'Tablero' }
                ]}
                icon={<PresentationChartLineIcon className="h-6 w-6" />}
                actions={
                    <div className="flex items-center gap-2 h-10">
                        <DateNavigator
                            value={selectedMonth}
                            onChange={(newDate) => setSelectedMonth(newDate)}
                        />
                        <Button
                            onClick={() => openForm()}
                            size="md"
                        >
                            <PlusIcon className="w-4 h-4 mr-1.5" />
                            Nuevo Registro
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
                {/* Stats Cards Row */}
                <div className="lg:col-span-12">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {stats.map((stat) => (
                            <div key={stat.name} className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-all hover:shadow-md">
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-2">{stat.name}</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate">{formatCurrency(stat.value)}</p>
                                    </div>
                                    <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.bgDark} shrink-0`}>
                                        <stat.icon className={`w-5 h-5 ${stat.color} ${stat.colorDark}`} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    {/* Weekly Bar Chart */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Evolución Semanal</h3>
                                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{format(selectedMonth, 'MMMM yyyy', { locale: es })}</p>
                            </div>
                        </div>
                        <div className="h-[300px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} tickFormatter={(val) => `$${val / 1000}k`} />
                                    <Tooltip
                                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total']}
                                        labelFormatter={(label, payload) => {
                                            if (payload && payload.length > 0) {
                                                return `${label} (${payload[0].payload.fullLabel})`;
                                            }
                                            return label;
                                        }}
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                    />
                                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={40} fill="#4f46e5" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category Distribution */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6">Concentración por Categoría</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Monto']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                    />
                                    <Legend
                                        layout="vertical"
                                        verticalAlign="middle"
                                        align="right"
                                        formatter={(value) => <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Right Column: Tables */}
                <div className="lg:col-span-4 flex flex-col gap-4">

                    {/* ── Cartera en Mora ── */}
                    {overdueStats.count > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-rose-100 dark:border-rose-900/30 bg-rose-50/60 dark:bg-rose-900/10">
                                <h3 className="text-[10px] font-bold text-rose-600 uppercase tracking-[0.15em] flex items-center gap-1.5">
                                    <ExclamationCircleIcon className="w-3.5 h-3.5" />
                                    Cartera en Mora
                                </h3>
                                <span className="text-[10px] font-bold text-rose-500 bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 rounded-full tabular-nums">
                                    {overdueStats.count}
                                </span>
                            </div>
                            <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                                <table className="w-full border-collapse">
                                    <thead className="sticky top-0 z-10 bg-white dark:bg-slate-800">
                                        <tr className="border-b border-gray-100 dark:border-slate-700">
                                            <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-3 py-1.5">Concepto</th>
                                            <th className="text-center text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-2 py-1.5 w-12">Días</th>
                                            <th className="text-right text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-3 py-1.5">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {overdueStats.chartData.map((item, idx) => (
                                            <tr key={`mora-${idx}`} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-rose-50/30 dark:hover:bg-rose-900/5 transition-colors">
                                                <td className="px-3 py-1.5 text-[11px] text-gray-700 dark:text-gray-300 font-medium truncate max-w-[180px]">{item.name}</td>
                                                <td className="px-2 py-1.5 text-center">
                                                    <span className={`text-[10px] font-bold tabular-nums ${item.days > 30 ? 'text-rose-600' : 'text-amber-500'}`}>
                                                        {item.days}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 text-right text-[11px] font-bold text-rose-600 dark:text-rose-400 tabular-nums whitespace-nowrap">{formatCurrency(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-600">
                                        <tr>
                                            <td className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total</td>
                                            <td className="px-2 py-2 text-center text-[10px] font-bold text-gray-400">{overdueStats.count}</td>
                                            <td className="px-3 py-2 text-right text-[12px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">{formatCurrency(overdueStats.total)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Próximos Vencimientos ── */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-700/30">
                            <h3 className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-[0.15em] flex items-center gap-1.5">
                                <CalendarDaysIcon className="w-3.5 h-3.5 text-primary" />
                                Próximos Vencimientos
                            </h3>
                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full tabular-nums">
                                {upcomingList.length}
                            </span>
                        </div>
                        {upcomingList.length === 0 ? (
                            <div className="py-8 text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sin vencimientos próximos</p>
                            </div>
                        ) : (
                            <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                                <table className="w-full border-collapse">
                                    <thead className="sticky top-0 z-10 bg-white dark:bg-slate-800">
                                        <tr className="border-b border-gray-100 dark:border-slate-700">
                                            <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-3 py-1.5 w-14">Fecha</th>
                                            <th className="text-left text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-2 py-1.5">Concepto</th>
                                            <th className="text-right text-[10px] uppercase tracking-wider text-gray-400 font-semibold px-3 py-1.5">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {upcomingList.map((item) => (
                                            <tr key={item.id} className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/5 transition-colors cursor-pointer group">
                                                <td className="px-3 py-1.5 text-[10px] font-bold text-indigo-500 tabular-nums whitespace-nowrap">
                                                    {format(parseISO(item.dueDate), 'd MMM', { locale: es })}
                                                </td>
                                                <td className="px-2 py-1.5 text-[11px] text-gray-700 dark:text-gray-300 font-medium truncate max-w-[180px] group-hover:text-primary transition-colors">{item.title}</td>
                                                <td className="px-3 py-1.5 text-right text-[11px] font-bold text-gray-800 dark:text-white tabular-nums whitespace-nowrap">{formatCurrency(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Diagnostic Tool */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-200 dark:border-slate-700 border-dashed">
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span>🔍 Diagnóstico</span>
                        </h3>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                            Registro maestro (2024-2027) para conciliación.
                        </p>
                        <GhostBuster />
                    </div>
                </div>
            </div>
        </div>
    );
};
