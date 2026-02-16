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
import { GhostBuster } from '../components/GhostBuster';

const getBarColor = (dayData: any) => {
    // Simple logic: if mostly paid, green. If mostly overdue, red. 
    // Or just static color. The image showed colorful bars.
    // Let's use a nice gradient or static teal if not specified.
    return '#4f46e5'; // Indigo
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export const BudgetDashboard: React.FC = () => {
    const { categories, transactions } = useData();
    const { openForm } = useBudgetContext();
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [commitments, setCommitments] = useState<BudgetCommitment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Helper to get Category Name
    const getCategoryName = (idOrName: string) => {
        const category = categories.find(c => c.id === idOrName);
        return category ? category.name : (idOrName || 'Sin Categoría');
    };

    // --- Data Loading on Month Change ---

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Fetch full month context (with some buffer for safety if needed, but start/end of month is fine)
                const start = startOfMonth(selectedMonth);
                const end = endOfMonth(selectedMonth);

                let data = await budgetService.getCommitments(
                    format(start, 'yyyy-MM-dd'),
                    format(end, 'yyyy-MM-dd')
                );

                // --- FALLBACK LOGIC ---
                // Si no hay compromisos de presupuesto específicos, usar las transacciones reales históricas
                // para que el dashboard no se vea vacío.
                if (data.length === 0 && textIsDataLoaded()) {
                    console.log('⚠️ BudgetDashboard: Usando transacciones como fallback.');
                    const fallbackData = transactions
                        .filter(t => {
                            const d = parseISO(t.date);
                            return isWithinInterval(d, { start, end });
                        })
                        .map(t => ({
                            id: t.id,
                            title: t.description || 'Transacción',
                            amount: t.amount,
                            dueDate: t.date,
                            status: 'paid', // All historical transactions are paid
                            paidDate: t.date,
                            category: t.categoryId,
                            description: 'Historical fallback',
                            isProjected: false,
                            createdAt: 0,
                            updatedAt: 0
                        } as BudgetCommitment));

                    if (fallbackData.length > 0) {
                        data = fallbackData;
                    }
                }

                setCommitments(data);
            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [selectedMonth, transactions]); // Add transactions dependency

    // Helper to check if transactions actully loaded
    const textIsDataLoaded = () => transactions.length > 0;

    // --- Overdue Logic (Global Context) ---
    const [overdueItems, setOverdueItems] = useState<BudgetCommitment[]>([]);

    useEffect(() => {
        const loadOverdue = async () => {
            try {
                // Fetch last 6 months to ensure we catch recent overdue
                const start = subMonths(new Date(), 6);
                const end = subDays(new Date(), 1); // Strictly before today

                const data = await budgetService.getCommitments(
                    format(start, 'yyyy-MM-dd'),
                    format(end, 'yyyy-MM-dd')
                );

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const overdue = data.filter(c => {
                    const d = parseISO(c.dueDate);
                    d.setHours(0, 0, 0, 0);
                    return c.status !== 'paid' && d < today;
                });
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

    // --- Stats Calculation (Scoped to Selected Month) ---
    const stats = useMemo(() => {
        const start = startOfMonth(selectedMonth);
        const end = endOfMonth(selectedMonth);

        const currentMonthItems = commitments.filter(c =>
            isWithinInterval(parseISO(c.dueDate), { start, end })
        );

        const totalPending = currentMonthItems
            .filter(c => c.status === 'pending' || c.status === 'overdue')
            .reduce((sum, c) => sum + c.amount, 0);

        const totalPaid = currentMonthItems
            .filter(c => c.status === 'paid')
            .reduce((sum, c) => sum + c.amount, 0);

        const overdueCount = currentMonthItems.filter(c => c.status === 'overdue').length;

        const totalOverdueAmount = currentMonthItems
            .filter(c => c.status === 'overdue')
            .reduce((sum, c) => sum + c.amount, 0);

        return [
            { name: 'Total Mes', value: `$${(totalPending + totalPaid).toLocaleString()}`, icon: BanknotesIcon, color: 'text-slate-600', bg: 'bg-slate-100' },
            { name: 'Pagado', value: `$${totalPaid.toLocaleString()}`, icon: CheckCircleIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { name: 'Pendiente', value: `$${totalPending.toLocaleString()}`, icon: CurrencyDollarIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            {
                name: overdueStats.count > 0 ? 'Cartera Vencida Total' : 'Vencido (Mes)',
                value: overdueStats.count > 0 ? `$${overdueStats.total.toLocaleString()}` : `$${totalOverdueAmount.toLocaleString()}`,
                icon: ExclamationCircleIcon,
                color: 'text-rose-600',
                bg: 'bg-rose-50'
            },
        ];
    }, [commitments, selectedMonth]);

    // --- Chart Data (Weekly Aggregation) ---
    const chartData = useMemo(() => {
        const startMonth = startOfMonth(selectedMonth);
        const endMonth = endOfMonth(selectedMonth);

        // We need to generate buckets for each week that touches this month
        // Logic: Iterate from startMonth, jumping 1 week at a time, until endMonth.
        // Important: "Weeks must start on Monday".

        const weeks: { name: string; amount: number; fullLabel: string }[] = [];

        let currentIter = startOfWeek(startMonth, { weekStartsOn: 1 }); // Start at the beginning of the first week (could be prev month)
        // Adjust start: If the first week started inside prev month, we still want to count it? 
        // Usually, reports show "Week 1" as the first week falling mostly or fully or partially in the month.
        // Let's iterate through every day of the month and assign to a week bucket?
        // Simpler: 
        // 1. Get all commitments.
        // 2. For each commitment, find which "Week of Month" it belongs to OR just "Week Starting X".
        // "Week Starting X" is unambiguous.

        // Let's build buckets for the whole month view:
        let weekStart = startOfWeek(startMonth, { weekStartsOn: 1 });

        // While the week start is before the end of the month
        while (weekStart <= endMonth) {
            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

            // Filter items in this week AND in the current month (intersection?)
            // User query: "Total expenses by week". Usually means "Sum of expenses occurring in that week".
            // If a week spans two months (Feb 27 - Mar 5), and we are in Feb, do we show only Feb 27-28?
            // Usually YES, strictly scoped to the month view means filtered by month.
            // But visually, it's better to show the whole week's load if requested "By week".
            // However, our fetch is limited to start/end of month. So we only have data for this month.
            // So we naturally sum only the portion within the month.

            const weekTotal = commitments
                .filter(c => {
                    const d = parseISO(c.dueDate);
                    return isWithinInterval(d, { start: weekStart, end: weekEnd });
                })
                .reduce((sum, c) => sum + c.amount, 0);

            weeks.push({
                name: `Semana ${format(weekStart, 'w', { locale: es })}`, // Week user friendly label
                fullLabel: `${format(weekStart, 'd MMM')} - ${format(weekEnd, 'd MMM')}`,
                amount: weekTotal
            });

            weekStart = addDays(weekStart, 7);
        }

        return weeks;
    }, [commitments, selectedMonth]);

    // --- Category Chart Data ---
    const categoryData = useMemo(() => {
        const start = startOfMonth(selectedMonth);
        const end = endOfMonth(selectedMonth);

        // Filter items in month
        const monthlyItems = commitments.filter(c =>
            isWithinInterval(parseISO(c.dueDate), { start, end })
        );

        const categoryMap = new Map<string, number>();

        monthlyItems.forEach(item => {
            // Only count if positive? Expenses are usually positive in this app context.
            const catName = getCategoryName(item.category || '');
            const current = categoryMap.get(catName) || 0;
            categoryMap.set(catName, current + item.amount);
        });

        // Convert to array and sort
        return Array.from(categoryMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value); // Descending

    }, [commitments, selectedMonth, categories]); // Depends on categories to resolve names

    // --- Upcoming List ---
    const upcomingList = useMemo(() => {
        const now = new Date();
        return commitments
            .filter(c => (c.status === 'pending' || c.status === 'overdue') && new Date(c.dueDate) >= now) // Still showing relative to NOW, not selected month? Maybe better to show relative to selected month?
            // Usually "Upcoming" means from *today* onwards regardless of history view. Let's keep it practical.
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 5);
    }, [commitments]);



    if (isLoading) return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                <p className="text-sm font-medium text-slate-500 animate-pulse">Cargando tablero...</p>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-y-auto custom-scrollbar pr-2 pb-20 animate-in fade-in zoom-in-95 duration-500">
            <div className="lg:col-span-3">
                <PageHeader
                    title="Control Presupuestal"
                    breadcrumbs={[
                        { label: 'Finanzas', path: '/budget' },
                        { label: 'Dashboard' }
                    ]}
                    icon={<PresentationChartLineIcon className="h-6 w-6" />}
                    actions={
                        <div className="flex items-center gap-3">
                            <input
                                type="month"
                                value={format(selectedMonth, 'yyyy-MM')}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const [y, m] = e.target.value.split('-');
                                        setSelectedMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
                                    }
                                }}
                                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <button
                                onClick={() => openForm()}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Nuevo</span>
                            </button>
                        </div>
                    }
                />
            </div>


            {/* Stats Cards */}
            <div className="lg:col-span-3">

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat) => (
                        <div key={stat.name} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.name}</p>
                                    <p className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${stat.bg}`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Gastos por Semana ({format(selectedMonth, 'MMMM yyyy', { locale: es })})</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(val) => `$${val / 1000}k`} />
                            <Tooltip
                                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total']}
                                labelFormatter={(label, payload) => {
                                    if (payload && payload.length > 0) {
                                        return `${label} (${payload[0].payload.fullLabel})`;
                                    }
                                    return label;
                                }}
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={50} fill="#6366f1">
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Side Column: Overdue & Upcoming */}
            <div className="space-y-6">

                {/* Overdue List Card */}
                {overdueStats.count > 0 && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 border-l-4 border-l-rose-500">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <ExclamationCircleIcon className="w-5 h-5 text-rose-500" />
                            Cartera Vencida
                        </h3>
                        <div className="space-y-3">
                            {overdueStats.chartData.slice(0, 5).map((item, idx) => (
                                <div key={`${item.name}-${idx}`} className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800/50">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                                        <p className="text-xs text-rose-600 font-medium mt-0.5">{item.days} días de mora</p>
                                    </div>
                                    <div className="text-right pl-3">
                                        <p className="text-sm font-bold text-rose-700 dark:text-rose-400">${item.amount.toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400">{format(parseISO(item.date), 'd MMM')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {overdueStats.count > 5 && (
                            <p className="text-xs text-center text-slate-400 mt-3">
                                + {overdueStats.count - 5} deudas más
                            </p>
                        )}
                    </div>
                )}

                {/* Upcoming List */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <CalendarDaysIcon className="w-5 h-5 text-indigo-500" />
                        Próximos Vencimientos
                    </h3>
                    <div className="space-y-4">
                        {upcomingList.length === 0 ? (
                            <p className="text-slate-500 text-sm">No hay vencimientos próximos.</p>
                        ) : (
                            upcomingList.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors cursor-pointer group">
                                    <div className="flex items-center space-x-3 overflow-hidden">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs flex-col leading-none">
                                            <span>{format(parseISO(item.dueDate), 'd')}</span>
                                            <span className="text-[9px] uppercase">{format(parseISO(item.dueDate), 'MMM', { locale: es })}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                                                {item.title}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {getCategoryName(item.category || '')}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                        ${item.amount.toLocaleString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            {/* Category Pie Chart - New Row */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Distribución por Categoría</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                    const RADIAN = Math.PI / 180;
                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                    // Only show label if segment is big enough
                                    if (percent < 0.05) return null;

                                    return (
                                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
                                            {`${(percent * 100).toFixed(0)}%`}
                                        </text>
                                    );
                                }}
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Monto']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend
                                layout="vertical"
                                verticalAlign="middle"
                                align="right"
                                wrapperStyle={{ paddingLeft: '20px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div >

            {/* --- DEBUG SECTION: GHOST HUNTER --- */}
            <div className="lg:col-span-3 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 mt-8">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    👻 Cazador de Fantasmas (Diagnóstico BD)
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Esta sección lista <strong>TODOS</strong> los registros de la base de datos desde 2024 hasta 2027, sin importar el mes seleccionado.
                    Úsala para identificar y eliminar registros antiguos o erróneos.
                </p>

                <GhostBuster />
            </div>

        </div>
    );
};
