import { useMemo } from 'react';

/**
 * Hook optimizado para cálculos pesados con búsqueda O(1)
 * 
 * @example
 * ```tsx
 * const processedData = useOptimizedComputation(
 *   rawData,
 *   referenceSet,
 *   (item, refs) => {
 *     // Usar Set.has() en vez de Array.some()
 *     if (refs.has(item.id)) return processItem(item);
 *   }
 * );
 * ```
 */
export function useOptimizedComputation<T, R>(
    data: T[],
    referenceData: any[],
    computeFn: (item: T, refSet: Set<string>) => R
): R[] {
    return useMemo(() => {
        // Convertir a Set para búsqueda O(1)
        const refSet = new Set(referenceData.map(r => r.id || r));

        return data.map(item => computeFn(item, refSet));
    }, [data, referenceData]);
}
