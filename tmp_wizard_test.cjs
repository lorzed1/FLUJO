const XLSX = require('xlsx');
const fs = require('fs');

try {
    const buf = fs.readFileSync('test.xlsx');
    // Simular el FileReader ArrayBuffer en el frontend
    const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const u8 = new Uint8Array(arrayBuffer);

    const wb = XLSX.read(u8, { type: 'array', cellDates: true });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];

    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    let likelyHeaderIdx = 0;
    const headers = data[likelyHeaderIdx] || [];
    const sampleData = data.slice(likelyHeaderIdx + 1, likelyHeaderIdx + 11);

    const columnsConfig = headers.map((header, colIndex) => {
        let hStr = String(header || `Columna ${colIndex + 1}`).trim();
        let type = 'string';
        for (let row of sampleData) {
            const val = row[colIndex];
            if (val !== undefined && val !== null && val !== '') {
                if (val instanceof Date) type = 'date';
                else if (typeof val === 'number') type = 'number';
                else if (typeof val === 'boolean') type = 'boolean';
                else if (!isNaN(Number(val))) type = 'number';
                else if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) type = 'date';
                break;
            }
        }
        return { key: hStr, label: hStr, type };
    });

    console.log("Config:", columnsConfig);

    const result = [];
    for (let i = likelyHeaderIdx + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        let hasData = false;
        const cleanRowContent = {};

        columnsConfig.forEach((col, colIndex) => {
            let val = row[colIndex];

            if (val !== undefined && val !== null && val !== '') {
                hasData = true;
                if (col.type === 'number' || col.type === 'currency') {
                    val = Number(val);
                    if (isNaN(val)) val = 0;
                } else if (col.type === 'date') {
                    if (val instanceof Date) {
                        val = val.toISOString().split('T')[0];
                    } else {
                        const d = new Date(val);
                        if (!isNaN(d.getTime())) val = d.toISOString().split('T')[0];
                        else val = String(val);
                    }
                } else if (col.type === 'boolean') {
                    if (typeof val === 'string') {
                        const lower = val.toLowerCase().trim();
                        val = lower === 'true' || lower === 'si' || lower === 'sí' || lower === '1';
                    } else {
                        val = Boolean(val);
                    }
                } else {
                    val = String(val);
                }
            }
            cleanRowContent[col.key] = val;
        });

        if (hasData) {
            result.push(cleanRowContent);
        }
    }

    console.log("Final data length:", result.length);
    if (result.length > 0) console.log(result[0]);

} catch (error) {
    console.error("Error:", error);
}
