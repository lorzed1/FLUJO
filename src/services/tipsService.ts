import { supabase } from './supabaseClient';
import { format } from 'date-fns';

export interface TipRecord {
    id: string;
    fecha: string;
    total_propinas: number;
    comision_medios_electronicos: number;
    base_propinas: number;
    division: number;
    total_persona: number;
    unp: number;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
}

export const tipsService = {
    async syncTips(): Promise<void> {
        try {
            const { error } = await supabase.rpc('sync_tips_from_arqueos');
            if (error) {
                console.warn('No se pudo auto-sincronizar propinas (posible permisos rpc).', error);
            }
        } catch (error) {
            console.warn('Error catch en sync_tips_from_arqueos:', error);
        }
    },

    async getTips(startDate?: string, endDate?: string): Promise<TipRecord[]> {
        let query = supabase
            .from('tips_records')
            .select('*')
            .order('fecha', { ascending: false });

        if (startDate) {
            query = query.gte('fecha', startDate);
        }
        if (endDate) {
            query = query.lte('fecha', endDate);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching tips:', error);
            throw error;
        }

        return data || [];
    },

    async addTip(tip: Omit<TipRecord, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<TipRecord> {
        const { data, error } = await supabase
            .from('tips_records')
            .insert([tip])
            .select()
            .single();

        if (error) {
            console.error('Error adding tip:', error);
            throw error;
        }

        return data;
    },

    async updateTip(id: string, tip: Partial<TipRecord>): Promise<TipRecord> {
        const { data, error } = await supabase
            .from('tips_records')
            .update({ ...tip, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating tip:', error);
            throw error;
        }

        return data;
    },

    async deleteTip(id: string): Promise<void> {
        const { error } = await supabase
            .from('tips_records')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting tip:', error);
            throw error;
        }
    }
};
