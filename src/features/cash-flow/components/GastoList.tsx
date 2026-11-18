import React, { useState, useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input, formatCOP, parseCOP } from '../../../components/ui/Input';
import { PlusIcon, TrashIcon } from '../../../components/ui/Icons';
import { formatCurrencyValue, type GastoRecord } from '../hooks/useArqueoForm';

interface GastoListProps {
    title: string;
    gastos: GastoRecord[];
    total: number;
    onAdd: (desc: string, val: number) => void;
    onRemove: (id: string) => void;
}

/**
 * Lista editable de gastos de caja (facturas de personal o proveedores)
 * con formato de moneda en vivo y soporte de teclado (Enter).
 */
export const GastoList: React.FC<GastoListProps> = ({
    title,
    gastos,
    total,
    onAdd,
    onRemove,
}) => {
    const [desc, setDesc] = useState('');
    const [val, setVal] = useState('');
    const descWrapperRef = useRef<HTMLDivElement>(null);

    const parsedValue = parseCOP(val);
    const canAdd = desc.trim().length > 0 && parsedValue > 0;

    const handleAdd = () => {
        if (!canAdd) return;
        onAdd(desc.trim(), parsedValue);
        setDesc('');
        setVal('');
        descWrapperRef.current?.querySelector('input')?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
                <h4 className="text-xs2 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-caps">
                    {title}
                </h4>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                    {formatCurrencyValue(total)}
                </span>
            </div>

            <div className="bg-gray-50 dark:bg-slate-900/30 rounded-xl p-3 space-y-2.5 border border-gray-100 dark:border-slate-700">
                {gastos.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                        Sin facturas registradas
                    </p>
                ) : (
                    gastos.map((g) => (
                        <div
                            key={g.id}
                            className="flex justify-between items-center bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm"
                        >
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">
                                {g.descripcion}
                            </span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white w-28 text-right mx-2 tabular-nums">
                                {formatCurrencyValue(g.valor)}
                            </span>
                            <Button
                                variant="icon-danger"
                                size="icon-sm"
                                type="button"
                                onClick={() => onRemove(g.id)}
                                title={`Eliminar ${g.descripcion}`}
                                aria-label={`Eliminar ${g.descripcion}`}
                            >
                                <TrashIcon className="h-4 w-4" />
                            </Button>
                        </div>
                    ))
                )}

                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center pt-1.5">
                    <div ref={descWrapperRef} className="flex-1 min-w-0">
                        <Input
                            type="text"
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Descripción de la factura..."
                            className="text-sm h-9"
                        />
                    </div>
                    <div className="flex gap-2 items-center">
                        <div className="relative flex-1 sm:w-32 shrink-0">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium pointer-events-none">
                                $
                            </span>
                            <Input
                                type="text"
                                inputMode="numeric"
                                value={val}
                                onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    setVal(raw ? formatCOP(raw) : '');
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="0"
                                className="text-sm text-right h-9 pl-6 font-medium tabular-nums"
                            />
                        </div>
                        <Button
                            variant="primary"
                            size="sm"
                            type="button"
                            disabled={!canAdd}
                            onClick={handleAdd}
                            className="gap-1 shrink-0"
                        >
                            <PlusIcon className="h-4 w-4" />
                            Añadir
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
