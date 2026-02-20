
import React from 'react';
import { MOCK_BUDGET_DATA } from '../dashboard-mock-data';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Card } from '../../../components/ui/Card';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '../../../components/ui/Icons';

export const BudgetsView: React.FC<{ selectedDate: Date }> = ({ selectedDate }) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {MOCK_BUDGET_DATA.kpis.map((kpi, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{kpi.title}</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{kpi.value}</h3>
                            </div>
                            <div className={`p-1.5 rounded-lg ${index === 0 ? 'bg-purple-50 text-purple-600' :
                                index === 1 ? 'bg-orange-50 text-orange-600' :
                                    'bg-emerald-50 text-emerald-600'
                                }`}>
                                {index === 0 && <span className="text-[10px] font-bold uppercase">Total</span>}
                                {index === 1 && <span className="text-[10px] font-bold uppercase">Uso</span>}
                                {index === 2 && <span className="text-[10px] font-bold uppercase">Libre</span>}
                            </div>
                        </div>

                        {/* Progress Bar for the budget usage */}
                        {index === 1 && (
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-2">
                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '68%' }}></div>
                            </div>
                        )}
                        {index === 2 && (
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-2">
                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '32%' }}></div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Main Bar Chart */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800 dark:text-white">Ejecución por Área</h3>
                    <p className="text-xs text-gray-500 mt-1">Comparativa de Presupuesto Asignado vs Ejecutado</p>
                </div>

                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={MOCK_BUDGET_DATA.executionByArea}
                            layout="vertical"
                            margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                            barSize={20}
                            barGap={4}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="area"
                                type="category"
                                tick={{ fontSize: 12, fontWeight: 600, fill: '#4b5563' }}
                                width={100}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: '#f9fafb' }}
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: '4px' }}
                            />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                            />
                            <Bar name="Asignado" dataKey="allocated" fill="#e0e7ff" radius={[0, 4, 4, 0]} />
                            <Bar name="Ejecutado" dataKey="executed" fill="#7c3aed" radius={[0, 4, 4, 0]} >
                                {
                                    MOCK_BUDGET_DATA.executionByArea.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.executed > entry.allocated ? '#ef4444' : '#7c3aed'} />
                                    ))
                                }
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
