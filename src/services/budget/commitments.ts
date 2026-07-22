/**
 * Budget Commitments — CRUD para compromisos presupuestarios
 */
import { supabase } from '../supabaseClient';
import { BudgetCommitment, RecurrenceRule } from '../../types/budget';
import { format, isAfter, isBefore, isSameDay, parseISO, getDay, setDate, addDays, addMonths } from 'date-fns';
import { mapCommitmentFromRow, mapRuleFromRow, getNextDate } from './mappers';

/** Obtiene compromisos con proyección virtual de recurrentes */
export async function getCommitments(startDate?: string, endDate?: string): Promise<BudgetCommitment[]> {
    try {
        // 1. Fetch REAL commitments
        let query = supabase
            .from('budget_commitments')
            .select('*')
            .order('due_date', { ascending: true });

        if (startDate && endDate) {
            query = supabase
                .from('budget_commitments')
                .select('*')
                .gte('due_date', startDate)
                .lte('due_date', endDate)
                .order('due_date', { ascending: true });
        }

        const { data: rows, error } = await query;
        if (error) throw error;

        const realCommitments: BudgetCommitment[] = (rows || [])
            .map((row: any) => mapCommitmentFromRow(row))
            .filter(c => c.status !== 'cancelled'); // Filter out cancelled ones

        // 2. Project VIRTUAL commitments (Only if range is provided)
        if (startDate && endDate) {
            const { data: ruleRows, error: ruleError } = await supabase
                .from('budget_recurring_rules')
                .select('*');
            if (ruleError) throw ruleError;

            const rules: RecurrenceRule[] = (ruleRows || []).map((row: any) => mapRuleFromRow(row));

            const start = parseISO(startDate);
            const end = parseISO(endDate);
            const virtualCommitments: BudgetCommitment[] = [];
            
            // Re-fetch all real commitments for deduplication including cancelled ones
            const { data: allRealRows } = await supabase
                .from('budget_commitments')
                .select('id, due_date, original_due_date, recurrence_rule_id, status');
            
            const allReal = allRealRows || [];

            for (const rule of rules) {
                if (!rule.active) continue;

                let nextDate = parseISO(rule.startDate);
                if (!nextDate || isNaN(nextDate.getTime())) continue;

                let safety1 = 0;
                while (isBefore(nextDate, start) && safety1 < 1000) {
                    nextDate = getNextDate(nextDate, rule.frequency, rule.interval);
                    safety1++;
                }

                let safety2 = 0;
                while ((isBefore(nextDate, end) || isSameDay(nextDate, end)) && safety2 < 1000) {
                    safety2++;
                    const targetDay = Number(rule.dayToSend);

                    if (!isNaN(targetDay)) {
                        if (rule.frequency === 'weekly') {
                            const currentDay = getDay(nextDate);
                            if (currentDay !== targetDay) {
                                const diff = targetDay - currentDay;
                                nextDate = addDays(nextDate, diff);
                            }
                        } else if (rule.frequency === 'monthly') {
                            const currentDoM = nextDate.getDate();
                            const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
                            const actualTarget = Math.min(targetDay, daysInMonth);
                            if (currentDoM !== actualTarget) {
                                nextDate = setDate(nextDate, actualTarget);
                            }
                        }
                    }

                    if (rule.endDate) {
                        const ruleEnd = parseISO(rule.endDate);
                        if (isAfter(nextDate, ruleEnd)) {
                            break;
                        }
                    }

                    const dateStr = format(nextDate, 'yyyy-MM-dd');

                    // Check if there is already a real commitment (paid, pending OR cancelled) for this rule and date
                    // Use find to be more explicit and handle potential null comparisons
                    const hasRealCoverage = allReal.some(rc => {
                        const isSameRule = rc.recurrence_rule_id === rule.id;
                        // DEDUPLICACIÓN MEJORADA: El compromiso real cubre la ocurrencia 
                        // si coincide con la due_date original (la que la regla esperaba)
                        // O si coincide con la due_date actual (comportamiento legacy).
                        const isSameOriginalDay = rc.original_due_date === dateStr;
                        const isSameCurrentDay = rc.due_date === dateStr;
                        return isSameRule && (isSameOriginalDay || isSameCurrentDay);
                    });

                    if (!hasRealCoverage) {
                        virtualCommitments.push({
                            id: `projected-${rule.id}-${dateStr}`,
                            title: `${rule.title} (Proyectado)`,
                            amount: rule.amount,
                            dueDate: dateStr,
                            status: 'pending',
                            category: rule.category,
                            recurrenceRuleId: rule.id,
                            description: rule.description || 'Proyección Recurrente',
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                            isProjected: true
                        });
                    }

                    nextDate = getNextDate(nextDate, rule.frequency, rule.interval);
                }
            }

            // Combine only non-cancelled real with new virtuals
            const finalMap = new Map<string, BudgetCommitment>();
            realCommitments.forEach(rc => finalMap.set(rc.id, rc));
            virtualCommitments.forEach(vc => finalMap.set(vc.id, vc));

            return Array.from(finalMap.values()).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        }

        return realCommitments;
    } catch (error) {
        console.error('Error fetching commitments:', error);
        throw error;
    }
}

