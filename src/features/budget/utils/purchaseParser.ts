/**
 * UTILIDADES PARA IMPORTACIÓN UNIVERSAL
 * Este motor es genérico: importa todo el contenido del archivo sin restricciones.
 */
import { parseSpanishDate, isValidDate } from '../../../utils/dateUtils';
import { Purchase } from '../../../types/budget';
import { type ColumnType } from '../../../utils/importUtils';

export interface PurchaseParsedRow {
    data: any; // Datos planos del archivo + campos mapeados
    allData: Record<string, any>;
    errors: string[];
    rowNumber: number;
    isValid: boolean;
}

/**
 * Sugerencias de identidad para columnas (Opcional)
 * Sirve para que el sistema sepa qué columnas usar en cálculos y visualizaciones.
 */
export const PURCHASE_SYSTEM_FIELDS = [
    { key: 'date', label: 'Eje de Tiempo (Fecha)', aliases: ['fecha', 'date', 'día', 'periodo', 'vencimiento'] },
    { key: 'amount', label: 'Eje de Valor (Monto/Dinero)', aliases: ['monto', 'valor', 'total', 'precio', 'neto', 'debito', 'crédito', 'val.'] },
    { key: 'provider', label: 'Identificador (Proveedor/Cliente)', aliases: ['proveedor', 'cliente', 'tercero', 'nombre', 'contacto'] },
    { key: 'description', label: 'Detalle (Descripción)', aliases: ['descripción', 'detalle', 'concepto', 'item', 'glosa'] },
];

/**
 * Limpieza Estricta COP (Especialidad importador-experto-cop)
 */
export function cleanCurrencyValue(value: string | number): number {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return Math.round(value);

    let clean = String(value)
        .replace(/[$\s]/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '');

    const result = parseInt(clean, 10);
    return isNaN(result) ? 0 : result;
}

export function findHeaderRow(rows: any[][]): number {
    let bestRow = 0;
    let maxScore = -1;
    const scannerLimit = Math.min(rows.length, 15);

    for (let i = 0; i < scannerLimit; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        let score = 0;
        row.forEach(cell => {
            if (!cell) return;
            const val = String(cell).trim();
            if (isNaN(Number(val)) && val.length > 2) score += 1;
        });

        if (score > maxScore) {
            maxScore = score;
            bestRow = i;
        }
    }
    return bestRow;
}

/**
 * PARSER UNIVERSAL: Procesa todas las columnas sin excepción.
 */
export function parsePurchaseRows(
    lines: string[],
    mapping: Record<string, string>,
    types: Record<string, ColumnType>,
    headerIndex: number = 0
): { rows: PurchaseParsedRow[], validCount: number, errorCount: number } {
    const rows: PurchaseParsedRow[] = [];
    if (lines.length <= headerIndex) return { rows: [], validCount: 0, errorCount: 0 };

    const headers = lines[headerIndex].split('\t').map(h => h.trim());
    const reverseMapping: Record<string, string> = {};
    Object.entries(mapping).forEach(([sysKey, header]) => {
        if (header) reverseMapping[header] = sysKey;
    });

    for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const cells = line.split('\t');
        const allData: Record<string, any> = {};
        const mappedTags: Record<string, any> = {};

        headers.forEach((header, idx) => {
            const rawValue = cells[idx] || '';
            const cellValue = String(rawValue).trim();
            const type = types[header] || 'text';
            let processed: any = cellValue;

            // Procesamiento inteligente según tipo detectado
            if (type === 'currency' || type === 'number') {
                processed = cleanCurrencyValue(cellValue);
            } else if (type === 'date') {
                const num = Number(cellValue);
                if (!isNaN(num) && num > 30000 && num < 60000) {
                    const epoch = new Date(1899, 11, 30);
                    processed = new Date(epoch.getTime() + num * 86400000).toISOString().split('T')[0];
                } else {
                    processed = parseSpanishDate(cellValue) || cellValue;
                }
            }

            allData[header] = processed;

            // Si el usuario marcó esta columna como una "etiqueta de sistema"
            const sysKey = reverseMapping[header];
            if (sysKey) mappedTags[sysKey] = processed;
        });

        const hasData = Object.values(allData).some(v => v !== '' && v !== 0 && v !== null);

        rows.push({
            data: {
                ...allData,   // EL ARCHIVO MANDA: Se guarda todo
                ...mappedTags, // Se añaden etiquetas para que el sistema sepa qué es qué
                id: `uni-${Date.now()}-${i}`,
                createdAt: Date.now(),
                // Fallbacks básicos para que el sistema no se rompa al visualizar
                date: mappedTags.date || new Date().toISOString().split('T')[0],
                amount: mappedTags.amount || 0,
                provider: mappedTags.provider || 'Sin identificar',
                description: mappedTags.description || 'Fila importada'
            },
            allData,
            errors: [], // En modo universal no hay errores, solo datos
            rowNumber: i + 1,
            isValid: hasData
        });
    }

    return {
        rows,
        validCount: rows.filter(r => r.isValid).length,
        errorCount: 0
    };
}
