import React, { useState, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { SmartDataTable } from '../../../components/ui/SmartDataTable';
import { TrashIcon, PlusIcon, TagIcon } from '@heroicons/react/24/outline';
import { TransactionType } from '../../../types';
import { useUI } from '../../../context/UIContext';

export const BudgetCategories: React.FC = () => {
    const { categories, addCategory, deleteCategory } = useApp();
    const { setAlertModal } = useUI();
    const [newCategoryName, setNewCategoryName] = useState('');

    // Filter to show only EXPENSE categories by default? 
    // Or show all. Usually budget module cares about Expenses mostly.
    // But user might want to see both. 
    // Let's filter to Expenses mostly, or let table filter handle it.
    // I'll show all but emphasize Expenses.

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        addCategory({
            name: newCategoryName.trim(),
            type: TransactionType.EXPENSE // Default to expense for budget module
        });
        setNewCategoryName('');
    };

    const handleDelete = (id: string) => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Confirmar Eliminación',
            message: '¿Eliminar esta categoría?',
            showCancel: true,
            confirmText: 'Eliminar',
            onConfirm: () => {
                deleteCategory(id);
                setAlertModal({ isOpen: false, message: '' });
            }
        });
    };

    const columns = useMemo(() => [
        {
            key: 'name',
            label: 'Nombre de Categoría',
            sortable: true,
            filterable: true,
            render: (value: string) => (
                <div className="flex items-center gap-2">
                    <TagIcon className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{value}</span>
                </div>
            )
        },
        {
            key: 'type',
            label: 'Tipo',
            sortable: true,
            filterable: true,
            render: (value: string) => (
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${value === TransactionType.EXPENSE
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                    {value === TransactionType.EXPENSE ? 'Gasto' : 'Ingreso'}
                </span>
            )
        },
        {
            key: 'actions',
            label: '',
            width: 'w-10',
            align: 'text-right' as const,
            render: (_: any, item: any) => (
                <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Eliminar"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            )
        }
    ], [deleteCategory]);

    return (
        <div className="h-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <TagIcon className="w-6 h-6 text-indigo-500" />
                Gestión de Categorías
            </h2>

            {/* Add Form */}
            <form onSubmit={handleAdd} className="mb-8 flex gap-3 items-end bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl">
                <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Nueva Categoría
                    </label>
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Ej: Servicios Públicos"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <button
                    type="submit"
                    disabled={!newCategoryName.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
                >
                    <PlusIcon className="w-4 h-4" />
                    Agregar
                </button>
            </form>

            <div className="flex-1 min-h-0">
                <SmartDataTable
                    data={categories}
                    columns={columns}
                    enableSearch={true}
                    searchPlaceholder="Buscar categorías..."
                    containerClassName="h-full"
                />
            </div>
        </div>
    );
};
