/**
 * Budget Service — Barrel Export
 * 
 * Re-exporta todos los módulos del servicio de presupuesto
 * para mantener compatibilidad con `import { budgetService } from '...'`
 * 
 * Estructura interna:
 * - mappers.ts    → Transformación DB ↔ TypeScript
 * - commitments.ts → CRUD de compromisos presupuestarios
 * - recurrence.ts  → Reglas de recurrencia, generación, seed
 * - execution.ts   → Logs, disponibilidad semanal, reconciliación
 */
import * as commitments from './commitments';
import * as recurrence from './recurrence';
import * as execution from './execution';
import { getNextDate } from './mappers';

/**
 * Facade que mantiene la API original `budgetService.xxx`
 * para compatibilidad con los 10+ archivos que lo importan.
 */
export const budgetService = {
    // Commitments
    getCommitments: commitments.getCommitments,
    getOverduePendingCommitments: commitments.getOverduePendingCommitments,
    addCommitment: commitments.addCommitment,
    updateCommitment: commitments.updateCommitment,
    deleteCommitment: commitments.deleteCommitment,

    // Recurrence Rules
    getRecurrenceRules: recurrence.getRecurrenceRules,
    addRecurrenceRule: recurrence.addRecurrenceRule,
    updateRecurrenceRule: recurrence.updateRecurrenceRule,
    deleteRecurrenceRule: recurrence.deleteRecurrenceRule,

    // Orchestration
    createEntryWithRecurrence: recurrence.createEntryWithRecurrence,
    generateFromRules: recurrence.generateFromRules,

    // Seed & Reset
    seedRecurringExpenses: recurrence.seedRecurringExpenses,
    resetRecurringModule: recurrence.resetRecurringModule,

    // Execution
    addExecutionLog: execution.addExecutionLog,
    getExecutionLogs: execution.getExecutionLogs,
    reconcileTodayLog: execution.reconcileTodayLog,

    // Weekly Availability
    getWeeklyAvailability: execution.getWeeklyAvailability,
    saveWeeklyAvailability: execution.saveWeeklyAvailability,

    // Utility
    getNextDate,
};

// Re-export individual modules for direct import
export { commitments, recurrence, execution };
