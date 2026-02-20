
import React from 'react';
import { MOCK_OVERVIEW_DATA } from '../dashboard-mock-data';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon, BanknotesIcon, ChartBarIcon } from '../../../components/ui/Icons';

// Standard Palette: Emerald (Positive), Rose (Negative/Expense), Indigo (Neutral), Amber (Warning)
const COLORS = ['#059669', '#e11d48', '#4f46e5', '#d97706']; // emerald-600, rose-600, indigo-600, amber-600

export const OverviewView: React.FC<{ selectedDate: Date }> = ({ selectedDate }) => {
    return (
        <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {MOCK_OVERVIEW_DATA.kpis.map((kpi, index) => (
                    <div key={index} className="relative group bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{kpi.title}</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {kpi.value}
                                </h3>
                            </div>
                            <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50`}>
                                {index === 0 ? <CurrencyDollarIcon className="w-5 h-5 text-purple-600" /> :
                                    index === 1 ? <BanknotesIcon className="w-5 h-5 text-rose-500" /> :
                                        <ChartBarIcon className="w-5 h-5 text-emerald-500" />}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${kpi.trend === 'up'
                                ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : 'text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400'
                                }`}>
                                {kpi.trend === 'up' ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                                {kpi.change}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">{kpi.period}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sales Trend Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800 dark:text-white">Tendencia de Ingresos</h3>
                            <p className="text-xs text-gray-500">Comparativa Real vs Meta Mensual</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                                <span className="text-xs text-gray-600 dark:text-gray-300">Real</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-200"></span>
                                <span className="text-xs text-gray-600 dark:text-gray-300">Meta</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={MOCK_OVERVIEW_DATA.salesTrend}>
                                <defs>
                                    <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#9333ea" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    labelStyle={{ color: '#374151', fontWeight: 600, fontSize: '12px' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="real"
                                    stroke="#9333ea"
                                    fillOpacity={1}
                                    fill="url(#colorReal)"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="meta"
                                    stroke="#e9d5ff"
                                    fill="none"
                                    strokeDasharray="4 4"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution Pie Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800 dark:text-white mb-6">Distribución</h3>
                    <div className="h-[250px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={MOCK_OVERVIEW_DATA.budgetDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {MOCK_OVERVIEW_DATA.budgetDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', padding: '8px 12px', border: '1px solid #e5e7eb' }} itemStyle={{ fontSize: '12px', fontWeight: 600 }} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <span className="text-2xl font-bold text-gray-800 dark:text-white">
                                {MOCK_OVERVIEW_DATA.budgetDistribution.length > 0 ? '100%' : '---'}
                            </span>
                            <p className="text-xs text-gray-500">Total</p>
                        </div>
                    </div>

                    <div className="space-y-3 mt-4">
                        {MOCK_OVERVIEW_DATA.budgetDistribution.map((item, index) => (
                            <div key={index} className="flex items-center justify-between group cursor-default">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-xs text-gray-600 dark:text-gray-300">{item.name}</span>
                                </div>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};
