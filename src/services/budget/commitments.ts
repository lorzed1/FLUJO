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

        const realCommitments: BudgetCommitment[] = (rows || []).map((row: any) => mapCommitmentFromRow(row));

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
            const consumedRealIds = new Set<string>();

            for (const rule of rules) {
                if (!rule.active) continue;

                let nextDate = parseISO(rule.startDate);

                while (isBefore(nextDate, start)) {
                    nextDate = getNextDate(nextDate, rule.frequency, rule.interval);
                }

                while (isBefore(nextDate, end) || isSameDay(nextDate, end)) {
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

                    const candidates = realCommitments.filter(rc =>
                        rc.recurrenceRuleId === rule.id && !consumedRealIds.has(rc.id)
                    );

                    let bestMatch: BudgetCommitment | null = null;
                    let minDiff = Infinity;
                    const thresholdDays = rule.frequency === 'weekly' ? 6 : 25;

                    for (const candidate of candidates) {
                        const candidateDate = parseISO(candidate.dueDate);
                        const diff = Math.abs(candidateDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24);
                        if (diff <= thresholdDays && diff < minDiff) {
                            minDiff = diff;
                            bestMatch = candidate;
                        }
                    }

                    if (bestMatch) {
                        consumedRealIds.add(bestMatch.id);
                    } else {
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

            // --- AGGRESSIVE DEDUPLICATION ---
            const finalVirtuals = virtualCommitments.filter(vc => {
                const vcDate = parseISO(vc.dueDate);
                const hasCoverage = realCommitments.some(rc => {
                    if (rc.recurrenceRuleId !== vc.recurrenceRuleId) return false;
                    const rcDate = parseISO(rc.dueDate);
                    const diffVal = Math.abs(rcDate.getTime() - vcDate.getTime()) / (1000 * 60 * 60 * 24);
                    return diffVal <= 3;
                });
                return !hasCoverage;
            });

            // FINAL DEDUPLICATION BY ID AND SIGNATURE
            const uniqueMap = new Map<string, BudgetCommitment>();
            const signatureSet = new Set<string>();

            realCommitments.forEach(rc => {
                uniqueMap.set(rc.id, rc);
                if (rc.recurrenceRuleId) {
                    signatureSet.add(`${rc.recurrenceRuleId}-${rc.dueDate}`);
                }
            });

            finalVirtuals.forEach(vc => {
                const key = `${vc.recurrenceRuleId}-${vc.dueDate}`;
                if (!signatureSet.has(key)) {
                    uniqueMap.set(vc.id, vc);
                    signatureSet.add(key);
                }
            });

            return Array.from(uniqueMap.values()).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
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
                provider_name: commitment.providerName || null,
                contact_info: commitment.contactInfo || null,
                is_projected: commitment.isProjected || false,
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
        if (updates.paidDate !== undefined) {
            mapped.paid_date = updates.paidDate;
            mapped.parsed_paid_date = updates.paidDate; // Sync parsed_paid_date
        }
        if (updates.category !== undefined) mapped.category = updates.category;
        if (updates.description !== undefined) mapped.description = updates.description;
        if (updates.recurrenceRuleId !== undefined) mapped.recurrence_rule_id = updates.recurrenceRuleId;
        if (updates.providerName !== undefined) mapped.provider_name = updates.providerName;
        if (updates.contactInfo !== undefined) mapped.contact_info = updates.contactInfo;
        if (updates.isProjected !== undefined) mapped.is_projected = updates.isProjected;

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
        const { error } = await supabase.from('budget_commitments').delete().eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting commitment:', error);
        throw error;
    }
}
