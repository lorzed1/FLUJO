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
    pucCode?: string; // Código contable PUC por defecto
}

export const RECONCILIATION_ACCOUNTS: ReconciliationAccountConfig[] = [
    {
        id: 'cta-natalia',
        label: 'Cta Natalia',
        table: 'accounting_cta_natalia',
        valueField: 'valor',
        dateField: 'fecha',
        descField: 'descripcion',
        pucCode: '11100501' // Placeholder, cambiar por el real
    },
    {
        id: 'cta-ahorros-julian',
        label: 'Cta Ahorros Julian',
        table: 'accounting_cta_ahorros_julian',
        valueField: 'valor',
        dateField: 'fecha',
        descField: 'descripcion',
        pucCode: '11100502' // Placeholder, cambiar por el real
    },
    {
        id: 'cta-corriente',
        label: 'Cta Corriente',
        table: 'accounting_cta_corriente',
        valueField: 'valor',
        dateField: 'fecha',
        descField: 'descripcion',
        pucCode: '11100503' // Placeholder, cambiar por el real
    },
];

export interface InternalTransfer {
    id: string;
    date: string;
    amount: number;
    sourceAccount: ReconciliationAccountConfig;
    targetAccount: ReconciliationAccountConfig;
    sourceRecordId: string;
    targetRecordId: string;
    sourceDesc: string;
    targetDesc: string;
    sourceRef?: string;
    targetRef?: string;
    isConciliated?: boolean;
}

export interface ReconciliationRecord {
    id: string;
    date: string;
    amount: number;
    description: string;
    reference?: string; // Número de referencia bancaria (para matching preciso)
    notes?: string;      // Comentarios/notas adicionales
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
     * Carga registros de una tabla fuente y los normaliza.
     * Incluye el campo 'referencia' para permitir matching exacto por referencia bancaria.
     */
    static async loadSourceRecords(account: ReconciliationAccountConfig): Promise<ReconciliationRecord[]> {
        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        let fetchMore = true;

        while (fetchMore) {
            const { data, error } = await supabase
                .from(account.table)
                .select('*')
                .order(account.dateField, { ascending: false })
                .range(from, from + step - 1);

            if (error) throw error;
            
            if (data && data.length > 0) {
                allData = [...allData, ...data];
                if (data.length < step) fetchMore = false;
                else from += step;
            } else {
                fetchMore = false;
            }
        }

        return allData.map((row: any) => ({
            id: row.id,
            date: row[account.dateField] || '',
            amount: Number(row[account.valueField]) || 0,
            description: String(row[account.descField] || ''),
            reference: String(row['referencia'] || row['reference'] || '').trim(),
            notes: row['notes'] || '',
            raw: row,
        }));
    }

