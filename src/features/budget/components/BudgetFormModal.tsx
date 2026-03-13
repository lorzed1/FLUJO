import React, { useState, useEffect } from 'react';
import { Input } from '../../../components/ui/Input';
import { DatePicker } from '../../../components/ui/DatePicker';
import { CurrencyInput } from '../../../components/ui/CurrencyInput';
import { Select } from '../../../components/ui/Select';
import { format } from 'date-fns';
import { BudgetCommitment } from '../../../types/budget';
import { useData } from '../../../context/DataContext';
import { TransactionType } from '../../../types';
import { PlusIcon, XMarkIcon, CheckIcon, TagIcon, BanknotesIcon } from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { FormGroup } from '../../../components/ui/FormGroup';

interface BudgetFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: Date;
    initialCommitment?: BudgetCommitment;
    onSubmit: (data: any) => Promise<void>;
}

export const BudgetFormModal: React.FC<BudgetFormModalProps> = ({
    isOpen,
    onClose,
    initialDate,
    initialCommitment,
    onSubmit
}) => {
    const { categories, addCategory } = useData();
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        date: '',
        category: '',
        status: 'pending',
        paymentDate: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);

    useEffect(() => {
        if (isOpen) {
            if (initialCommitment) {
                setFormData({
                    title: initialCommitment.title,
                    amount: String(initialCommitment.amount),
                    date: initialCommitment.dueDate,
                    category: initialCommitment.category,
                    status: initialCommitment.status,
                    paymentDate: initialCommitment.paidDate || ''
                });
            } else if (initialDate) {
                setFormData({
                    title: '',
                    amount: '',
                    date: format(initialDate, 'yyyy-MM-dd'),
                    category: expenseCategories[0]?.name || '',
                    status: 'pending',
                    paymentDate: ''
                });
            } else {
                setFormData({
                    title: '',
                    amount: '',
                    date: '',
                    category: expenseCategories[0]?.name || '',
                    status: 'pending',
                    paymentDate: ''
                });
            }
        }
    }, [isOpen, initialDate, initialCommitment, categories]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            await addCategory({
                name: newCategoryName,
                type: TransactionType.EXPENSE
            });
            setFormData(prev => ({ ...prev, category: newCategoryName }));
            setNewCategoryName('');
            setIsAddingCategory(false);
        } catch (error) {
            console.error("Failed to add category", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSubmit({
                ...formData,
                amount: Number(formData.amount),
                id: initialCommitment?.id,
                recurrenceRuleId: initialCommitment?.recurrenceRuleId,
                paidDate: formData.status === 'paid' ? (formData.paymentDate || new Date().toISOString().split('T')[0]) : null
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const headerTitle = (
        <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-slate-700 rounded-lg">
                <BanknotesIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                    {initialCommitment ? 'Editar registro' : 'Nuevo gasto presupuestal'}
                </h2>
                <p className="text-xs2 text-slate-400 font-semibold uppercase tracking-caps mt-0.5">Módulo de Egresos</p>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={headerTitle}
            maxWidth="max-w-xl"
            className="p-0 overflow-hidden"
        >
            <div className="flex flex-col flex-1 min-h-0">
                <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto">
                    {/* Primary Field: Title */}
                    <FormGroup label="Descripción o Nombre del Proveedor" required>
                        <Input
                            value={formData.title}
                            onChange={e => handleChange('title', e.target.value)}
                            placeholder="Ej: Pago de Arriendo, Nómina, Marketing Digital..."
                            className="text-sm-"
                            required
                        />
                    </FormGroup>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-5">
                            <FormGroup label="Importe Proyectado" required>
                                <CurrencyInput
                                    value={formData.amount}
                                    onChange={val => handleChange('amount', val)}
                                    placeholder="$ 0"
                                    className="text-sm- font-semibold"
                                    required
                                />
                            </FormGroup>
                            <FormGroup label="Fecha de Vencimiento" required>
                                <DatePicker
                                    value={formData.date}
                                    onChange={val => handleChange('date', val)}
                                    className="text-sm- font-medium"
                                    required
                                />
                            </FormGroup>
                        </div>

                        <div className="space-y-5">
                            <FormGroup label="Estado del Pago">
                                <Select
                                    value={formData.status}
                                    className="text-sm- font-medium text-slate-600"
                                    onChange={e => {
                                        const newStatus = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            status: newStatus,
                                            paymentDate: newStatus === 'paid' && !prev.paymentDate ? new Date().toISOString().split('T')[0] : prev.paymentDate
                                        }));
                                    }}
                                >
                                    <option value="pending">Pendiente de pago</option>
                                    <option value="paid">Liquidado / Pagado</option>
                                    <option value="overdue">Vencido</option>
                                </Select>
                            </FormGroup>

                            {formData.status === 'paid' ? (
                                <FormGroup label="Fecha de Liquidación">
                                    <DatePicker
                                        value={formData.paymentDate}
                                        onChange={val => handleChange('paymentDate', val)}
                                        className="text-sm- font-medium border-emerald-100 bg-emerald-50/10"
                                    />
                                </FormGroup>
                            ) : (
                                <FormGroup label="Categoría" required>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            {isAddingCategory ? (
                                                <div className="flex items-center gap-1.5 animate-in slide-in-from-right-2">
                                                    <Input
                                                        value={newCategoryName}
                                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                                        placeholder="Nombre..."
                                                        autoFocus
                                                        className="!text-xs"
                                                    />
                                                    <Button type="button" onClick={handleAddCategory} className="!w-10 !p-0">
                                                        <CheckIcon className="w-5 h-5" />
                                                    </Button>
                                                    <Button type="button" variant="secondary" onClick={() => setIsAddingCategory(false)} className="!w-10 !p-0">
                                                        <XMarkIcon className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Select
                                                    value={formData.category}
                                                    className="text-sm- font-medium"
                                                    onChange={e => handleChange('category', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Seleccionar categoría...</option>
                                                    {expenseCategories.map(cat => (
                                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                    ))}
                                                    {formData.category && !expenseCategories.some(c => c.name === formData.category) && (
                                                        <option value={formData.category}>{formData.category}</option>
                                                    )}
                                                </Select>
                                            )}
                                        </div>
                                        {!isAddingCategory && (
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() => setIsAddingCategory(true)}
                                                className="!w-10 !p-0 border-dashed"
                                                title="Añadir categoría"
                                            >
                                                <PlusIcon className="w-5 h-5" />
                                            </Button>
                                        )}
                                    </div>
                                </FormGroup>
                            )}
                        </div>
                    </div>

                    <div className="pt-5 flex justify-between items-center border-t border-slate-100 dark:border-slate-700 mt-4 shrink-0 bg-white dark:bg-slate-800">
                        <div className="flex-1">
                            {initialCommitment && initialCommitment.status !== 'paid' && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setFormData(prev => ({
                                            ...prev,
                                            status: 'paid',
                                            paymentDate: new Date().toISOString().split('T')[0]
                                        }));
                                    }}
                                    className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
                                >
                                    <CheckIcon className="w-4 h-4" />
                                    Liquidar Ahora
                                </Button>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onClose}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Procesando...' : (initialCommitment ? 'Actualizar registro' : 'Confirmar gasto')}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </Modal>
    );
};
