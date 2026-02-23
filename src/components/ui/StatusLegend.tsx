import React from 'react';

export interface LegendItem {
    label: string;
    colorClass: string;
}

interface StatusLegendProps {
    items: LegendItem[];
    className?: string;
}

/**
 * StatusLegend - Aliaddo UI Component
 * A standardized way to display data categories or indicators (dots + labels).
 * Follows Aliaddo Design System §4 Z1 (Contextual Indicators).
 */
export const StatusLegend: React.FC<StatusLegendProps> = ({
    items,
    className = ''
}) => {
    return (
        <div className={`flex items-center gap-4 px-4 h-10 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm ${className}`}>
            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2 shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full ${item.colorClass}`} />
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        {item.label}
                    </span>
                </div>
            ))}
        </div>
    );
};
