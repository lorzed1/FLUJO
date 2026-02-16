/**
 * Utilidades para parsear fechas en formato español
 */

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
