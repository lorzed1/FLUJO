
import React from 'react';

interface LabeledFieldProps {
    label: string;
    children: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
}

export const LabeledField: React.FC<LabeledFieldProps> = ({ label, children, icon, className = '' }) => {
    return (
        <div className={`relative border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-900 flex items-center gap-2 group focus-within:ring-2 focus-within:ring-indigo-100 transition-all ${className}`}>
            <label className="absolute -top-2 left-2 bg-white dark:bg-slate-900 px-1 text-[10px] font-semibold text-slate-400 group-focus-within:text-indigo-500 whitespace-nowrap z-10">
                {label}
            </label>
            {icon && (
                <div className="text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-400 transition-colors shrink-0">
                    {icon}
                </div>
            )}
            <div className="flex-1 min-w-0">
                {children}
            </div>
        </div>
    );
};
