import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { SmartDataTable, Column } from '../../../components/ui/SmartDataTable';
import { budgetService } from '../../../services/budget';
import { BudgetCommitment } from '../../../types/budget';
import { BanknotesIcon, PlusIcon } from '../../../components/ui/Icons';
import { Spinner } from '../../../components/ui/Spinner';
import { format, parseISO, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/ui/Button';
import { FormGroup } from '../../../components/ui/FormGroup';

interface PaymentGroupDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactionId: string;
    dateText?: string;
    onUpdate?: () => void;
}

export const PaymentGroupDetailModal: React.FC<PaymentGroupDetailModalProps> = ({
    isOpen,
    onClose,
    transactionId,
    dateText,
    onUpdate
}) => {
    const { setAlertModal } = useUI();
    const [commitments, setCommitments] = useState<BudgetCommitment[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Add payment state
    const [submitting, setSubmitting] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    
    const [pendingWeekly, setPendingWeekly] = useState<BudgetCommitment[]>([]);
    const [selectedPendingId, setSelectedPendingId] = useState('');

    const loadData = useCallback(async () => {
        if (!isOpen || !transactionId) return;
        setLoading(true);
        try {
            const data = await budgetService.getCommitmentsByTransaction(transactionId);
            setCommitments(data);
            
            // Cargar los pagos pendientes de la misma semana
            const log = await budgetService.getExecutionLogById(transactionId);
            if (log && log.weekStartDate) {
                const startStr = log.weekStartDate;
                const endStr = format(endOfWeek(parseISO(startStr), { weekStartsOn: 1 }), 'yyyy-MM-dd');
                const [weekData, overdueData] = await Promise.all([
                    budgetService.getCommitments(startStr, endStr),
                    budgetService.getOverduePendingCommitments(startStr)
                ]);
                const pending = [...overdueData, ...weekData]
                    .filter(c => c.status === 'pending' && !c.isProjected && !c.id.startsWith('projected-'))
                    .filter(c => !data.some(d => d.id === c.id)) // Excluir los ya vinculados
                    .reduce((acc, cur) => {
                        if (!acc.find(i => i.id === cur.id)) acc.push(cur);
                        return acc;
                    }, [] as BudgetCommitment[]);
                setPendingWeekly(pending);
            }
        } catch (error) {
            console.error("Error loading separated payments", error);
        } finally {
            setLoading(false);
        }
    }, [isOpen, transactionId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRemovePayment = (id: string, title: string) => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Desvincular Pago',
            message: `¿Estás seguro de que deseas desvincular "${title}" de este grupo de pagos? El pago volverá a estar "Pendiente" y el registro descontará este valor.`,
            showCancel: true,
            confirmText: 'Desvincular',
            onConfirm: async () => {
                setAlertModal({ isOpen: false, message: '' });
                setLoading(true);
                try {
                    await budgetService.updateCommitment(id, {
                        transactionId: undefined, // Remover vinculacion
                        status: 'pending',
                        paidDate: undefined
                    });
                    await budgetService.syncExecutionLogTotals(transactionId);
                    await loadData();
                    if (onUpdate) onUpdate();
                } catch (error) {
                    console.error("Error desvinculando", error);
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleBulkRemove = (idsSet: Set<string>) => {
        const ids = Array.from(idsSet);
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Desvincular Pagos Múltiples',
            message: `¿Estás seguro de que deseas desvincular ${ids.length} pagos de este grupo? Volverán a estar "Pendientes".`,
            showCancel: true,
            confirmText: 'Desvincular',
            onConfirm: async () => {
                setAlertModal({ isOpen: false, message: '' });
                setLoading(true);
                try {
                    await Promise.all(ids.map(id => budgetService.updateCommitment(id, {
                        transactionId: undefined,
                        status: 'pending',
                        paidDate: undefined
                    })));
                    await budgetService.syncExecutionLogTotals(transactionId);
                    await loadData();
                    if (onUpdate) onUpdate();
                } catch (error) {
                    console.error("Error desvinculando lote", error);
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleAddExistingPayment = async () => {
        if (!selectedPendingId) return;
        
        setSubmitting(true);
        try {
            await budgetService.updateCommitment(selectedPendingId, {
                status: 'paid',
                paidDate: format(new Date(), 'yyyy-MM-dd'),
                transactionId: transactionId
            });
            await budgetService.syncExecutionLogTotals(transactionId);
            
            setSelectedPendingId('');
            setShowAddForm(false);
            
            await loadData();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error linking payment to group", error);
        } finally {
            setSubmitting(false);
        }
    };

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
            <div className="flex flex-col min-h-[400px] max-h-[85vh] bg-white dark:bg-slate-800 rounded-b-xl overflow-hidden">
                {/* Header Action para mostrar form de añadir */}
                {!loading && (
                    <div className="flex justify-end px-4 pt-4 pb-2 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setShowAddForm(!showAddForm)}
                        >
                            {showAddForm ? 'Cancelar' : <><PlusIcon className="w-4 h-4 mr-2" /> Añadir Pago</>}
                        </Button>
                    </div>
                )}

                {/* Formulario para añadir pago existente */}
                {showAddForm && (
                    <div className="p-4 bg-purple-50 dark:bg-slate-700/50 border-b border-purple-100 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <FormGroup label="Seleccionar Pago Pendiente" required>
                                <select 
                                    className="w-full h-10 px-3 py-2 text-sm- text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white transition-colors"
                                    value={selectedPendingId}
                                    onChange={(e) => setSelectedPendingId(e.target.value)}
                                >
                                    <option value="">-- Seleccione un pago pendiente --</option>
                                    {pendingWeekly.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.title} - {formatCurrency(p.amount)} ({p.category})
                                        </option>
                                    ))}
                                </select>
                            </FormGroup>
                        </div>
                        <Button 
                            variant="primary" 
                            type="button" 
                            disabled={submitting || !selectedPendingId}
                            onClick={handleAddExistingPayment}
                            className="w-full md:w-auto mt-4 md:mt-0"
                        >
                            {submitting ? <Spinner size="sm" /> : 'Vincular Pago'}
                        </Button>
                    </div>
                )}

                {loading ? (
                    <div className="flex-1 flex justify-center items-center bg-gray-50/50 dark:bg-slate-900/50 min-h-[300px]">
                        <Spinner size="lg" />
                    </div>
                ) : commitments.length > 0 ? (
                    <div className="flex-1 p-0 overflow-y-auto">
                        <SmartDataTable
                            data={commitments}
                            columns={columns}
                            enableSearch={true}
                            enableExport={true}
                            enableSelection={true}
                            onDelete={(item) => handleRemovePayment(item.id, item.title)}
                            onBulkDelete={handleBulkRemove}
                            containerClassName="border-none shadow-none rounded-none"
                            id="payment-group-table"
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
                        <BanknotesIcon className="w-12 h-12 text-gray-300 mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Sin registros asociados</h4>
                        <p className="text-sm text-gray-500 max-w-sm">
                            No se encontraron compromisos vinculados a este identificador de transacción.
                            Es posible que estos pagos se hayan desvinculado. Puedes añadir un nuevo pago.
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
};
