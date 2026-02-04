import { Transaction, ReconciliationCandidate } from '../types';

export class InteractiveReconciliationService {

    /**
     * Encuentra candidatos potenciales para una transacción del Lado A
     * Retorna una lista ordenada por score (mayor a menor)
     */
    public static findCandidates(
        externalTransaction: Transaction,
        internalTransactions: Transaction[],
        config = { dateMarginDays: 5, amountTolerance: 1, amountToleranceAbs: 1000 }
    ): ReconciliationCandidate[] {
        const candidates: ReconciliationCandidate[] = [];
        const extAmount = this.getSignedAmount(externalTransaction);
        const extDate = new Date(externalTransaction.date);

        for (const internal of internalTransactions) {
            const intAmount = this.getSignedAmount(internal);
            const intDate = new Date(internal.date);

            let score = 0;
            const reasons: string[] = [];

            // 1. Coincidencia de Monto (peso: 50 puntos)
            const amountDiff = Math.abs(extAmount - intAmount);
            if (amountDiff === 0) {
                score += 50;
                reasons.push('Monto exacto');
            } else if (amountDiff <= config.amountTolerance) {
                score += 48;
                reasons.push('Monto casi exacto (redondeo)');
            } else if (amountDiff <= config.amountToleranceAbs) {
                score += 45;
                reasons.push(`Diferencia tolerable (±${amountDiff.toLocaleString()})`);
            } else if (amountDiff <= Math.abs(extAmount) * 0.05) {
                score += 30;
                reasons.push('Monto similar (±5%)');
            }

            // 2. Coincidencia de Fecha (peso: 30 puntos)
            const daysDiff = Math.abs((extDate.getTime() - intDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff === 0) {
                score += 30;
                reasons.push('Misma fecha');
            } else if (daysDiff <= 1) {
                score += 25;
                reasons.push('1 día de diferencia');
            } else if (daysDiff <= config.dateMarginDays) {
                score += 20 - (daysDiff * 2);
                reasons.push(`${Math.floor(daysDiff)} días de diferencia`);
            }

            // 3. Coincidencia de Descripción (peso: 20 puntos)
            const descSimilarity = this.calculateStringSimilarity(
                externalTransaction.description.toLowerCase(),
                internal.description.toLowerCase()
            );
            if (descSimilarity > 0.8) {
                score += 20;
                reasons.push('Descripción muy similar');
            } else if (descSimilarity > 0.5) {
                score += 10;
                reasons.push('Descripción similar');
            }

            // BONUS: Si Monto y Fecha son exactos, el match es financieramente perfecto.
            // Asignamos 100% (o 99% si queremos dejar margen) independientemente de la descripción.
            if (amountDiff === 0 && daysDiff === 0) {
                score = 100;
                // Opcional: Agregar razón destacada o reemplazar las anteriores
                // reasons = ['Coincidencia Financiera Exacta (Monto y Fecha)']; // Si se quiere reemplazar todo
                // O solo añadir al inicio si queremos conservar el detalle
                if (!reasons.includes('Coincidencia Financiera Exacta')) {
                    reasons.unshift('Coincidencia Financiera Exacta');
                }
            }

            // Solo incluir si tiene al menos 20 puntos
            if (score >= 20) {
                candidates.push({
                    transaction: internal,
                    score,
                    reason: reasons.join(' • ')
                });
            }
        }

        // Ordenar por score descendente
        return candidates.sort((a, b) => b.score - a.score);
    }

    /**
     * Encuentra candidatos para un lote de transacciones (día por día)
     */
    public static findBatchCandidates(
        externalTransactions: Transaction[],
        internalTransactions: Transaction[]
    ): Map<string, ReconciliationCandidate[]> {
        const batchResults = new Map<string, ReconciliationCandidate[]>();

        for (const ext of externalTransactions) {
            const candidates = this.findCandidates(ext, internalTransactions);
            batchResults.set(ext.id, candidates);
        }

        return batchResults;
    }

    private static getSignedAmount(t: Transaction): number {
        return t.type === 'income' ? Math.abs(t.amount) : -Math.abs(t.amount);
    }

    /**
     * Calcula similitud entre dos strings (algoritmo simple basado en palabras comunes)
     */
    private static calculateStringSimilarity(str1: string, str2: string): number {
        const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 3));
        const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 3));

        if (words1.size === 0 && words2.size === 0) return 0;

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    }
}
