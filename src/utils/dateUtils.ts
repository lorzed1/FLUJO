/**
 * Utilidades para parsear fechas en formato español
 */
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';


const MESES_ESPANOL: Record<string, number> = {
    'enero': 1,
    'febrero': 2,
    'marzo': 3,
    'abril': 4,
    'mayo': 5,
    'junio': 6,
    'julio': 7,
    'agosto': 8,
    'septiembre': 9,
    'octubre': 10,
    'noviembre': 11,
    'diciembre': 12
};

/**
 * Convierte una fecha en formato español largo a formato ISO (YYYY-MM-DD)
 * Ejemplo: "sábado 17 de enero de 2026" -> "2026-01-17"
 */
export function parseSpanishDate(dateStr: string): string | null {
    try {
        // Limpiar la cadena
        const cleaned = dateStr.trim().toLowerCase();

        // Regex para extraer componentes: "día de mes de año"
        // Puede o no tener día de la semana al inicio
        const regex = /(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})/i;
        const match = cleaned.match(regex);

        if (!match) {
            return null;
        }

        const dia = parseInt(match[1], 10);
        const mesNombre = match[2].toLowerCase();
        const anio = parseInt(match[3], 10);

        // Buscar el mes
        const mes = MESES_ESPANOL[mesNombre];
        if (!mes) {
            return null;
        }

        // Validar rango de día
        if (dia < 1 || dia > 31) {
            return null;
        }

        // Construir fecha ISO
        const mesStr = mes.toString().padStart(2, '0');
        const diaStr = dia.toString().padStart(2, '0');

        return `${anio}-${mesStr}-${diaStr}`;
    } catch (error) {
        console.error('Error parsing Spanish date:', error);
        return null;
    }
}

export function isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Obtiene la fecha actual local en formato ISO (YYYY-MM-DD)
 * Evita el problema de toISOString() que devuelve UTC
 */
export function getLocalDateISO(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function formatDateToDisplay(dateStr: string | any): string {
    if (!dateStr) return '';
    try {
        // Si es un objeto fecha, convertir a ISO string
        let isoStr = dateStr;
        if (dateStr instanceof Date) {
            isoStr = dateStr.toISOString().split('T')[0];
        } else if (typeof dateStr === 'string') {
            isoStr = dateStr.split('T')[0];
        }

        if (typeof isoStr === 'string' && isoStr.includes('-')) {
            const parts = isoStr.split('-');
            if (parts.length === 3) {
                const [year, month, day] = parts;
                return `${day}/${month}/${year}`;
            }
        }
        return String(dateStr);
    } catch (e) {
        return String(dateStr);
    }
}

/**
 * Retorna las fechas exactas de inicio y fin para buscar semanas completas 
 * que intersectan un mes dado (incluso si cruzan de mes).
 * Empieza el primer Lunes contiguo y termina el último Domingo contiguo.
 * Estandarizado para evitar repetir la misma lógica en múltiples gráficas semanales.
 */
export function getCompleteWeeksRange(currentDate: Date | number, weekStartsOn: 0 | 1 = 1) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

    const weekDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return {
        monthStart,
        monthEnd,
        calendarStart,
        calendarEnd,
        weekDays,
        startStr: format(calendarStart, 'yyyy-MM-dd'),
        endStr: format(calendarEnd, 'yyyy-MM-dd')
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES UTC PURAS — Para importación y conciliación bancaria
// ═══════════════════════════════════════════════════════════════════════════════
// REGLA FUNDAMENTAL: Todas las fechas se procesan en UTC para evitar
// desfases de ±1 día causados por la timezone local del navegador.
// Formato de salida estándar: "YYYY-MM-DD" (string puro, sin hora, sin timezone).
// ═══════════════════════════════════════════════════════════════════════════════

// Epoch de Excel en UTC: día 0 = 1899-12-30
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;

/**
 * Detecta si un valor parece ser un serial de Excel.
 * Seriales razonables para fechas (1950-2100): ~18264 a ~73050.
 */
export function isExcelSerial(value: unknown): boolean {
    if (typeof value === 'number') return value > 0 && value < 200_000;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length === 0 || trimmed.length > 6) return false;
        const num = Number(trimmed);
        return !isNaN(num) && num > 0 && num < 200_000;
    }
    return false;
}

