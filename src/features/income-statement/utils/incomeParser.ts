
import { parseSpanishDate, isValidDate } from '../../../utils/dateUtils';
import { parseCOP } from '../../../components/ui/Input';

export interface IncomeData {
    date: string;
    code?: string; // Accounting code (e.g., 510506)
    description: string;
    category: string;
    amount: number; // Positive for income, negative for expense (or handled by type)
    type: 'income' | 'expense';
}

export interface ParsedIncomeRow {
    data: IncomeData;
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

export function extractHeadersAndLines(text: string): { headers: string[], lines: string[] } {
    const allLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (allLines.length < 2) return { headers: [], lines: [] };
    const headers = allLines[0].split('\t').map(h => h.trim());
    return { headers, lines: allLines };
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

export function parseIncomeRows(lines: string[], mapping: Record<string, string>): { rows: ParsedIncomeRow[], validCount: number, errorCount: number } {
    const rows: ParsedIncomeRow[] = [];
    let validCount = 0;
    let errorCount = 0;

    if (lines.length < 2) return { rows: [], validCount: 0, errorCount: 0 };

    const headers = lines[0].split('\t').map(h => h.trim());
    const columnIndices: Record<string, number> = {};

    Object.entries(mapping).forEach(([key, headerName]) => {
        if (headerName) {
            const idx = headers.findIndex(h => h.trim() === headerName.trim());
            if (idx !== -1) columnIndices[key] = idx;
        }
    });

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const cells = line.split('\t');
        const rowNumber = i + 1;
        const rowErrors: string[] = [];
        const data: Partial<IncomeData> = {};

        // Date or Month
        if (columnIndices.date !== undefined) {
            const dateStr = cells[columnIndices.date]?.trim();
            if (dateStr) {
                // Try standard date parser first
                let dateISO = parseSpanishDate(dateStr);

                // If failed, try to parse as "Month Year" or just "Month"
                if (!dateISO) {
                    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                    const lowerDate = dateStr.toLowerCase();
                    const monthIdx = months.findIndex(m => lowerDate.includes(m));

                    if (monthIdx !== -1) {
                        // Default to current year if not found
                        const currentYear = new Date().getFullYear();
                        // Try to find year in string
                        const yearMatch = dateStr.match(/\d{4}/);
                        const year = yearMatch ? parseInt(yearMatch[0]) : currentYear;

                        // Construct ISO date: YYYY-MM-01
                        const monthNum = (monthIdx + 1).toString().padStart(2, '0');
                        dateISO = `${year}-${monthNum}-01`;
                    }
                }

                if (dateISO) data.date = dateISO;
                else rowErrors.push(`Fecha inválida: "${dateStr}"`);
            } else {
                rowErrors.push('Fecha faltante');
            }
        } else {
            rowErrors.push('Columna Fecha no mapeada');
        }

        // Description
        if (columnIndices.description !== undefined) {
            data.description = cells[columnIndices.description]?.trim() || '';
            if (!data.description) rowErrors.push('Descripción vacía');
        } else {
            rowErrors.push('Columna Descripción no mapeada');
        }

        // Code (Account)
        if (columnIndices.code !== undefined) {
            data.code = cells[columnIndices.code]?.trim() || '';
        }

        // Category
        if (columnIndices.category !== undefined) {
            data.category = cells[columnIndices.category]?.trim() || 'Sin Categoría';
        }

        // Type Inference from Code
        let inferredType: 'income' | 'expense' = 'expense';
        let inferredFromCode = false;

        if (data.code) {
            const firstDigit = data.code.trim().charAt(0);
            if (['4'].includes(firstDigit)) {
                inferredType = 'income';
                inferredFromCode = true;
            } else if (['5', '6', '7'].includes(firstDigit)) {
                inferredType = 'expense';
                inferredFromCode = true;
            }
        }

        // Amount & Type
        if (columnIndices.amount !== undefined) {
            const amountVal = cleanCurrencyValue(cells[columnIndices.amount]?.trim() || '0');
            data.amount = Math.abs(amountVal); // Store absolute value

            if (!inferredFromCode) {
                // Fallback to name-based inference for headers
                const name = (data.description || '').toUpperCase();
                if (name.includes('INGRESOS') || name.includes('VENTAS') || name.includes('UTILIDAD')) {
                    inferredType = 'income';
                }

                if (columnIndices.type !== undefined) {
                    const typeStr = cells[columnIndices.type]?.trim().toLowerCase();
                    if (typeStr) {
                        if (typeStr.includes('ingreso') || typeStr.includes('income')) inferredType = 'income';
                        else if (typeStr.includes('egreso') || typeStr.includes('gasto') || typeStr.includes('expense')) inferredType = 'expense';
                    }
                } else {
                    if (amountVal < 0) inferredType = 'expense';
                }
            }

            data.type = inferredType;
        } else {
            rowErrors.push('Columna Monto no mapeada');
        }

        const isValid = rowErrors.length === 0;
        if (isValid) validCount++; else errorCount++;

        rows.push({
            data: data as IncomeData,
            errors: rowErrors,
            rowNumber,
            isValid
        });
    }

    return { rows, validCount, errorCount };
}
