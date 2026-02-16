import React, { useState, useEffect } from 'react';
import { Input } from '../../../components/ui/Input';
import { CurrencyInput } from '../../../components/ui/CurrencyInput';
import { Select } from '../../../components/ui/Select';
import { LabeledField } from '../../../components/ui/LabeledField';
import { format } from 'date-fns';
import { BudgetCommitment } from '../../../types/budget';
import { useApp } from '../../../context/AppContext';
import { TransactionType } from '../../../types';
import { PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

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
    const { categories, addCategory } = useApp();
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

    // Filter only expense categories
    const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);

    // Efecto para cargar datos iniciales o resetear
    useEffect(() => {
        if (isOpen) {
            if (initialCommitment) {
                // Modo Edición
                setFormData({
                    title: initialCommitment.title,
                    amount: String(initialCommitment.amount),
                    date: initialCommitment.dueDate,
                    category: initialCommitment.category, // This might be a name, not ID. We need to handle that.
                    status: initialCommitment.status,
                    paymentDate: initialCommitment.paidDate || ''
                });
            } else if (initialDate) {
                // Modo Creación con fecha pre-seleccionada
                setFormData({
                    title: '',
                    amount: '',
                    date: format(initialDate, 'yyyy-MM-dd'),
                    category: expenseCategories[0]?.name || '',
                    status: 'pending',
                    paymentDate: ''
                });
            } else {
                // Modo Creación limpio
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
                recurrenceRuleId: initialCommitment?.recurrenceRuleId, // Preserve rule association
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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                    {initialCommitment ? 'Editar Gasto' : 'Nuevo Gasto'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <LabeledField label="Descripción / Proveedor">
                        <Input
                            value={formData.title}
                            onChange={e => handleChange('title', e.target.value)}
                            placeholder="Ej: Pago de Arriendo"
                            required
                        />
                    </LabeledField>

                    <div className="grid grid-cols-2 gap-4">
                        <LabeledField label="Monto">
                            <CurrencyInput
                                value={formData.amount}
                                onChange={val => handleChange('amount', val)}
                                placeholder="$ 0"
                                required
                            />
                        </LabeledField>

                        <LabeledField label="Fecha Vencimiento">
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={e => handleChange('date', e.target.value)}
                                required
                            />
                        </LabeledField>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <LabeledField label="Estado">
                            <Select
                                value={formData.status}
                                onChange={e => {
                                    const newStatus = e.target.value;
                                    setFormData(prev => ({
                                        ...prev,
                                        status: newStatus,
                                        paymentDate: newStatus === 'paid' && !prev.paymentDate ? new Date().toISOString().split('T')[0] : prev.paymentDate
                                    }));
                                }}
                            >
                                <option value="pending">Pendiente</option>
                                <option value="paid">Pagado</option>
                                <option value="overdue">Vencido</option>
                            </Select>
                        </LabeledField>

                        {formData.status === 'paid' && (
                            <LabeledField label="Fecha de Pago">
                                <Input
                                    type="date"
                                    value={formData.paymentDate}
                                    onChange={e => handleChange('paymentDate', e.target.value)}
                                />
                            </LabeledField>
                        )}
                    </div>

                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            {isAddingCategory ? (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                    <Input
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="Nueva categoría..."
                                        autoFocus
                                        className="h-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCategory}
                                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        <CheckIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingCategory(false)}
                                        className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <LabeledField label="Categoría">
                                    <Select
                                        value={formData.category} // Must match an option value
                                        onChange={e => handleChange('category', e.target.value)}
                                        required
                                    >
                                        <option value="">Seleccionar...</option>

                                        {/* Categories from System (Dynamic) */}
                                        {expenseCategories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}

                                        {/* Ensure current value is shown even if valid but not in lists above (Legacy/Imported) */}
                                        {formData.category &&
                                            !expenseCategories.some(c => c.name === formData.category) && (
                                                <option value={formData.category}>{formData.category}</option>
                                            )}
                                    </Select>
                                </LabeledField>
                            )}
                        </div>
                        {!isAddingCategory && (
                            <button
                                type="button"
                                onClick={() => setIsAddingCategory(true)}
                                className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600"
                                title="Añadir nueva categoría"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>




                    <div className="pt-4 flex justify-between space-x-3">
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
                                    className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 rounded-lg transition-colors font-bold text-xs uppercase tracking-wider flex items-center gap-2"
                                >
                                    <CheckIcon className="w-4 h-4" />
                                    Marcar como Pagado
                                </button>
                            )}
                        </div>

                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/30 transition-all font-medium text-sm flex items-center"
                            >
                                {isLoading ? 'Guardando...' : (initialCommitment ? 'Actualizar' : 'Guardar')}
                            </button>
                        </div>
                    </div>
                </form >
            </div >
        </div >
    );
};
