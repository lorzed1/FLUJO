import React from 'react';
import { formatCurrencyValue } from '../hooks/useArqueoForm';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { MinusIcon, PlusIcon } from '../../../components/ui/Icons';

export interface DenominationTableProps {
    title: string;
    denominations: Record<string, number>;
    total: number;
    onUpdate: (denomination: string, value: string) => void;
    keyPrefix: string;
}

const BILL_THRESHOLD = 2000;

/**
 * Tabla de conteo físico por denominación, agrupada en Billetes y Monedas
 * con botones rápidos de incremento/decremento.
 */
export const DenominationTable: React.FC<DenominationTableProps> = ({
    title,
    denominations,
    total,
    onUpdate,
    keyPrefix,
}) => {
    const sortedKeys = Object.keys(denominations).sort((a, b) => Number(b) - Number(a));
    const billKeys = sortedKeys.filter((d) => Number(d) >= BILL_THRESHOLD);
    const coinKeys = sortedKeys.filter((d) => Number(d) < BILL_THRESHOLD);

    const calcSubtotal = (keys: string[]) =>
        keys.reduce((acc, d) => acc + Number(d) * (denominations[d] || 0), 0);

    const stepQty = (denom: string, delta: number) => {
        const next = Math.max(0, (denominations[denom] || 0) + delta);
        onUpdate(denom, String(next));
    };

    const renderGroup = (groupTitle: string, keys: string[]) => {
        if (keys.length === 0) return null;
        const subtotal = calcSubtotal(keys);

        return (
            <div className="space-y-2">
                <div className="flex justify-between items-center px-2">
                    <span className="text-xs2 font-bold uppercase tracking-caps text-gray-500 dark:text-gray-400">
                        {groupTitle}
                    </span>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 tabular-nums">
                        {formatCurrencyValue(subtotal)}
                    </span>
                </div>
                <div className="bg-white dark:bg-slate-900/30 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden divide-y divide-gray-100 dark:divide-slate-800 shadow-sm">
                    {keys.map((denom) => {
                        const qty = denominations[denom] || 0;
                        const rowTotal = Number(denom) * qty;
                        return (
                            <div
                                key={`${keyPrefix}-${denom}`}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2.5"
                            >
                                <span className="w-20 sm:w-24 shrink-0 font-bold text-gray-700 dark:text-gray-300 text-sm whitespace-nowrap tabular-nums">
                                    {formatCurrencyValue(parseInt(denom, 10))}
                                </span>

                                <div className="flex items-center gap-1.5">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon-sm"
                                        onClick={() => stepQty(denom, -1)}
                                        disabled={qty <= 0}
                                        aria-label={`Restar ${formatCurrencyValue(parseInt(denom, 10))}`}
                                    >
                                        <MinusIcon className="h-3.5 w-3.5" />
                                    </Button>

                                    <Input
                                        type="number"
                                        min={0}
                                        value={qty || ''}
                                        onChange={(e) => onUpdate(denom, e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        onWheel={(e) => (e.target as HTMLElement).blur()}
                                        className="w-16 sm:w-20 text-center font-bold text-sm h-8 tabular-nums"
                                        placeholder="0"
                                        aria-label={`Cantidad de ${formatCurrencyValue(parseInt(denom, 10))}`}
                                    />

                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon-sm"
                                        onClick={() => stepQty(denom, 1)}
                                        aria-label={`Sumar ${formatCurrencyValue(parseInt(denom, 10))}`}
                                    >
                                        <PlusIcon className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                <span
                                    className={`flex-1 text-right font-bold text-sm whitespace-nowrap tabular-nums ${
                                        rowTotal > 0
                                            ? 'text-purple-600 dark:text-purple-400'
                                            : 'text-gray-400 dark:text-gray-500'
                                    }`}
                                >
                                    {formatCurrencyValue(rowTotal)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 w-full">
            <div className="flex justify-between items-center px-2 py-2 bg-purple-50/70 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800/40">
                <h4 className="text-xs2 font-bold text-purple-700 dark:text-purple-300 uppercase tracking-caps">
                    {title}
                </h4>
                <span className="text-lg sm:text-xl font-black text-purple-700 dark:text-purple-300 tabular-nums">
                    {formatCurrencyValue(total)}
                </span>
            </div>

            <div className="space-y-5">
                {renderGroup('Billetes', billKeys)}
                {renderGroup('Monedas', coinKeys)}
            </div>
        </div>
    );
};
