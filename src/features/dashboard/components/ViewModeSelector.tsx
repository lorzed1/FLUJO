import React from 'react';

interface ViewModeSelectorProps {
    viewMode: 'sales' | 'visits' | 'combined';
    onChange: (mode: 'sales' | 'visits' | 'combined') => void;
}

export const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({ viewMode, onChange }) => {
    return (
        <div className="flex gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
            {(['sales', 'visits', 'combined'] as const).map(mode => (
                <button
                    key={mode}
                    onClick={() => onChange(mode)}
                    className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${viewMode === mode
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                >
                    {mode === 'sales' ? 'Ventas' : mode === 'visits' ? 'Visitas' : 'Combinado'}
                </button>
            ))}
        </div>
    );
};
