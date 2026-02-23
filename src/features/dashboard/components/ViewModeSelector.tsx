import React from 'react';

interface ViewModeSelectorProps {
    viewMode: 'sales' | 'visits' | 'combined';
    onChange: (mode: 'sales' | 'visits' | 'combined') => void;
}

export const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({ viewMode, onChange }) => {
    return (
        <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm overflow-hidden h-9">
            {(['sales', 'visits', 'combined'] as const).map((mode, idx, arr) => (
                <button
                    key={mode}
                    onClick={() => onChange(mode)}
                    className={`flex items-center justify-center px-4 h-full text-[13px] font-semibold transition-colors
                        ${idx < arr.length - 1 ? 'border-r border-slate-200 dark:border-slate-700' : ''}
                        ${viewMode === mode
                            ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                            : 'bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700'
                        }`}
                >
                    {mode === 'sales' ? 'Ventas' : mode === 'visits' ? 'Visitas' : 'Combinado'}
                </button>
            ))}
        </div>
    );
};
