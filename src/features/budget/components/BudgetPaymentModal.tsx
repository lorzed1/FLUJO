import React, { useState } from 'react';
import { useUI } from '../../../context/UIContext';
import { budgetService } from '../../../services/budgetService';
import { BudgetCommitment } from '../../../types/budget';
import { useApp } from '../../../context/AppContext';
import { format } from 'date-fns';

import { XMarkIcon, CheckCircleIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { CurrencyInput } from '../../../components/ui/CurrencyInput';
import { Input } from '../../../components/ui/Input';

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
            await budgetService.updateCommitment(commitment.id, {
                status: 'paid',
                paidDate: date,
                amount: Number(amount) // Update amount in case it was changed during payment
            });
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error("Payment failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !commitment) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <BanknotesIcon className="w-6 h-6 text-emerald-600" />
                                Registrar Pago
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                {commitment.title}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                            <XMarkIcon className="w-6 h-6 text-slate-400" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monto Pagado</label>
                            <CurrencyInput
                                value={amount}
                                onChange={(val) => setAmount(String(val))}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Pago</label>
                            <Input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                            >
                                {isLoading ? 'Procesando...' : (
                                    <>
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Confirmar Pago
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
