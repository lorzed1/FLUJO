import React, { useState, useEffect, useRef } from 'react';
import { ClipboardDocumentListIcon, PlusCircleIcon, TrashIcon } from '../../../components/ui/Icons';
import { formatCOP, parseCOP } from '../../../components/ui/Input';

interface PaymentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items: number[];
    onAddItem: (amount: number) => void;
    onRemoveItem: (index: number) => void;
    useMonoFont?: boolean;
}

export const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({ isOpen, onClose, title, items, onAddItem, onRemoveItem, useMonoFont = false }) => {
    const [newVal, setNewVal] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const num = parseCOP(newVal);
        if (num > 0) {
            onAddItem(num);
            setNewVal('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    };

    const total = items.reduce((a, b) => a + b, 0);

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full sm:w-full sm:max-w-md flex flex-col h-[85dvh] sm:h-auto sm:max-h-[85dvh] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                    <div>
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-0.5">Detalle</span>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-900">
                    {/* Input Area */}
                    <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm z-10">
                        <form onSubmit={handleSubmit} className="flex gap-3">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    inputMode="numeric"
                                    value={newVal}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        setNewVal(raw ? formatCOP(raw) : '');
                                    }}
                                    placeholder="0"
                                    className={`w-full pl-7 pr-3 py-3 text-lg ${useMonoFont ? 'font-mono' : ''} text-gray-800 dark:text-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all`}
                                    autoComplete="off"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!newVal}
                                onMouseDown={(e) => e.preventDefault()}
                                className="bg-primary disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 rounded-xl hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center shadow-md shadow-indigo-200"
                            >
                                <PlusCircleIcon className="h-6 w-6" />
                            </button>
                        </form>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                <ClipboardDocumentListIcon className="h-16 w-16 mb-2" />
                                <p className="text-sm">Sin registros agregados</p>
                            </div>
                        ) : (
                            items.map((amount, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl border border-gray-100 dark:border-slate-700 transition-colors group animate-in slide-in-from-bottom-2 duration-300 fill-mode-backwards" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-gray-400 shadow-sm">
                                            {idx + 1}
                                        </div>
                                        <span className={`${useMonoFont ? 'font-mono' : ''} text-lg font-medium text-gray-700 dark:text-gray-200`}>${formatCOP(amount)}</span>
                                    </div>
                                    <button
                                        onClick={() => onRemoveItem(idx)}
                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-all"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer Totals */}
                <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 pb-8 sm:pb-4">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Total Acumulado</span>
                            <div className="text-xs text-gray-400">{items.length} movimientos</div>
                        </div>
                        <span className="text-3xl font-black text-primary tracking-tight">${formatCOP(total)}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200"
                    >
                        Confirmar y Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