    /**
     * Carga registros de asientos contables (tabla base)
     * Usa débito - crédito como valor neto por registro
     */
    static async loadAsientosContables(): Promise<ReconciliationRecord[]> {
        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        let fetchMore = true;

        while (fetchMore) {
            const { data, error } = await supabase
                .from('accounting_asientos_contables')
                .select('*')
                .order('fecha', { ascending: false })
                .range(from, from + step - 1);

            if (error) throw error;
            
            if (data && data.length > 0) {
                allData = [...allData, ...data];
                if (data.length < step) fetchMore = false;
                else from += step;
            } else {
                fetchMore = false;
            }
        }

        return allData.map((row: any) => {
            const debito = Number(row.debito) || 0;
            const credito = Number(row.credito) || 0;
            const netAmount = debito - credito;

            return {
                id: row.id,
                date: row.fecha || '',
                amount: netAmount,
                description: `${row.descripcion || ''} ${row.descripcion_movimiento || ''}`.trim(),
                notes: row.notes || '',
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

        // FASE 1: Match exacto (valor absoluto + fecha idénticos)
        // Comparamos en VALOR ABSOLUTO para que:
        //   - negativos con negativos (egreso banco vs crédito contable)
        //   - positivos con positivos (ingreso banco vs débito contable)
        for (const src of availableSource) {
            if (usedSourceIds.has(src.id)) continue;

            for (const tgt of availableTarget) {
                if (usedTargetIds.has(tgt.id)) continue;

                const srcAbs = Math.abs(src.amount);
                const tgtAbs = Math.abs(tgt.amount);
                const sameSign = (src.amount >= 0) === (tgt.amount >= 0);

                if (srcAbs === tgtAbs && sameSign && src.date === tgt.date) {
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

        // FASE 2: Valor exacto en magnitud + Fecha flexible (±N días) + mismo signo
        for (const src of availableSource) {
            if (usedSourceIds.has(src.id)) continue;

            for (const tgt of availableTarget) {
                if (usedTargetIds.has(tgt.id)) continue;

                const dateDiff = this.daysDiff(src.date, tgt.date);
                const srcAbs = Math.abs(src.amount);
                const tgtAbs = Math.abs(tgt.amount);
                const sameSign = (src.amount >= 0) === (tgt.amount >= 0);

                if (srcAbs === tgtAbs && sameSign && dateDiff <= config.dateMarginDays) {
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

        // FASE 3: Tolerancia de valor (en magnitud) + mismo signo + Fecha flexible
        for (const src of availableSource) {
            if (usedSourceIds.has(src.id)) continue;

            let bestMatch: ReconciliationMatchResult | null = null;

            for (const tgt of availableTarget) {
                if (usedTargetIds.has(tgt.id)) continue;

                // Solo comparar registros del mismo signo (+ con +, - con -)
                const sameSign = (src.amount >= 0) === (tgt.amount >= 0);
                if (!sameSign) continue;

                // Diferencia entre valores absolutos
                const amountDiff = Math.abs(Math.abs(src.amount) - Math.abs(tgt.amount));
                const dateDiff = this.daysDiff(src.date, tgt.date);

                if (amountDiff <= config.amountTolerance && dateDiff <= config.dateMarginDays) {
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
    // DETECCIÓN DE TRANSFERENCIAS INTERNAS
    // ------------------------------------------

    /**
     * Busca posibles transferencias entre cuentas bancarias
     */
    static async findInternalTransfers(
        config: ReconciliationConfig = DEFAULT_CONFIG
    ): Promise<InternalTransfer[]> {
        // Cargar registros de todas las cuentas y su estado de conciliación
        const allRecordsPromises = RECONCILIATION_ACCOUNTS.map(async acc => {
            const records = await this.loadSourceRecords(acc);
            const conciliated = await this.getConciliatedIds(acc.table);
            
            // Mostrar absolutamente todos los registros (incluyendo conciliados), pero marcándolos
            return records.map(r => ({ 
                ...r, 
                account: acc,
                isConciliated: conciliated.has(`source:${r.id}`)
            }));
        });

        const accountsData = await Promise.all(allRecordsPromises);
        const flatRecords = accountsData.flat();

        const withdrawals = flatRecords.filter(r => r.amount < 0);
        const deposits = flatRecords.filter(r => r.amount > 0);

        const transfers: InternalTransfer[] = [];
        const usedWithdrawalIds = new Set<string>();
        const usedDepositIds = new Set<string>();

        // ============================================================
        // FASE 0: Matching por REFERENCIA BANCARIA compartida
        // MÁXIMA PRIORIDAD: Si un retiro de cuenta A y un depósito de
        // cuenta B comparten la misma referencia no vacía, son con
        // certeza las dos caras de la misma transferencia.
        //
        // Ejemplo real:
        //   Cta Natalia  -$336.000 ref=27000011139 (TRANSFERENCIA CTA SUC VIRTUAL)
        //   Cta Corriente +$336.000 ref=91215400366 (TRANSFERENCIA CTA SUC VIRTUAL)
        //
        // Aunque las referencias son distintas, el banco genera una ref
        // por cada extremo. La clave es: mismo valor absoluto, misma fecha
        // (± margen), y al menos UNA de las referencias indica transferencia.
        //
        // Estrategia: comparar por referencia exacta entre retiro y depósito.
        // Si ambos tienen referencia y coinciden → match de máxima certeza.
        // ============================================================

        // FASE 0A: Referencia exacta entre retiro y depósito de cuentas distintas
        for (const w of withdrawals) {
            if (usedWithdrawalIds.has(w.id)) continue;
            const wRef = w.reference?.trim();
            if (!wRef) continue;

            for (const d of deposits) {
                if (usedDepositIds.has(d.id)) continue;
                if (w.account.id === d.account.id) continue;

                const dRef = d.reference?.trim();
                if (!dRef) continue;

                // Referencia idéntica y mismo valor absoluto (sin importar signo)
                if (wRef === dRef && Math.abs(w.amount) === d.amount) {
                    transfers.push({
                        id: `tx-${w.id}-${d.id}`,
                        date: w.date,
                        amount: Math.abs(w.amount),
                        sourceAccount: w.account,
                        targetAccount: d.account,
                        sourceRecordId: w.id,
                        targetRecordId: d.id,
                        sourceDesc: w.description,
                        targetDesc: d.description,
                        sourceRef: w.reference,
                        targetRef: d.reference,
                        isConciliated: (w as any).isConciliated || (d as any).isConciliated,
                    });
                    usedWithdrawalIds.add(w.id);
                    usedDepositIds.add(d.id);
                    break;
                }
            }
        }

        // FASE 0B: Monto exacto + Fecha exacta + descripción de transferencia
        // (Cubre el caso de dos cuentas donde el banco genera referencias distintas
        //  por cada extremo pero la descripción dice "TRANSFERENCIA CTA SUC VIRTUAL")
        const TRANSFER_KEYWORDS = ['TRANSFERENCIA CTA', 'TRANSFERENCIA BANCARIA', 'TRF ', 'TRANSF '];
        const isTransferDesc = (desc: string) =>
            TRANSFER_KEYWORDS.some(kw => desc.toUpperCase().includes(kw));

        for (const w of withdrawals) {
            if (usedWithdrawalIds.has(w.id)) continue;
            if (!isTransferDesc(w.description)) continue;

            for (const d of deposits) {
                if (usedDepositIds.has(d.id)) continue;
                if (w.account.id === d.account.id) continue;
                if (!isTransferDesc(d.description)) continue;

                const dateDiff = this.daysDiff(w.date, d.date);
                if (Math.abs(w.amount) === d.amount && dateDiff <= config.dateMarginDays) {
                    transfers.push({
                        id: `tx-${w.id}-${d.id}`,
                        date: w.date,
                        amount: Math.abs(w.amount),
                        sourceAccount: w.account,
                        targetAccount: d.account,
                        sourceRecordId: w.id,
                        targetRecordId: d.id,
                        sourceDesc: w.description,
                        targetDesc: d.description,
                        sourceRef: w.reference,
                        targetRef: d.reference,
                        isConciliated: (w as any).isConciliated || (d as any).isConciliated,
                    });
                    usedWithdrawalIds.add(w.id);
                    usedDepositIds.add(d.id);
                    break;
                }
            }
        }

        // ============================================================
        // FASE 1: Monto exacto + Fecha exacta (fallback sin descripción)
        // ============================================================
        for (const w of withdrawals) {
            if (usedWithdrawalIds.has(w.id)) continue;
            for (const d of deposits) {
                if (usedDepositIds.has(d.id)) continue;
                if (w.account.id === d.account.id) continue; // Misma cuenta no es transferencia

                if (Math.abs(w.amount) === d.amount && w.date === d.date) {
                    transfers.push({
                        id: `tx-${w.id}-${d.id}`,
                        date: w.date,
                        amount: Math.abs(w.amount),
                        sourceAccount: w.account, // Origen = la que disminuye
                        targetAccount: d.account, // Destino = la que incrementa
                        sourceRecordId: w.id,
                        targetRecordId: d.id,
                        sourceDesc: w.description,
                        targetDesc: d.description,
                        sourceRef: w.reference,
                        targetRef: d.reference,
                        isConciliated: (w as any).isConciliated || (d as any).isConciliated,
                    });
                    usedWithdrawalIds.add(w.id);
                    usedDepositIds.add(d.id);
                    break;
                }
            }
        }

        // ============================================================
        // FASE 2: Monto exacto + Margen de días (fallback flexible)
        // ============================================================
        for (const w of withdrawals) {
            if (usedWithdrawalIds.has(w.id)) continue;
            for (const d of deposits) {
                if (usedDepositIds.has(d.id)) continue;
                if (w.account.id === d.account.id) continue;

                const dateDiff = this.daysDiff(w.date, d.date);

                if (Math.abs(w.amount) === d.amount && dateDiff <= config.dateMarginDays) {
                    transfers.push({
                        id: `tx-${w.id}-${d.id}`,
                        date: w.date, // Se asume fecha de origen como principal
                        amount: Math.abs(w.amount),
                        sourceAccount: w.account,
                        targetAccount: d.account,
                        sourceRecordId: w.id,
                        targetRecordId: d.id,
                        sourceDesc: w.description,
                        targetDesc: d.description,
                        sourceRef: w.reference,
                        targetRef: d.reference,
                        isConciliated: (w as any).isConciliated || (d as any).isConciliated,
                    });
                    usedWithdrawalIds.add(w.id);
                    usedDepositIds.add(d.id);
                    break;
                }
            }
        }

        // ============================================================
        // FASE 3: Detección por texto (Transferencias con CAJA virtual)
        // Se ejecuta DESPUÉS de fases anteriores para no interferir
        // con movimientos ya emparejados entre cuentas bancarias.
        // ============================================================

        // Cuenta Virtual CAJA
        const CAJA_ACCOUNT: ReconciliationAccountConfig = {
            id: 'virtual_caja',
            label: 'Caja',
            table: 'virtual_caja',
            valueField: 'valor',
            dateField: 'fecha',
            descField: 'descripcion',
            pucCode: '110505' // Código genérico para Caja
        };

        // Retiro de Cajero -> Banco a Caja
        for (const w of withdrawals) {
            if (usedWithdrawalIds.has(w.id)) continue;
            if (w.description && w.description.toUpperCase().includes('RETIRO DE CAJERO')) {
                transfers.push({
                    id: `tx-caja-out-${w.id}`,
                    date: w.date,
                    amount: Math.abs(w.amount),
                    sourceAccount: w.account,
                    targetAccount: CAJA_ACCOUNT,
                    sourceRecordId: w.id,
                    targetRecordId: 'caja-virtual',
                    sourceDesc: w.description,
                    targetDesc: 'Ingreso a Caja desde cajero automático',
                    sourceRef: w.reference,
                    isConciliated: (w as any).isConciliated,
                });
                usedWithdrawalIds.add(w.id);
            }
        }

        // Consignacion -> Caja a Banco
        // IMPORTANTE: Solo aplica si el depósito NO fue emparejado con otro retiro
        // bancario en fases anteriores (evita marcar erróneamente como Caja→Cuenta
        // un depósito que en realidad vino de otra cuenta bancaria)
        for (const d of deposits) {
            if (usedDepositIds.has(d.id)) continue;
            if (d.description && d.description.toUpperCase().includes('CONSIGNACION')) {
                transfers.push({
                    id: `tx-caja-in-${d.id}`,
                    date: d.date,
                    amount: Math.abs(d.amount),
                    sourceAccount: CAJA_ACCOUNT,
                    targetAccount: d.account,
                    sourceRecordId: 'caja-virtual',
                    targetRecordId: d.id,
                    sourceDesc: 'Salida de Caja por consignación',
                    targetDesc: d.description,
                    targetRef: d.reference,
                    isConciliated: (d as any).isConciliated,
                });
                usedDepositIds.add(d.id);
            }
        }

        // Ordenar por fecha descendente
        return transfers.sort((a, b) => b.date.localeCompare(a.date));
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
     * Revierte un match (lo elimina completamente del historial)
     */
    static async reverseMatch(matchId: string): Promise<void> {
        const { error } = await supabase
            .from('reconciliation_history')
            .delete()
            .eq('id', matchId);

        if (error) throw error;
    }

    /**
     * Revierte múltiples matches (los elimina completamente del historial)
     */
    static async reverseMatchesBatch(matchIds: string[]): Promise<void> {
        if (matchIds.length === 0) return;
        const { error } = await supabase
            .from('reconciliation_history')
            .delete()
            .in('id', matchIds);

        if (error) throw error;
    }

    /**
     * Limpia automáticamente conciliaciones huérfanas vinculadas a registros eliminados
     */
    static async cleanOrphanedReconciliationsByRecords(recordIds: string[]): Promise<void> {
        if (!recordIds || recordIds.length === 0) return;

        try {
            // 1. Borrar todas las conciliaciones donde estos registros son el SOURCE
            const { error: err1 } = await supabase
                .from('reconciliation_history')
                .delete()
                .in('source_record_id', recordIds);
            
            // 2. Borrar todas las conciliaciones donde estos registros son el TARGET
            const { error: err2 } = await supabase
                .from('reconciliation_history')
                .delete()
                .in('target_record_id', recordIds);

            if (err1) console.error("Error al limpiar conciliaciones (source):", err1);
            if (err2) console.error("Error al limpiar conciliaciones (target):", err2);
        } catch (err) {
            console.error("Error manejando limpieza huérfana de conciliaciones:", err);
        }
    }

    /**
     * Actualiza la nota/comentario de un registro en cualquier tabla
     */
    static async updateNote(table: string, id: string, note: string): Promise<void> {
        const { error } = await supabase
            .from(table)
            .update({ notes: note || null })
            .eq('id', id);

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
     * Obtiene TODO el historial (de todas las cuentas bancarias),
     * filtrando únicamente los registros activos (no revertidos).
     */
    static async getAllActiveHistory(): Promise<ReconciliationHistoryRow[]> {
        const { data, error } = await supabase
            .from('reconciliation_history')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as ReconciliationHistoryRow[];
    }

    /**
     * Obtiene el set de IDs ya conciliados (activos) para filtrar.
     *
     * IMPORTANTE: Los source_record_id se filtran por cuenta bancaria (source_table),
     * pero los target_record_id (asientos contables) son globales: un asiento ya
     * conciliado con CUALQUIER cuenta debe ocultarse sin importar qué cuenta se esté
     * visualizando actualmente.
     */
    static async getConciliatedIds(sourceTable: string): Promise<Set<string>> {
        // Consulta 1: IDs de source (propios de esta cuenta bancaria)
        const { data: sourceData, error: sourceError } = await supabase
            .from('reconciliation_history')
            .select('source_record_id')
            .eq('source_table', sourceTable)
            .eq('status', 'active');

        if (sourceError) throw sourceError;

        // Consulta 2: IDs de target (asientos contables) — GLOBAL, sin filtro de cuenta
        // Un asiento conciliado con cualquier cuenta debe quedar oculto en todas las cuentas.
        const { data: targetData, error: targetError } = await supabase
            .from('reconciliation_history')
            .select('target_record_id')
            .eq('status', 'active');

        if (targetError) throw targetError;

        const ids = new Set<string>();
        (sourceData || []).forEach((row: any) => {
            ids.add(`source:${row.source_record_id}`);
        });
        (targetData || []).forEach((row: any) => {
            ids.add(`target:${row.target_record_id}`);
        });
        return ids;
    }

    // ------------------------------------------
    // UTILIDADES - LIMPIEZA
    // ------------------------------------------

    /**
     * Busca y elimina del historial las conciliaciones huérfanas
     * (aquellas cuyo registro en origen o en target ya no existe).
     * Retorna el número de registros limpiados.
     */
    static async cleanOrphanedRecords(): Promise<number> {
        let totalCleaned = 0;

        // 1. Obtener TODO el historial
        const { data: historyItems, error: histError } = await supabase
            .from('reconciliation_history')
            .select('id, source_table, source_record_id, target_record_id');

        if (histError) throw histError;
        if (!historyItems || historyItems.length === 0) return 0;

        // 2. Obtener todos los IDs de asientos contables (Target)
        const { data: targetRecords, error: targetError } = await supabase
            .from('accounting_asientos_contables')
            .select('id');
        
        if (targetError) throw targetError;
        const validTargetIds = new Set((targetRecords || []).map(r => r.id));

        // 3. Obtener todos los IDs de cada cuenta bancaria (Source)
        const validSourceIds = new Set<string>();
        for (const account of RECONCILIATION_ACCOUNTS) {
            const { data: sourceRecords, error: sourceError } = await supabase
                .from(account.table)
                .select('id');
            
            if (sourceError) {
                console.error(`Error fetching from ${account.table}:`, sourceError);
                continue;
            }
            
            // Prefijamos el ID con el nombre de la tabla para evitar colisiones
            (sourceRecords || []).forEach(r => validSourceIds.add(`${account.table}:${r.id}`));
        }

        // 4. Buscar huérfanos
        const idsToDelete: string[] = [];

        for (const item of historyItems) {
            const isSourceOrphan = !validSourceIds.has(`${item.source_table}:${item.source_record_id}`);
            const isTargetOrphan = !validTargetIds.has(item.target_record_id);

            if (isSourceOrphan || isTargetOrphan) {
                idsToDelete.push(item.id);
            }
        }

        // 5. Eliminar
        if (idsToDelete.length > 0) {
            // Eliminar en lotes de 1000 por si hay muchos
            for (let i = 0; i < idsToDelete.length; i += 1000) {
                const chunk = idsToDelete.slice(i, i + 1000);
                const { error: delError } = await supabase
                    .from('reconciliation_history')
                    .delete()
                    .in('id', chunk);

                if (delError) throw delError;
                totalCleaned += chunk.length;
            }
        }

        return totalCleaned;
    }

    // ------------------------------------------
    // UTILIDADES INTERNAS
    // ------------------------------------------

    private static daysDiff(date1: string, date2: string): number {
        const d1 = new Date(date1).getTime();
        const d2 = new Date(date2).getTime();
        if (isNaN(d1) || isNaN(d2)) return 999;
        return Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
    }
}
