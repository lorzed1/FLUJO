
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
        // Remove non-numeric chars except for formatting if needed, but here we just pass raw
        const rawValue = e.target.value.replace(/\D/g, '');
        onChange(name, Number(rawValue));
    };

    return (
        <div className="w-full">
            <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-gray-500 pointer-events-none text-sm">$</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        name={name}
                        value={value === 0 ? '' : new Intl.NumberFormat('es-CO').format(value)}
                        onChange={handleChange}
                        readOnly={readOnly}
                        className={`w-full pl-6 pr-2 py-1.5 text-[13px] rounded border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 ${useMonoFont ? 'font-mono' : ''} transition-all shadow-sm h-8 ${readOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'bg-white text-gray-900 dark:bg-slate-700 dark:text-white'}`}
                        placeholder="0"
                        autoComplete="off"
                    />
                </div>
                {onDetailClick && (
                    <button
                        type="button"
                        onClick={onDetailClick}
                        className="bg-purple-600 hover:bg-purple-700 text-white p-1 rounded shadow-sm transition-colors flex items-center justify-center w-8 h-8"
                        title="Ver Detalles"
                    >
                        <ClipboardDocumentListIcon className="h-4 w-4" />
                    </button>
                )}
            </div>
            {sublabel && (
                <p className="text-[11px] text-gray-500 mt-0.5 ml-0.5">{sublabel}</p>
            )}
        </div>
    );
};
