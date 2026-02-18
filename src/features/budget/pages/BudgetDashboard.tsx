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

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const start = startOfMonth(selectedMonth);
                const end = endOfMonth(selectedMonth);

                let data = await budgetService.getCommitments(
                    format(start, 'yyyy-MM-dd'),
                    format(end, 'yyyy-MM-dd')
                );

                if (data.length === 0 && textIsDataLoaded()) {
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
                            status: 'paid',
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
    }, [selectedMonth, transactions]);

    const [overdueItems, setOverdueItems] = useState<BudgetCommitment[]>([]);

    useEffect(() => {
        const loadOverdue = async () => {
            try {
                const start = subMonths(new Date(), 6);
                const end = subDays(new Date(), 1);

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

        const totalOverdueAmount = currentMonthItems
            .filter(c => c.status === 'overdue')
            .reduce((sum, c) => sum + c.amount, 0);

        return [
            { name: 'Total Mes', value: (totalPending + totalPaid), icon: BanknotesIcon, color: 'text-gray-600', bg: 'bg-gray-100', colorDark: 'dark:text-gray-400', bgDark: 'dark:bg-slate-700/50' },
            { name: 'Pagado', value: totalPaid, icon: CheckCircleIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', colorDark: 'dark:text-emerald-400', bgDark: 'dark:bg-emerald-900/20' },
            { name: 'Pendiente', value: totalPending, icon: CurrencyDollarIcon, color: 'text-indigo-600', bg: 'bg-indigo-50', colorDark: 'dark:text-indigo-400', bgDark: 'dark:bg-indigo-900/20' },
            {
                name: overdueStats.count > 0 ? 'Mora Consolidada' : 'Vencido (Mes)',
                value: overdueStats.count > 0 ? overdueStats.total : totalOverdueAmount,
                icon: ExclamationCircleIcon,
                color: 'text-rose-600',
                bg: 'bg-rose-50',
                colorDark: 'dark:text-rose-400',
                bgDark: 'dark:bg-rose-900/20'
            },
        ];
    }, [commitments, selectedMonth, overdueStats]);

    const chartData = useMemo(() => {
        const startMonth = startOfMonth(selectedMonth);
        const endMonth = endOfMonth(selectedMonth);
        const weeks: { name: string; amount: number; fullLabel: string }[] = [];
        let weekStart = startOfWeek(startMonth, { weekStartsOn: 1 });

        while (weekStart <= endMonth) {
            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
            const weekTotal = commitments
                .filter(c => {
                    const d = parseISO(c.dueDate);
                    return isWithinInterval(d, { start: weekStart, end: weekEnd });
                })
                .reduce((sum, c) => sum + c.amount, 0);

            weeks.push({
                name: `Sem ${format(weekStart, 'w', { locale: es })}`,
                fullLabel: `${format(weekStart, 'd MMM')} - ${format(weekEnd, 'd MMM')}`,
                amount: weekTotal
            });
            weekStart = addDays(weekStart, 7);
        }
        return weeks;
    }, [commitments, selectedMonth]);

    const categoryData = useMemo(() => {
        const start = startOfMonth(selectedMonth);
        const end = endOfMonth(selectedMonth);
        const monthlyItems = commitments.filter(c =>
            isWithinInterval(parseISO(c.dueDate), { start, end })
        );
        const categoryMap = new Map<string, number>();
        monthlyItems.forEach(item => {
            const catName = getCategoryName(item.category || '');
            const current = categoryMap.get(catName) || 0;
            categoryMap.set(catName, current + item.amount);
        });
        return Array.from(categoryMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

    }, [commitments, selectedMonth, categories]);

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
                title="Control Presupuestal"
                breadcrumbs={[
                    { label: 'Finanzas', path: '/budget' },
                    { label: 'Tablero' }
                ]}
                icon={<PresentationChartLineIcon className="h-6 w-6" />}
                actions={
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                type="month"
                                value={format(selectedMonth, 'yyyy-MM')}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        const [y, m] = e.target.value.split('-');
                                        setSelectedMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
                                    }
                                }}
                                className="h-9 px-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-200 shadow-sm focus:ring-1 focus:ring-primary outline-none uppercase tracking-wider"
                            />
                        </div>
                        <Button
                            onClick={() => openForm()}
                            className="!h-9 !px-4 !text-[11px] font-bold uppercase tracking-wider shadow-sm"
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

                {/* Right Column: Alerts & Side Panels */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Overdue Alerts */}
                    {overdueStats.count > 0 && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border-2 border-rose-100 dark:border-rose-900/30 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
                            <h3 className="text-[11px] font-bold text-rose-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <ExclamationCircleIcon className="w-4 h-4" />
                                Alerta de Morosidad
                            </h3>
                            <div className="space-y-3">
                                {overdueStats.chartData.slice(0, 4).map((item, idx) => (
                                    <div key={`${item.name}-${idx}`} className="flex items-center justify-between p-3 bg-rose-50/50 dark:bg-rose-900/10 rounded-lg border border-rose-50 dark:border-rose-900/20">
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 truncate tracking-tight">{item.name}</p>
                                            <p className="text-[11px] text-rose-600 font-bold uppercase tracking-tighter mt-0.5">{item.days} días de mora</p>
                                        </div>
                                        <div className="text-right pl-3 shrink-0">
                                            <p className="text-[13px] font-bold text-rose-600 tracking-tight">{formatCurrency(item.amount)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {overdueStats.count > 4 && (
                                <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest mt-4">
                                    + {overdueStats.count - 4} registros adicionales
                                </p>
                            )}
                        </div>
                    )}

                    {/* Upcoming List */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2 tracking-tight">
                            <CalendarDaysIcon className="w-4 h-4 text-primary" />
                            Próximos Vencimientos
                        </h3>
                        <div className="space-y-4">
                            {upcomingList.length === 0 ? (
                                <div className="py-10 text-center border-2 border-dashed border-gray-100 dark:border-slate-700 rounded-xl">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Sin vencimientos</p>
                                </div>
                            ) : (
                                upcomingList.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-gray-100 dark:hover:border-slate-700">
                                        <div className="flex items-center space-x-3 overflow-hidden">
                                            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs flex-col leading-none border border-indigo-100 dark:border-indigo-900/10">
                                                <span>{format(parseISO(item.dueDate), 'd')}</span>
                                                <span className="text-[8px] uppercase">{format(parseISO(item.dueDate), 'MMM', { locale: es })}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors tracking-tight">
                                                    {item.title}
                                                </p>
                                                <p className="text-[11px] text-gray-400 font-medium truncate uppercase tracking-tighter">
                                                    {getCategoryName(item.category || '')}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[13px] font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">
                                            {formatCurrency(item.amount)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Diagnostic Tool */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-gray-200 dark:border-slate-700 border-dashed">
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span>🔍 HERRAMIENTA DE DIAGNÓSTICO</span>
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                            Registro maestro de la base de datos (2024-2027) para conciliación manual.
                        </p>
                        <GhostBuster />
                    </div>
                </div>
            </div>
        </div>
    );
};
