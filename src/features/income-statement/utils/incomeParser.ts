import { parseSpanishDate, isValidDate } from '../../../utils/dateUtils';
import { parseCOP } from '../../../components/ui/Input';
import { detectHeaderRow, type ColumnType } from '../../../utils/importUtils';

export interface IncomeData {
    date: string;
    code?: string;
    description: string;
    category: string;
    amount: number;
    type: 'income' | 'expense';
    [key: string]: any; // Permitir columnas extra
}

export interface ParsedIncomeRow {
    data: IncomeData;
    allData?: Record<string, any>; // Todas las columnas procesadas
    errors: string[];
    rowNumber: number;
    isValid: boolean;
}

export interface IncomeSystemFieldDef {
    key: keyof IncomeData;
    label: string;
    aliases: string[];
    required?: boolean;
}

export const INCOME_SYSTEM_FIELDS: IncomeSystemFieldDef[] = [
    { key: 'date', label: 'Fecha', aliases: ['FECHA', 'DATE', 'DIA'], required: true },
    { key: 'code', label: 'Código (Opcional)', aliases: ['CODIGO', 'CUENTA', 'CODE', 'ACCOUNT'] },
    { key: 'description', label: 'Descripción', aliases: ['DESCRIPCION', 'DETALLE', 'CONCEPTO', 'MEMO'], required: true },
    { key: 'category', label: 'Categoría', aliases: ['CATEGORIA', 'RUBRO', 'CLASIFICACION'], required: true },
    { key: 'amount', label: 'Monto', aliases: ['MONTO', 'VALOR', 'IMPORTE', 'TOTAL'], required: true },
    { key: 'type', label: 'Tipo (Opcional)', aliases: ['TIPO', 'CLASE', 'NATURE'] }, // If missing, infer from amount sign
];

export function cleanCurrencyValue(value: string): number {
    if (!value) return 0;
    if (value === '-') return 0;
    return parseCOP(String(value));
}

export function extractHeadersAndLines(text: string): { headers: string[], lines: string[], headerIndex: number } {
    const allLines = text.split('\n');
    if (allLines.length === 0) return { headers: [], lines: [], headerIndex: 0 };

    const rows = allLines.map(l => l.split('\t'));
    const headerIndex = detectHeaderRow(rows, INCOME_SYSTEM_FIELDS);

    const headers = rows[headerIndex].map(h => h.trim());
    return { headers, lines: allLines, headerIndex };
}

export function autoMapColumns(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    const normalizedHeaders = headers.map(h => h.toUpperCase());

    INCOME_SYSTEM_FIELDS.forEach(field => {
        const match = field.aliases.find(alias => normalizedHeaders.includes(alias));
        if (match) {
            const index = normalizedHeaders.indexOf(match);
            mapping[field.key] = headers[index];
        } else {
            const candidateIndex = normalizedHeaders.findIndex(h => field.aliases.some(alias => h.includes(alias)));
            if (candidateIndex !== -1) {
                mapping[field.key] = headers[candidateIndex];
            } else {
                mapping[field.key] = '';
            }
        }
    });
    return mapping;
}

export function parseIncomeRows(
    lines: string[],
    mapping: Record<string, string>,
    types: Record<string, ColumnType>,
    headerIndex: number = 0
): { rows: ParsedIncomeRow[], validCount: number, errorCount: number } {
    const rows: ParsedIncomeRow[] = [];
    let validCount = 0;
    let errorCount = 0;

    if (lines.length <= headerIndex) return { rows: [], validCount: 0, errorCount: 0 };

    const headers = lines[headerIndex].split('\t').map(h => h.trim());

    // Invertimos el mapeo para saber que key del sistema corresponde a cada columna (si existe)
    const reverseMapping: Record<string, string> = {};
    Object.entries(mapping).forEach(([sysKey, header]) => {
        if (header) reverseMapping[header] = sysKey;
    });

    for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const cells = line.split('\t');
        const rowNumber = i + 1;
        const rowErrors: string[] = [];
        const data: Partial<IncomeData> = {};
        const allData: Record<string, any> = {};

        headers.forEach((header, idx) => {
            const cellValue = (cells[idx] || '').trim();
            const type = types[header] || 'text';
            let processedValue: any = cellValue;

            if (type === 'currency' || type === 'number') {
                processedValue = cleanCurrencyValue(cellValue);
            } else if (type === 'date') {
                processedValue = parseSpanishDate(cellValue) || cellValue;
            }

            allData[header] = processedValue;

            const sysKey = reverseMapping[header];
            if (sysKey) {
                (data as any)[sysKey] = processedValue;
            }
        });

        // Validaciones específicas y pos-procesamiento para IncomeStatement
        if (data.date && typeof data.date === 'string') {
            const dateISO = parseSpanishDate(data.date);
            if (dateISO) {
                data.date = dateISO;
            } else {
                // Lógica de mes/año fallback (como antes)
                const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                const lowerDate = data.date.toLowerCase();
                const monthIdx = months.findIndex(m => lowerDate.includes(m));

                if (monthIdx !== -1) {
                    const currentYear = new Date().getFullYear();
                    const yearMatch = data.date.match(/\d{4}/);
                    const year = yearMatch ? parseInt(yearMatch[0]) : currentYear;
                    const monthNum = (monthIdx + 1).toString().padStart(2, '0');
                    data.date = `${year}-${monthNum}-01`;
                } else {
                    rowErrors.push(`Fecha inválida: "${data.date}"`);
                }
            }
        } else if (!data.date) {
            rowErrors.push('Fecha faltante');
        }

        if (!data.description) rowErrors.push('Descripción vacía o faltante');

        // Inferencia de tipo egreso/ingreso
        let inferredType: 'income' | 'expense' = 'expense';
        if (data.code && String(data.code).startsWith('4')) inferredType = 'income';
        else if (data.type && String(data.type).toLowerCase().includes('ingreso')) inferredType = 'income';

        data.type = inferredType;
        data.amount = Math.abs(cleanCurrencyValue(String((data as any).amount || '0')));

        const isValid = rowErrors.length === 0;
        if (isValid) validCount++; else errorCount++;

        rows.push({
            data: data as IncomeData,
            allData,
            errors: rowErrors,
            rowNumber,
            isValid
        });
    }

    return { rows, validCount, errorCount };
}

