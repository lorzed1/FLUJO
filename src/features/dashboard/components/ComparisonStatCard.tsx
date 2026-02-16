import React from 'react';

interface ComparisonStatCardProps {
    label: string;
    bestValue: string;
    bestDate?: string;
    worstValue: string;
    worstDate?: string;
}

export const ComparisonStatCard: React.FC<ComparisonStatCardProps> = ({ label, bestValue, bestDate, worstValue, worstDate }) => {
    return (
        <div className="rounded-lg p-3 border bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700 transition-transform hover:scale-105 hover:shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2.5 text-slate-600 dark:text-slate-400">{label}</p>
            <div className="space-y-2.5">
                <div>
                    <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">↑ Mejor</p>
                    <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">{bestValue}</p>
                    {bestDate && <p className="text-[9px] opacity-70 mt-0.5 font-medium">{new Date(bestDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</p>}
                </div>
                <div className="border-t border-slate-300 dark:border-slate-600 pt-2.5">
                    <p className="text-[9px] text-rose-600 dark:text-rose-400 font-semibold mb-0.5">↓ Peor</p>
                    <p className="text-base font-bold text-rose-700 dark:text-rose-400">{worstValue}</p>
                    {worstDate && <p className="text-[9px] opacity-70 mt-0.5 font-medium">{new Date(worstDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</p>}
                </div>
            </div>
        </div>
    );
};
