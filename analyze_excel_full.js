
import XLSX from 'xlsx';

const filePath = "c:\\Users\\David\\OneDrive\\WEB UNP\\Proyecto App\\PYG Enero 2026.xlsx";

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log("Full Analysis of PYG Enero 2026.xlsx:");
    data.forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
    });

} catch (error) {
    console.error("Error reading file:", error);
}
