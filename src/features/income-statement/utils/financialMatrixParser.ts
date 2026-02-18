
import { IncomeData, ParsedIncomeRow } from './incomeParser';
import { parseCOP } from '../../../components/ui/Input';

/**
 * Valid columns for months in Spanish (lowercase for normalization)
 */
const MONTH_COLUMNS = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

interface MatrixMapping {
    accountCode: string; // Header name for account code column
    accountName: string; // Header name for account name column
    year: number; // Base year for the import
    selectedMonths: string[]; // Array of headers to treat as months
}

/**
 * Detects headers that correspond to month names.
 */
export function detectMonthColumns(headers: string[]): string[] {
    return headers.filter(h => MONTH_COLUMNS.includes(h.toLowerCase().trim()));
}

/**
 * Detects if the headers look like a Financial Statement Matrix (P&G)
 * Criteria: Has 'Cuenta'/'Codigo' AND at least one month column
 */
export function isFinancialMatrixFormat(headers: string[]): boolean {
    const normalized = headers.map(h => h.toLowerCase().trim());
    const hasAccount = normalized.some(h =>
        h.includes('cuenta') || h.includes('codigo') || h.includes('account') || h.includes('code')
    );
    const hasMonth = normalized.some(h => MONTH_COLUMNS.includes(h));

    return hasAccount && hasMonth;
}

/**
 * Parses rows from a consolidated matrix format (Account | Name | Jan | Feb | ...)
 * transforming them into a flat list of transactions (Date | Account | Amount)
 */
export function parseFinancialMatrix(
    rows: any[][], // Raw data from XLSX (array of arrays)
    mapping: MatrixMapping // Now includes selectedMonths
): { rows: ParsedIncomeRow[], validCount: number, errorCount: number } {
    const parsedRows: ParsedIncomeRow[] = [];
    let validCount = 0;
    let errorCount = 0;

    if (!rows || rows.length < 2) return { rows: [], validCount: 0, errorCount: 0 };

    const headers = rows[0].map(h => String(h || '').trim());

    // Find indices
    const codeIdx = headers.findIndex(h => h === mapping.accountCode);
    const nameIdx = headers.findIndex(h => h === mapping.accountName);

    // Identify month columns indices from selection
    const monthIndices: { [header: string]: number } = {};
    const selectedMonths = mapping.selectedMonths || detectMonthColumns(headers); // Fallback to all if not provided (safety)

    selectedMonths.forEach(monthHeader => {
        const idx = headers.findIndex(h => h === monthHeader);
        if (idx !== -1) {
            monthIndices[monthHeader] = idx; // Store exact header name as key
        }
    });

    if (codeIdx === -1) {
        return { rows: [], validCount: 0, errorCount: 0 }; // Critical error, mapping invalid
    }

    // Process data rows
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const codeValue = row[codeIdx] ? String(row[codeIdx]).trim() : '';
        const nameValue = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : '';

        // Skip empty rows or header repetitions
        if (!codeValue || codeValue.toLowerCase() === 'cuenta') continue;

        // Iterate over SELECTED month columns
        Object.entries(monthIndices).forEach(([headerName, colIdx]) => {
            const rawVal = row[colIdx];
            if (rawVal === undefined || rawVal === null || rawVal === '') return;

            const val = typeof rawVal === 'number' ? rawVal : parseCOP(String(rawVal));

            if (val !== 0) { // Only import non-zero
                // Normalize header to find month index
                const lowerHeader = headerName.toLowerCase().trim();
                const monthIndex = MONTH_COLUMNS.indexOf(lowerHeader);

                if (monthIndex !== -1) {
                    const monthNum = (monthIndex + 1).toString().padStart(2, '0');
                    const dateStr = `${mapping.year}-${monthNum}-01`;

                    // Infer type
                    let type: 'income' | 'expense' = 'expense';
                    const firstDigit = codeValue.charAt(0);
                    if (['4'].includes(firstDigit)) type = 'income';
                    else if (['5', '6', '7'].includes(firstDigit)) type = 'expense';

                    // Absolute amount
                    const amount = Math.abs(val);

                    const data: IncomeData = {
                        date: dateStr,
                        code: codeValue,
                        description: nameValue || `Cuenta ${codeValue}`,
                        category: nameValue, // Initial category is the account name
                        amount: amount,
                        type: type
                    };

                    parsedRows.push({
                        data,
                        errors: [],
                        rowNumber: i + 1,
                        isValid: true
                    });
                    validCount++;
                }
            }
        });
    }

    return { rows: parsedRows, validCount, errorCount };
}
