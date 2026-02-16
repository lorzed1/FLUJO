/**
 * Budget Mappers — Helpers para transformar filas de Supabase → tipos TS
 */
import { BudgetCommitment, RecurrenceRule, RecurrenceFrequency } from '../../types/budget';
import { addMonths, addWeeks } from 'date-fns';

/** Transforma un row de `budget_commitments` → BudgetCommitment */
export function mapCommitmentFromRow(row: any): BudgetCommitment {
    return {
        id: row.id,
        title: row.title,
        amount: Number(row.amount),
        dueDate: row.due_date,
        status: row.status,
        paidDate: row.paid_date,
        category: row.category,
        description: row.description,
        recurrenceRuleId: row.recurrence_rule_id,
        providerName: row.provider_name,
        contactInfo: row.contact_info,
        isProjected: row.is_projected,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/** Transforma un row de `budget_recurring_rules` → RecurrenceRule */
export function mapRuleFromRow(row: any): RecurrenceRule {
    return {
        id: row.id,
        title: row.title,
        amount: Number(row.amount),
        frequency: row.frequency,
        interval: row.interval_count,
        dayToSend: row.day_to_send,
        startDate: row.start_date,
        endDate: row.end_date,
        category: row.category,
        description: row.description,
        active: row.active,
        lastGeneratedDate: row.last_generated_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/** Calcula la siguiente fecha según la frecuencia de recurrencia */
export function getNextDate(current: Date, freq: RecurrenceFrequency, interval: number = 1): Date {
    switch (freq) {
        case 'weekly': return addWeeks(current, interval);
        case 'monthly': return addMonths(current, interval);
        case 'yearly': return addMonths(current, 12 * interval);
        default: return addMonths(current, interval);
    }
}
