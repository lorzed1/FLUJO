import React from 'react';
import { formatCurrencyValue } from '../hooks/useArqueoForm';
import { Input } from '../../../components/ui/Input';

export interface DenominationTableProps {
    title: string;
    denominations: Record<string, number>;
    total: number;
    onUpdate: (denomination: string, value: string) => void;
    keyPrefix: string;
}

export const DenominationTable: React.FC<DenominationTableProps> = ({
    title,
    denominations,
    total,
    onUpdate,
    keyPrefix
}) => (
    <div className="space-y-4 w-full">
        <div className="flex justify-between items-center px-2">
            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h4>
            <span className="text-xl font-bold text-gray-700 dark:text-gray-200">{formatCurrencyValue(total)}</span>
        </div>
        <div className="bg-white dark:bg-slate-900/30 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden divide-y divide-gray-100 dark:divide-slate-800 shadow-sm">
            {Object.keys(denominations).map((denom) => (
                <div key={`${keyPrefix}-${denom}`} className="flex items-center gap-2 px-4 py-3">
                    <span className="w-20 shrink-0 font-bold text-gray-600 dark:text-gray-400 text-sm whitespace-nowrap">
                        {formatCurrencyValue(parseInt(denom))}
                    </span>
                    <Input
                        type="number"
                        value={denominations[denom] || ''}
                        onChange={(e) => onUpdate(denom, e.target.value)}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        className="max-w-[120px] text-center font-bold text-sm h-9"
                        placeholder="0"
                    />
                    <span className="flex-1 text-right font-black text-purple-600 dark:text-purple-400 text-sm whitespace-nowrap">
                        {formatCurrencyValue(parseInt(denom) * (denominations[denom] || 0))}
                    </span>
                </div>
            ))}
        </div>
    </div>
);
