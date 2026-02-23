import React from 'react';

interface SelectionToggleProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    variant?: 'purple' | 'emerald' | 'blue';
}

/**
 * SelectionToggle - Aliaddo UI Component
 * A standardized toggle switch with label, following Aliaddo Design System §4 & §5.
 * Used for view modes or context switching in PageHeaders (Zone A).
 */
export const SelectionToggle: React.FC<SelectionToggleProps> = ({
    label,
    checked,
    onChange,
    variant = 'purple'
}) => {
    const variants = {
        purple: 'bg-purple-600',
        emerald: 'bg-emerald-500',
        blue: 'bg-blue-600'
    };

    return (
        <label className="flex items-center gap-2 cursor-pointer group h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md transition-all hover:bg-slate-50 dark:hover:bg-slate-750 shadow-sm active:scale-95">
            <div className={`relative inline-flex h-4 w-7.5 items-center rounded-full transition-colors ${checked ? variants[variant] : 'bg-slate-200 dark:bg-slate-700'}`}>
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform shadow-sm ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
            </div>
            <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors uppercase tracking-[0.1em] whitespace-nowrap">
                {label}
            </span>
        </label>
    );
};
