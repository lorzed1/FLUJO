import React, { useState } from 'react';
import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
import {
    ChartBarIcon,
    CalendarIcon,
    TableCellsIcon,
    PlusIcon,
    ArrowPathIcon,
    TagIcon
} from '../../../components/ui/Icons';
import { BudgetFormModal } from '../components/BudgetFormModal';
import { budgetService } from '../../../services/budget';

import { BudgetCommitment } from '../../../types/budget';
import { useUI } from '../../../context/UIContext';

export type BudgetContextType = {
    openForm: (date?: Date, commitment?: BudgetCommitment) => void;
    handleDelete: (commitment: BudgetCommitment) => Promise<void>;
    refresh: () => void;
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

    const handleDelete = async (commitment: BudgetCommitment) => {
        const isProjected = commitment.id.startsWith('projected-');

        return new Promise<void>((resolve, reject) => {
            setAlertModal({
                isOpen: true,
                type: 'warning',
                title: 'Confirmar Eliminación',
                message: `¿Deseas eliminar este registro de "${commitment.title}"?`,
                showCancel: true,
                confirmText: 'Eliminar',
                onConfirm: async () => {
                    try {
                        if (isProjected && commitment.recurrenceRuleId) {
                            await budgetService.cancelProjectedCommitment(commitment.recurrenceRuleId, commitment.dueDate);
                        } else {
                            await budgetService.deleteCommitment(commitment.id);
                        }
                        setRefreshTrigger(prev => prev + 1);
                        setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Registro eliminado correctamente.' });
                        resolve();
                    } catch (error) {
                        console.error("Error deleting item:", error);
                        setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error al eliminar el registro.' });
                        reject(error);
                    }
                }
            });
        });
    };

    const handleCreateOrUpdate = async (data: any) => {
        try {
            if (data.id && !data.id.startsWith('projected-')) {
                // Modo Actualización (Solo compromisos reales existentes)
                await budgetService.updateCommitment(data.id, {
                    title: data.title,
                    amount: data.amount,
                    dueDate: data.date || data.dueDate,
                    status: data.status,
                    category: data.category,
                    paidDate: data.paidDate,
                    // Si es recurrente y estamos cambiando la fecha por primera vez, 
                    // preservamos la fecha anterior como 'original' para evitar duplicados proyectados.
                    ...(data.recurrenceRuleId && (data.date && data.date !== data.dueDate) && !data.originalDueDate 
                        ? { originalDueDate: data.dueDate } 
                        : {})
                });
                setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Compromiso actualizado exitosamente' });
            } else {
                // Modo Creación o Materialización de Proyección
                if (data.id && data.id.startsWith('projected-')) {
                    // Caso Especial: El usuario editó una proyección virtual.
                    await budgetService.addCommitment({
                        title: data.title.replace(' (Proyectado)', ''),
                        amount: data.amount,
                        dueDate: data.date || data.dueDate,
                        status: data.status,
                        category: data.category,
                        recurrenceRuleId: data.recurrenceRuleId, // VÍNCULO CRÍTICO: Para evitar duplicados
                        originalDueDate: data.dueDate, // PREVENCIÓN DE DUPLICADOS: Guardamos la fecha original
                        paidDate: data.paidDate
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
                <Outlet context={{ openForm, handleDelete, refresh: () => setRefreshTrigger(p => p + 1), refreshTrigger }} />
            </div>

            <BudgetFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialDate={initialDate}
                initialCommitment={initialCommitment}
                onSubmit={handleCreateOrUpdate}
                onDelete={handleDelete}
            />
        </div>
    );
};
