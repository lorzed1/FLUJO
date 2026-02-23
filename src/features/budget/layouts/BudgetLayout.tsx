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
import { budgetService } from '../../../services/budget';

import { BudgetCommitment } from '../../../types/budget';
import { useUI } from '../../../context/UIContext';

export type BudgetContextType = {
    openForm: (date?: Date, commitment?: BudgetCommitment) => void;
    refreshTrigger: number;
};

export const useBudgetContext = () => useOutletContext<BudgetContextType>();

export const BudgetLayout: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { setAlertModal } = useUI();
    const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);
    const [initialCommitment, setInitialCommitment] = useState<BudgetCommitment | undefined>(undefined);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

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
                    category: data.category,
                    paidDate: data.paidDate // Include paidDate
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
                        paidDate: data.paidDate // Include paidDate
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
            // Trigger refresh for children
            setRefreshTrigger(prev => prev + 1);
        } catch (e: any) {
            console.error("Budget Save Error:", e);
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: `Error al guardar compromiso: ${e?.message || 'Error desconocido'}` });
        }
    };

    return (
        <div className="flex flex-col space-y-4">


            <div className="flex-1 min-h-0">
                <Outlet context={{ openForm, refreshTrigger }} />
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
