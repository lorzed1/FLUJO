
import XLSX from 'xlsx';
import fs from 'fs';

const filePath = "PYG Enero 2026.xlsx";

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const entries = [];
    const date = "2026-01-01"; // Default for this file

    // Row 0 is header: ["Cuenta", "Nombre", "enero"]
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const code = row[0] ? String(row[0]).trim() : '';
        const name = row[1] ? String(row[1]).trim() : '';
        const amount = parseFloat(String(row[2]).replace(/[^0-9.-]+/g, "")) || 0;

        if (!name && !code) continue;

        let type = 'expense';
        if (code.startsWith('4') || name.toUpperCase().includes('INGRESOS') || name.toUpperCase().includes('UTILIDAD')) {
            type = 'income';
        }

        entries.push({
            id: code ? code : `row-${i}-${name.substring(0, 10)}`,
            date: date,
            code: code,
            description: name,
            category: 'Imported',
            type: type,
            amount: amount,
            status: 'completed',
            rowNumber: i
        });
    }

    fs.writeFileSync('pyg_data.json', JSON.stringify({ key: 'financial_statements', data: entries, updated_at: new Date().toISOString() }, null, 2));
    console.log(`Prepared ${entries.length} entries.`);

} catch (error) {
    console.error("Error:", error);
}
