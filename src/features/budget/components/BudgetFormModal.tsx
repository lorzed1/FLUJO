import React, { useState, useEffect } from 'react';
import { Input } from '../../../components/ui/Input';
import { CurrencyInput } from '../../../components/ui/CurrencyInput';
import { Select } from '../../../components/ui/Select';
import { format } from 'date-fns';
import { BudgetCommitment } from '../../../types/budget';
import { useData } from '../../../context/DataContext';
import { TransactionType } from '../../../types';
import { PlusIcon, XMarkIcon, CheckIcon, TagIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { Button } from '../../../components/ui/Button';

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

    const FormLabel = ({ children }: { children: React.ReactNode }) => (
        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            {children}
        </label>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] px-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Block */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                            <BanknotesIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                                {initialCommitment ? 'Editar Registro' : 'Nuevo Gasto Presupuestal'}
                            </h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Módulo de Egresos</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-white dark:bg-slate-700 p-1.5 rounded-lg border border-gray-100 dark:border-slate-600 shadow-sm"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Primary Field: Title */}
                    <div>
                        <FormLabel>Descripción o Nombre del Proveedor</FormLabel>
                        <Input
                            value={formData.title}
                            onChange={e => handleChange('title', e.target.value)}
                            placeholder="Ej: Pago de Arriendo, Nómina, Marketing Digital..."
                            className="!h-10 text-[13px] font-medium"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-5">
                            <div>
                                <FormLabel>Importe Proyectado</FormLabel>
                                <CurrencyInput
                                    value={formData.amount}
                                    onChange={val => handleChange('amount', val)}
                                    placeholder="$ 0"
                                    className="!h-10 text-[14px] font-bold"
                                    required
                                />
                            </div>
                            <div>
                                <FormLabel>Fecha de Vencimiento</FormLabel>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={e => handleChange('date', e.target.value)}
                                    className="!h-10 text-[13px] font-medium uppercase tracking-tight"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <FormLabel>Estado del Pago</FormLabel>
                                <Select
                                    value={formData.status}
                                    className="!h-10 text-[13px] font-bold"
                                    onChange={e => {
                                        const newStatus = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            status: newStatus,
                                            paymentDate: newStatus === 'paid' && !prev.paymentDate ? new Date().toISOString().split('T')[0] : prev.paymentDate
                                        }));
                                    }}
                                >
                                    <option value="pending">PENDIENTE</option>
                                    <option value="paid">LIQUIDADO</option>
                                    <option value="overdue">VENCIDO</option>
                                </Select>
                            </div>

                            {formData.status === 'paid' ? (
                                <div>
                                    <FormLabel>Fecha de Liquidación</FormLabel>
                                    <Input
                                        type="date"
                                        value={formData.paymentDate}
                                        onChange={e => handleChange('paymentDate', e.target.value)}
                                        className="!h-10 text-[13px] font-medium uppercase tracking-tight border-emerald-100 bg-emerald-50/10"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <FormLabel>Categoría</FormLabel>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            {isAddingCategory ? (
                                                <div className="flex items-center gap-1.5 animate-in slide-in-from-right-2">
                                                    <Input
                                                        value={newCategoryName}
                                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                                        placeholder="Nombre..."
                                                        autoFocus
                                                        className="!h-10 !text-[12px]"
                                                    />
                                                    <Button type="button" onClick={handleAddCategory} className="!h-10 !w-10 !p-0">
                                                        <CheckIcon className="w-5 h-5" />
                                                    </Button>
                                                    <Button type="button" variant="secondary" onClick={() => setIsAddingCategory(false)} className="!h-10 !w-10 !p-0">
                                                        <XMarkIcon className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Select
                                                    value={formData.category}
                                                    className="!h-10 text-[13px] font-medium"
                                                    onChange={e => handleChange('category', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {expenseCategories.map(cat => (
                                                        <option key={cat.id} value={cat.name}>{cat.name.toUpperCase()}</option>
                                                    ))}
                                                    {formData.category && !expenseCategories.some(c => c.name === formData.category) && (
                                                        <option value={formData.category}>{formData.category.toUpperCase()}</option>
                                                    )}
                                                </Select>
                                            )}
                                        </div>
                                        {!isAddingCategory && (
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() => setIsAddingCategory(true)}
                                                className="!h-10 !w-10 !p-0 border-dashed"
                                                title="Añadir categoría"
                                            >
                                                <PlusIcon className="w-5 h-5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-6 flex justify-between items-center border-t border-gray-50 dark:border-slate-700 mt-4">
                        <div className="flex-1">
                            {initialCommitment && initialCommitment.status !== 'paid' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({
                                            ...prev,
                                            status: 'paid',
                                            paymentDate: new Date().toISOString().split('T')[0]
                                        }));
                                    }}
                                    className="flex items-center gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:bg-emerald-50 dark:hover:bg-emerald-900/10 px-3 py-2 rounded-lg transition-colors"
                                >
                                    <CheckIcon className="w-4 h-4" />
                                    Liquidar Ahora
                                </button>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onClose}
                                className="!h-10 !px-6 font-bold text-[11px] uppercase tracking-wider"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="!h-10 !px-8 font-bold text-[11px] uppercase tracking-wider shadow-lg shadow-indigo-100 dark:shadow-none"
                            >
                                {isLoading ? 'Cargando...' : (initialCommitment ? 'Actualizar Registro' : 'Confirmar Gasto')}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
