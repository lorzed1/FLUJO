import React from 'react';
import { formatCOP } from '../../components/ui/Input';

interface CashBaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    baseDetail: Record<string, number>;
    total: number;
    title?: string;
}

const CashBaseModal: React.FC<CashBaseModalProps> = ({ isOpen, onClose, baseDetail, total, title = "Detalle de Base" }) => {
    if (!isOpen) return null;

    const denominations = Object.entries(baseDetail)
        .map(([denom, count]) => {
            const val = parseInt(denom);
            const cnt = Number(count);
            return {
                value: val,
                count: cnt,
                subtotal: val * cnt
            };
        })
        .filter(item => item.count > 0) // Solo mostrar lo que tiene cantidad
        .sort((a, b) => b.value - a.value); // Ordenar mayor a menor valor

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-700">

                {/* Header */}
                <div className="bg-gray-50 dark:bg-slate-900/50 p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Body: List of denominations */}
                <div className="p-0 max-h-[60dvh] overflow-y-auto">
                    {denominations.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            No hay detalle registrado para esta base.
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/50 dark:bg-slate-900/20 text-xs text-gray-500 font-semibold uppercase text-center">
                                <tr>
                                    <th className="px-4 py-2">Denominación</th>
                                    <th className="px-4 py-2">Cant.</th>
                                    <th className="px-4 py-2">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {denominations.map((item) => (
                                    <tr key={item.value} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium">
                                            $ {item.value.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2 text-center text-gray-800 dark:text-gray-200 font-bold bg-gray-50 dark:bg-slate-800">
                                            {item.count}
                                        </td>
                                        <td className="px-4 py-2 text-right text-gray-900 dark:text-white font-mono">
                                            {formatCOP(item.subtotal)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer: Total */}
                <div className="bg-secondary/10 p-4 border-t border-secondary/20 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-secondary tracking-wider">Total Base</span>
                    <span className="text-xl font-black text-secondary">{formatCOP(total)}</span>
                </div>
            </div>
        </div>
    );
};

export default CashBaseModal;
