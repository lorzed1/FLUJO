import React from 'react';
import { ProjectionResult } from '../../../utils/projections';
import { SalesProjection } from '../../../types';
import {
    BanknotesIcon,
    ArrowTrendingUpIcon,
    UsersIcon,
    ChartPieIcon
} from '../../../components/ui/Icons';
import {
    CheckCircleIcon,
    XCircleIcon,
    CalendarDaysIcon,
    SparklesIcon,
    ArrowTrendingDownIcon,
    StarIcon
} from '@heroicons/react/24/outline';
import { useProjectionsKPIs } from '../hooks/useProjectionsKPIs';

interface ProjectionsKPIsProps {
    currentDate: Date;
    calculatedProjections: Record<string, ProjectionResult>;
    storedProjections: Record<string, SalesProjection>;
    realSales: Record<string, number>;
    mode?: 'statistical' | 'financial'; // Modo del dashboard
}

export const ProjectionsKPIs: React.FC<ProjectionsKPIsProps> = ({
    currentDate,
    calculatedProjections,
    storedProjections,
    realSales,
    mode = 'statistical'
}) => {

    const stats = useProjectionsKPIs({
        currentDate,
        calculatedProjections,
        storedProjections,
        realSales,
        mode
    });

    // Formatters
    const fmtMoney = (val: number) => `$ ${val.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
    const fmtPercent = (val: number) => `${val.toFixed(1)}%`;

    // Color helpers
    const cumplimientoColor = stats.cumplimiento >= 100
        ? 'text-emerald-600 dark:text-emerald-400'
        : stats.cumplimiento >= 70
            ? 'text-amber-500 dark:text-amber-400'
            : 'text-rose-500 dark:text-rose-400';
    const cumplimientoBarColor = stats.cumplimiento >= 100
        ? 'bg-emerald-500'
        : stats.cumplimiento >= 70
            ? 'bg-amber-500'
            : 'bg-rose-500';
    const proyeccionCierreColor = stats.proyeccionCierre >= stats.totalMeta
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-amber-500 dark:text-amber-400';

    // ==========================================
    // MODO PUNTO DE EQUILIBRIO (KPIs especializados)
    // ==========================================
    if (mode === 'financial') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">

                {/* KPI 1: Cumplimiento Global Equilibrio */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-8 -top-8 w-28 h-28 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/10 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cumplimiento Equilibrio</p>
                            <div className="flex items-baseline gap-2 mt-1.5">
                                <span className={`text-3xl font-black ${cumplimientoColor}`}>
                                    {fmtPercent(stats.cumplimiento)}
                                </span>
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full mt-3 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${cumplimientoBarColor}`}
                                    style={{ width: `${Math.min(stats.cumplimiento, 100)}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">
                                {stats.countDaysWithReal} de {stats.daysInMonth} días operados
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center ml-3 shrink-0">
                            <ChartPieIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>

                {/* KPI 2: Venta Acumulada vs Meta de Gastos */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-8 -top-8 w-28 h-28 bg-gradient-to-br from-emerald-50 to-transparent dark:from-emerald-900/10 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Venta Acumulada</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 truncate">
                                {fmtMoney(stats.totalReal)}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1.5">
                                Meta: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{fmtMoney(stats.totalMeta)}</span>
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center ml-3 shrink-0">
                            <BanknotesIcon className="w-5 h-5 text-emerald-600" />
                        </div>
                    </div>
                </div>

                {/* KPI 3: Brecha / Superávit */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-8 -top-8 w-28 h-28 bg-gradient-to-br from-amber-50 to-transparent dark:from-amber-900/10 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {stats.superavit > 0 ? 'Superávit 🎉' : 'Brecha para Meta'}
                            </p>
                            <p className={`text-2xl font-black mt-1.5 ${stats.superavit > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'}`}>
                                {stats.superavit > 0 ? `+${fmtMoney(stats.superavit)}` : fmtMoney(stats.faltante)}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1.5">
                                {stats.superavit > 0
                                    ? 'Por encima del punto de equilibrio'
                                    : 'Falta por vender este mes'}
                            </p>
                        </div>
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center ml-3 shrink-0 ${stats.superavit > 0
                            ? 'bg-emerald-50 dark:bg-emerald-900/20'
                            : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                            {stats.superavit > 0
                                ? <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500" />
                                : <ArrowTrendingDownIcon className="w-5 h-5 text-amber-500" />}
                        </div>
                    </div>
                </div>

                {/* KPI 4: Proyección de Cierre (Run Rate) */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-8 -top-8 w-28 h-28 bg-gradient-to-br from-purple-50 to-transparent dark:from-purple-900/10 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Proyección de Cierre</p>
                            <p className={`text-2xl font-black mt-1.5 ${proyeccionCierreColor}`}>
                                {stats.countDaysWithReal > 0 ? fmtMoney(stats.proyeccionCierre) : '-'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1.5">
                                Prom. diario: <span className="font-semibold text-slate-600 dark:text-slate-300">{fmtMoney(stats.avgDiario)}</span>
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center ml-3 shrink-0">
                            <SparklesIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                </div>

                {/* KPI 5: Días Cumplidos vs No Cumplidos */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-8 -top-8 w-28 h-28 bg-gradient-to-br from-green-50 to-transparent dark:from-green-900/10 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tasa de Éxito Diario</p>
                            <div className="flex items-baseline gap-3 mt-1.5">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.daysCumplidos}</span>
                                </div>
                                <span className="text-slate-300 dark:text-slate-600 text-lg">/</span>
                                <div className="flex items-center gap-1.5">
                                    <XCircleIcon className="w-5 h-5 text-rose-400" />
                                    <span className="text-2xl font-black text-rose-500 dark:text-rose-400">{stats.daysNoCumplidos}</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5">
                                {stats.countDaysWithReal > 0
                                    ? `${((stats.daysCumplidos / stats.countDaysWithReal) * 100).toFixed(0)}% de éxito en ${stats.countDaysWithReal} días`
                                    : 'Sin datos aún'}
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center ml-3 shrink-0">
                            <CalendarDaysIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                {/* KPI 6: Mejor Día del Mes */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-8 -top-8 w-28 h-28 bg-gradient-to-br from-yellow-50 to-transparent dark:from-yellow-900/10 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mejor Día del Mes</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 truncate">
                                {stats.bestDay.value > 0 ? fmtMoney(stats.bestDay.value) : '-'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1.5 capitalize">
                                {stats.bestDayLabel}
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center ml-3 shrink-0">
                            <StarIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // MODO ESTADÍSTICO (KPIs originales)
    // ==========================================
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
                    </div>
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

            {/* KPI 2: Venta Real vs Meta */}
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

            {/* KPI 4: Días Operados */}
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
