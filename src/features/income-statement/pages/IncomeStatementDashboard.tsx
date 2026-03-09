import React, { useState } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import {
    PresentationChartLineIcon,
    CurrencyDollarIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ChartBarIcon
} from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';
import { DateNavigator } from '../../../components/ui/DateNavigator';
import { Card } from '../../../components/ui/Card';

export const IncomeStatementDashboard: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pr-2 pb-10">
            <PageHeader
                title="BI PYG"
                breadcrumbs={[
                    { label: 'Estado de Resultados' },
                    { label: 'BI PYG' }
                ]}
                icon={<PresentationChartLineIcon className="h-6 w-6" />}
                actions={
                    <div className="flex items-center gap-2">
                        <DateNavigator
                            value={selectedMonth}
                            onChange={(newDate) => setSelectedMonth(newDate)}
                        />
                        <Button
                            variant="primary"
                            className="!px-4 !text-xs font-bold uppercase tracking-wider shadow-sm"
                        >
                            <ArrowTrendingUpIcon className="w-4 h-4 mr-1.5" />
                            Generar Reporte
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
                {/* Stats Cards Row */}
                <div className="lg:col-span-12">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Ingresos */}
                        <Card className="p-5 transition-all hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider leading-none mb-2">Ingresos Totales</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate">$0</p>
                                </div>
                                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 shrink-0">
                                    <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                        </Card>

                        {/* Egresos */}
                        <Card className="p-5 transition-all hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider leading-none mb-2">Egresos Totales</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate">$0</p>
                                </div>
                                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 shrink-0">
                                    <ArrowTrendingDownIcon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                </div>
                            </div>
                        </Card>

                        {/* Utilidad */}
                        <Card className="p-5 transition-all hover:shadow-md">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider leading-none mb-2">Utilidad Neta</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate">$0</p>
                                </div>
                                <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 shrink-0">
                                    <CurrencyDollarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Main Content Area - Placeholder for Charts */}
                <div className="lg:col-span-12">
                    <Card className="p-6 min-h-[400px] flex flex-col items-center justify-center">
                        <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-700/50 mb-4">
                            <ChartBarIcon className="w-10 h-10 text-slate-300 dark:text-slate-500" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Visualización de Datos</h3>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide text-center max-w-sm">
                            Los gráficos de rendimiento financiero aparecerán aquí una vez que se conecten los datos reales.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
};
