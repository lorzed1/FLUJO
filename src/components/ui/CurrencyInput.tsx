import React from 'react';
import { formatCOP, parseCOP } from './Input';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: number | string;
    onChange: (value: number) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, className, ...props }) => {

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const numberValue = parseCOP(raw);
        onChange(numberValue);
    };

    // Calculate display value
    // If value is empty string, show empty string
    // If value is 0, show $ 0 (or empty depending on preference, but usually $ 0)
    // If value is number, format it.
    let displayValue = '';

    if (value === '' || value === undefined || value === null) {
        displayValue = '';
    } else {
        // Ensure we are formatting a number
        const num = typeof value === 'string' ? parseCOP(value) : value;
        displayValue = formatCOP(num);
    }

    return (
        <div className="relative">
            <input
                type="text"
                value={displayValue}
                onChange={handleChange}
                className={`block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200 ${className}`}
                inputMode="numeric"
                {...props}
            />
        </div>
    );
};
