/**
 * @module constants
 * @description Constantes globales del proyecto.
 * 
 * REGLA: Toda constante "mágica" que se use en ≥2 archivos debe estar aquí.
 * No hardcodear valores como 'es-CO', 'COP', etc. en componentes.
 */

// ========================================
// Locale y Moneda
// ========================================

/** Locale principal para formateo de números y fechas */
export const LOCALE = 'es-CO';

/** Código de moneda ISO 4217 */
export const CURRENCY_CODE = 'COP';

/** Símbolo de moneda para display */
export const CURRENCY_SYMBOL = '$';

/** Zona horaria del negocio */
export const TIMEZONE = 'America/Bogota';

/** Offset UTC de la zona horaria (en horas) */
export const TIMEZONE_OFFSET = -5;

// ========================================
// Breakpoints Responsive (px)
// ========================================

/** Breakpoints alineados con Tailwind CSS */
export const BREAKPOINTS = {
    /** Teléfonos pequeños */
    xs: 320,
    /** Teléfonos */
    sm: 640,
    /** Tablets */
    md: 768,
    /** Laptops */
    lg: 1024,
    /** Desktops */
    xl: 1280,
    /** Pantallas grandes */
    '2xl': 1536,
} as const;

// ========================================
// Límites de UI
// ========================================

/** Filas por página por defecto en tablas */
export const DEFAULT_PAGE_SIZE = 25;

/** Opciones de filas por página */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/** Delay de debounce para búsquedas (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Delay de debounce para auto-guardado (ms) */
export const AUTOSAVE_DEBOUNCE_MS = 2000;

/** Máximo de caracteres para descripciones */
export const MAX_DESCRIPTION_LENGTH = 500;

// ========================================
// Formatos de Fecha
// ========================================

/** Formato de fecha para display (DD/MM/YYYY) */
export const DATE_FORMAT_DISPLAY = 'dd/MM/yyyy';

/** Formato de fecha para storage (YYYY-MM-DD) */
export const DATE_FORMAT_STORAGE = 'yyyy-MM-dd';

/** Días de la semana en español (0=Domingo) */
export const DAYS_OF_WEEK = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles',
    'Jueves', 'Viernes', 'Sábado'
] as const;

/** Meses del año en español (0-indexed) */
export const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril',
    'Mayo', 'Junio', 'Julio', 'Agosto',
    'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
] as const;

// ========================================
// Colores del Sistema (para uso en JS, ej. Recharts)
// ========================================

/** Paleta de colores para gráficos */
export const CHART_COLORS = {
    primary: '#3b82f6',    // blue-500
    secondary: '#8b5cf6',  // violet-500
    success: '#22c55e',    // green-500
    warning: '#f59e0b',    // amber-500
    danger: '#ef4444',     // red-500
    info: '#06b6d4',       // cyan-500
    muted: '#94a3b8',      // slate-400
} as const;

/** Paleta extendida para series múltiples en gráficos */
export const CHART_SERIES_COLORS = [
    '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b',
    '#ef4444', '#06b6d4', '#ec4899', '#f97316',
    '#14b8a6', '#6366f1',
] as const;
