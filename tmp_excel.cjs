const XLSX = require('xlsx');

// Create test excel 
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
    ['Cuenta', 'Nombre de Cuenta', 'Contacto', 'Identificación', 'Centro de costo', 'Documento', 'Fecha', 'Descripción', 'Descripción del movimiento', 'Base', 'Saldo inicial', 'Debito', 'Credito', 'Saldo final'],
    ['61359504', 'COSTOS INSUMOS Y EMPAQUES', 'Proveedor No habitual', 13, 'Principal', 'FC-1531', '2026-02-22', 'Factura', undefined, 10000, 0, 10000, 0, 0]
]);
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
XLSX.writeFile(wb, 'testResult3.xlsx');

const buf = require('fs').readFileSync('testResult3.xlsx');
const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const u8 = new Uint8Array(arrayBuffer);

const wb2 = XLSX.read(u8, { type: 'array', cellDates: true });
const wsname = wb2.SheetNames[0];
const ws2 = wb2.Sheets[wsname];

const data = XLSX.utils.sheet_to_json(ws2, { header: 1 });

let maxCols = 0;
let likelyHeaderIdx = 0;
const maxSearchDepth = Math.min(10, data.length);
for (let i = 0; i < maxSearchDepth; i++) {
    const row = data[i] || [];
    const nonNullCount = row.filter(cell => cell !== undefined && cell !== null && cell !== '').length;
    if (nonNullCount > maxCols) {
        maxCols = nonNullCount;
        likelyHeaderIdx = i;
    }
}
console.log("likelyHeaderIdx:", likelyHeaderIdx);
