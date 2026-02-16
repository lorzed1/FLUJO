import React, { useMemo } from 'react';
import { ProjectionResult } from '../../../utils/projections';
import { SalesProjection } from '../../../types';
import {
    BanknotesIcon,
    ArrowTrendingUpIcon,
    UsersIcon,
    ChartPieIcon
} from '../../../components/ui/Icons';
import { TicketIcon } from '../../../components/ui/icons/TicketIcon';

interface ProjectionsKPIsProps {
    currentDate: Date;
    calculatedProjections: Record<string, ProjectionResult>;
    storedProjections: Record<string, SalesProjection>;
    realSales: Record<string, number>;
}

export const ProjectionsKPIs: React.FC<ProjectionsKPIsProps> = ({
    calculatedProjections,
    storedProjections,
    realSales
}) => {

    // Calcular totales del mes
    const stats = useMemo(() => {
        let totalMeta = 0;
        let totalReal = 0;
        let totalProyectadoVisitas = 0;
        let totalRealVisitas = 0; // Necesitamos este dato si existiera en realSales, por ahora asumimos solo ventas monetarias
        // Si realSales es solo Record<string, number> (dinero), no tenemos visitas reales aquí.
        // Asumiremos que por ahora comparamos solo Dinero.

        let countDaysWithReal = 0;

        Object.keys(calculatedProjections).forEach(dateStr => {
            const projection = calculatedProjections[dateStr];
            const stored = storedProjections[dateStr];
            const real = realSales[dateStr] || 0;

            // Meta: Prioridad Manual > Calculada
            const metaDia = stored?.amountAdjusted ?? projection?.final ?? 0;
            totalMeta += metaDia;

            if (realSales[dateStr] !== undefined) {
                totalReal += real;
                countDaysWithReal++;
            }
        });

        const cumplimiento = totalMeta > 0 ? (totalReal / totalMeta) * 100 : 0;
        const faltante = Math.max(0, totalMeta - totalReal);

        return {
            totalMeta,
            totalReal,
            cumplimiento,
            faltante,
            countDaysWithReal
        };
    }, [calculatedProjections, storedProjections, realSales]);

    // Formatter local si no importamos
    const fmtMoney = (val: number) => `$ ${val.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
    const fmtPercent = (val: number) => `${val.toFixed(1)}%`;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

            {/* KPI 1: Cumplimiento Global */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cumplimiento Mes</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className={`text-2xl font-bold ${stats.cumplimiento >= 100 ? 'text-emerald-600' : stats.cumplimiento >= 80 ? 'text-amber-500' : 'text-slate-700 dark:text-white'}`}>
                            {fmtPercent(stats.cumplimiento)}
                        </span>
                        {/* <span className="text-xs text-slate-400 font-medium">de la meta</span> */}
                    </div>
                    {/* Progress Bar Mini */}
                    <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                        <div
                            className={`h-full rounded-full ${stats.cumplimiento >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                            style={{ width: `${Math.min(stats.cumplimiento, 100)}%` }}
                        />
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
                    <ChartPieIcon className="w-5 h-5" />
                </div>
            </div>

            {/* KPI 2: Venta Real vs Meta (Progreso) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Venta Real vs Meta</p>
                    <div className="flex flex-col mt-1">
                        <span className="text-xl font-bold text-slate-900 dark:text-white">
                            {fmtMoney(stats.totalReal)}
                        </span>
                        <span className="text-xs text-slate-400 font-medium mt-0.5">
                            Meta: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{fmtMoney(stats.totalMeta)}</span>
                        </span>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                    <BanknotesIcon className="w-5 h-5" />
                </div>
            </div>

            {/* KPI 3: Brecha (Faltante) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Brecha para Meta</p>
                    <div className="mt-1">
                        <span className="text-xl font-bold text-slate-700 dark:text-slate-300">
                            {stats.faltante > 0 ? fmtMoney(stats.faltante) : '$ 0'}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">
                            {stats.faltante > 0 ? 'Falta por vender' : '¡Meta superada! 🎉'}
                        </p>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
                    <ArrowTrendingUpIcon className="w-5 h-5" />
                </div>
            </div>

            {/* KPI 4: Proyeccion Cierre (Run Rate) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Días Operados</p>
                    <div className="mt-1">
                        <span className="text-xl font-bold text-slate-900 dark:text-white">
                            {stats.countDaysWithReal}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">Con registros reales</p>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600">
                    <UsersIcon className="w-5 h-5" />
                </div>
            </div>

        </div>
    );
};
