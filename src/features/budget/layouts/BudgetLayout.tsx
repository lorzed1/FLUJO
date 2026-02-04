import React, { useState } from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import {
    ChartBarIcon,
    CalendarIcon,
    TableCellsIcon,
    PlusIcon,
    ArrowPathIcon,
    TagIcon
} from '@heroicons/react/24/outline';
import { BudgetFormModal } from '../components/BudgetFormModal';
import { budgetService } from '../../../services/budgetService';

import { BudgetCommitment } from '../../../types/budget';
import { useUI } from '../../../context/UIContext';

export type BudgetContextType = {
    openForm: (date?: Date, commitment?: BudgetCommitment) => void;
};

export const useBudgetContext = () => useOutletContext<BudgetContextType>();

export const BudgetLayout: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { setAlertModal } = useUI();
    const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);
    const [initialCommitment, setInitialCommitment] = useState<BudgetCommitment | undefined>(undefined);

    const openForm = (date?: Date, commitment?: BudgetCommitment) => {
        setInitialDate(date);
        setInitialCommitment(commitment);
        setIsModalOpen(true);
    };

    const handleCreateOrUpdate = async (data: any) => {
        try {
            if (data.id && !data.id.startsWith('projected-')) {
                // Modo Actualización (Solo compromisos reales existentes)
                await budgetService.updateCommitment(data.id, {
                    title: data.title,
                    amount: data.amount,
                    dueDate: data.date || data.dueDate, // Fix: Handle both form 'date' and object 'dueDate'
                    status: data.status,
                    category: data.category
                });
                setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Compromiso actualizado exitosamente' });
            } else {
                // Modo Creación o Materialización de Proyección
                if (data.id && data.id.startsWith('projected-')) {
                    // Caso Especial: El usuario editó una proyección virtual.
                    // Creamos un compromiso REAL para esta fecha específica.
                    // Al existir un real con 'recurrenceRuleId' y misma fecha, 
                    // la proyección automática se ocultará y mostrará este real modificado.
                    await budgetService.addCommitment({
                        title: data.title.replace(' (Proyectado)', ''),
                        amount: data.amount,
                        dueDate: data.date || data.dueDate, // Fix: Handle both form 'date' and object 'dueDate'
                        status: data.status,
                        category: data.category,
                        recurrenceRuleId: data.recurrenceRuleId, // Mantenemos link a la regla
                    });
                    setAlertModal({ isOpen: true, type: 'info', title: 'Información', message: 'Gasto guardado individualmente. Esta modificación solo afecta a este mes.' });
                } else {
                    // Creación Normal (Botón Nuevo)
                    await budgetService.createEntryWithRecurrence({
                        title: data.title,
                        amount: data.amount,
                        date: data.date,
                        status: data.status,
                        category: data.category,
                        isRecurring: data.isRecurring,
                        frequency: data.frequency
                    });
                    setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Compromiso creado exitosamente' });
                }
            }
        } catch (e: any) {
            console.error("Budget Save Error:", e);
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: `Error al guardar compromiso: ${e?.message || 'Error desconocido'}` });
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Presupuestos y Pagos</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Gestiona tus compromisos, visualiza deudas y planifica tus pagos.
                    </p>
                </div>
                <div className="flex space-x-3">
                    <nav className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <NavLink
                            to="/budget"
                            end
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`
                            }
                        >
                            <ChartBarIcon className="w-4 h-4" />
                            <span>Dashboard</span>
                        </NavLink>
                        <NavLink
                            to="/budget/calendar"
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`
                            }
                        >
                            <CalendarIcon className="w-4 h-4" />
                            <span>Calendario</span>
                        </NavLink>
                        <NavLink
                            to="/budget/list"
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`
                            }
                        >
                            <TableCellsIcon className="w-4 h-4" />
                            <span>Tabla</span>
                        </NavLink>
                        <NavLink
                            to="/budget/recurrent"
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`
                            }
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            <span>Gastos Recurrentes</span>
                        </NavLink>
                        <NavLink
                            to="/budget/categories"
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`
                            }
                        >
                            <TagIcon className="w-4 h-4" />
                            <span>Categorías</span>
                        </NavLink>
                    </nav>

                    <button
                        onClick={() => openForm()}
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/30"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Nuevo Gasto</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <Outlet context={{ openForm }} />
            </div>

            <BudgetFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialDate={initialDate}
                initialCommitment={initialCommitment}
                onSubmit={handleCreateOrUpdate}
            />
        </div>
    );
};
