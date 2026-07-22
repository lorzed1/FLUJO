/**
 * @module validators
 * @description Validaciones reutilizables para formularios y datos.
 * 
 * REGLA: Importar desde `@/utils/validators` para toda validación.
 * No duplicar lógica de validación en componentes.
 */

/**
 * Verifica si un string no está vacío (después de trim).
 */
export function isNotEmpty(value: string | null | undefined): boolean {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Verifica si un valor es un número finito válido.
 */
export function isValidNumber(value: unknown): value is number {
    return typeof value === 'number' && isFinite(value) && !isNaN(value);
}

/**
 * Verifica si un monto monetario es válido (número finito ≥ 0).
 */
export function isValidAmount(value: unknown): boolean {
    return isValidNumber(value as number) && (value as number) >= 0;
}

/**
 * Verifica si una fecha ISO (YYYY-MM-DD) es válida.
 * 
 * @example
 * isValidISODate("2026-01-15") // → true
 * isValidISODate("2026-13-45") // → false
 * isValidISODate("15/01/2026") // → false
 */
export function isValidISODate(dateStr: string | null | undefined): boolean {
    if (!dateStr || typeof dateStr !== 'string') return false;

    // Verificar formato YYYY-MM-DD
    const regex = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
    if (!regex.test(dateStr)) return false;

    // Verificar que es una fecha real (no 2026-02-30)
    const date = new Date(dateStr + 'T12:00:00');
    const [year, month, day] = dateStr.split('-').map(Number);
    return (
        date.getFullYear() === year &&
        date.getMonth() + 1 === month &&
        date.getDate() === day
    );
}

/**
 * Verifica si un email tiene formato válido.
 */
export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Verifica que un rango de fechas sea válido (desde ≤ hasta).
 */
export function isValidDateRange(from: string, to: string): boolean {
    if (!isValidISODate(from) || !isValidISODate(to)) return false;
    return from <= to;
}

/**
 * Verifica que un array no esté vacío.
 */
export function isNonEmptyArray<T>(arr: unknown): arr is T[] {
    return Array.isArray(arr) && arr.length > 0;
}

/**
 * Sanitiza un string para prevenir XSS básico.
 * Remueve tags HTML y trim.
 */
export function sanitizeString(value: string): string {
    return value.replace(/<[^>]*>/g, '').trim();
}
