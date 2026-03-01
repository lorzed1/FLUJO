import { supabase } from './supabaseClient';
import {
    Transaction,
    Category,
    RecurringExpense,
    RecurringExpenseOverrides,
    TransferRecord
} from '../types';

/**
 * Servicio centralizado de base de datos.
 */
export class DatabaseService {

    // ============ TRANSACCIONES ============

    /**
     * Guardar todas las transacciones (upsert inteligente)
     */
    static async saveTransactions(transactions: Transaction[]): Promise<void> {
        try {
            // 1. Obtener IDs existentes
            const { data: existingRows, error: fetchError } = await supabase
                .from('transactions')
                .select('id');
            if (fetchError) throw fetchError;

            const existingIds = new Set((existingRows || []).map((r: any) => r.id));
            const newIds = new Set(transactions.map(t => t.id));

            // 2. Eliminar los que ya no están (Hard Delete)
            const toDelete = Array.from(existingIds).filter(id => !newIds.has(id));
            if (toDelete.length > 0) {
                const { error: delError } = await supabase
                    .from('transactions')
                    .delete()
                    .in('id', toDelete);
                if (delError) throw delError;
            }

            // 3. Upsert los que están
            if (transactions.length > 0) {
                const rows = transactions.map(t => ({
                    id: t.id,
                    date: t.date,
                    parsed_date: t.date, // Required
                    original_date: t.originalDate || null,
                    description: t.description,
                    amount: t.amount,
                    type: t.type || 'expense',
                    expense_type: t.expenseType || null, // Keeping for backward compat, ideally remove later
                    category_id: t.categoryId || null,
                    is_recurring: t.isRecurring || false,
                    recurring_id: t.recurringId || null,
                    metadata: t.metadata || {},
                    status: t.status || 'completed'
                }));

                // Upsert en lotes de 500
                for (let i = 0; i < rows.length; i += 500) {
                    const batch = rows.slice(i, i + 500);
                    const { error: upsertError } = await supabase
                        .from('transactions')
                        .upsert(batch, { onConflict: 'id' });
                    if (upsertError) throw upsertError;
                }
            }

            console.log(`💾 Supabase Sync: ${transactions.length} transacciones sincronizadas`);
        } catch (error) {
            console.error('Error guardando transacciones en Supabase:', error);
            throw error;
        }
    }

