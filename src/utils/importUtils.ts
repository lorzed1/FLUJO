/**
 * Utilidades comunes para procesos de importación
 */

export type ColumnType = 'text' | 'number' | 'currency' | 'date';

/**
 * Detecta el tipo de dato de una columna basado en una muestra de valores
 */
export function inferColumnType(values: any[]): ColumnType {
    const samples = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '').slice(0, 10);
    if (samples.length === 0) return 'text';

    let counts = { date: 0, currency: 0, number: 0, text: 0 };

    samples.forEach(val => {
        const s = String(val).trim();

        // Date detection
        if (/^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(s) || /^[A-Za-z]+ \d{4}$/.test(s)) {
            counts.date++;
            return;
        }

        // Currency detection
        if (s.startsWith('$') || (/[\d]{1,3}([.][\d]{3})*([,][\d]{2})?$/.test(s) && s.includes(','))) {
            counts.currency++;
            return;
        }

        // Number detection
        if (!isNaN(Number(s.replace(/,/g, '').replace(/\./g, '').replace(/\$/g, '').trim()))) {
            // Check if it's just a number or something else
            const cleanNum = s.replace(/,/g, '').replace(/\./g, '').replace(/\$/g, '').trim();
            if (cleanNum.length > 0 && /^\d+$/.test(cleanNum)) {
                counts.number++;
                return;
            }
        }

        counts.text++;
    });

    if (counts.date > samples.length / 2) return 'date';
    if (counts.currency > samples.length / 2) return 'currency';
    if (counts.number > samples.length / 2) return 'number';
    return 'text';
}

/**
 * Detecta el índice de la fila que probablemente contiene los encabezados.
 * Compara el contenido de las celdas contra un conjunto de alias conocidos.
 * 
 * @param rows Matriz de datos (filas x columnas)
 * @param systemFields Definiciones de campos con sus alias
 * @param maxRows Cantidad máxima de filas a inspeccionar (default 10)
 */
export function detectHeaderRow(rows: any[][], systemFields: { aliases: string[] }[], maxRows = 10): number {
    let bestRow = 0;
    let maxMatches = 0;

    const allAliases = systemFields.flatMap(f => f.aliases.map(a => a.toUpperCase()));

    for (let i = 0; i < Math.min(rows.length, maxRows); i++) {
        const currentRow = rows[i];
        if (!currentRow) continue;

        const rowContent = currentRow.filter(c => c !== null && c !== undefined).map(c => String(c).toUpperCase().trim());
        let matches = 0;

        rowContent.forEach(cell => {
            if (cell && allAliases.some(alias => cell === alias || cell.includes(alias))) {
                matches++;
            }
        });

        // Actualizamos si encontramos una fila con más coincidencias
        if (matches > maxMatches) {
            maxMatches = matches;
            bestRow = i;
        }
    }

    // Si no encontramos ninguna coincidencia clara, asumimos la primera fila
    return bestRow;
}
