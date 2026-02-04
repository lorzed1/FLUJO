/**
 * Utilidades para parsear datos de Excel/TSV para Arqueo de Caja
 */

import { parseSpanishDate, isValidDate } from './dateUtils';

export interface ArqueoData {
    fecha: string;
    ventaBruta: number;
    propina: number;
    efectivo: number;
    datafonoDavid: number;
    datafonoJulian: number;
    transfBancolombia: number;
    nequi: number;
    rappi: number;
    ingresoCovers: number;
    cajero: string;
    visitas: number;
}

export interface ParsedRow {
    data: ArqueoData;
    errors: string[];
    rowNumber: number;
    isValid: boolean;
    isDuplicate?: boolean;
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

import { parseCOP } from '../components/ui/Input';

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
export function extractHeadersAndLines(text: string): { headers: string[], lines: string[] } {
    const allLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (allLines.length < 2) return { headers: [], lines: [] };

    // Asumimos que la primera línea son los encabezados
    const headers = allLines[0].split('\t').map(h => h.trim());
    return { headers, lines: allLines };
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
 * Parsea datos de Excel usando un mapeo específico
 * @param lines Todas las líneas incluyendo encabezados
 * @param mapping Objeto que mapea keyDelSistema -> nombreHeaderExcel
 */
export function parseExcelRows(lines: string[], mapping: Record<string, string>): ParseResult {
    const rows: ParsedRow[] = [];
    let validCount = 0;
    let errorCount = 0;

    try {
        if (lines.length < 2) {
            return { rows: [], validCount: 0, errorCount: 0, hasErrors: true };
        }

        const headers = lines[0].split('\t').map(h => h.trim());

        // Convertir mapping (nombres) a índices
        const columnIndices: Record<string, number> = {};
        Object.entries(mapping).forEach(([key, headerName]) => {
            if (headerName) {
                const idx = headers.findIndex(h => h.trim() === headerName.trim());
                if (idx !== -1) columnIndices[key] = idx;
            }
        });

        // Procesar filas
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const cells = line.split('\t');
            const rowNumber = i + 1;
            const rowErrors: string[] = [];
            const data: Partial<ArqueoData> = {};

            // FECHA
            if (columnIndices.fecha !== undefined) {
                const fechaStr = cells[columnIndices.fecha]?.trim();
                if (fechaStr) {
                    const fechaISO = parseSpanishDate(fechaStr);
                    if (fechaISO) {
                        data.fecha = fechaISO;
                    } else {
                        rowErrors.push(`Fecha inválida: "${fechaStr}"`);
                        data.fecha = '';
                    }
                }
            }

            // CAMPOS MONETARIOS
            const currencyFields: (keyof ArqueoData)[] = [
                'ventaBruta', 'propina', 'efectivo',
                'datafonoDavid', 'datafonoJulian', 'transfBancolombia',
                'nequi', 'rappi', 'ingresoCovers'
            ];

            for (const field of currencyFields) {
                if (columnIndices[field] !== undefined) {
                    const cellValue = cells[columnIndices[field]]?.trim() || '';
                    (data as any)[field] = cleanCurrencyValue(cellValue);
                } else {
                    (data as any)[field] = 0;
                }
            }

            // CAJERO
            if (columnIndices.cajero !== undefined) {
                data.cajero = cells[columnIndices.cajero]?.trim() || '';
            }

            // VISITAS
            if (columnIndices.visitas !== undefined) {
                const visitasStr = cells[columnIndices.visitas]?.trim() || '0';
                data.visitas = parseInt(visitasStr, 10) || 0;
            }

            // Validar
            const validationErrors = validateArqueoRow(data, rowNumber);
            rowErrors.push(...validationErrors);

            const isValid = rowErrors.length === 0;

            if (isValid) validCount++; else errorCount++;

            rows.push({
                data: data as ArqueoData,
                errors: rowErrors,
                rowNumber,
                isValid
            });
        }

    } catch (error) {
        console.error('Error parsing Excel data:', error);
    }

    return {
        rows,
        validCount,
        errorCount,
        hasErrors: errorCount > 0
    };
}

/**
 * @deprecated Use extractHeadersAndLines + autoMapColumns + parseExcelRows instead
 * Maintained for backward compatibility
 */
export function parseExcelData(text: string): ParseResult {
    const { headers, lines } = extractHeadersAndLines(text);
    const mapping = autoMapColumns(headers);
    return parseExcelRows(lines, mapping);
}

/**
 * Calcula el total recaudado para un registro de Arqueo
 */
export function calculateTotalRecaudado(data: ArqueoData): number {
    return (
        data.efectivo +
        data.datafonoDavid +
        data.datafonoJulian +
        data.transfBancolombia +
        data.nequi +
        data.rappi
    );
}

/**
 * Calcula el descuadre para un registro de Arqueo
 */
export function calculateDescuadre(data: ArqueoData): number {
    const totalIngresos = (Number(data.ventaBruta) || 0) + (Number(data.propina) || 0);
    const totalEgresos = calculateTotalRecaudado(data);
    return totalEgresos - totalIngresos;
}
