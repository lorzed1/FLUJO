import { parseSpanishDate, isValidDate } from './dateUtils';
import { detectHeaderRow, type ColumnType } from './importUtils';
import { parseCOP } from '../components/ui/Input';

export interface ArqueoData {
    fecha: string;
    ventaBruta: number;
    propina: number;
    venta_sc?: number;
    efectivo: number;
    datafonoDavid: number;
    datafonoJulian: number;
    transfBancolombia: number;
    nequi: number;
    rappi: number;
    ingresoCovers: number;
    cajero: string;
    visitas: number;
    [key: string]: any; // Permitir columnas extra
}

export interface ParsedRow {
    data: ArqueoData;
    errors: string[];
    rowNumber: number;
    isValid: boolean;
    isDuplicate?: boolean;
    allData?: Record<string, any>; // Todas las columnas procesadas
}

export interface ParseResult {
    rows: ParsedRow[];
    validCount: number;
    errorCount: number;
    hasErrors: boolean;
}

export interface SystemFieldDef {
    key: keyof ArqueoData;
    label: string;
    aliases: string[];
    required?: boolean;
    exclude?: string[]; // Nuevas palabras clave para excluir en búsqueda fuzzy
}

export const SYSTEM_FIELDS: SystemFieldDef[] = [
    { key: 'fecha', label: 'Fecha', aliases: ['FECHA', 'DATE', 'DIA'], required: true },
    { key: 'cajero', label: 'Cajero', aliases: ['CAJERO', 'RESPONSABLE', 'ENCARGADO'], required: true },
    // Excluimos 'BRUTA' para evitar que mapee a 'VENTA BRUTA' (Base) cuando buscamos el Total
    { key: 'ventaBruta', label: 'Venta POS (Total)', aliases: ['VENTA', 'VENTA TOTAL', 'TOTAL VENTA', 'VENTA POS', 'POS', 'TOTAL'], required: true, exclude: ['BRUTA', 'BASE', 'NETA'] },
    // Venta Sin Cover (Neta) opcional
    { key: 'venta_sc', label: 'Venta Net (S/Cover)', aliases: ['VENTA SC', 'VENTA SIN COVER', 'NETO', 'SUBTOTAL', 'VENTA NETA'] },
    { key: 'propina', label: 'Propina', aliases: ['PROPINA', 'TIPS'] },
    { key: 'ingresoCovers', label: 'Covers', aliases: ['INGRESO X COVERS', 'COVERS', 'ENTRADAS'] },
    { key: 'efectivo', label: 'Efectivo', aliases: ['EFECTIVO', 'CASH'] },
    { key: 'datafonoDavid', label: 'Datafono 1', aliases: ['DATAFONO DAVID', 'D. DAVID', 'DAVID', 'DATAFONO 1', 'DATAFONO1'] },
    { key: 'datafonoJulian', label: 'Datafono 2', aliases: ['DATAFONO JULIAN', 'D. JULIAN', 'JULIAN', 'DATAFONO 2', 'DATAFONO2'] },
    { key: 'transfBancolombia', label: 'Bancolombia', aliases: ['BANCOLOMBIA', 'TRANSF', 'TRANSFERENCIA', 'BANCO'] },
    { key: 'nequi', label: 'Nequi', aliases: ['NEQUI'] },
    { key: 'rappi', label: 'Rappi', aliases: ['RAPPI', 'DOMICILIOS'] },
    { key: 'visitas', label: 'Visitas', aliases: ['VISITAS', 'PAX', 'CLIENTES', 'PERSONAS'] },
];


/**
 * Limpia un valor monetario colombiano y lo convierte a número
 * Delega a parseCOP para manejo robusto de decimales y miles.
 */
export function cleanCurrencyValue(value: string): number {
    if (!value) return 0;
    if (value === '-') return 0;
    // Asegurar que sea string
    const stringVal = String(value);
    return parseCOP(stringVal);
}

/**
 * Valida una fila de datos de Arqueo
 */
function validateArqueoRow(data: Partial<ArqueoData>, rowNumber: number): string[] {
    const errors: string[] = [];

    // Validar fecha
    if (!data.fecha) {
        errors.push('Fecha faltante');
    } else if (!isValidDate(data.fecha)) {
        errors.push('Fecha inválida');
    }

    // Validar venta bruta
    if (data.ventaBruta === undefined || data.ventaBruta < 0) {
        errors.push('Venta Bruta inválida');
    }

    // Validar cajero
    if (!data.cajero || data.cajero.trim() === '') {
        errors.push('Cajero faltante');
    }

    // Validar que montos sean no negativos
    const montos = [
        'propina', 'efectivo', 'datafonoDavid',
        'datafonoJulian', 'transfBancolombia', 'nequi', 'rappi', 'ingresoCovers'
    ];

    for (const campo of montos) {
        const valor = (data as any)[campo];
        if (valor !== undefined && valor < 0) {
            errors.push(`${campo} no puede ser negativo`);
        }
    }

    // Validar visitas
    if (data.visitas !== undefined && data.visitas < 0) {
        errors.push('Visitas no puede ser negativo');
    }

    return errors;
}

/**
 * Extrae encabezados y líneas del texto raw
 */
export function extractHeadersAndLines(text: string): { headers: string[], lines: string[], headerIndex: number } {
    const allLines = text.split('\n');
    if (allLines.length === 0) return { headers: [], lines: [], headerIndex: 0 };

    const rows = allLines.map(l => l.split('\t'));
    const headerIndex = detectHeaderRow(rows, SYSTEM_FIELDS);

    const headers = rows[headerIndex].map(h => h.trim());
    return { headers, lines: allLines, headerIndex };
}