    /**
     * Obtener todas las transacciones (Excluyendo borradas)
     */
    static async getTransactions(): Promise<Transaction[]> {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('date', { ascending: false })
                .range(0, 10000);

            if (error) {
                console.error('❌ Error Supabase getTransactions:', error);
                throw error;
            }

            console.log(`📊 DEBUG DatabaseService: Bajadas ${data?.length || 0} filas de Supabase.`);

            return (data || []).map((row: any) => ({
                id: row.id,
                date: row.date,
                originalDate: row.original_date,
                description: row.description,
                amount: Number(row.amount),
                type: row.type,
                expenseType: row.expense_type,
                categoryId: row.category_id,
                isRecurring: row.is_recurring,
                recurringId: row.recurring_id,
                metadata: row.metadata,
                status: row.status,
            }));
        } catch (error) {
            console.error('Error obteniendo transacciones:', error);
            throw error;
        }
    }

    // ============ CATEGORÍAS ============

    static async saveCategories(categories: Category[]): Promise<void> {
        try {
            // Upsert categories
            if (categories.length > 0) {
                const rows = categories.map(c => ({
                    id: c.id,
                    name: c.name,
                    type: c.type,
                }));
                const { error } = await supabase.from('categories').upsert(rows);
                if (error) throw error;
            }
        } catch (error) {
            console.error('Error guardando categorías:', error);
            throw error;
        }
    }

    static async getCategories(): Promise<Category[]> {
        try {
            const { data, error } = await supabase.from('categories').select('*');
            if (error) throw error;
            return (data || []).map((row: any) => ({
                id: row.id,
                name: row.name,
                type: row.type,
            }));
        } catch (error) {
            console.error('Error obteniendo categorías:', error);
            throw error;
        }
    }

    // ============ GASTOS RECURRENTES ============

    static async saveRecurringExpenses(expenses: RecurringExpense[]): Promise<void> {
        try {
            if (expenses.length > 0) {
                const rows = expenses.map(e => ({
                    id: e.id,
                    start_date: e.startDate,
                    description: e.description,
                    amount: e.amount,
                    frequency: e.frequency,
                    day_of_month: e.dayOfMonth || null,
                    day_of_week: e.dayOfWeek ?? null,
                    expense_type: e.expenseType,
                    category_id: e.categoryId,
                }));
                const { error } = await supabase.from('recurring_expenses').upsert(rows);
                if (error) throw error;
            }
        } catch (error) {
            console.error('Error guardando gastos recurrentes:', error);
            throw error;
        }
    }

    static async getRecurringExpenses(): Promise<RecurringExpense[]> {
        try {
            const { data, error } = await supabase.from('recurring_expenses').select('*');
            if (error) throw error;
            return (data || []).map((row: any) => ({
                id: row.id,
                startDate: row.start_date,
                description: row.description,
                amount: Number(row.amount),
                frequency: row.frequency,
                dayOfMonth: row.day_of_month,
                dayOfWeek: row.day_of_week,
                expenseType: row.expense_type,
                categoryId: row.category_id,
            }));
        } catch (error) {
            console.error('Error obteniendo gastos recurrentes:', error);
            throw error;
        }
    }

    // ============ OVERRIDES (SETTINGS) ============

    static async saveRecurringOverrides(overrides: RecurringExpenseOverrides): Promise<void> {
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({ key: 'recurringOverrides', data: overrides, updated_at: new Date().toISOString() }, { onConflict: 'key' });
            if (error) throw error;
        } catch (error) {
            console.error('Error guardando overrides:', error);
            throw error;
        }
    }

    static async getRecurringOverrides(): Promise<RecurringExpenseOverrides> {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('data')
                .eq('key', 'recurringOverrides')
                .maybeSingle();
            if (error) throw error;
            return (data?.data as RecurringExpenseOverrides) || {};
        } catch (error) {
            console.error('Error obteniendo overrides:', error);
            throw error;
        }
    }

    static async saveRecordedDays(days: Set<string>): Promise<void> {
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({ key: 'recordedDays', data: Array.from(days), updated_at: new Date().toISOString() }, { onConflict: 'key' });
            if (error) throw error;
        } catch (error) {
            console.error('Error guardando días registrados:', error);
            throw error;
        }
    }

    static async getRecordedDays(): Promise<string[]> {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('data')
                .eq('key', 'recordedDays')
                .maybeSingle();
            if (error) throw error;
            return (data?.data as string[]) || [];
        } catch (error) {
            console.error('Error obteniendo días registrados:', error);
            throw error;
        }
    }

    // ============ MAPEOS DE CUENTAS ============

    static async saveAccountMappings(mappings: any[]): Promise<void> {
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({ key: 'accountMappings', data: mappings, updated_at: new Date().toISOString() }, { onConflict: 'key' });
            if (error) throw error;
        } catch (error) {
            console.error('Error guardando mapeos de cuentas:', error);
            throw error;
        }
    }

    static async getAccountMappings(): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('data')
                .eq('key', 'accountMappings')
                .maybeSingle();
            if (error) throw error;
            return (data?.data as any[]) || [];
        } catch (error) {
            console.error('Error obteniendo mapeos de cuentas:', error);
            throw error;
        }
    }

    // ============ EXTRACTOS Y CONCILIACIÓN ============

    static async saveBankTransactions(bankData: Record<string, Transaction[]>): Promise<void> {
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({ key: 'bankTransactions', data: bankData, updated_at: new Date().toISOString() }, { onConflict: 'key' });
            if (error) throw error;
        } catch (error) {
            console.error('Error guardando extractos bancarios:', error);
            throw error;
        }
    }

    static async getBankTransactions(): Promise<Record<string, Transaction[]>> {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('data')
                .eq('key', 'bankTransactions')
                .maybeSingle();
            if (error) throw error;
            return (data?.data as Record<string, Transaction[]>) || {};
        } catch (error) {
            console.error('Error obteniendo extractos bancarios:', error);
            throw error;
        }
    }


    static async saveReconciliationResults(results: Record<string, any>): Promise<void> {
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({ key: 'reconciliationResults', data: results, updated_at: new Date().toISOString() }, { onConflict: 'key' });
            if (error) throw error;
        } catch (error) {
            console.error('Error guardando resultados de conciliación:', error);
            throw error;
        }
    }

    static async getReconciliationResults(): Promise<Record<string, any>> {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('data')
                .eq('key', 'reconciliationResults')
                .maybeSingle();
            if (error) throw error;
            return (data?.data as Record<string, any>) || {};
        } catch (error) {
            console.error('Error obteniendo resultados de conciliación:', error);
            throw error;
        }
    }


    // ============ ARQUEOS (UPDATED) ============

    static async saveArqueo(arqueo: any): Promise<string> {
        try {
            const row = {
                fecha: arqueo.fecha,
                parsed_date: arqueo.fecha, // REQUIRED: Fill parsed_date
                cajero: arqueo.cajero || '',
                venta_pos: arqueo.ventaPos || 0,
                venta_sc: arqueo.venta_sc ?? null,
                propina: arqueo.propina || 0,
                efectivo: arqueo.efectivo || 0,
                datafono_david: arqueo.datafonoDavid || 0,
                datafono_julian: arqueo.datafonoJulian || 0,
                transf_bancolombia: arqueo.transfBancolombia || 0,
                nequi: arqueo.nequi || 0,
                rappi: arqueo.rappi || 0,
                ingreso_covers: arqueo.ingresoCovers || 0,
                visitas: arqueo.visitas || 0,
                numero_transacciones: arqueo.numeroTransacciones ?? null,
                total_recaudado: arqueo.totalRecaudado || 0,
                descuadre: arqueo.descuadre || 0,
                // These might be redundant if we fully move to arqueo_details, but keeping for compatibility
                base_detail: arqueo.baseDetail || null,
                cuadre_detail: arqueo.cuadreDetail || null,
                total_ingresos: arqueo.totalIngresos ?? null
            };

            const query = supabase.from('arqueos');
            let result;

            if (arqueo.id && !arqueo.id.startsWith('temp-')) {
                result = await query.upsert({ ...row, id: arqueo.id }).select('id').single();
            } else {
                result = await query.insert(row).select('id').single();
            }

            const { data, error } = result;

            if (error) throw error;
            console.log('✅ Arqueo guardado con ID:', data.id);
            return data.id;
        } catch (error) {
            console.error('❌ Error en saveArqueo:', error);
            throw error;
        }
    }

    static async getArqueos(): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('arqueos')
                .select('*')
                .order('fecha', { ascending: false });

            if (error) throw error;

            return (data || []).map((row: any) => ({
                id: row.id,
                fecha: row.fecha, // Keeping original text date
                parsedDate: row.parsed_date, // Exposing new date
                cajero: row.cajero,
                ventaPos: Number(row.venta_pos),
                venta_sc: row.venta_sc != null ? Number(row.venta_sc) : undefined,
                propina: Number(row.propina),
                efectivo: Number(row.efectivo),
                datafonoDavid: Number(row.datafono_david),
                datafonoJulian: Number(row.datafono_julian),
                transfBancolombia: Number(row.transf_bancolombia),
                nequi: Number(row.nequi),
                rappi: Number(row.rappi),
                ingresoCovers: Number(row.ingreso_covers),
                visitas: row.visitas,
                numeroTransacciones: row.numero_transacciones,
                totalRecaudado: Number(row.total_recaudado),
                descuadre: Number(row.descuadre),
                baseDetail: row.base_detail,
                cuadreDetail: row.cuadre_detail,
                totalIngresos: row.total_ingresos != null ? Number(row.total_ingresos) : undefined,
                createdAt: row.created_at,
            }));
        } catch (error) {
            console.error('Error obteniendo arqueos:', error);
            return [];
        }
    }

    static async updateArqueo(id: string, updates: any): Promise<void> {
        try {
            const mapped: any = {};
            if (updates.fecha !== undefined) {
                mapped.fecha = updates.fecha;
                mapped.parsed_date = updates.fecha; // Sync parsed_date
            }
            if (updates.cajero !== undefined) mapped.cajero = updates.cajero;
            if (updates.ventaPos !== undefined) mapped.venta_pos = updates.ventaPos;
            if (updates.venta_sc !== undefined) mapped.venta_sc = updates.venta_sc;
            if (updates.propina !== undefined) mapped.propina = updates.propina;
            if (updates.efectivo !== undefined) mapped.efectivo = updates.efectivo;
            if (updates.datafonoDavid !== undefined) mapped.datafono_david = updates.datafonoDavid;
            if (updates.datafonoJulian !== undefined) mapped.datafono_julian = updates.datafonoJulian;
            if (updates.transfBancolombia !== undefined) mapped.transf_bancolombia = updates.transfBancolombia;
            if (updates.nequi !== undefined) mapped.nequi = updates.nequi;
            if (updates.rappi !== undefined) mapped.rappi = updates.rappi;
            if (updates.ingresoCovers !== undefined) mapped.ingreso_covers = updates.ingresoCovers;
            if (updates.visitas !== undefined) mapped.visitas = updates.visitas;
            if (updates.numeroTransacciones !== undefined) mapped.numero_transacciones = updates.numeroTransacciones;
            if (updates.totalRecaudado !== undefined) mapped.total_recaudado = updates.totalRecaudado;
            if (updates.descuadre !== undefined) mapped.descuadre = updates.descuadre;
            // JSON fields
            if (updates.baseDetail !== undefined) mapped.base_detail = updates.baseDetail;
            if (updates.cuadreDetail !== undefined) mapped.cuadre_detail = updates.cuadreDetail;
            if (updates.totalIngresos !== undefined) mapped.total_ingresos = updates.totalIngresos;

            const { error } = await supabase
                .from('arqueos')
                .update(mapped)
                .eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error('Error actualizando arqueo:', error);
            throw error;
        }
    }

    static async deleteArqueo(id: string): Promise<void> {
        try {
            // Utilizando Hard Delete (Borrado permanente)
            const { error } = await supabase
                .from('arqueos')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error eliminando arqueo:', error);
            throw error;
        }
    }

    // ============ TRANSFERENCIAS (UPDATED TO USE TRANSACTIONS) ============

    static async saveTransfer(transfer: TransferRecord): Promise<void> {
        try {
            if (!transfer.id || !transfer.amount || !transfer.type) {
                console.warn('⚠️ Intento de guardar transferencia inválida:', transfer);
                return;
            }

            // Map to Transactions table structure
            const row = {
                id: transfer.id,
                date: transfer.date,
                parsed_date: transfer.date,
                amount: transfer.amount,
                type: 'transfer', // Main type
                transfer_type: transfer.type, // Subtype (nequi, bancolombia, etc)
                transfer_reference: transfer.reference || null,
                description: transfer.description,
                arqueo_id: transfer.arqueoId || null,
                created_at: transfer.createdAt,
                status: 'completed'
            };

            const { error } = await supabase
                .from('transactions') // Redirect to transactions table
                .upsert(row, { onConflict: 'id' });
            if (error) throw error;

            console.log('✅ Transferencia guardada en Transactions:', transfer.id);
        } catch (error) {
            console.error('❌ Error en saveTransfer:', error);
            throw error;
        }
    }

    static async getTransfers(): Promise<TransferRecord[]> {
        try {
            // Read from 'transactions' where type='transfer'
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('type', 'transfer')
                .order('date', { ascending: false });

            if (error) throw error;

            return (data || []).map((row: any) => ({
                id: row.id,
                date: row.date,
                amount: Number(row.amount),
                type: row.transfer_type || 'other', // Restore subtype
                description: row.description,
                reference: row.transfer_reference,
                createdAt: row.created_at,
                arqueoId: row.arqueo_id,
            }));
        } catch (error) {
            console.error('Error obteniendo transferencias:', error);
            return [];
        }
    }

    static async updateTransfer(id: string, updates: Partial<TransferRecord>): Promise<void> {
        try {
            const mapped: any = { updated_at: new Date().toISOString() };
            if (updates.date !== undefined) {
                mapped.date = updates.date;
                mapped.parsed_date = updates.date;
            }
            if (updates.amount !== undefined) mapped.amount = updates.amount;
            if (updates.type !== undefined) mapped.transfer_type = updates.type;
            if (updates.description !== undefined) mapped.description = updates.description;
            if (updates.reference !== undefined) mapped.transfer_reference = updates.reference;
            if (updates.arqueoId !== undefined) mapped.arqueo_id = updates.arqueoId;

            const { error } = await supabase.from('transactions').update(mapped).eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error('Error actualizando transferencia:', error);
            throw error;
        }
    }

    static async deleteTransfer(id: string): Promise<void> {
        try {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error('Error eliminando transferencia:', error);
            throw error;
        }
    }

    /**
     * Limpieza Automática: Desactivada temporalmente.
     */
    static async autoPurgeOldData(): Promise<number> {
        return 0;
    }

    /**
     * ⚠️ ZONA DE PELIGRO: Reseteo total de datos (Fábrica)
     */
    static async resetSystemData(): Promise<void> {
        try {
            console.warn('⚠️ INICIANDO RESET DE FÁBRICA SYSTEM...');

            // 1. Eliminar Arqueos
            await supabase.from('arqueos').delete().neq('id', 'placeholder');

            // 2. Eliminar Transacciones (incluye transferencias)
            await supabase.from('transactions').delete().neq('id', 'placeholder');

            // 3. Eliminar Gastos Recurrentes
            await supabase.from('recurring_expenses').delete().neq('id', 'placeholder');

            // 4. Resetear Settings (excepto claves críticas si las hubiera)
            await supabase.from('settings').delete().neq('key', 'placeholder');

            // 5. Categorías (Opcional: Si quieres borrar las personalizadas)
            // await supabase.from('categories').delete().neq('id', 'placeholder');

            console.log('✅ SYSTEM FACTORY RESET COMPLETED');
        } catch (error) {
            console.error('❌ Error durante Factory Reset:', error);
            throw error;
        }
    }

    // ============ IMPORT / EXPORT DATA ============
    static async exportAllData(): Promise<any> {
        try {
            const transactions = await this.getTransactions();
            const categories = await this.getCategories();
            const recurringExpenses = await this.getRecurringExpenses();
            return {
                transactions,
                categories,
                recurringExpenses,
                meta: {
                    exportDate: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Error exportando todos los datos:', error);
            throw error;
        }
    }

    static async importAllData(data: any): Promise<void> {
        try {
            if (data.transactions && data.transactions.length > 0) {
                await this.saveTransactions(data.transactions);
            }
            if (data.categories && data.categories.length > 0) {
                await this.saveCategories(data.categories);
            }
            if (data.recurringExpenses && data.recurringExpenses.length > 0) {
                await this.saveRecurringExpenses(data.recurringExpenses);
            }
            console.log('✅ Datos importados correctamente');
        } catch (error) {
            console.error('Error importando todos los datos:', error);
            throw error;
        }
    }
}
