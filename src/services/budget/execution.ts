/**
 * Budget Execution — Logs de ejecución y disponibilidad semanal
 */
import { supabase } from '../supabaseClient';
import { BudgetExecutionLog, WeeklyAvailability, BudgetCommitment } from '../../types/budget';
import { format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { mapCommitmentFromRow } from './mappers';

// ============================================
// Execution Logs
// ============================================

/** Agrega un log de ejecución */
export async function addExecutionLog(log: Omit<BudgetExecutionLog, 'id'>): Promise<string> {
    try {
        const { data, error } = await supabase
            .from('budget_execution_logs')
            .insert({
                execution_date: log.executionDate,
                week_start_date: log.weekStartDate,
                initial_state: log.initialState,
                total_paid: log.totalPaid,
                final_balance: log.finalBalance,
                items_count: log.itemsCount,
            })
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error('Error adding execution log:', error);
        throw error;
    }
}

/** Obtiene todos los logs de ejecución */
export async function getExecutionLogs(): Promise<BudgetExecutionLog[]> {
    try {
        const { data, error } = await supabase
            .from('budget_execution_logs')
            .select('*')
            .order('execution_date', { ascending: false });
        if (error) throw error;
        return (data || []).map((row: any) => ({
            id: row.id,
            executionDate: row.execution_date,
            weekStartDate: row.week_start_date,
            initialState: row.initial_state,
            totalPaid: Number(row.total_paid),
            finalBalance: Number(row.final_balance),
            itemsCount: row.items_count,
        }));
    } catch (error) {
        console.error('Error fetching execution logs:', error);
        return [];
    }
}

/** Obtiene un log específico por ID */
export async function getExecutionLogById(id: string): Promise<BudgetExecutionLog | null> {
    try {
        const { data, error } = await supabase
            .from('budget_execution_logs')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return {
             id: data.id,
             executionDate: data.execution_date,
             weekStartDate: data.week_start_date,
             initialState: data.initial_state,
             totalPaid: Number(data.total_paid),
             finalBalance: Number(data.final_balance),
             itemsCount: data.items_count,
        };
    } catch (error) {
        console.error('Error fetching execution log:', error);
        return null;
    }
}

/** Elimina un log de ejecución */
export async function deleteExecutionLog(id: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('budget_execution_logs')
            .delete()
            .eq('id', id);
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting execution log:', error);
        throw error;
    }
}

// ============================================
// Weekly Availability
// ============================================

/** Obtiene la disponibilidad semanal para una fecha de inicio de semana */
export async function getWeeklyAvailability(weekStartDate: string): Promise<WeeklyAvailability | null> {
    try {
        const { data, error } = await supabase
            .from('budget_weekly_availability')
            .select('*')
            .eq('week_start_date', weekStartDate)
            .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return {
            id: data.id,
            weekStartDate: data.week_start_date,
            ctaCorriente: Number(data.cta_corriente),
            ctaAhorrosJ: Number(data.cta_ahorros_j),
            ctaAhorrosN: Number(data.cta_ahorros_n),
            ctaNequi: Number(data.cta_nequi),
            otrosIngresos: Number(data.otros_ingresos),
            efectivo: Number(data.efectivo),
            totalAvailable: Number(data.total_available),
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    } catch (error) {
        console.error('Error fetching availability:', error);
        return null;
    }
}

/** Guarda o actualiza la disponibilidad semanal */
export async function saveWeeklyAvailability(data: Omit<WeeklyAvailability, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
        const existing = await getWeeklyAvailability(data.weekStartDate);
        const now = Date.now();

        if (existing) {
            const { error } = await supabase
                .from('budget_weekly_availability')
                .update({
                    cta_corriente: data.ctaCorriente,
                    cta_ahorros_j: data.ctaAhorrosJ,
                    cta_ahorros_n: data.ctaAhorrosN,
                    cta_nequi: data.ctaNequi,
                    otros_ingresos: data.otrosIngresos,
                    efectivo: data.efectivo,
                    total_available: data.totalAvailable,
                    updated_at: now,
                })
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('budget_weekly_availability')
                .insert({
                    week_start_date: data.weekStartDate,
                    cta_corriente: data.ctaCorriente,
                    cta_ahorros_j: data.ctaAhorrosJ,
                    cta_ahorros_n: data.ctaAhorrosN,
                    cta_nequi: data.ctaNequi,
                    otros_ingresos: data.otrosIngresos,
                    efectivo: data.efectivo,
                    total_available: data.totalAvailable,
                    created_at: now,
                    updated_at: now,
                });
            if (error) throw error;
        }
    } catch (error) {
        console.error('Error saving availability:', error);
        throw error;
    }
}

