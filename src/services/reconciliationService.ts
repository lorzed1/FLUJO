import { Transaction, TransactionType, ReconciliationMatch, ReconciliationResult } from '../types';

interface ReconciliationConfig {
    dateMarginDays: number; // Days to search forward/backward
    amountTolerance: number; // Max difference allowed
    maxCombinationSize: number; // For many-to-one, max items to combine
}

const DEFAULT_CONFIG: ReconciliationConfig = {
    dateMarginDays: 3,
    amountTolerance: 0.05,
    maxCombinationSize: 4,
};

export class ReconciliationService {

    private static getSignedAmount(t: Transaction): number {
        return t.type === TransactionType.INCOME ? Math.abs(t.amount) : -Math.abs(t.amount);
    }

    private static areDatesClose(date1: string, date2: string, marginDays: number): boolean {
        const d1 = new Date(date1).getTime();
        const d2 = new Date(date2).getTime();
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= marginDays;
    }

    private static isAmountEqual(a1: number, a2: number, tolerance: number): boolean {
        return Math.abs(a1 - a2) <= tolerance;
    }

    public static reconcile(
        internalTxns: Transaction[],
        externalTxns: Transaction[],
        config: ReconciliationConfig = DEFAULT_CONFIG
    ): ReconciliationResult {
        const matches: ReconciliationMatch[] = [];
        const usedInternalIds = new Set<string>();
        const usedExternalIds = new Set<string>();

        const getUnusedInternal = () => internalTxns.filter(t => !usedInternalIds.has(t.id));
        const getUnusedExternal = () => externalTxns.filter(t => !usedExternalIds.has(t.id));

        // Helper to create match
        const createMatch = (internal: Transaction[], external: Transaction[], rule: string, diff: number = 0) => {
            internal.forEach(t => usedInternalIds.add(t.id));
            external.forEach(t => usedExternalIds.add(t.id));

            const match: ReconciliationMatch = {
                id: `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                internalIds: internal.map(t => t.id),
                externalIds: external.map(t => t.id),
                totalAmount: external.reduce((sum, t) => sum + this.getSignedAmount(t), 0),
                date: external[0]?.date || internal[0]?.date || '',
                difference: diff,
                status: 'matched_auto',
                ruleInfo: rule,
                confidence: 100
            };
            matches.push(match);
        };

        // --- PHASE 1: EXACT MATCH (Amount + Date) ---
        // Strict 1:1
        let freeInternal = getUnusedInternal();
        let freeExternal = getUnusedExternal();

        for (const ext of freeExternal) {
            const extAmount = this.getSignedAmount(ext);
            // Find internal with precise date and amount
            const exactMatch = freeInternal.find(int =>
                !usedInternalIds.has(int.id) &&
                this.getSignedAmount(int) === extAmount &&
                int.date === ext.date
            );

            if (exactMatch) {
                createMatch([exactMatch], [ext], 'Coincidencia Exacta (Fecha y Monto)');
            }
        }

        // --- PHASE 2: DATE WINDOW (Amount exact, Date approximately) ---
        freeInternal = getUnusedInternal();
        freeExternal = getUnusedExternal();

        for (const ext of freeExternal) {
            const extAmount = this.getSignedAmount(ext);
            const windowMatch = freeInternal.find(int =>
                !usedInternalIds.has(int.id) &&
                this.getSignedAmount(int) === extAmount &&
                this.areDatesClose(int.date, ext.date, config.dateMarginDays)
            );

            if (windowMatch) {
                createMatch([windowMatch], [ext], `Coincidencia Flexible (Ventana ${config.dateMarginDays} días)`);
            }
        }

        // --- PHASE 3: AMOUNT TOLERANCE (Within window, small diff) ---
        freeInternal = getUnusedInternal();
        freeExternal = getUnusedExternal();

        for (const ext of freeExternal) {
            const extAmount = this.getSignedAmount(ext);
            const toleranceMatch = freeInternal.find(int =>
                !usedInternalIds.has(int.id) &&
                this.isAmountEqual(this.getSignedAmount(int), extAmount, config.amountTolerance) &&
                this.areDatesClose(int.date, ext.date, config.dateMarginDays)
            );

            if (toleranceMatch) {
                const diff = Math.abs(this.getSignedAmount(toleranceMatch) - extAmount);
                createMatch([toleranceMatch], [ext], `Tolerancia Monto (${diff.toFixed(2)})`, diff);
            }
        }

        // --- PHASE 4: MANY TO ONE (Subset Sum) ---
        // Only attempting 1 External vs N Internal (common case: deposit = sum of sales)
        // Or 1 Internal vs N External (expense = sum of fees + net)

        // CASE A: 1 External (Bank) matched by N Internal (Book)
        // Example: Bank Deposit $500 = Book Sale $100 + $200 + $200
        freeExternal = getUnusedExternal(); // Refresh
        freeInternal = getUnusedInternal();

        for (const ext of freeExternal) {
            const targetAmount = this.getSignedAmount(ext);
            // Optimization: Only look for internals with same validation sign and within date window
            const candidates = freeInternal.filter(int =>
                !usedInternalIds.has(int.id) &&
                Math.sign(this.getSignedAmount(int)) === Math.sign(targetAmount) &&
                this.areDatesClose(int.date, ext.date, config.dateMarginDays)
            );

            if (candidates.length > 0 && candidates.length <= 15) { // Limit search space
                const combination = this.findSubsetSum(candidates, targetAmount, config.amountTolerance, config.maxCombinationSize);
                if (combination) {
                    createMatch(combination, [ext], 'Suma de Partidas (Muchos a Uno)');
                }
            }
        }

        return {
            matches,
            unmatchedInternal: getUnusedInternal(),
            unmatchedExternal: getUnusedExternal(),
        };
    }

    // Basic recursive subset sum finder
    private static findSubsetSum(
        candidates: Transaction[],
        target: number,
        tolerance: number,
        maxSize: number
    ): Transaction[] | null {

        const result: Transaction[] = [];

        const search = (index: number, currentSum: number, currentItems: Transaction[]): boolean => {
            if (Math.abs(currentSum - target) <= tolerance && currentItems.length > 0) {
                result.push(...currentItems);
                return true;
            }
            if (index >= candidates.length || currentItems.length >= maxSize) {
                return false;
            }

            // Include candidates[index]
            const val = this.getSignedAmount(candidates[index]);
            // Pruning: if adding this exceeds target (magnitude) significantly? 
            // Actually difficult with mixed signs, but here we assumed same sign candidates.

            if (search(index + 1, currentSum + val, [...currentItems, candidates[index]])) {
                return true;
            }

            // Exclude candidates[index]
            if (search(index + 1, currentSum, currentItems)) {
                return true;
            }

            return false;
        };

        // To avoid complexity, we can use a simpler greedy or limit recursion depth
        // Since candidates are filtered by date, N shouldn't be too huge.
        search(0, 0, []);
        return result.length > 0 ? result : null;
    }
}
