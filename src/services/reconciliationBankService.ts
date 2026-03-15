import { supabase } from './supabaseClient';

// =============================================
// TIPOS
// =============================================

export interface ReconciliationAccountConfig {
    id: string;
    label: string;
    table: string;
    valueField: string;
    dateField: string;
    descField: string;
}

export const RECONCILIATION_ACCOUNTS: ReconciliationAccountConfig[] = [
    {
        id: 'cta-natalia',
        label: 'Cta Natalia',
        table: 'accounting_cta_natalia',
        valueField: 'valor',
        dateField: 'fecha',
        descField: 'descripcion',
    },
    {
        id: 'cta-ahorros-julian',
        label: 'Cta Ahorros Julian',
        table: 'accounting_cta_ahorros_julian',
        valueField: 'valor',
        dateField: 'fecha',
        descField: 'descripcion',
    },
    {
        id: 'cta-corriente',
        label: 'Cta Corriente',
        table: 'accounting_cta_corriente',
        valueField: 'valor',
        dateField: 'fecha',
        descField: 'descripcion',
    },
];

export interface ReconciliationRecord {
    id: string;
    date: string;
    amount: number;
    description: string;
    raw: Record<string, any>; // Fila original completa
}

export interface ReconciliationMatchResult {
    sourceRecord: ReconciliationRecord;
    targetRecord: ReconciliationRecord;
    score: number;
    ruleInfo: string;
    amountDiff: number;
    dateDiff: number;
}

export interface ReconciliationHistoryRow {
    id: string;
    source_table: string;
    source_record_id: string;
    target_record_id: string;
    match_type: 'auto' | 'manual';
    score: number | null;
    rule_info: string | null;
    amount_diff: number;
    date_diff: number;
    status: 'active' | 'reversed';
    reversed_at: string | null;
    reversed_reason: string | null;
    created_at: string;
    created_by: string | null;
}

export interface ReconciliationConfig {
    amountTolerance: number;  // Tolerancia en valor absoluto (ej: 2000)
    dateMarginDays: number;   // Margen de días (ej: 2)
}

const DEFAULT_CONFIG: ReconciliationConfig = {
    amountTolerance: 2000,
    dateMarginDays: 2,
};

// =============================================
// SERVICIO
// =============================================

export class ReconciliationBankService {

    // ------------------------------------------
    // CARGA DE DATOS
    // ------------------------------------------

