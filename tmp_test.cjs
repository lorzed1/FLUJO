const XLSX = require('xlsx');
const fs = require('fs');

try {
    const buf = fs.readFileSync('test.xlsx');
    // Simular el FileReader ArrayBuffer en el frontend
    const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const u8 = new Uint8Array(arrayBuffer);

    console.log("Reading workbook...");
    const wb = XLSX.read(u8, { type: 'array', cellDates: true });

    console.log("Sheet names:", wb.SheetNames);
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];

    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log("Data read successfully.");
    console.log("Total rows:", data.length);
    if (data.length > 0) {
        console.log("Header row length:", data[0].length);
        console.log("Header sample:", data[0].slice(0, 5));
    }
} catch (error) {
    console.error("Error testing:", error);
}
