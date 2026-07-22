import React, { useState } from 'react';
import { useUI } from '../../../context/UIContext';
import { budgetService } from '../../../services/budget';
import { BudgetCommitment } from '../../../types/budget';
import { format } from 'date-fns';
import { XMarkIcon, BanknotesIcon } from '../../../components/ui/Icons';
import { CurrencyInput } from '../../../components/ui/CurrencyInput';
import { Button } from '../../../components/ui/Button';
import { DatePicker } from '../../../components/ui/DatePicker';
import { Modal } from '../../../components/ui/Modal';
import { FormGroup } from '../../../components/ui/FormGroup';

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

    const headerTitle = (
        <span className="flex items-center gap-2">
            <BanknotesIcon className="w-5 h-5 text-gray-500" />
            Confirmación de Pago
        </span>
    );

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={headerTitle}
            maxWidth="max-w-md"
            className="p-0"
        >
            <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-slate-800">
                <form onSubmit={handleSubmit}>
                    {/* Content Block */}
                    <div className="p-5 space-y-4">
                        {/* Summary / Concepto */}
                        <FormGroup label="Concepto">
                            <div className="px-3 py-2 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded text-sm font-medium text-gray-700 dark:text-gray-200">
                                {commitment.title}
                            </div>
                        </FormGroup>

                        <div className="grid grid-cols-2 gap-4">
                            <FormGroup label="Importe" required>
                                <CurrencyInput
                                    value={amount}
                                    onChange={(val) => setAmount(String(val))}
                                    className="text-sm- font-medium !border-gray-300 focus:!ring-purple-600 focus:!border-purple-600"
                                    required
                                />
                            </FormGroup>
                            <FormGroup label="Fecha Valor">
                                <DatePicker
                                    value={date}
                                    onChange={(val) => setDate(val)}
                                    className="text-sm- font-medium !border-gray-300 focus:!ring-purple-600 focus:!border-purple-600"
                                />
                            </FormGroup>
                        </div>
                    </div>

                    {/* Footer Block */}
                    <div className="px-5 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-2 rounded-b-xl mt-auto shrink-0">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Procesando...' : 'Confirmar Pago'}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};
