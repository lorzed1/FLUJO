import React from 'react';
import { BanknotesIcon, UserIcon, UsersIcon, ArrowsRightLeftIcon } from '../../../components/ui/Icons';
import { formatCurrency } from '../../../components/ui/Input';
import { KPICard } from './KPICard';
import { ComparisonStatCard } from './ComparisonStatCard';

interface KPISectionProps {
    extendedKPIs: any;
}

export const KPISection: React.FC<KPISectionProps> = ({ extendedKPIs }) => {
    return (
        <div>
            <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">📊 Indicadores Clave</h2>

            {/* Row 1: KPIs Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
                <KPICard
                    label="Ventas del Mes"
                    value={formatCurrency(extendedKPIs.totalSales.value)}
                    vsLastMonth={extendedKPIs.totalSales.vsLastMonth}
                    vsLastYear={extendedKPIs.totalSales.vsLastYear}
                    icon={<BanknotesIcon className="w-5 h-5 text-indigo-600" />}
                    colorClass="bg-indigo-100 dark:bg-indigo-900"
                />
                <KPICard
                    label="Ticket Promedio"
                    value={formatCurrency(extendedKPIs.avgTicket.value)}
                    vsLastMonth={extendedKPIs.avgTicket.vsLastMonth}
                    icon={<UserIcon className="w-5 h-5 text-emerald-600" />}
                    colorClass="bg-emerald-100 dark:bg-emerald-900"
                />
                <KPICard
                    label="Visitas Totales"
                    value={extendedKPIs.totalVisits}
                    icon={<UsersIcon className="w-5 h-5 text-orange-600" />}
                    colorClass="bg-orange-100 dark:bg-orange-900"
                />
                <KPICard
                    label="Ventas Domicilios (Rappi)"
                    value={formatCurrency(extendedKPIs.rappiSales)}
                    icon={<ArrowsRightLeftIcon className="w-5 h-5 text-purple-600" />}
                    colorClass="bg-purple-100 dark:bg-purple-900"
                />
            </div>

            {/* Row 2: Mini Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <ComparisonStatCard
                    label="Ventas del Día"
                    bestValue={formatCurrency(extendedKPIs.bestSale.value)}
                    bestDate={extendedKPIs.bestSale.date}
                    worstValue={formatCurrency(extendedKPIs.worstSale.value)}
                    worstDate={extendedKPIs.worstSale.date}
                />
                <ComparisonStatCard
                    label="Ticket del Día"
                    bestValue={formatCurrency(extendedKPIs.bestTicket.value)}
                    bestDate={extendedKPIs.bestTicket.date}
                    worstValue={formatCurrency(extendedKPIs.worstTicket.value)}
                    worstDate={extendedKPIs.worstTicket.date}
                />
            </div>
        </div>
    );
};
