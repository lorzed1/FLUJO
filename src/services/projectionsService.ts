import { supabase } from './supabaseClient';
import { SalesEvent, SalesProjection } from '../types';

/**
 * Servicio de proyecciones de ventas usando Supabase.
 * Mantiene la misma interfaz pública que la versión anterior con Firestore.
 */
export const projectionsService = {
    // --- Sales Events ---
    async addSalesEvent(event: Omit<SalesEvent, 'id' | 'createdAt'>): Promise<string> {
        try {
            const { data, error } = await supabase
                .from('sales_events')
                .insert({
                    date: event.date,
                    name: event.name,
                    type: event.type,
                    impact_factor: event.impactFactor,
                    is_recurring: event.isRecurring,
                    notes: event.notes || null,
                })
                .select('id')
                .single();
            if (error) throw error;
            return data.id;
        } catch (error) {
            console.error('Error adding sales event:', error);
            throw error;
        }
    },

    async getSalesEvents(startDate?: string, endDate?: string): Promise<SalesEvent[]> {
        try {
            let query = supabase.from('sales_events').select('*');
            if (startDate && endDate) {
                query = query.gte('date', startDate).lte('date', endDate);
            }
            const { data, error } = await query.order('date', { ascending: true });
            if (error) throw error;
            return (data || []).map((row: any) => ({
                id: row.id,
                date: row.date,
                name: row.name,
                type: row.type,
                impactFactor: Number(row.impact_factor),
                isRecurring: row.is_recurring,
                notes: row.notes,
                createdAt: row.created_at,
            }));
        } catch (error) {
            console.error('Error getting sales events:', error);
            return [];
        }
    },

    async updateSalesEvent(id: string, updates: Partial<SalesEvent>): Promise<void> {
        try {
            const mapped: any = {};
            if (updates.date !== undefined) mapped.date = updates.date;
            if (updates.name !== undefined) mapped.name = updates.name;
            if (updates.type !== undefined) mapped.type = updates.type;
            if (updates.impactFactor !== undefined) mapped.impact_factor = updates.impactFactor;
            if (updates.isRecurring !== undefined) mapped.is_recurring = updates.isRecurring;
            if (updates.notes !== undefined) mapped.notes = updates.notes;

            const { error } = await supabase.from('sales_events').update(mapped).eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error('Error updating sales event:', error);
            throw error;
        }
    },

    async deleteSalesEvent(id: string): Promise<void> {
        try {
            const { error } = await supabase.from('sales_events').delete().eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting sales event:', error);
            throw error;
        }
    },

    // --- Sales Projections ---
    async getSalesProjections(startDate?: string, endDate?: string): Promise<SalesProjection[]> {
        try {
            let query = supabase.from('sales_projections').select('*');
            if (startDate && endDate) {
                query = query.gte('date', startDate).lte('date', endDate);
            }
            const { data, error } = await query.order('date', { ascending: true });
            if (error) throw error;
            return (data || []).map((row: any) => ({
                date: row.date,
                amountSystem: Number(row.amount_system),
                amountAdjusted: Number(row.amount_adjusted),
                status: row.status,
                notes: row.notes,
                lastUpdated: row.last_updated,
            }));
        } catch (error) {
            console.error('Error getting projections:', error);
            return [];
        }
    },

    async saveSalesProjection(projection: SalesProjection): Promise<void> {
        try {
            const { error } = await supabase
                .from('sales_projections')
                .upsert({
                    date: projection.date,
                    amount_system: projection.amountSystem,
                    amount_adjusted: projection.amountAdjusted,
                    status: projection.status,
                    notes: projection.notes || null,
                    last_updated: new Date().toISOString(),
                }, { onConflict: 'date' });
            if (error) throw error;
        } catch (error) {
            console.error('Error saving projection:', error);
            throw error;
        }
    },

    async deleteSalesProjection(date: string): Promise<void> {
        try {
            const { error } = await supabase.from('sales_projections').delete().eq('date', date);
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting projection:', error);
            throw error;
        }
    },

    // --- Global Config ---
    async getProjectionConfig(): Promise<any> {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('data')
                .eq('key', 'projections_config')
                .maybeSingle();

            if (error) throw error;
            return data?.data || null;
        } catch (error) {
            console.error('Error getting projection config:', error);
            return null;
        }
    },

    async saveProjectionConfig(config: any): Promise<void> {
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({
                    key: 'projections_config',
                    data: config,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;
        } catch (error) {
            console.error('Error saving projection config:', error);
            throw error;
        }
    }
};