/** Obtiene compromisos pendientes vencidos (últimos 3 meses) */
export async function getOverduePendingCommitments(beforeDate: string): Promise<BudgetCommitment[]> {
    try {
        const horizonDate = addMonths(parseISO(beforeDate), -3);
        const horizonStr = format(horizonDate, 'yyyy-MM-dd');
        const dayBefore = addDays(parseISO(beforeDate), -1);
        const dayBeforeStr = format(dayBefore, 'yyyy-MM-dd');

        const allHistory = await getCommitments(horizonStr, dayBeforeStr);

        const overdue = allHistory.filter(c => {
            if (c.isProjected) return true;
            return c.status === 'pending';
        });

        return overdue;
    } catch (error) {
        console.error('Error fetching comprehensive overdue commitments:', error);
        return [];
    }
}

/** Obtiene compromisos vinculados a una transacción específica (ej. un BudgetExecutionLog) */
export async function getCommitmentsByTransaction(transactionId: string): Promise<BudgetCommitment[]> {
    try {
        const { data: rows, error } = await supabase
            .from('budget_commitments')
            .select('*')
            .eq('transaction_id', transactionId)
            .order('due_date', { ascending: true });

        if (error) throw error;
        return (rows || []).map((row: any) => mapCommitmentFromRow(row));
    } catch (error) {
        console.error('Error fetching grouped commitments:', error);
        return [];
    }
}

/** Agrega un nuevo compromiso */
export async function addCommitment(commitment: Omit<BudgetCommitment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
        const now = Date.now();
        const { data, error } = await supabase
            .from('budget_commitments')
            .insert({
                title: commitment.title,
                amount: commitment.amount,
                due_date: commitment.dueDate,
                parsed_due_date: commitment.dueDate, // Sync parsed_due_date
                status: commitment.status,
                paid_date: commitment.paidDate || null,
                parsed_paid_date: commitment.paidDate || null, // Sync parsed_paid_date
                category: commitment.category,
                description: commitment.description || null,
                recurrence_rule_id: commitment.recurrenceRuleId || null,
                transaction_id: commitment.transactionId || null,
                provider_name: commitment.providerName || null,
                contact_info: commitment.contactInfo || null,
                is_projected: commitment.isProjected || false,
                original_due_date: commitment.originalDueDate || null,
                created_at: now,
                updated_at: now,
            })
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error('Error adding commitment:', error);
        throw error;
    }
}

/** Actualiza un compromiso existente */
export async function updateCommitment(id: string, updates: Partial<BudgetCommitment>): Promise<void> {
    try {
        const mapped: any = { updated_at: Date.now() };
        if (updates.title !== undefined) mapped.title = updates.title;
        if (updates.amount !== undefined) mapped.amount = updates.amount;
        if (updates.dueDate !== undefined) {
            mapped.due_date = updates.dueDate;
            mapped.parsed_due_date = updates.dueDate; // Sync parsed_due_date
        }
        if (updates.status !== undefined) mapped.status = updates.status;
        // Campos nulleables: usar 'in' para detectar intención de limpiar (undefined → null)
        if ('paidDate' in updates) {
            mapped.paid_date = updates.paidDate ?? null;
            mapped.parsed_paid_date = updates.paidDate ?? null;
        }
        if (updates.category !== undefined) mapped.category = updates.category;
        if ('description' in updates) mapped.description = updates.description ?? null;
        if ('recurrenceRuleId' in updates) mapped.recurrence_rule_id = updates.recurrenceRuleId ?? null;
        if ('transactionId' in updates) mapped.transaction_id = updates.transactionId ?? null;
        if ('providerName' in updates) mapped.provider_name = updates.providerName ?? null;
        if ('contactInfo' in updates) mapped.contact_info = updates.contactInfo ?? null;
        if (updates.isProjected !== undefined) mapped.is_projected = updates.isProjected;
        if ('originalDueDate' in updates) mapped.original_due_date = updates.originalDueDate ?? null;

        const { error } = await supabase
            .from('budget_commitments')
            .update(mapped)
            .eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error('Error updating commitment:', error);
        throw error;
    }
}

/** Elimina un compromiso */
export async function deleteCommitment(id: string): Promise<void> {
    try {
        const { error } = await supabase
            .rpc('delete_budget_commitment', { target_id: id });
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting commitment:', error);
        throw error;
    }
}

/** Cancela un compromiso proyectado (crea un registro real con status 'cancelled') */
export async function cancelProjectedCommitment(ruleId: string, dueDate: string): Promise<void> {
    try {
        // 1. Fetch rule info to mirror it
        const { data: ruleRow, error: ruleError } = await supabase
            .from('budget_recurring_rules')
            .select('*')
            .eq('id', ruleId)
            .single();
        
        if (ruleError) throw ruleError;
        const rule = mapRuleFromRow(ruleRow);

        // 2. Create a REAL commitment with status 'cancelled'
        await addCommitment({
            title: rule.title,
            amount: rule.amount,
            dueDate: dueDate,
            status: 'cancelled' as any,
            category: rule.category,
            recurrenceRuleId: ruleId,
            description: 'Instancia de recurrencia cancelada individualmente'
        });
    } catch (error) {
        console.error('Error cancelling projected commitment:', error);
        throw error;
    }
}
