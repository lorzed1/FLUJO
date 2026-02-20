import React, { useState } from 'react';
import { useUI } from '../../../context/UIContext';
import { budgetService } from '../../../services/budget';
import { BudgetCommitment } from '../../../types/budget';
import { format } from 'date-fns';
import { XMarkIcon, BanknotesIcon } from '@heroicons/react/24/outline';
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
        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
            {children}
        </label>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-md border border-gray-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Block */}
                <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <BanknotesIcon className="w-5 h-5 text-gray-500" />
                        Confirmación de Pago
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 p-1"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Content Block */}
                    <div className="p-5 space-y-4">
                        {/* Summary / Concepto */}
                        <div>
                            <FormLabel>Concepto</FormLabel>
                            <div className="px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded text-sm font-medium text-gray-700 dark:text-gray-200">
                                {commitment.title}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FormLabel>Importe</FormLabel>
                                <CurrencyInput
                                    value={amount}
                                    onChange={(val) => setAmount(String(val))}
                                    className="!h-9 text-[13px] font-medium !border-gray-300 focus:!ring-purple-600 focus:!border-purple-600"
                                    required
                                />
                            </div>
                            <div>
                                <FormLabel>Fecha Valor</FormLabel>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="!h-9 text-[13px] font-medium uppercase tracking-tight !border-gray-300 focus:!ring-purple-600 focus:!border-purple-600"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer Block */}
                    <div className="px-5 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="h-8 text-xs font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="h-8 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white shadow-sm rounded-lg border-transparent"
                        >
                            {isLoading ? 'Procesando...' : 'Confirmar Pago'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
