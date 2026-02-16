import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { SmartDataTable } from '../../../components/ui/SmartDataTable';
import { TrashIcon, PlusIcon, TagIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../../components/layout/PageHeader';
import { TransactionType } from '../../../types';
import { useUI } from '../../../context/UIContext';

export const BudgetCategories: React.FC = () => {
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
                setAlertModal({ isOpen: false, message: '' }); // Close modal
            }
        });
    };

    const columns = useMemo(() => [
        {
            key: 'name',
            label: 'Nombre',
            sortable: true,
            searchable: true,
            render: (value: string) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                        <TagIcon className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{value}</span>
                </div>
            )
        },
        {
            key: 'type',
            label: 'Tipo',
            sortable: true,
            render: (value: string) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${value === TransactionType.EXPENSE
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                    {value === TransactionType.EXPENSE ? 'Gasto' : 'Ingreso'}
                </span>
            )
        },
        {
            key: 'actions',
            label: '',
            width: 'w-16',
            align: 'text-right' as const,
            render: (_: any, item: any) => (
                <button
                    onClick={() => handleDelete(item)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                    title="Eliminar"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            )
        }
    ], [deleteCategory, setAlertModal]);

    return (
        <div className="space-y-6 h-full pb-20 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-500 pr-2">
            <PageHeader
                title="Gestión de Categorías"
                breadcrumbs={[
                    { label: 'Finanzas', path: '/budget' },
                    { label: 'Categorías' }
                ]}
                icon={<TagIcon className="h-6 w-6" />}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 sticky top-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <PlusIcon className="w-5 h-5 text-indigo-500" />
                            Nueva Categoría
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            Crea nuevas categorías para organizar tus ingresos y gastos de forma eficiente.
                        </p>

                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Nombre
                                </label>
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Ej: Marketing, Nómina..."
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Tipo
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewCategoryType(TransactionType.EXPENSE)}
                                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${newCategoryType === TransactionType.EXPENSE
                                            ? 'bg-rose-50 border-rose-200 text-rose-700 ring-2 ring-rose-500 ring-offset-1 dark:ring-offset-slate-800'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        Gasto
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewCategoryType(TransactionType.INCOME)}
                                        className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${newCategoryType === TransactionType.INCOME
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-slate-800'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        Ingreso
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!newCategoryName.trim()}
                                className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Crear Categoría
                            </button>
                        </form>
                    </div>
                </div>

                {/* Table Card */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col h-full min-h-[500px]">
                        <div className="flex-1">
                            <SmartDataTable
                                data={categories}
                                columns={columns}
                                enableSearch={true}
                                searchPlaceholder="Buscar categorías..."
                                containerClassName="h-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
