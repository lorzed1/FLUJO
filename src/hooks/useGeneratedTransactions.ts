import { useMemo } from 'react';
import { Transaction, RecurringExpense, RecurringExpenseOverrides, Frequency, TransactionType } from '../types';

/**
 * Hook optimizado para generar transacciones recurrentes futuras
 * Reduce el rango de generación y usa cache para mejorar performance
 */
export function useGeneratedTransactions(
    transactions: Transaction[],
    recurringExpenses: RecurringExpense[],
    recurringOverrides: RecurringExpenseOverrides,
    recordedDays: Set<string>,
    monthsAhead: number = 6 // Reducido de 18 meses a 6 meses
): Transaction[] {
    return useMemo(() => {
        const generatedTransactions: Transaction[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Reducir ventana de generación para mejorar performance
        const endDate = new Date(today.getFullYear(), today.getMonth() + monthsAhead, 1);

        // Set para búsqueda O(1) de transacciones consumidas
        const consumedKeys = new Set(
            transactions
                .filter(t => t.recurringId)
                .map(t => `${t.recurringId}-${t.date}-${t.originalDate}`)
        );

        // Optimización: No recorrer desde el inicio de los tiempos
        // Empezar desde hace 3 meses como máximo para mostrar historial reciente
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        recurringExpenses.forEach(re => {
            let currentDate = new Date(re.startDate + 'T00:00:00');

            // Si la fecha de inicio es muy vieja, saltar al pasado reciente
            if (currentDate < threeMonthsAgo) {
                if (re.frequency === Frequency.MONTHLY) {
                    // Calcular meses de diferencia y ajustar
                    const diffMonths = (threeMonthsAgo.getFullYear() - currentDate.getFullYear()) * 12 + (threeMonthsAgo.getMonth() - currentDate.getMonth());
                    currentDate.setMonth(currentDate.getMonth() + diffMonths);
                    // Asegurar que siga siendo el mismo diá del mes si es posible
                    if (currentDate.getDate() !== re.dayOfMonth) {
                        currentDate.setDate(re.dayOfMonth);
                    }
                } else if (re.frequency === Frequency.WEEKLY) {
                    // Avanzar semanas hasta llegar cerca de threeMonthsAgo
                    const diffTime = Math.abs(threeMonthsAgo.getTime() - currentDate.getTime());
                    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
                    currentDate.setDate(currentDate.getDate() + (diffWeeks * 7));
                }
            }

            if (re.frequency === Frequency.MONTHLY) {
                while (currentDate <= endDate) {
                    // Re-verificar día correcto del mes (por saltos de febrero, etc)
                    const targetDay = re.dayOfMonth > 28 ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() : re.dayOfMonth;
                    const checkDay = Math.min(re.dayOfMonth, targetDay);

                    const loopYear = currentDate.getFullYear();
                    const loopMonth = currentDate.getMonth() + 1;

                    const dayKey = `${loopYear}-${String(loopMonth).padStart(2, '0')}-${String(checkDay).padStart(2, '0')}`;
                    const consumedKey = `${re.id}-${dayKey}-${dayKey}`;

                    if (!consumedKeys.has(consumedKey) && !recordedDays.has(dayKey)) {
                        // ... (logica de push) ...
                        const override = recurringOverrides[re.id]?.[dayKey];
                        const overriddenAmount = override?.amount;
                        const finalDate = override?.date || dayKey;

                        generatedTransactions.push({
                            id: `gen-${re.id}-${dayKey}`,
                            date: finalDate,
                            originalDate: dayKey,
                            description: re.description,
                            amount: overriddenAmount !== undefined ? overriddenAmount : re.amount,
                            type: TransactionType.EXPENSE,
                            expenseType: re.expenseType,
                            categoryId: re.categoryId,
                            isRecurring: true,
                            recurringId: re.id,
                            status: 'projected',
                        });
                    }
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    // Resetear al día original para el siguiente mes
                    currentDate.setDate(re.dayOfMonth);
                }
            } else if (re.frequency === Frequency.WEEKLY) {
                let loopDate = new Date(currentDate);
                // Asegurar día de semana correcto tras el salto
                while (loopDate.getDay() !== re.dayOfWeek) loopDate.setDate(loopDate.getDate() + 1);

                while (loopDate <= endDate) {
                    const dateStr = loopDate.toISOString().slice(0, 10);
                    const consumedKey = `${re.id}-${dateStr}-${dateStr}`;

                    if (!consumedKeys.has(consumedKey) && !recordedDays.has(dateStr)) {
                        const override = recurringOverrides[re.id]?.[dateStr];
                        const finalDate = override?.date || dateStr;

                        generatedTransactions.push({
                            id: `gen-w-${re.id}-${dateStr}`,
                            date: finalDate,
                            originalDate: dateStr,
                            description: re.description,
                            amount: override?.amount !== undefined ? override.amount : re.amount,
                            type: TransactionType.EXPENSE,
                            expenseType: re.expenseType,
                            categoryId: re.categoryId,
                            isRecurring: true,
                            recurringId: re.id,
                            status: 'projected',
                        });
                    }
                    loopDate.setDate(loopDate.getDate() + 7);
                }
            }
        });

        // Combinar y ordenar solo una vez
        return [...transactions, ...generatedTransactions].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    }, [transactions, recurringExpenses, recurringOverrides, recordedDays, monthsAhead]);
}
