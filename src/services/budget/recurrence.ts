/**
 * Budget Recurrence Rules — CRUD y generación de reglas recurrentes
 */
import { supabase } from '../supabaseClient';
import { BudgetCommitment, RecurrenceRule, BudgetStatus, RecurrenceFrequency } from '../../types/budget';
import { addMonths, format, isBefore, parseISO, getDay } from 'date-fns';
import { mapRuleFromRow, getNextDate } from './mappers';
import { addCommitment } from './commitments';

// ============================================
// CRUD
// ============================================

/** Obtiene todas las reglas de recurrencia */
export async function getRecurrenceRules(): Promise<RecurrenceRule[]> {
    try {
        const { data, error } = await supabase.from('budget_recurring_rules').select('*');
        if (error) throw error;
        return (data || []).map((row: any) => mapRuleFromRow(row));
    } catch (error) {
        console.error('Error fetching rules:', error);
        throw error;
    }
}

/** Agrega una nueva regla de recurrencia */
export async function addRecurrenceRule(rule: Omit<RecurrenceRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
        if (!rule.title || rule.title.trim() === '') {
            throw new Error("Cannot create rule: Title is required.");
        }
        if (rule.amount === undefined || rule.amount === null) {
            throw new Error("Cannot create rule: Amount is required.");
        }

        const now = Date.now();
        const { data, error } = await supabase
            .from('budget_recurring_rules')
            .insert({
                title: rule.title,
                amount: rule.amount,
                frequency: rule.frequency,
                interval_count: rule.interval || 1,
                day_to_send: rule.dayToSend,
                start_date: rule.startDate,
                end_date: rule.endDate || null,
                category: rule.category,
                description: rule.description || null,
                active: rule.active,
                last_generated_date: rule.lastGeneratedDate || null,
                created_at: now,
                updated_at: now,
            })
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error('Error adding rule:', error);
        throw error;
    }
}

/** Actualiza una regla de recurrencia existente */
export async function updateRecurrenceRule(id: string, updates: Partial<RecurrenceRule>): Promise<void> {
    try {
        const mapped: any = { updated_at: Date.now() };
        if (updates.title !== undefined) mapped.title = updates.title;
        if (updates.amount !== undefined) mapped.amount = updates.amount;
        if (updates.frequency !== undefined) mapped.frequency = updates.frequency;
        if (updates.interval !== undefined) mapped.interval_count = updates.interval;
        if (updates.dayToSend !== undefined) mapped.day_to_send = updates.dayToSend;
        if (updates.startDate !== undefined) mapped.start_date = updates.startDate;
        if (updates.endDate !== undefined) mapped.end_date = updates.endDate;
        if (updates.category !== undefined) mapped.category = updates.category;
        if (updates.description !== undefined) mapped.description = updates.description;
        if (updates.active !== undefined) mapped.active = updates.active;
        if (updates.lastGeneratedDate !== undefined) mapped.last_generated_date = updates.lastGeneratedDate;

        const { error } = await supabase.from('budget_recurring_rules').update(mapped).eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error('Error updating rule:', error);
        throw error;
    }
}

/** Elimina una regla y sus compromisos pendientes asociados */
export async function deleteRecurrenceRule(id: string): Promise<void> {
    try {
        // 1. Delete all PENDING commitments associated with this rule
        const { error: delCommError } = await supabase
            .from('budget_commitments')
            .delete()
            .eq('recurrence_rule_id', id)
            .eq('status', 'pending');
        if (delCommError) throw delCommError;

        // 2. Delete the rule itself
        const { error: delRuleError } = await supabase
            .from('budget_recurring_rules')
            .delete()
            .eq('id', id);
        if (delRuleError) throw delRuleError;
    } catch (error) {
        console.error('Error deleting rule and associated pending commitments:', error);
        throw error;
    }
}

// ============================================
// Orchestration
// ============================================

