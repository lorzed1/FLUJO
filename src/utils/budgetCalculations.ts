import { startOfDay } from 'date-fns';

// ============================================
// Types
// ============================================

export interface WeeklyAvailabilityInput {
    ctaCorriente?: number | string;
    ctaAhorrosJ?: number | string;
    ctaAhorrosN?: number | string;
    ctaNequi?: number | string;
    otrosIngresos?: number | string;
    efectivo?: number | string;
}

export interface BudgetExecutionSummary {
    totalAvailable: number;
    totalSelected: number;
    remainingBalance: number;
    isDeficit: boolean;
    usagePercent: number;
}

export type CommitmentStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';

// ============================================
// Cálculos de Disponibilidad Semanal
// ============================================

/**
 * Calcula el total disponible sumando todas las cuentas bancarias y efectivo.
 * Centraliza la suma que antes se hacía inline en BudgetExecution.
 */
export const calculateTotalAvailable = (input: WeeklyAvailabilityInput): number => {
    return (
        (parseFloat(String(input.ctaCorriente)) || 0) +
        (parseFloat(String(input.ctaAhorrosJ)) || 0) +
        (parseFloat(String(input.ctaAhorrosN)) || 0) +
        (parseFloat(String(input.ctaNequi)) || 0) +
        (parseFloat(String(input.otrosIngresos)) || 0) +
        (parseFloat(String(input.efectivo)) || 0)
    );
};

/**
 * Calcula el resumen completo de una ejecución presupuestal semanal.
 */
export const calculateExecutionSummary = (
    availabilityInput: WeeklyAvailabilityInput,
    totalSelected: number
): BudgetExecutionSummary => {
    const totalAvailable = calculateTotalAvailable(availabilityInput);
    const remainingBalance = totalAvailable - totalSelected;
    const isDeficit = remainingBalance < 0;
    const usagePercent = totalAvailable > 0
        ? Math.round((totalSelected / totalAvailable) * 100)
        : 0;

    return {
        totalAvailable,
        totalSelected,
        remainingBalance,
        isDeficit,
        usagePercent
    };
};

// ============================================
// Determinación de Estado de Compromisos
// ============================================

/**
 * Determina si un compromiso presupuestal está vencido.
 * Centraliza la lógica que se repetía en BudgetCalendar, BudgetDashboard y BudgetExecution.
 */
export const isCommitmentOverdue = (
    status: string,
    dueDate: Date | string
): boolean => {
    if (status === 'paid' || status === 'cancelled') return false;
    const today = startOfDay(new Date());
    const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    return due < today;
};

/**
 * Resuelve el estado visual de un compromiso (para colores, badges, etc.)
 */
export const resolveCommitmentVisualStatus = (
    status: string,
    dueDate: Date | string,
    isProjected: boolean = false
): 'paid' | 'overdue' | 'projected' | 'pending' => {
    if (status === 'paid') return 'paid';
    if (isCommitmentOverdue(status, dueDate)) return 'overdue';
    if (isProjected) return 'projected';
    return 'pending';
};

/**
 * Retorna los colores de estilo para un compromiso según su estado visual.
 * Elimina la repetición de la paleta de colores en Calendar y Dashboard.
 */
export const getCommitmentColors = (
    visualStatus: 'paid' | 'overdue' | 'projected' | 'pending'
): { bgColor: string; borderColor: string; textColor: string } => {
    switch (visualStatus) {
        case 'paid':
            return { bgColor: '#ecfdf5', borderColor: '#10b981', textColor: '#047857' };
        case 'overdue':
            return { bgColor: '#fef2f2', borderColor: '#ef4444', textColor: '#b91c1c' };
        case 'projected':
            return { bgColor: '#f8fafc', borderColor: '#94a3b8', textColor: '#64748b' };
        case 'pending':
        default:
            return { bgColor: '#fffbeb', borderColor: '#f59e0b', textColor: '#b45309' };
    }
};
