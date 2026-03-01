import { useEffect, useRef } from 'react';

/**
 * Hook para auto-guardado optimizado con debouncing
 * 
 * @example
 * ```tsx
 * // En AppContext.tsx
 * useDebouncedSave(transactions, DataService.saveTransactions, 2000, isDataLoaded);
 * ```
 */
export function useDebouncedSave<T>(
    data: T,
    saveFunction: (data: T) => void | Promise<void>,
    delay: number = 2000,
    isEnabled: boolean = true
) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        if (!isEnabled) return;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            saveFunction(data);
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, delay, isEnabled]);
}
