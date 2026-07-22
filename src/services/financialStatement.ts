import { supabase } from './supabaseClient';

export interface FinancialStatementEntry {
    id: string;
    date: string;
    code?: string;
    description: string;
    category: string;
    type: 'income' | 'expense';
    amount: number;
    status: string;
    rowNumber?: number;
}

export interface RowFormula {
    rowId: string; // The name or ID of the row (e.g., "UTILIDAD BRUTA")
    type: 'aggregate' | 'formula';
    // For aggregate: e.g., ["4"] means sum all codes starting with 4
    // For formula: e.g., ["INGRESOS OPERACIONALES", "-", "COSTOS OPERACIONALES"]
    definition: string[];
}

export class FinancialStatementService {
    private static KEY = 'financial_statements';
    private static ORDER_KEY = 'financial_statements_order';
    private static FORMULA_KEY = 'financial_statements_formulas';

    static async getAll(): Promise<FinancialStatementEntry[]> {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('data')
                .eq('key', this.KEY)
                .maybeSingle();
            if (error) throw error;
            return (data?.data as FinancialStatementEntry[]) || [];
        } catch (error) {
            console.error('Error fetching financial statements:', error);
            return [];
        }
    }

    static async saveBulk(entries: FinancialStatementEntry[]): Promise<void> {
        try {
            const current = await this.getAll();
            const currentMap = new Map(current.map(e => [e.id, e]));
            entries.forEach(e => {
                currentMap.set(e.id, e);
            });
            const updated = Array.from(currentMap.values());
            await supabase.from('settings').upsert({
                key: this.KEY,
                data: updated,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
        } catch (error) {
            console.error('Error saving records:', error);
            throw error;
        }
    }

    static async getRowOrder(): Promise<string[]> {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('data')
                .eq('key', this.ORDER_KEY)
                .maybeSingle();
            return (data?.data as string[]) || [];
        } catch (error) {
            return [];
        }
    }

    static async saveRowOrder(order: string[]): Promise<void> {
        await supabase.from('settings').upsert({
            key: this.ORDER_KEY,
            data: order,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
    }

    static async getFormulas(): Promise<RowFormula[]> {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('data')
                .eq('key', this.FORMULA_KEY)
                .maybeSingle();
            return (data?.data as RowFormula[]) || [];
        } catch (error) {
            return [];
        }
    }

    static async saveFormulas(formulas: RowFormula[]): Promise<void> {
        await supabase.from('settings').upsert({
            key: this.FORMULA_KEY,
            data: formulas,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
    }

    static async deleteMonth(monthKey: string): Promise<void> {
        const current = await this.getAll();
        const filtered = current.filter(e => e.date.substring(0, 7) !== monthKey);
        await supabase.from('settings').upsert({
            key: this.KEY,
            data: filtered,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
    }

    static async clearAll(): Promise<void> {
        await supabase.from('settings').delete().eq('key', this.KEY);
        await supabase.from('settings').delete().eq('key', this.ORDER_KEY);
        await supabase.from('settings').delete().eq('key', this.FORMULA_KEY);
    }
}
