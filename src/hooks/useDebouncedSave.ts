import { useEffect, useRef } from 'react';

/**
 * Hook para auto-guardado optimizado con debouncing
 * Evita guardados excesivos en localStorage/IndexedDB
 * 
 * @param data - Datos a guardar
 * @param saveFunction - Función async que ejecuta el guardado
 * @param delay - Tiempo de espera en ms (default: 2000ms)
 * @param isEnabled - Flag para habilitar/deshabilitar el guardado
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
        // Skip en la primera ejecución (carga inicial)
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        if (!isEnabled) return;

        // Cancelar guardado pendiente
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Programar nuevo guardado
        timeoutRef.current = setTimeout(() => {
            saveFunction(data);
        }, delay);

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, delay, isEnabled]);
}
