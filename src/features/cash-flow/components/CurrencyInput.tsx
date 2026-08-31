
import React from 'react';
import { ClipboardDocumentListIcon } from '../../../components/ui/Icons';
import { FormGroup } from '../../../components/ui/FormGroup';
import { Input } from '../../../components/ui/Input';

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
        <FormGroup label={label} description={sublabel} className="w-full mb-2">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 pointer-events-none text-sm">$</span>
                    <Input
                        type="text"
                        inputMode="numeric"
                        name={name}
                        value={value === 0 ? '' : new Intl.NumberFormat('es-CO').format(value)}
                        onChange={handleChange}
                        readOnly={readOnly}
                        className={`pl-7 font-bold text-sm transition-all shadow-sm h-10 ${useMonoFont ? 'font-mono' : ''} ${readOnly ? 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 cursor-not-allowed' : ''}`}
                        placeholder="0"
                        autoComplete="off"
                    />
                </div>
                {onDetailClick && (
                    <button
                        type="button"
                        onClick={onDetailClick}
                        className="bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 p-2 rounded-lg shadow-sm transition-colors flex items-center justify-center w-10 h-10"
                        title="Ver Detalles"
                    >
                        <ClipboardDocumentListIcon className="h-6 w-6" />
                    </button>
                )}
            </div>
        </FormGroup>
    );
};
