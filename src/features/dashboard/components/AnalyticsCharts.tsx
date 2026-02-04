import React from 'react';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, PieChart, Pie, Cell, LineChart, AreaChart, Area } from 'recharts';
import { Card } from '../../../components/ui/Card';
import { formatCurrency } from '../../../components/ui/Input';

import { ViewMode, PeriodMode } from '../../../hooks/useBusinessIntelligence';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#3b82f6', '#06b6d4'];

interface SalesEvolutionChartProps {
    data: any[];
    viewMode: ViewMode;
    periodMode: PeriodMode;
}
export const SalesEvolutionChart: React.FC<SalesEvolutionChartProps> = ({ data, viewMode, periodMode }) => {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 30, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#94A3B8" axisLine={false} tickLine={false} dy={10}
                    tickFormatter={(val) => {
                        const d = new Date(val + 'T12:00:00');
                        if (periodMode === 'year') {
                            return d.toLocaleDateString('es-CO', { month: 'short' }).charAt(0).toUpperCase() + d.toLocaleDateString('es-CO', { month: 'short' }).slice(1);
                        }
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                />

                {/* Eje Y Izquierdo (Ventas/Principal) */}
                {(viewMode === 'all' || viewMode === 'sales') && (
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#94A3B8" axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                )}

                {/* Eje Y Derecho (Visitas/Secundario) - Si solo es Visitas, lo usamos como primario vizual pero alineado a la izquierda si se quiere, o mantenemos right */}
                {(viewMode === 'all' || viewMode === 'visits') && (
                    <YAxis yAxisId="right" orientation={viewMode === 'visits' ? 'left' : 'right'} tick={{ fontSize: 11, fill: '#64748B' }} stroke="#94A3B8" axisLine={false} tickLine={false} />
                )}

                <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: number, name: string) => [
                        name === 'sales' ? formatCurrency(value) : value,
                        name === 'sales' ? 'Ventas' : 'Visitas'
                    ]}
                    labelFormatter={(label) => {
                        const d = new Date(label + 'T12:00:00');
                        if (periodMode === 'year') {
                            return d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
                        }
                        return d.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />

                {/* Renderizado condicional de series */}
                {(viewMode === 'all' || viewMode === 'sales') && (
                    <Bar yAxisId="left" dataKey="sales" name="Ventas" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                )}

                {(viewMode === 'all' || viewMode === 'visits') && (
                    <Line yAxisId="right" type="monotone" dataKey="visits" name="Visitas" stroke="#f97316" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                )}
            </ComposedChart>
        </ResponsiveContainer>
    );
};

interface DayOfWeekAnalysisProps {
    data: any[];
    viewMode: ViewMode;
}
export const DayOfWeekAnalysis: React.FC<DayOfWeekAnalysisProps> = ({ data, viewMode }) => {
    // Definir qué métrica mostrar según el modo
    const dataKey = viewMode === 'visits' ? 'avgPax' : 'avgSales';
    const label = viewMode === 'visits' ? 'Promedio Visitas' : 'Promedio Venta';
    const barColor = viewMode === 'visits' ? '#f97316' : '#8b5cf6'; // Naranja para visitas, Violeta para ventas

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                <XAxis type="number" hide />
                <YAxis dataKey="dayName" type="category" tick={{ fontSize: 12, fontWeight: 600, fill: '#475569' }} width={80} axisLine={false} tickLine={false} />
                <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: number, name: string) => [
                        viewMode !== 'visits' ? formatCurrency(value) : value,
                        label
                    ]}
                />
                <Bar dataKey={dataKey} fill={barColor} radius={[0, 4, 4, 0]} barSize={20} background={{ fill: '#f8fafc' }}>
                    {viewMode === 'all' && data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

interface PaymentMixChartProps {
    data: any[];
}
export const PaymentMixChart: React.FC<PaymentMixChartProps> = ({ data }) => {
    return (
        <div className="flex flex-col md:flex-row items-center h-full gap-4">
            <div className="h-48 md:h-64 w-full md:w-2/5 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="w-full md:w-3/5 space-y-3 p-2 overflow-y-auto max-h-64 pr-2 custom-scrollbar">
                {data.map((item, idx) => (
                    <div key={item.name} className="flex justify-between items-center text-xs lg:text-sm border-b border-slate-50 dark:border-slate-700/50 pb-1 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                            <span className="text-slate-600 dark:text-gray-300 font-medium truncate" title={item.name}>{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="font-semibold text-slate-800 dark:text-white whitespace-nowrap">{formatCurrency(item.value)}</span>
                            <span className="text-slate-400 text-xs w-10 text-right font-mono">{item.percentage.toFixed(1)}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
interface WeeklyOverlapChartProps {
    data: any[];
    keys: string[];
}
export const WeeklyOverlapChart: React.FC<WeeklyOverlapChartProps> = ({ data, keys }) => {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#94A3B8" axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} stroke="#94A3B8" axisLine={false} tickLine={false} />
                <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: number, name: string) => [value, name]}
                    labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                {keys.map((key, index) => (
                    <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={key}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                        connectNulls
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
};

interface PaymentEvolutionChartProps {
    data: any[];
}
export const PaymentEvolutionChart: React.FC<PaymentEvolutionChartProps> = ({ data }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorEfectivo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBancolombia" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNequi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDatafono" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis dataKey="date" tickFormatter={(val) => new Date(val).getDate().toString()} stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="Efectivo" stackId="1" stroke="#10b981" fill="url(#colorEfectivo)" />
                <Area type="monotone" dataKey="Bancolombia" stackId="1" stroke="#ec4899" fill="url(#colorBancolombia)" />
                <Area type="monotone" dataKey="Nequi" stackId="1" stroke="#8b5cf6" fill="url(#colorNequi)" />
                <Area type="monotone" dataKey="Datafono" stackId="1" stroke="#6366f1" fill="url(#colorDatafono)" />
                <Area type="monotone" dataKey="Rappi" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
            </AreaChart>
        </ResponsiveContainer>
    );
};
