
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = [
    'c:\\Users\\David\\OneDrive\\WEB UNP\\Proyecto App\\PYG Año 2025.xlsx',
    'c:\\Users\\David\\OneDrive\\WEB UNP\\Proyecto App\\PYG Enero 2026.xlsx'
];

files.forEach(filePath => {
    try {
        if (fs.existsSync(filePath)) {
            console.log(`\n--- Analyzing: ${path.basename(filePath)} ---`);
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Get range
            const range = XLSX.utils.decode_range(sheet['!ref']);
            console.log(`Range: ${sheet['!ref']}`);

            // Read first 5 rows to understand header structure
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });
            console.log('First 5 rows (raw):');
            rows.slice(0, 5).forEach((row, i) => console.log(`Row ${i}:`, JSON.stringify(row)));
        } else {
            console.log(`File not found: ${filePath}`);
        }
    } catch (err) {
        console.error(`Error processing ${filePath}:`, err.message);
    }
});
