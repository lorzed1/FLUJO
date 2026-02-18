
// This file is used to analyze the structure of the Excel file
// to understand how to parse the hierarchy properly.
import XLSX from 'xlsx';
import fs from 'fs';

const filePath = process.argv[2];

if (!filePath) {
    console.error("Please provide the path to the Excel file.");
    process.exit(1);
}

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log("Sheet Name:", sheetName);
    console.log("First 15 rows:");
    data.slice(0, 15).forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
    });

} catch (error) {
    console.error("Error reading file:", error);
}
