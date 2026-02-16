import React from 'react';
import { ClipboardDocumentListIcon } from '../../../components/ui/Icons';
import { formatCOP, parseCOP } from '../../../components/ui/Input';

interface CurrencyInputProps {
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
        const val = parseCOP(e.target.value);
        onChange(name, val);
    };

    return (
        <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">{label}</label>
            <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none text-base sm:text-sm">$</span>
                <input
                    type="text"
                    inputMode="numeric"
                    name={name}
                    value={value === 0 ? '' : formatCOP(value)}
                    onChange={handleChange}
                    readOnly={readOnly}
                    className={`w-full pl-7 ${onDetailClick ? 'pr-10' : 'pr-3'} py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${useMonoFont ? 'font-mono' : ''} transition-all shadow-sm ${readOnly ? 'bg-gray-50/80 dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 font-medium' : 'border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800'}`}
                    placeholder="0"
                    autoComplete="off"
                />
                {onDetailClick && (
                    <button
                        type="button"
                        onClick={onDetailClick}
                        className="absolute inset-y-0 right-0 p-3 flex items-center text-primary hover:text-primary/80 transition-colors"
                        title="Ver Detalles"
                    >
                        <ClipboardDocumentListIcon className="h-6 w-6" />
                    </button>
                )}
            </div>
            {sublabel && <p className="text-[10px] sm:text-xs text-gray-500 mt-1 pl-1 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>{sublabel}</p>}
        </div>
    );
};
