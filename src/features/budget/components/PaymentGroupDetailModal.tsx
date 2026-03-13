import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { SmartDataTable, Column } from '../../../components/ui/SmartDataTable';
import { budgetService } from '../../../services/budget';
import { BudgetCommitment } from '../../../types/budget';
import { BanknotesIcon } from '../../../components/ui/Icons';
import { Spinner } from '../../../components/ui/Spinner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentGroupDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactionId: string;
    dateText?: string;
}

export const PaymentGroupDetailModal: React.FC<PaymentGroupDetailModalProps> = ({
    isOpen,
    onClose,
    transactionId,
    dateText
}) => {
    const [commitments, setCommitments] = useState<BudgetCommitment[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !transactionId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const data = await budgetService.getCommitmentsByTransaction(transactionId);
                setCommitments(data);
            } catch (error) {
                console.error("Error loading separated payments", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [isOpen, transactionId]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const columns: Column<BudgetCommitment>[] = [
        {
            key: 'title',
            label: 'Concepto',
            sortable: true,
            render: (value: string) => <span className="font-medium text-sm-">{value}</span>
        },
        {
            key: 'category',
            label: 'Categoría',
            sortable: true,
            render: (value: string) => <span className="text-gray-500 text-sm-">{value}</span>
        },
        {
            key: 'paidDate',
            label: 'Fecha de Pago',
            sortable: true,
            align: 'text-center',
            render: (value: string) => (
                <span className="text-gray-600 text-sm-">
                    {value ? format(parseISO(value), 'd MMM yyyy', { locale: es }) : '-'}
                </span>
            )
        },
        {
            key: 'amount',
            label: 'Monto',
            align: 'text-right',
            sortable: true,
            render: (value: number) => (
                <span className="font-bold text-gray-900 dark:text-white text-sm-">
                    {formatCurrency(value)}
                </span>
            )
        }
    ];

    const headerTitle = (
        <span className="flex items-center gap-2">
            <BanknotesIcon className="w-5 h-5 text-purple-600" />
            Detalle de Pagos {dateText ? `(${dateText})` : ''}
        </span>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={headerTitle}
            maxWidth="max-w-4xl"
            className="p-0"
        >
            <div className="flex flex-col min-h-[400px] bg-white dark:bg-slate-800 rounded-b-xl overflow-hidden">
                {loading ? (
                    <div className="flex-1 flex justify-center items-center bg-gray-50/50 dark:bg-slate-900/50">
                        <Spinner size="lg" />
                    </div>
                ) : commitments.length > 0 ? (
                    <div className="flex-1 p-0 overflow-hidden">
                        <SmartDataTable
                            data={commitments}
                            columns={columns}
                            enableSearch={true}
                            enableExport={true}
                            containerClassName="border-none shadow-none rounded-none"
                            id="payment-group-table"
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <BanknotesIcon className="w-12 h-12 text-gray-300 mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Sin registros asociados</h4>
                        <p className="text-sm text-gray-500 max-w-sm">
                            No se encontraron compromisos vinculados a este identificador de transacción.
                            Es posible que estos pagos se hayan hecho antes de activar la agrupación o individualmente.
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
};
