import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { SmartDataTable } from '../../../components/ui/SmartDataTable';
import { TrashIcon, PlusIcon, TagIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../../components/layout/PageHeader';
import { TransactionType } from '../../../types';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

interface BudgetCategoriesProps {
    hideHeader?: boolean;
    onSwitchToRecurrentes?: () => void;
}

export const BudgetCategories: React.FC<BudgetCategoriesProps> = ({ hideHeader = false, onSwitchToRecurrentes }) => {
    const { categories, addCategory, deleteCategory } = useData();
    const { setAlertModal } = useUI();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryType, setNewCategoryType] = useState<TransactionType>(TransactionType.EXPENSE);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        addCategory({
            name: newCategoryName.trim(),
            type: newCategoryType
        });
        setNewCategoryName('');
    };

    const handleDelete = (category: any) => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Confirmar Eliminación',
            message: `¿Eliminar la categoría "${category.name}"?`,
            showCancel: true,
            confirmText: 'Eliminar',
            onConfirm: () => {
                deleteCategory(category.id);
                setAlertModal({ isOpen: false, message: '' });
            }
        });
    };

    const columns = useMemo(() => [
        {
            key: 'name',
            label: 'Nombre de Categoría',
            sortable: true,
            searchable: true,
            render: (value: string) => (
                <div className="flex items-center gap-3 py-1">
                    <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-primary border border-gray-100 dark:border-slate-700">
                        <TagIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="uppercase tracking-wide">{value}</span>
                </div>
            )
        },
        {
            key: 'type',
            label: 'Tipo de Flujo',
            sortable: true,
            render: (value: string) => {
                const isExpense = value === TransactionType.EXPENSE;
                return (
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border shadow-sm w-fit ${isExpense ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800' : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isExpense ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        <span className={`text-[10px] font-semibold uppercase tracking-widest ${isExpense ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                            {isExpense ? 'Gasto' : 'Ingreso'}
                        </span>
                    </div>
                );
            }
        },
        {
            key: 'actions',
            label: '',
            width: 'w-16',
            align: 'text-right' as const,
            filterable: false,
            render: (_: any, item: any) => (
                <div className="flex justify-end gap-1">
                    <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                        title="Eliminar"
                    >
                        <TrashIcon className="w-4.5 h-4.5" />
                    </button>
                </div>
            )
        }
    ], [deleteCategory, setAlertModal]);

    return (
        <div className="flex flex-col h-full">
            {!hideHeader && (
                <PageHeader
                    title="Categorías"
                    breadcrumbs={[
                        { label: 'Egresos', path: '/budget' },
                        { label: 'Categorías' }
                    ]}
                    icon={<TagIcon className="h-6 w-6" />}
                    actions={
                        onSwitchToRecurrentes ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={onSwitchToRecurrentes}
                                className="bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
                            >
                                <ArrowPathIcon className="w-3.5 h-3.5 mr-2" />
                                Gastos Recurrentes
                            </Button>
                        ) : undefined
                    }
                />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Panel lateral de creación */}
                <div className="lg:col-span-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 sticky top-6">
                        <div className="flex items-center gap-2 mb-1">
                            <PlusIcon className="w-4 h-4 text-primary" />
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nueva Categoría</h3>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Registro Maestro</h4>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mb-6 leading-relaxed">
                            Añade etiquetas para clasificar compromisos de pago y fuentes de ingreso.
                        </p>

                        <form onSubmit={handleAdd} className="space-y-5">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Nombre de la Etiqueta
                                </label>
                                <Input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Marketing, Nómina, etc."
                                    className="!h-10 text-[13px] font-medium"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Tipo de Movimiento
                                </label>
                                <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-slate-900/50 p-1 rounded-lg border border-gray-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setNewCategoryType(TransactionType.EXPENSE)}
                                        className={`px-4 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${newCategoryType === TransactionType.EXPENSE
                                            ? 'bg-white dark:bg-slate-800 text-rose-600 shadow-sm border border-rose-100 dark:border-rose-900/30'
                                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${newCategoryType === TransactionType.EXPENSE ? 'bg-rose-500' : 'bg-gray-300'}`} />
                                        Gasto
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewCategoryType(TransactionType.INCOME)}
                                        className={`px-4 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${newCategoryType === TransactionType.INCOME
                                            ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm border border-emerald-100 dark:border-emerald-900/30'
                                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full ${newCategoryType === TransactionType.INCOME ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                        Ingreso
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                disabled={!newCategoryName.trim()}
                                className="w-full !py-3 font-bold text-[12px] uppercase tracking-wider shadow-lg shadow-indigo-100 dark:shadow-none"
                            >
                                <PlusIcon className="w-4 h-4 mr-1" />
                                Confirmar Registro
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Tabla de resultados */}
                <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden min-h-[500px] flex flex-col">
                        <div className="flex-1">
                            <SmartDataTable
                                data={categories}
                                columns={columns}
                                enableSearch={true}
                                searchPlaceholder="Filtrar por nombre o tipo..."
                                id="budget-categories"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