    /**
     * Carga registros de una tabla fuente y los normaliza
     */
    static async loadSourceRecords(account: ReconciliationAccountConfig): Promise<ReconciliationRecord[]> {
        const { data, error } = await supabase
            .from(account.table)
            .select('*')
            .order(account.dateField, { ascending: false });

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.id,
            date: row[account.dateField] || '',
            amount: Number(row[account.valueField]) || 0,
            description: String(row[account.descField] || ''),
            raw: row,
        }));
    }

    /**
     * Carga registros de asientos contables (tabla base)
     * Usa débito - crédito como valor neto por registro
     */
    static async loadAsientosContables(): Promise<ReconciliationRecord[]> {
        const { data, error } = await supabase
            .from('accounting_asientos_contables')
            .select('*')
            .order('fecha', { ascending: false });

        if (error) throw error;

        return (data || []).map((row: any) => {
            const debito = Number(row.debito) || 0;
            const credito = Number(row.credito) || 0;
            const netAmount = debito - credito;

            return {
                id: row.id,
                date: row.fecha || '',
                amount: netAmount,
                description: `${row.descripcion || ''} ${row.descripcion_movimiento || ''}`.trim(),
                raw: row,
            };
        });
    }

    // ------------------------------------------
    // ALGORITMO DE CONCILIACIÓN AUTOMÁTICA
    // ------------------------------------------

    /**
     * Ejecuta la conciliación automática entre fuente y asientos contables
     * Retorna matches sugeridos ordenados por score desc
     */
    static reconcileAuto(
        sourceRecords: ReconciliationRecord[],
        targetRecords: ReconciliationRecord[],
        alreadyConciliated: Set<string>, // IDs ya conciliados (source + target)
        config: ReconciliationConfig = DEFAULT_CONFIG
    ): ReconciliationMatchResult[] {

        const matches: ReconciliationMatchResult[] = [];
        const usedSourceIds = new Set<string>();
        const usedTargetIds = new Set<string>();

        // Filtrar registros ya conciliados
        const availableSource = sourceRecords.filter(r => !alreadyConciliated.has(`source:${r.id}`));
        const availableTarget = targetRecords.filter(r => !alreadyConciliated.has(`target:${r.id}`));

        // FASE 1: Match exacto (valor + fecha idénticos)
        for (const src of availableSource) {
            if (usedSourceIds.has(src.id)) continue;

            for (const tgt of availableTarget) {
                if (usedTargetIds.has(tgt.id)) continue;

                if (src.amount === tgt.amount && src.date === tgt.date) {
                    matches.push({
                        sourceRecord: src,
                        targetRecord: tgt,
                        score: 100,
                        ruleInfo: 'Coincidencia Exacta (Valor y Fecha)',
                        amountDiff: 0,
                        dateDiff: 0,
                    });
                    usedSourceIds.add(src.id);
                    usedTargetIds.add(tgt.id);
                    break;
                }
            }
        }

        // FASE 2: Valor exacto + Fecha flexible (±N días)
        for (const src of availableSource) {
            if (usedSourceIds.has(src.id)) continue;

            for (const tgt of availableTarget) {
                if (usedTargetIds.has(tgt.id)) continue;

                const dateDiff = this.daysDiff(src.date, tgt.date);

                if (src.amount === tgt.amount && dateDiff <= config.dateMarginDays) {
                    matches.push({
                        sourceRecord: src,
                        targetRecord: tgt,
                        score: 99 - dateDiff * 2,
                        ruleInfo: `Valor Exacto, Fecha ±${dateDiff}d`,
                        amountDiff: 0,
                        dateDiff,
                    });
                    usedSourceIds.add(src.id);
                    usedTargetIds.add(tgt.id);
                    break;
                }
            }
        }

        // FASE 3: Tolerancia de valor + Fecha flexible
        for (const src of availableSource) {
            if (usedSourceIds.has(src.id)) continue;

            let bestMatch: ReconciliationMatchResult | null = null;

            for (const tgt of availableTarget) {
                if (usedTargetIds.has(tgt.id)) continue;

                const amountDiff = Math.abs(src.amount - tgt.amount);
                const dateDiff = this.daysDiff(src.date, tgt.date);

                if (amountDiff <= config.amountTolerance && dateDiff <= config.dateMarginDays) {
                    // Calcular score: base 98, penalizar sutilmente por diferencias
                    const amountPenalty = (amountDiff / config.amountTolerance) * 5;
                    const datePenalty = dateDiff * 1.5;
                    const score = Math.round(98 - amountPenalty - datePenalty);

                    if (score > 50 && (!bestMatch || score > bestMatch.score)) {
                        bestMatch = {
                            sourceRecord: src,
                            targetRecord: tgt,
                            score,
                            ruleInfo: `Tolerancia (Δ$${amountDiff.toLocaleString()}, Δ${dateDiff}d)`,
                            amountDiff,
                            dateDiff,
                        };
                    }
                }
            }

            if (bestMatch) {
                matches.push(bestMatch);
                usedSourceIds.add(bestMatch.sourceRecord.id);
                usedTargetIds.add(bestMatch.targetRecord.id);
            }
        }

        return matches.sort((a, b) => b.score - a.score);
    }

    // ------------------------------------------
    // PERSISTENCIA (HISTORIAL)
    // ------------------------------------------

    /**
     * Guarda un match (auto o manual) en el historial
     */
    static async saveMatch(
        sourceTable: string,
        sourceRecordId: string,
        targetRecordId: string,
        matchType: 'auto' | 'manual',
        score?: number,
        ruleInfo?: string,
        amountDiff?: number,
        dateDiff?: number,
    ): Promise<void> {
        const { error } = await supabase
            .from('reconciliation_history')
            .insert({
                source_table: sourceTable,
                source_record_id: sourceRecordId,
                target_record_id: targetRecordId,
                match_type: matchType,
                score: score ?? null,
                rule_info: ruleInfo ?? null,
                amount_diff: amountDiff ?? 0,
                date_diff: dateDiff ?? 0,
                status: 'active',
            });

        if (error) throw error;
    }

    /**
     * Guarda múltiples matches de una vez (para conciliación automática en lote)
     */
    static async saveMatchesBatch(
        sourceTable: string,
        matches: ReconciliationMatchResult[],
        matchTypeOverride?: 'auto' | 'manual'
    ): Promise<void> {
        if (matches.length === 0) return;

        const rows = matches.map(m => ({
            source_table: sourceTable,
            source_record_id: m.sourceRecord.id,
            target_record_id: m.targetRecord.id,
            match_type: matchTypeOverride || 'auto',
            score: m.score,
            rule_info: m.ruleInfo,
            amount_diff: m.amountDiff,
            date_diff: m.dateDiff,
            status: 'active',
        }));

        const { error } = await supabase
            .from('reconciliation_history')
            .insert(rows);

        if (error) throw error;
    }

    /**
     * Revierte un match (marca como reversed)
     */
    static async reverseMatch(matchId: string, reason: string): Promise<void> {
        const { error } = await supabase
            .from('reconciliation_history')
            .update({
                status: 'reversed',
                reversed_at: new Date().toISOString(),
                reversed_reason: reason,
            })
            .eq('id', matchId);

        if (error) throw error;
    }

    /**
     * Obtiene historial de conciliaciones para una tabla fuente
     */
    static async getHistory(sourceTable: string): Promise<ReconciliationHistoryRow[]> {
        const { data, error } = await supabase
            .from('reconciliation_history')
            .select('*')
            .eq('source_table', sourceTable)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as ReconciliationHistoryRow[];
    }

    /**
     * Obtiene el set de IDs ya conciliados (activos) para filtrar
     */
    static async getConciliatedIds(sourceTable: string): Promise<Set<string>> {
        const { data, error } = await supabase
            .from('reconciliation_history')
            .select('source_record_id, target_record_id')
            .eq('source_table', sourceTable)
            .eq('status', 'active');

        if (error) throw error;

        const ids = new Set<string>();
        (data || []).forEach((row: any) => {
            ids.add(`source:${row.source_record_id}`);
            ids.add(`target:${row.target_record_id}`);
        });
        return ids;
    }

    // ------------------------------------------
    // UTILIDADES
    // ------------------------------------------

    private static daysDiff(date1: string, date2: string): number {
        const d1 = new Date(date1).getTime();
        const d2 = new Date(date2).getTime();
        if (isNaN(d1) || isNaN(d2)) return 999;
        return Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
    }
}
