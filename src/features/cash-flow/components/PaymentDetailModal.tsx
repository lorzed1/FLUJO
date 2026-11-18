import React, { useState, useEffect, useRef } from 'react';
import { ClipboardDocumentListIcon, PlusCircleIcon, TrashIcon } from '../../../components/ui/Icons';
import { formatCOP, parseCOP } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';

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

    const headerContent = (
        <div>
            <span className="text-xs2 font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5">Detalle</span>
            <span className="text-base font-bold text-slate-800 dark:text-white leading-tight">{title}</span>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={headerContent}
            maxWidth="max-w-md"
            className="p-0 overflow-hidden"
        >
            <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-slate-900 overflow-hidden rounded-b-xl">
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
                                className={`w-full pl-7 pr-3 py-3 text-lg ${useMonoFont ? 'font-mono' : ''} text-slate-800 dark:text-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-purple-600 focus:ring-4 focus:ring-purple-500/15 outline-none transition-all`}
                                autoComplete="off"
                            />
                        </div>
                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            disabled={!newVal}
                            onMouseDown={(e) => e.preventDefault()}
                            className="px-4 rounded-xl"
                            aria-label="Agregar movimiento"
                        >
                            <PlusCircleIcon className="h-6 w-6" />
                        </Button>
                    </form>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {items.length === 0 ? (
                        <EmptyState
                            icon={<ClipboardDocumentListIcon className="h-12 w-12 text-gray-400" />}
                            title="Sin registros agregados"
                            description="Ingresa un monto arriba y presiona Enter para sumarlo."
                            className="py-6"
                        />
                    ) : (
                        items.map((amount, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl border border-gray-100 dark:border-slate-700 transition-colors group animate-in slide-in-from-bottom-2 duration-300 fill-mode-backwards" style={{ animationDelay: `${idx * 50}ms` }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-gray-400 shadow-sm">
                                        {idx + 1}
                                    </div>
                                    <span className={`${useMonoFont ? 'font-mono' : ''} text-lg font-medium text-gray-700 dark:text-gray-200 tabular-nums`}>${formatCOP(amount)}</span>
                                </div>
                                <Button
                                    type="button"
                                    variant="icon-danger"
                                    size="icon-md"
                                    onClick={() => onRemoveItem(idx)}
                                    title="Eliminar movimiento"
                                    aria-label={`Eliminar movimiento ${idx + 1}`}
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer Totals */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 mt-auto shrink-0 pb-6 sm:pb-4">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Total Acumulado</span>
                        <div className="text-xs text-slate-400">{items.length} movimientos</div>
                    </div>
                    <span className="text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight tabular-nums">${formatCOP(total)}</span>
                </div>
                <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={onClose}
                    className="w-full font-bold rounded-xl"
                >
                    Confirmar y Cerrar
                </Button>
            </div>
        </Modal>
    );
};
