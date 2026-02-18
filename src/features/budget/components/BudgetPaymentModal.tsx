import React, { useState } from 'react';
import { useUI } from '../../../context/UIContext';
import { budgetService } from '../../../services/budget';
import { BudgetCommitment } from '../../../types/budget';
import { format } from 'date-fns';
import { XMarkIcon, CheckCircleIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { CurrencyInput } from '../../../components/ui/CurrencyInput';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

interface BudgetPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    commitment?: BudgetCommitment;
    onSuccess?: () => void;
}

export const BudgetPaymentModal: React.FC<BudgetPaymentModalProps> = ({
    isOpen,
    onClose,
    commitment,
    onSuccess
}) => {
    const { setAlertModal } = useUI();
    const [amount, setAmount] = useState(commitment ? String(commitment.amount) : '');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isLoading, setIsLoading] = useState(false);

    // Update amount if commitment changes
    React.useEffect(() => {
        if (commitment) {
            setAmount(String(commitment.amount));
        }
    }, [commitment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commitment) return;

        setIsLoading(true);
        try {
            if (commitment.id.startsWith('projected-')) {
                await budgetService.addCommitment({
                    title: commitment.title,
                    amount: Number(amount),
                    category: commitment.category,
                    dueDate: commitment.dueDate,
                    status: 'paid',
                    paidDate: date,
                    recurrenceRuleId: commitment.recurrenceRuleId,
                });
            } else {
                await budgetService.updateCommitment(commitment.id, {
                    status: 'paid',
                    paidDate: date,
                    amount: Number(amount)
                });
            }
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Payment failed", error);
            setAlertModal({
                isOpen: true,
                type: 'error',
                title: 'Error de Pago',
                message: 'No se pudo registrar el pago.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !commitment) return null;

    const FormLabel = ({ children }: { children: React.ReactNode }) => (
        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
            {children}
        </label>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Block */}
                <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BanknotesIcon className="w-4 h-4 text-emerald-600" />
                        Confirmación de Pago
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-900/20">
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.1em] mb-1">Concepto seleccionado</p>
                        <p className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">{commitment.title}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 gap-5">
                            <div>
                                <FormLabel>Importe a Liquidar</FormLabel>
                                <CurrencyInput
                                    value={amount}
                                    onChange={(val) => setAmount(String(val))}
                                    className="!h-10 text-[14px] font-bold !border-gray-200 dark:!border-slate-700"
                                    required
                                />
                            </div>
                            <div>
                                <FormLabel>Fecha Valor</FormLabel>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="!h-10 text-[13px] font-medium uppercase tracking-tight"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-gray-50 dark:border-slate-700 mt-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onClose}
                                className="flex-1 !h-10 font-bold text-[11px] uppercase tracking-wider"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 !h-10 !bg-emerald-600 hover:!bg-emerald-700 font-bold text-[11px] uppercase tracking-wider shadow-lg shadow-emerald-100 dark:shadow-none"
                            >
                                {isLoading ? 'Procesando...' : (
                                    <>
                                        <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                                        Efectuar Pago
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
