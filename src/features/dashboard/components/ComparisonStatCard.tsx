import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, CalendarIcon } from '../../../components/ui/Icons';

interface ComparisonStatCardProps {
    label: string;
    bestValue: string;
    bestDate?: string;
    worstValue: string;
    worstDate?: string;
}

export const ComparisonStatCard: React.FC<ComparisonStatCardProps> = ({ label, bestValue, bestDate, worstValue, worstDate }) => {
    // Helper para formatear fecha corta
    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3 group hover:border-indigo-200 dark:hover:border-indigo-900 transition-all duration-300">
            {/* Título e Icono Placeholder o Decoración */}
            <div className="flex flex-col justify-center pl-1">
                <div className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg w-fit mb-1.5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                    <CalendarIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
            </div>

            {/* Stats Area */}
            <div className="flex items-center gap-3 sm:gap-6 bg-slate-50 dark:bg-slate-900/40 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800/50">
                {/* Best */}
                <div className="flex flex-col items-end min-w-[80px]">
                    <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">MEJOR</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{bestValue}</p>
                    {bestDate && <p className="text-[9px] text-slate-400 font-medium">{formatDate(bestDate)}</p>}
                </div>

                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

                {/* Worst */}
                <div className="flex flex-col items-end min-w-[80px]">
                    <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-1.5 py-0.5 rounded-full">PEOR</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{worstValue}</p>
                    {worstDate && <p className="text-[9px] text-slate-400 font-medium">{formatDate(worstDate)}</p>}
                </div>
            </div>
        </div>
    );
};
