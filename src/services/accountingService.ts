import { supabase } from './supabaseClient';

export interface AccountingConsolidatedPYGEntry {
    id: string;
    import_id?: string;
    year: number;
    month: string;
    account: string;
    account_name: string;
    total: number;
    created_at?: string;
    updated_at?: string;
}

export class AccountingService {
    static async getAll(): Promise<AccountingConsolidatedPYGEntry[]> {
        const { data, error } = await supabase
            .from('accounting_consolidated_pyg')
            .select('*')
            .order('year', { ascending: false })
            .order('month', { ascending: false });

        if (error) {
            console.error('Error fetching accounting data:', error);
            throw error;
        }

        return data || [];
    }

    static async saveBulk(entries: Partial<AccountingConsolidatedPYGEntry>[]): Promise<void> {
        const importId = `imp-${Date.now()}`;
        const recordsToInsert = entries.map(e => ({
            ...e,
            import_id: importId,
        }));

        const { error } = await supabase
            .from('accounting_consolidated_pyg')
            .insert(recordsToInsert);

        if (error) {
            console.error('Error saving bulk accounting records:', error);
            throw error;
        }
    }

    static async getUniqueMonths(): Promise<string[]> {
        const { data, error } = await supabase
            .from('accounting_consolidated_pyg')
            .select('year, month');

        if (error) {
            console.error('Error fetching unique months:', error);
            return [];
        }

        const months = new Set<string>();
        data.forEach(item => {
            months.add(`${item.year}-${String(item.month).padStart(2, '0')}`);
        });

        return Array.from(months).sort((a, b) => b.localeCompare(a));
    }

    static async deleteByMonth(year: number, month: string): Promise<void> {
        const { error } = await supabase
            .from('accounting_consolidated_pyg')
            .delete()
            .eq('year', year)
            .eq('month', month);

        if (error) {
            console.error('Error deleting accounting month:', error);
            throw error;
        }
    }

    static async clearAll(): Promise<void> {
        const { error } = await supabase
            .from('accounting_consolidated_pyg')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (error) {
            console.error('Error clearing all accounting data:', error);
            throw error;
        }
    }
}