/**
 * Convierte un serial de Excel a "YYYY-MM-DD" en UTC.
 * Fórmula: epoch + (serial × 86400000ms), extraído con getUTC*.
 */
export function excelSerialToDateString(serial: number): string {
    const ms = EXCEL_EPOCH_MS + Math.round(serial * MS_PER_DAY);
    const d = new Date(ms);
    return formatDateUTC(d);
}

/**
 * Formatea un Date a "YYYY-MM-DD" usando SIEMPRE UTC.
 * NUNCA usa getDate()/getMonth() locales.
 */
export function formatDateUTC(d: Date): string {
    if (!d || isNaN(d.getTime())) return '';
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parsea DD/MM/YYYY o DD-MM-YYYY a "YYYY-MM-DD".
 * NO pasa por new Date() — manipulación directa de strings.
 */
export function parseDMY(dateStr: string): string | null {
    const match = dateStr.trim().match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
    if (!match) return null;
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/**
 * Valida y extrae "YYYY-MM-DD" de un string que empiece con ese formato.
 */
export function parseISODate(dateStr: string): string | null {
    const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const [, y, m, d] = match;
    const testDate = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (isNaN(testDate.getTime())) return null;
    return `${y}-${m}-${d}`;
}

/**
 * Función maestra: normaliza CUALQUIER formato de fecha a "YYYY-MM-DD" UTC.
 * 
 * Prioridad:
 * 1. Serial de Excel
 * 2. Objeto Date nativo
 * 3. String ISO "YYYY-MM-DD..."
 * 4. String DD/MM/YYYY o DD-MM-YYYY
 * 5. Fallback: new Date() + extracción UTC
 */
export function normalizeDate(value: unknown, fallback: string = ''): string {
    if (value === null || value === undefined || value === '') return fallback;

    // 1. Serial de Excel
    if (isExcelSerial(value)) {
        const serial = typeof value === 'number' ? value : Number(String(value).trim());
        return excelSerialToDateString(serial);
    }

    // 2. Objeto Date nativo
    if (value instanceof Date) {
        if (isNaN(value.getTime())) return fallback;
        return formatDateUTC(value);
    }

    // Solo strings a partir de aquí
    if (typeof value !== 'string') return fallback;

    const trimmed = value.trim();
    if (trimmed.length === 0) return fallback;

    // 3. ISO "YYYY-MM-DD..." — extraer directamente SIN new Date()
    const isoResult = parseISODate(trimmed);
    if (isoResult) return isoResult;

    // 4. DD/MM/YYYY o DD-MM-YYYY
    const dmyResult = parseDMY(trimmed);
    if (dmyResult) return dmyResult;

    // 5. Fallback: new Date() + extracción UTC
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
        return formatDateUTC(parsed);
    }

    return fallback;
}

/**
 * Diferencia en días entre dos fechas "YYYY-MM-DD".
 * Trabaja directamente con los componentes del string, sin new Date() local.
 * Retorna 999 si algún formato es inválido.
 */
export function daysDiffUTC(date1: string, date2: string): number {
    const parts1 = date1?.split('T')[0]?.split('-');
    const parts2 = date2?.split('T')[0]?.split('-');

    if (!parts1 || parts1.length < 3 || !parts2 || parts2.length < 3) return 999;

    const ms1 = Date.UTC(Number(parts1[0]), Number(parts1[1]) - 1, Number(parts1[2]));
    const ms2 = Date.UTC(Number(parts2[0]), Number(parts2[1]) - 1, Number(parts2[2]));

    if (isNaN(ms1) || isNaN(ms2)) return 999;

    return Math.round(Math.abs(ms2 - ms1) / MS_PER_DAY);
}

/**
 * Compara dos fechas "YYYY-MM-DD" por igualdad exacta.
 * Extrae solo la parte de fecha (antes de 'T').
 */
export function datesEqual(date1: string, date2: string): boolean {
    const d1 = date1?.split('T')[0];
    const d2 = date2?.split('T')[0];
    return d1 === d2 && d1 !== undefined && d1 !== '';
}
