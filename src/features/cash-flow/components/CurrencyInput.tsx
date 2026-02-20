
import React from 'react';
import { ClipboardDocumentListIcon } from '../../../components/ui/Icons';

export interface CurrencyInputProps {
    label: string;
    name: string;
    value: number;
    onChange: (name: string, value: number) => void;
    sublabel?: React.ReactNode;
    readOnly?: boolean;
    onDetailClick?: () => void;
    useMonoFont?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ label, name, value, onChange, sublabel, readOnly, onDetailClick, useMonoFont = false }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        onChange(name, Number(rawValue));
    };

    return (
        <div className="w-full mb-2">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">{label}</label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 pointer-events-none text-lg">$</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        name={name}
                        value={value === 0 ? '' : new Intl.NumberFormat('es-CO').format(value)}
                        onChange={handleChange}
                        readOnly={readOnly}
                        className={`w-full pl-7 pr-3 py-3 text-lg font-bold rounded-xl border border-gray-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 ${useMonoFont ? 'font-mono' : ''} transition-all shadow-sm h-12 ${readOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'bg-white text-gray-900 dark:bg-slate-700 dark:text-white'}`}
                        placeholder="0"
                        autoComplete="off"
                    />
                </div>
                {onDetailClick && (
                    <button
                        type="button"
                        onClick={onDetailClick}
                        className="bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 p-2 rounded-xl shadow-sm transition-colors flex items-center justify-center w-12 h-12"
                        title="Ver Detalles"
                    >
                        <ClipboardDocumentListIcon className="h-6 w-6" />
                    </button>
                )}
            </div>
            {sublabel && (
                <p className="text-xs text-gray-500 mt-1 ml-1 font-medium">{sublabel}</p>
            )}
        </div>
    );
};