/** Crea un compromiso y, si es recurrente, establece la regla y genera proyecciones futuras */
export async function createEntryWithRecurrence(data: {
    title: string;
    amount: number;
    date: string;
    category: string;
    status: BudgetStatus;
    isRecurring: boolean;
    frequency?: RecurrenceFrequency;
}): Promise<void> {
    try {
        const now = Date.now();

        if (!data.isRecurring || !data.frequency) {
            await addCommitment({
                title: data.title,
                amount: data.amount,
                dueDate: data.date,
                status: data.status,
                category: data.category,
            });
            return;
        }

        // 1. Create recurrence rule first
        const startDate = parseISO(data.date);
        const ruleId = await addRecurrenceRule({
            title: data.title,
            amount: data.amount,
            frequency: data.frequency,
            dayToSend: data.frequency === 'weekly' ? startDate.getDay() : startDate.getDate(),
            startDate: data.date,
            category: data.category,
            active: true,
            lastGeneratedDate: data.date,
        });

        // 2. Create first commitment
        await addCommitment({
            title: data.title,
            amount: data.amount,
            dueDate: data.date,
            status: data.status,
            category: data.category,
            recurrenceRuleId: ruleId,
        });

        // 3. Generate future commitments (up to 6 months)
        const futureLimit = addMonths(new Date(), 6);
        let nextDate = getNextDate(startDate, data.frequency);
        let lastGeneratedDate = data.date;

        const futureBatch: any[] = [];
        while (isBefore(nextDate, futureLimit) || nextDate.getTime() === futureLimit.getTime()) {
            futureBatch.push({
                title: data.title,
                amount: data.amount,
                due_date: format(nextDate, 'yyyy-MM-dd'),
                parsed_due_date: format(nextDate, 'yyyy-MM-dd'), // Sync parsed_due_date
                status: 'pending',
                category: data.category,
                recurrence_rule_id: ruleId,
                description: 'Generado automáticamente por regla de recurrencia',
                created_at: now,
                updated_at: now,
            });

            lastGeneratedDate = format(nextDate, 'yyyy-MM-dd');
            nextDate = getNextDate(nextDate, data.frequency);
        }

        if (futureBatch.length > 0) {
            const { error } = await supabase.from('budget_commitments').insert(futureBatch);
            if (error) throw error;
        }

        // Update rule with last generated date
        await updateRecurrenceRule(ruleId, { lastGeneratedDate });

    } catch (error) {
        console.error('Error creating entry with recurrence:', error);
        throw error;
    }
}

/** Genera compromisos futuros a partir de reglas activas */
export async function generateFromRules(futureLimitDate: string, specificRuleId?: string): Promise<void> {
    try {
        let rules: RecurrenceRule[] = [];

        if (specificRuleId) {
            const { data, error } = await supabase
                .from('budget_recurring_rules')
                .select('*')
                .eq('id', specificRuleId)
                .maybeSingle();
            if (error) throw error;
            if (data) rules = [mapRuleFromRow(data)];
        } else {
            rules = await getRecurrenceRules();
        }

        const limitDate = parseISO(futureLimitDate);
        const now = Date.now();
        const toInsert: any[] = [];
        const ruleUpdates: { id: string; lastGeneratedDate: string }[] = [];

        for (const rule of rules) {
            if (!rule.active) continue;

            let nextDate = rule.lastGeneratedDate
                ? parseISO(rule.lastGeneratedDate)
                : parseISO(rule.startDate);

            nextDate = getNextDate(nextDate, rule.frequency);
            let newLastGenerated = rule.lastGeneratedDate;

            while (isBefore(nextDate, limitDate) || nextDate.getTime() === limitDate.getTime()) {
                toInsert.push({
                    title: rule.title,
                    amount: rule.amount,
                    due_date: format(nextDate, 'yyyy-MM-dd'),
                    parsed_due_date: format(nextDate, 'yyyy-MM-dd'), // Sync parsed_due_date
                    status: 'pending',
                    category: rule.category,
                    recurrence_rule_id: rule.id,
                    description: 'Generado automáticamente por regla de recurrencia',
                    created_at: now,
                    updated_at: now,
                });

                newLastGenerated = format(nextDate, 'yyyy-MM-dd');
                nextDate = getNextDate(nextDate, rule.frequency);
            }

            if (newLastGenerated !== rule.lastGeneratedDate) {
                ruleUpdates.push({ id: rule.id, lastGeneratedDate: newLastGenerated! });
            }
        }

        if (toInsert.length > 0) {
            // Insert in batches of 500
            for (let i = 0; i < toInsert.length; i += 500) {
                const batch = toInsert.slice(i, i + 500);
                const { error } = await supabase.from('budget_commitments').insert(batch);
                if (error) throw error;
            }
            console.log(`Generados ${toInsert.length} nuevos compromisos.`);
        }

        for (const upd of ruleUpdates) {
            await updateRecurrenceRule(upd.id, { lastGeneratedDate: upd.lastGeneratedDate });
        }

    } catch (error) {
        console.error('Error in generateFromRules:', error);
        throw error;
    }
}

// ============================================
// Seed & Reset
// ============================================

