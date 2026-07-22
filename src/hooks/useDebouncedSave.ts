import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook para auto-guardado optimizado con debouncing.
 * 
 * MEJORAS v2:
 * - Usa snapshot JSON para evitar saves redundantes cuando los datos
 *   no han cambiado realmente (ej: carga inicial que setea el mismo valor).
 * - Skip del primer render + skip cuando isEnabled es false.
 * - Cleanup de timeout al desmontar.
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
    const lastSavedSnapshotRef = useRef<string>('');

    useEffect(() => {
        // Skip en la primera ejecución (carga inicial)
        if (isFirstRun.current) {
            isFirstRun.current = false;
            // Guardar snapshot inicial para comparar después
            try {
                lastSavedSnapshotRef.current = JSON.stringify(data);
            } catch {
                lastSavedSnapshotRef.current = '';
            }
            return;
        }

        if (!isEnabled) return;

        // Comparar snapshot: si los datos no cambiaron realmente, no guardar
        let currentSnapshot = '';
        try {
            currentSnapshot = JSON.stringify(data);
        } catch {
            currentSnapshot = String(data);
        }

        if (currentSnapshot === lastSavedSnapshotRef.current) {
            // Los datos son idénticos al último save → no hacer nada
            return;
        }

        // Cancelar guardado pendiente
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Programar nuevo guardado
        timeoutRef.current = setTimeout(() => {
            lastSavedSnapshotRef.current = currentSnapshot;
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
