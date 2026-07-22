/**
 * @module formatters
 * @description Funciones de formateo centralizadas para toda la aplicación.
 * 
 * REGLA ABSOLUTA: Todo formateo visual de números, moneda, fechas y porcentajes
 * DEBE usar estas funciones. Nunca usar .toLocaleString() directamente en componentes.
 */

import { LOCALE, CURRENCY_CODE } from '@/constants';
import { safeRound } from './numbers';

// ========================================
// MONEDA
// ========================================

/**
 * Formatea un valor monetario en pesos colombianos (COP) a string legible.
 * Sin decimales (COP no usa centavos en contexto HORECA).
 * 
 * @example
 * formatMoney(1074300)   // → "$ 1.074.300"
 * formatMoney(-500000)   // → "-$ 500.000"
 * formatMoney(0)         // → "$ 0"
 * formatMoney(undefined) // → "$ 0"
 */
export function formatMoney(value: number | null | undefined): string {
    const safeValue = typeof value === 'number' && isFinite(value) ? value : 0;

    const formatted = new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency: CURRENCY_CODE,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(safeValue);

    // Intl produce "COP 1.234" o "$1.234", normalizar a "$ 1.234"
    return formatted
        .replace('COP', '$')
        .replace(/\$\s*/g, '$ ')
        .trim();
}

/**
 * Formatea un valor monetario de forma compacta (para KPIs y espacios reducidos).
 * 
 * @example
 * formatMoneyCompact(1500000)  // → "$1.5M"
 * formatMoneyCompact(250000)   // → "$250K"
 * formatMoneyCompact(1500)     // → "$1.5K"
 * formatMoneyCompact(500)      // → "$500"
 */
export function formatMoneyCompact(value: number | null | undefined): string {
    const safeValue = typeof value === 'number' && isFinite(value) ? Math.abs(value) : 0;
    const sign = (typeof value === 'number' && value < 0) ? '-' : '';

    if (safeValue >= 1_000_000) {
        return `${sign}$${safeRound(safeValue / 1_000_000, 1)}M`;
    }
    if (safeValue >= 1_000) {
        return `${sign}$${safeRound(safeValue / 1_000, 1)}K`;
    }
    return `${sign}$${safeRound(safeValue, 0)}`;
}

// ========================================
// NÚMEROS
// ========================================

/**
 * Formatea un número con separador de miles.
 * 
 * @example
 * formatNumber(1234567)     // → "1.234.567"
 * formatNumber(1234.56, 2)  // → "1.234,56"
 * formatNumber(0)           // → "0"
 */
export function formatNumber(value: number | null | undefined, decimals: number = 0): string {
    const safeValue = typeof value === 'number' && isFinite(value) ? value : 0;

    return new Intl.NumberFormat(LOCALE, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(safeRound(safeValue, decimals));
}

// ========================================
// PORCENTAJES
// ========================================

/**
 * Formatea un valor como porcentaje.
 * 
 * @example
 * formatPercent(25.5)      // → "25,5%"
 * formatPercent(100)       // → "100%"
 * formatPercent(-3.14, 2)  // → "-3,14%"
 */
export function formatPercent(value: number | null | undefined, decimals: number = 1): string {
    const safeValue = typeof value === 'number' && isFinite(value) ? value : 0;
    return `${formatNumber(safeValue, decimals)}%`;
}

// ========================================
// FECHAS
// ========================================

/**
 * Formatea una fecha ISO (YYYY-MM-DD) a formato display (DD/MM/YYYY).
 * 
 * @example
 * formatDate("2026-01-15")   // → "15/01/2026"
 * formatDate("2026-12-01")   // → "01/12/2026"
 * formatDate("")             // → ""
 * formatDate(null)           // → ""
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
    if (!dateStr) return '';

    try {
        let isoStr: string;

        if (dateStr instanceof Date) {
            const y = dateStr.getFullYear();
            const m = String(dateStr.getMonth() + 1).padStart(2, '0');
            const d = String(dateStr.getDate()).padStart(2, '0');
            isoStr = `${y}-${m}-${d}`;
        } else if (typeof dateStr === 'string') {
            isoStr = dateStr.split('T')[0];
        } else {
            return String(dateStr);
        }

        if (isoStr.includes('-')) {
            const parts = isoStr.split('-');
            if (parts.length === 3) {
                const [year, month, day] = parts;
                return `${day}/${month}/${year}`;
            }
        }

        return String(dateStr);
    } catch {
        return String(dateStr);
    }
}

/**
 * Formatea una fecha ISO a formato largo en español.
 * 
 * @example
 * formatDateLong("2026-01-15") // → "Miércoles, 15 de Enero de 2026"
 */
export function formatDateLong(dateStr: string | null | undefined): string {
    if (!dateStr) return '';

    try {
        // Crear la fecha a mediodía para evitar problemas de zona horaria
        const date = new Date(dateStr + 'T12:00:00');
        if (isNaN(date.getTime())) return String(dateStr);

        return date.toLocaleDateString(LOCALE, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch {
        return String(dateStr);
    }
}

/**
 * Formatea una fecha relativa (hace X días, en X días).
 * 
 * @example
 * formatDateRelative("2026-02-13") // → "Hoy" (si hoy es 13/02/2026)
 * formatDateRelative("2026-02-12") // → "Ayer"
 * formatDateRelative("2026-02-10") // → "Hace 3 días"
 */
export function formatDateRelative(dateStr: string | null | undefined): string {
    if (!dateStr) return '';

    try {
        const now = new Date();
        const target = new Date(dateStr + 'T12:00:00');
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const diffMs = target.getTime() - new Date(todayStr + 'T12:00:00').getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Mañana';
        if (diffDays === -1) return 'Ayer';
        if (diffDays > 1 && diffDays <= 7) return `En ${diffDays} días`;
        if (diffDays < -1 && diffDays >= -7) return `Hace ${Math.abs(diffDays)} días`;

        return formatDate(dateStr);
    } catch {
        return formatDate(dateStr);
    }
}
