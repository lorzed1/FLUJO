import React, { ReactNode } from 'react';
import { Card } from '../../../components/ui/Card';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '../../../components/ui/Icons';

export interface KPICardProps {
    label: string;
    value: string | number;
    vsLastMonth?: number;
    vsLastYear?: number;
    icon: ReactNode;
    colorClass: string;
    compact?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({ label, value, vsLastMonth, vsLastYear, icon, colorClass, compact = false }) => {
    return (
        <Card className="hover:shadow-md transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 relative overflow-hidden group bg-white dark:bg-slate-800 p-4" noPadding={true}>
            {/* Background decoration */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-slate-50 to-transparent dark:from-slate-700/10 rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-1">
                    <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                        <p className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight`}>{value}</p>
                    </div>
                    <div className={`p-1.5 rounded-lg ${colorClass} bg-opacity-10 shadow-sm`}>
                        {icon}
                    </div>
                </div>

                {(vsLastMonth !== undefined || vsLastYear !== undefined) && (
                    <div className="flex gap-2 text-[10px]">
                        {vsLastMonth !== undefined && (
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium ${vsLastMonth >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                                {vsLastMonth >= 0 ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                                <span>{Math.abs(vsLastMonth).toFixed(1)}% vs mes ant.</span>
                            </div>
                        )}
                        {vsLastYear !== undefined && (
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium ${vsLastYear >= 0 ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'}`}>
                                <span>{Math.abs(vsLastYear).toFixed(1)}% vs año ant.</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};
