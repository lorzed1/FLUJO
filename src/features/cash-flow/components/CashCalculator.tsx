import React from 'react';
import { TableCellsIcon, ChevronDownIcon, ArrowPathIcon } from '../../../components/ui/Icons';
import { formatCurrencyValue } from '../hooks/useArqueoForm';

interface CashCalculatorProps {
    isExpanded: boolean;
    onToggleExpanded: () => void;
    baseCaja: Record<string, number>;
    cuadreVenta: Record<string, number>;
    consumoPersonal: number;
    facturas: number;
    totalBaseCaja: number;
    totalCuadreVenta: number;
    totalFinalCuadre: number;
    onUpdateDenomination: (
        setter: React.Dispatch<React.SetStateAction<Record<string, number>>>,
        denomination: string,
        value: string
    ) => void;
    onSetBaseCaja: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    onSetCuadreVenta: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    onSetConsumoPersonal: React.Dispatch<React.SetStateAction<number>>;
    onSetFacturas: React.Dispatch<React.SetStateAction<number>>;
    onSendToArqueo: () => void;
}

export const CashCalculator: React.FC<CashCalculatorProps> = ({
    isExpanded,
    onToggleExpanded,
    baseCaja,
    cuadreVenta,
    consumoPersonal,
    facturas,
    totalBaseCaja,
    totalCuadreVenta,
    totalFinalCuadre,
    onUpdateDenomination,
    onSetBaseCaja,
    onSetCuadreVenta,
    onSetConsumoPersonal,
    onSetFacturas,
    onSendToArqueo,
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-none sm:rounded-xl shadow-sm border-y sm:border border-indigo-100 dark:border-slate-700 overflow-hidden">
            <button
                type="button"
                onClick={onToggleExpanded}
                className="w-full flex items-center justify-between p-4 bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <TableCellsIcon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm sm:text-base font-bold text-gray-800 dark:text-white leading-tight">Calculadora de Efectivo</h3>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Conteo físico detallado de billetes y monedas</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <span className="text-[10px] uppercase text-gray-400 font-bold block">Total Conteo</span>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{formatCurrencyValue(totalFinalCuadre)}</span>
                    </div>
                    <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {isExpanded && (
                <div className="p-4 sm:p-6 border-t border-indigo-100 dark:border-slate-700 animate-fadeIn">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Base de Caja */}
                        <DenominationTable
                            title="Base de Caja"
                            denominations={baseCaja}
                            total={totalBaseCaja}
                            onUpdate={(denom, value) => onUpdateDenomination(onSetBaseCaja, denom, value)}
                            keyPrefix="base"
                        />

                        {/* Cuadre de Venta */}
                        <div className="space-y-3">
                            <DenominationTable
                                title="Conteo de Venta"
                                denominations={cuadreVenta}
                                total={totalCuadreVenta}
                                onUpdate={(denom, value) => onUpdateDenomination(onSetCuadreVenta, denom, value)}
                                keyPrefix="venta"
                            />

                            {/* Extras inline */}
                            <div className="p-3 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-xl space-y-2 border border-indigo-100/50 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <label className="flex-1 text-[10px] font-bold text-gray-500 uppercase">Consumo Pers.</label>
                                    <input
                                        type="number"
                                        value={consumoPersonal || ''}
                                        onChange={(e) => onSetConsumoPersonal(parseInt(e.target.value) || 0)}
                                        className="w-24 text-right py-1 px-2 border border-gray-200 dark:border-slate-700 rounded-md text-xs font-bold"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="flex-1 text-[10px] font-bold text-gray-500 uppercase">Facturas/Gastos</label>
                                    <input
                                        type="number"
                                        value={facturas || ''}
                                        onChange={(e) => onSetFacturas(parseInt(e.target.value) || 0)}
                                        className="w-24 text-right py-1 px-2 border border-gray-200 dark:border-slate-700 rounded-md text-xs font-bold"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onSendToArqueo}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                Sincronizar con Formulario
                                <ArrowPathIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// Sub-component: tabla de denominaciones
// ============================================

interface DenominationTableProps {
    title: string;
    denominations: Record<string, number>;
    total: number;
    onUpdate: (denomination: string, value: string) => void;
    keyPrefix: string;
}

const DenominationTable: React.FC<DenominationTableProps> = ({
    title,
    denominations,
    total,
    onUpdate,
    keyPrefix
}) => (
    <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h4>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{formatCurrencyValue(total)}</span>
        </div>
        <div className="bg-gray-50/50 dark:bg-slate-900/30 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-xs">
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {Object.keys(denominations).map((denom) => (
                        <tr key={`${keyPrefix}-${denom}`}>
                            <td className="py-2 px-3 font-medium text-gray-500">{formatCurrencyValue(parseInt(denom))}</td>
                            <td className="py-1 px-1">
                                <input
                                    type="number"
                                    value={denominations[denom] || ''}
                                    onChange={(e) => onUpdate(denom, e.target.value)}
                                    className="w-full text-center py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="0"
                                />
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-gray-700 dark:text-gray-300">
                                {formatCurrencyValue(parseInt(denom) * (denominations[denom] || 0))}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);