/** Semilla de gastos recurrentes iniciales para setup del negocio */
export async function seedRecurringExpenses(): Promise<void> {
    try {
        const now = Date.now();
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();

        const rulesToInsert: any[] = [];

        const createRule = (
            title: string,
            amount: number,
            category: string,
            freq: RecurrenceFrequency,
            day: number,
            interval: number = 1,
            desc: string = ''
        ) => {
            let startDate = new Date(currentYear, currentMonth, day);

            if (freq === 'weekly') {
                const today = new Date();
                const currentDay = getDay(today);
                const daysUntil = (day + 7 - currentDay) % 7;
                startDate = new Date(today);
                startDate.setDate(today.getDate() + daysUntil);
                if (daysUntil === 0) startDate.setDate(startDate.getDate() + 7);
            }

            rulesToInsert.push({
                title,
                amount,
                frequency: freq,
                interval_count: interval,
                day_to_send: day,
                start_date: format(startDate, 'yyyy-MM-dd'),
                category,
                description: desc || title,
                active: true,
                created_at: now,
                updated_at: now,
            });
        };

        // --- DATA ---
        createRule('Arrendamiento', 2482000, 'Arrendamiento', 'monthly', 12);
        createRule('Nómina Cocina (Q1)', 1019160, 'Gastos de Nómina', 'monthly', 15);
        createRule('Nómina Cocina (Q2)', 1019160, 'Gastos de Nómina', 'monthly', 30);
        createRule('Nómina Barman (Q1)', 1019160, 'Gastos de Nómina', 'monthly', 15);
        createRule('Nómina Barman (Q2)', 1019160, 'Gastos de Nómina', 'monthly', 30);
        createRule('Nómina Admon (Q1)', 4500000, 'Gastos de Nómina', 'monthly', 5);
        createRule('Nómina Admon (Q2)', 4500000, 'Gastos de Nómina', 'monthly', 20);
        createRule('Nómina David (Q1)', 150000, 'Gastos de Nómina', 'monthly', 5);
        createRule('Nómina David (Q2)', 150000, 'Gastos de Nómina', 'monthly', 20);
        createRule('Turnos y Propinas', 1600000, 'Gastos de Nómina', 'weekly', 1);
        createRule('Seguridad Social', 1560000, 'Gastos de Nómina', 'monthly', 4);
        createRule('Karaoke', 420000, 'Gastos Música', 'weekly', 1);
        createRule('Vie Musica', 350000, 'Gastos Música', 'weekly', 5);
        createRule('Sabad Musica', 300000, 'Gastos Música', 'weekly', 6, 2);
        createRule('Asesoría Financiera', 700000, 'Honorarios', 'monthly', 20);
        createRule('INC', 1000000, 'Impuestos', 'monthly', 19, 2);
        createRule('Industria y Comercio', 250000, 'Impuestos', 'monthly', 20, 2);
        createRule('Banco Agrario CR', 1150000, 'Obligaciones Financieras', 'monthly', 13);
        createRule('Banco Agrario TDC', 250000, 'Obligaciones Financieras', 'monthly', 10);
        createRule('Banco Pichincha', 1027000, 'Obligaciones Financieras', 'monthly', 22);
        createRule('Banco Finandina', 468000, 'Obligaciones Financieras', 'monthly', 16);
        createRule('A. Castaño', 1500000, 'Obligaciones Financieras', 'monthly', 15);
        createRule('Agua', 450000, 'Servicios Públicos', 'monthly', 20);
        createRule('Energía', 1000000, 'Servicios Públicos', 'monthly', 20);
        createRule('Gas', 350000, 'Servicios Públicos', 'monthly', 20);
        createRule('Internet', 170000, 'Servicios Públicos', 'monthly', 20);
        createRule('Datafonos', 350000, 'Servicios Públicos', 'monthly', 1);
        createRule('Seguros', 220000, 'Otros', 'monthly', 15);

        if (rulesToInsert.length > 0) {
            const { error } = await supabase.from('budget_recurring_rules').insert(rulesToInsert);
            if (error) throw error;
            console.log(`Seed: ${rulesToInsert.length} rules created.`);
        }

        // Generate commitments from these rules
        const futureLimit = format(addMonths(new Date(), 6), 'yyyy-MM-dd');
        await generateFromRules(futureLimit);

    } catch (error) {
        console.error('Seed error:', error);
        throw error;
    }
}

/** Elimina TODOS los datos del módulo de presupuesto (reset completo) */
export async function resetRecurringModule(): Promise<void> {
    try {
        console.log('🗑️ Resetting recurring module...');

        const { error: e1 } = await supabase.from('budget_commitments').delete().neq('id', '');
        if (e1) throw e1;

        const { error: e2 } = await supabase.from('budget_recurring_rules').delete().neq('id', '');
        if (e2) throw e2;

        const { error: e3 } = await supabase.from('budget_weekly_availability').delete().neq('id', '');
        if (e3) throw e3;

        const { error: e4 } = await supabase.from('budget_execution_logs').delete().neq('id', '');
        if (e4) throw e4;

        console.log('✅ Recurring module reset complete.');
    } catch (error) {
        console.error('Error resetting recurring module:', error);
        throw error;
    }
}