// ============================================
// Reconciliation
// ============================================

/** Reconcilia el log del día actual si hay pagos sin registrar */
export async function reconcileTodayLog(): Promise<string | null> {
    try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const startOfWeekStr = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

        // 1. Check existing log
        const existingLogs = await getExecutionLogs();
        const todayLog = existingLogs.find(l => {
            const logDate = parseISO(l.executionDate);
            return isSameDay(logDate, new Date());
        });

        if (todayLog) {
            console.log("Log for today already exists.");
            return 'exists';
        }

        // 2. Find payments made TODAY
        const { data: paidRows, error: paidError } = await supabase
            .from('budget_commitments')
            .select('*')
            .eq('status', 'paid');
        if (paidError) throw paidError;

        const paidItems = (paidRows || [])
            .map((row: any) => mapCommitmentFromRow(row))
            .filter((item: BudgetCommitment) => {
                if (!item.paidDate) return false;
                return item.paidDate.startsWith(todayStr);
            });

        console.log(`Filtered to ${paidItems.length} items paid explicitly on ${todayStr}.`);

        if (paidItems.length === 0) {
            console.log("No payments made today found (after filter).");
            return 'no_payments';
        }

        const totalPaid = paidItems.reduce((sum: number, item: BudgetCommitment) => sum + item.amount, 0);
        const itemsCount = paidItems.length;

        // 3. Get Current Accounts State (Snapshot)
        const availability = await getWeeklyAvailability(startOfWeekStr);

        const currentCtaCorriente = availability?.ctaCorriente || 0;
        const currentCtaAhorrosJ = availability?.ctaAhorrosJ || 0;
        const currentCtaAhorrosN = availability?.ctaAhorrosN || 0;
        const currentCtaNequi = availability?.ctaNequi || 0;
        const currentOtrosIngresos = availability?.otrosIngresos || 0;
        const currentEfectivo = availability?.efectivo || 0;

        const currentTotal = availability?.totalAvailable || (currentCtaCorriente + currentCtaAhorrosJ + currentCtaAhorrosN + currentCtaNequi + currentOtrosIngresos + currentEfectivo);
        const reconstructedInitialTotal = currentTotal + totalPaid;

        const log: Omit<BudgetExecutionLog, 'id'> = {
            executionDate: new Date().toISOString(),
            weekStartDate: startOfWeekStr,
            initialState: {
                ctaCorriente: currentCtaCorriente,
                ctaAhorrosJ: currentCtaAhorrosJ,
                ctaAhorrosN: currentCtaAhorrosN,
                ctaNequi: currentCtaNequi,
                otrosIngresos: currentOtrosIngresos,
                efectivo: currentEfectivo,
                totalAvailable: reconstructedInitialTotal
            },
            totalPaid: totalPaid,
            finalBalance: currentTotal,
            itemsCount: itemsCount
        };

        return await addExecutionLog(log);

    } catch (error) {
        console.error('Error reconciling log:', error);
        throw error;
    }
}

/** Recalcula los totales de una transacción luego de añadir/remover pagos vinculados */
export async function syncExecutionLogTotals(transactionId: string): Promise<void> {
    try {
        // 1. Obtener todos los compromisos vinculados a este log
        const { data: commitments, error: cError } = await supabase
            .from('budget_commitments')
            .select('amount')
            .eq('transaction_id', transactionId);

        if (cError) throw cError;

        const totalPaid = (commitments || []).reduce((sum, item) => sum + Number(item.amount), 0);
        const itemsCount = (commitments || []).length;

        // 2. Obtener el log actual
        const { data: log, error: logError } = await supabase
            .from('budget_execution_logs')
            .select('initial_state')
            .eq('id', transactionId)
            .single();

        if (logError) throw logError;
        
        let initialTotal = 0;
        if (log && log.initial_state && typeof log.initial_state === 'object') {
            const state = log.initial_state as any;
            initialTotal = state.totalAvailable || 0;
        }

        const finalBalance = initialTotal - totalPaid;

        // 3. Actualizar el log
        const { error: updateError } = await supabase
            .from('budget_execution_logs')
            .update({
                total_paid: totalPaid,
                items_count: itemsCount,
                final_balance: finalBalance
            })
            .eq('id', transactionId);

        if (updateError) throw updateError;
        
    } catch (error) {
        console.error('Error synchronizing execution log totals:', error);
        throw error;
    }
}
