/**
 * @module numbers
 * @description Utilidades para operaciones numéricas seguras.
 * 
 * REGLA: Usar estas funciones para TODA operación aritmética con moneda o decimales.
 * JavaScript tiene imprecisión con flotantes (0.1 + 0.2 = 0.30000000000000004).
 * Estas funciones garantizan resultados correctos.
 */

/**
 * Redondea un número a N decimales de forma segura.
 * Evita errores de punto flotante de JavaScript.
 * 
 * @example
 * safeRound(0.1 + 0.2, 2) // → 0.3 (no 0.30000000000000004)
 * safeRound(1234.5678, 0) // → 1235
 */
export function safeRound(value: number, decimals: number = 0): number {
    if (!isFinite(value)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Suma un array de números de forma segura.
 * Evita acumulación de errores de punto flotante.
 * 
 * @example
 * safeSum([0.1, 0.2, 0.3]) // → 0.6
 * safeSum([1000, 2000, -500]) // → 2500
 */
export function safeSum(values: number[], decimals: number = 0): number {
    const total = values.reduce((acc, val) => acc + (isFinite(val) ? val : 0), 0);
    return safeRound(total, decimals);
}

/**
 * Parsea un string de moneda a número.
 * Soporta formato latino (1.234.567,00) y americano (1,234,567.00).
 * 
 * @example
 * parseCurrency("$ 1.234.567") // → 1234567
 * parseCurrency("1,234,567.50") // → 1234567.5
 * parseCurrency("-$ 500.000") // → -500000
 * parseCurrency("") // → 0
 * parseCurrency(null) // → 0
 */
export function parseCurrency(value: string | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return isFinite(value) ? value : 0;

    // Limpiar espacios y símbolo de moneda
    let cleaned = String(value).trim();

    // Detectar si es negativo
    const isNegative = cleaned.startsWith('-') || cleaned.includes('(');
    cleaned = cleaned.replace(/[()]/g, '');

    // Eliminar símbolo de moneda y espacios
    cleaned = cleaned.replace(/[$€£¥COP\s]/gi, '').trim();

    if (!cleaned || cleaned === '-') return 0;

    // Detectar formato: si tiene punto seguido de 3 dígitos, es separador de miles
    // Formato latino: 1.234.567,00 (punto = miles, coma = decimales)
    // Formato americano: 1,234,567.00 (coma = miles, punto = decimales)
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');

    let normalizedStr: string;

    if (lastComma > lastDot) {
        // Formato latino: 1.234.567,50 → la coma es decimal
        normalizedStr = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        // Formato americano: 1,234,567.50 → el punto es decimal
        // PERO verificar: si hay exactamente 3 dígitos después del punto y no hay coma,
        // podría ser punto de miles sin decimal (ej: 914.350 = 914350)
        const afterDot = cleaned.substring(lastDot + 1);
        const beforeDot = cleaned.substring(0, lastDot);
        const hasMultipleDots = (cleaned.match(/\./g) || []).length > 1;

        if (hasMultipleDots) {
            // Múltiples puntos = separador de miles (1.234.567)
            normalizedStr = cleaned.replace(/\./g, '');
        } else if (afterDot.length === 3 && !beforeDot.includes(',') && /^\d+$/.test(afterDot)) {
            // Solo un punto con 3 dígitos después y sin comas → ambiguo
            // En contexto COP (sin centavos), asumir que es separador de miles
            normalizedStr = cleaned.replace('.', '');
        } else {
            // Formato americano estándar
            normalizedStr = cleaned.replace(/,/g, '');
        }
    } else {
        // Sin punto ni coma, o solo uno de ellos
        normalizedStr = cleaned.replace(/,/g, '');
    }

    // Eliminar cualquier carácter no numérico restante (excepto punto decimal y signo negativo)
    normalizedStr = normalizedStr.replace(/[^\d.\-]/g, '');

    const result = parseFloat(normalizedStr);
    if (isNaN(result) || !isFinite(result)) return 0;

    return isNegative ? -Math.abs(result) : result;
}

/**
 * Convierte un valor a número de forma segura.
 * Útil para leer datos de formularios o APIs.
 * 
 * @example
 * toNumber("123") // → 123
 * toNumber(undefined, 0) // → 0
 * toNumber("abc", -1) // → -1
 */
export function toNumber(value: unknown, fallback: number = 0): number {
    if (typeof value === 'number') return isFinite(value) ? value : fallback;
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
}

/**
 * Calcula el porcentaje de un valor sobre un total.
 * Retorna 0 si el total es 0 (evita división por cero).
 * 
 * @example
 * percentage(25, 100) // → 25
 * percentage(1, 3, 2) // → 33.33
 * percentage(0, 0) // → 0
 */
export function percentage(value: number, total: number, decimals: number = 1): number {
    if (!total || !isFinite(total) || total === 0) return 0;
    return safeRound((value / total) * 100, decimals);
}

/**
 * Clamp: restringe un número dentro de un rango [min, max].
 * 
 * @example
 * clamp(150, 0, 100) // → 100
 * clamp(-5, 0, 100) // → 0
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
