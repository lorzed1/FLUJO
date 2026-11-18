import React from 'react';
import { ClipboardDocumentListIcon } from '../../../components/ui/Icons';
import { FormGroup } from '../../../components/ui/FormGroup';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

export interface CurrencyInputProps {
    label: string;
    name: string;
    value: number;
    onChange: (name: string, value: number) => void;
    sublabel?: React.ReactNode;
    readOnly?: boolean;
    onDetailClick?: () => void;
    detailCount?: number;
    useMonoFont?: boolean;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
    label,
    name,
    value,
    onChange,
    sublabel,
    readOnly,
    onDetailClick,
    detailCount,
    useMonoFont = false,
}) => {
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
                        onClick={readOnly && onDetailClick ? onDetailClick : undefined}
                        className={`pl-7 font-bold text-sm transition-all shadow-sm h-10 tabular-nums ${useMonoFont ? 'font-mono' : ''} ${readOnly ? 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 cursor-pointer hover:border-purple-300 dark:hover:border-purple-700' : ''}`}
                        placeholder="0"
                        autoComplete="off"
                    />
                </div>
                {onDetailClick && (
                    <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={onDetailClick}
                        className="relative px-3 gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/60 dark:hover:bg-purple-900/50 shrink-0"
                        title={`Gestionar detalle de ${label}`}
                        aria-label={`Gestionar detalle de ${label}`}
                    >
                        <ClipboardDocumentListIcon className="h-5 w-5" />
                        <span className="text-xs font-semibold hidden sm:inline">Detalle</span>
                        {typeof detailCount === 'number' && detailCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs2 font-bold rounded-full bg-purple-600 text-white">
                                {detailCount}
                            </span>
                        )}
                    </Button>
                )}
            </div>
        </FormGroup>
    );
};