/**
 * Intenta mapear automáticamente las columnas basado en alias
 */
export function autoMapColumns(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    const normalizedHeaders = headers.map(h => h.toUpperCase());

    SYSTEM_FIELDS.forEach(field => {
        // 1. Busqueda exacta de alias
        const match = field.aliases.find(alias => normalizedHeaders.includes(alias));
        if (match) {
            const index = normalizedHeaders.indexOf(match);
            mapping[field.key] = headers[index];
        } else {
            // 2. Busqueda parcial (contains)
            // Filtramos headers que contengan palabras prohibidas si existen
            const candidateIndex = normalizedHeaders.findIndex(h => {
                const matchesAlias = field.aliases.some(alias => h.includes(alias));
                if (!matchesAlias) return false;

                // Chequear exclusiones
                if (field.exclude) {
                    const containsExcluded = field.exclude.some(ex => h.includes(ex));
                    if (containsExcluded) return false;
                }
                return true;
            });

            if (candidateIndex !== -1) {
                mapping[field.key] = headers[candidateIndex];
            } else {
                mapping[field.key] = ''; // No encontrado
            }
        }
    });
    return mapping;
}

/**
 * Parsea datos de Excel usando un mapeo y tipos específicos
 */
export function parseExcelRows(
    lines: string[],
    mapping: Record<string, string>,
    types: Record<string, ColumnType>,
    headerIndex: number = 0
): ParseResult {
    const rows: ParsedRow[] = [];
    let validCount = 0;
    let errorCount = 0;

    try {
        if (lines.length <= headerIndex) {
            return { rows: [], validCount: 0, errorCount: 0, hasErrors: true };
        }

        const headers = lines[headerIndex].split('\t').map(h => h.trim());

        // Invertir mapeo para saber que key del sistema corresponde a cada columna (si existe)
        const reverseMapping: Record<string, string> = {};
        Object.entries(mapping).forEach(([sysKey, header]) => {
            if (header) reverseMapping[header] = sysKey;
        });

        // Procesar filas
        for (let i = headerIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const cells = line.split('\t');
            const rowNumber = i + 1;
            const data: Partial<ArqueoData> = {};
            const allData: Record<string, any> = {};

            headers.forEach((header, idx) => {
                const cellValue = (cells[idx] || '').trim();
                const type = types[header] || 'text';
                let processedValue: any = cellValue;

                // Procesar por tipo
                if (type === 'currency' || type === 'number') {
                    processedValue = cleanCurrencyValue(cellValue);
                } else if (type === 'date') {
                    processedValue = parseSpanishDate(cellValue) || cellValue;
                }

                // Guardar en allData (todas las columnas van aquí)
                allData[header] = processedValue;

                // Si está mapeado a un campo del sistema, guardarlo en data
                const sysKey = reverseMapping[header];
                if (sysKey) {
                    (data as any)[sysKey] = processedValue;
                }
            });

            // Asegurar que campos requeridos de ArqueoData tengan valor (default 0 para números)
            const numericFields: (keyof ArqueoData)[] = [
                'ventaBruta', 'propina', 'efectivo', 'datafonoDavid', 'datafonoJulian',
                'transfBancolombia', 'nequi', 'rappi', 'ingresoCovers', 'visitas'
            ];
            numericFields.forEach(f => {
                if ((data as any)[f] === undefined) (data as any)[f] = 0;
            });

            const rowErrors = validateArqueoRow(data, rowNumber);
            const isValid = rowErrors.length === 0;

            if (isValid) validCount++;
            else errorCount++;

            rows.push({
                data: data as ArqueoData,
                allData,
                errors: rowErrors,
                rowNumber,
                isValid
            });
        }

        return {
            rows,
            validCount,
            errorCount,
            hasErrors: errorCount > 0
        };
    } catch (error) {
        console.error("Error en parseExcelRows:", error);
        return { rows: [], validCount: 0, errorCount: 0, hasErrors: true };
    }
}

/**
 * @deprecated Use extractHeadersAndLines + autoMapColumns + parseExcelRows instead
 * Maintained for backward compatibility
 */
export function parseExcelData(text: string): ParseResult {
    const { headers, lines, headerIndex } = extractHeadersAndLines(text);
    const mapping = autoMapColumns(headers);
    // Para simplificar la compatibilidad, inferimos tipos básicos
    const types: Record<string, ColumnType> = {};
    headers.forEach(h => types[h] = 'text');
    return parseExcelRows(lines, mapping, types, headerIndex);
}

/**
 * Calcula el total recaudado para un registro de Arqueo
 */
export function calculateTotalRecaudado(data: Partial<ArqueoData>): number {
    return (
        (Number(data.efectivo) || 0) +
        (Number(data.datafonoDavid) || 0) +
        (Number(data.datafonoJulian) || 0) +
        (Number(data.transfBancolombia) || 0) +
        (Number(data.nequi) || 0) +
        (Number(data.rappi) || 0)
    );
}

/**
 * Calcula el descuadre para un registro de Arqueo
 */
export function calculateDescuadre(data: Partial<ArqueoData>): number {
    const totalIngresos = (Number(data.ventaBruta) || 0) + (Number(data.propina) || 0);
    const totalEgresos = calculateTotalRecaudado(data);
    return totalEgresos - totalIngresos;
}
