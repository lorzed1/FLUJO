const XLSX = require('xlsx');
const fs = require('fs');

// 1. Cargamos datos de la DB
const fileText = fs.readFileSync('C:/Users/David/.gemini/antigravity/brain/3ccb0d16-65fa-4c4f-baab-612295d18d2d/.system_generated/steps/653/output.txt', 'utf8');
const fileJson = JSON.parse(fileText);
const match = fileJson.result.match(/<untrusted-data-[^>]+>\n([\s\S]+)\n<\/untrusted-data-/);
if (!match) {
    console.error("No se pudo encontrar el JSON dentro del resultado SQL");
    process.exit(1);
}
const dbData = JSON.parse(match[1]);

// 2. Cargamos el Excel
const workbook = XLSX.readFile('c:/Users/David/OneDrive/APPS UNP/Data BI/Documento_movimientos (15).xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// Range 2 (Cabecera está en la tercera fila)
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 2 });
// Saltamos la fila de cabecera que ahora es data[0]
const rows = rawData.slice(1);

// Logic helpers
const norm = (v) => String(v ?? '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, ' ');
const normId = (v) => norm(v).replace(/^0+/, '');
const parseN = (v) => Math.round(Number(v) || 0);

const normalizeForCompare = (val) => {
    if (val === null || val === undefined || val === '') return '';
    if (typeof val === 'number') {
        if (Math.abs(val - Math.round(val)) < 0.0001) return String(Math.round(val));
        return val.toFixed(2);
    }
    if (val instanceof Date) { if (!isNaN(val.getTime())) return val.toISOString().split('T')[0]; }
    let str = String(val).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ');
    if (/^\d+$/.test(str)) { str = str.replace(/^0+/, '') || '0'; }
    return str;
};

const isRowChanged = (mappedImport, existing) => {
    let changed = false;
    Object.keys(mappedImport).forEach(dbKey => {
        if (dbKey === 'id' || dbKey === 'created_at' || dbKey === 'updated_at' || dbKey === 'import_id') return;
        const normImported = normalizeForCompare(mappedImport[dbKey]);
        const normExisting = normalizeForCompare(existing[dbKey]);
        if (normImported !== normExisting) { changed = true; }
    });
    return changed;
};

// Mapper para Asientos Contables
const mapRow = (row, idx) => {
    const parseNum = (v) => Number(v) || 0;
    const xlsDateToISO = (num) => {
        if (!num || isNaN(num)) return "";
        try {
            // Excel Serial to JS Date
            let d = new Date(Math.round((Number(num) - 25569) * 86400 * 1000));
            if (isNaN(d.getTime())) return "";
            return d.toISOString().split('T')[0];
        } catch (e) { return ""; }
    };
    
    if (idx < 5) console.log(`Row ${idx}:`, row[5], row[6]);

    return {
        cuenta: String(row[0] ?? '').trim(),
        contacto: String(row[2] ?? '').trim(),
        identificacion: String(row[3] ?? '').trim(),
        centro_costo: String(row[4] ?? '').trim(),
        documento: String(row[5] ?? '').trim(),
        fecha: xlsDateToISO(row[6]),
        descripcion: String(row[7] ?? '').trim(),
        descripcion_movimiento: String(row[8] ?? '').trim(),
        base: parseNum(row[9]),
        saldo_inicial: parseNum(row[10]),
        debito: parseNum(row[11]),
        credito: parseNum(row[12]),
        saldo_final: parseNum(row[13])
    };
};

let counts = { new: 0, updates: 0, identical: 0, intraFileDups: 0 };
const seenHashes = new Set();

rows.forEach((r, idx) => {
    if (!r || r.length === 0) return;
    const mapped = mapRow(r, idx);
    
    // Intra-file duplicates (usando logic de hash similar al UI)
    const hash = [mapped.documento, mapped.cuenta, mapped.fecha, mapped.identificacion].map(normId).join('|');
    if (seenHashes.has(hash)) {
        counts.intraFileDups++;
        return;
    }
    seenHashes.add(hash);
    
    // Identidad Total
    let identical = dbData.find(db => 
        norm(db.documento) === norm(mapped.documento) &&
        norm(db.cuenta) === norm(mapped.cuenta) &&
        norm(db.fecha) === norm(mapped.fecha) &&
        normId(db.identificacion) === normId(mapped.identificacion)
    );
    
    if (identical) {
        if (isRowChanged(mapped, identical)) counts.updates++;
        else counts.identical++;
        return;
    }
    
    // Smart Strategy
    let candidate = dbData.find(db => {
        const docMatch = norm(db.documento) === norm(mapped.documento);
        const accMatch = norm(db.cuenta) === norm(mapped.cuenta);
        const debMatch = parseN(db.debito) === parseN(mapped.debito);
        const creMatch = parseN(db.credito) === parseN(mapped.credito);
        const dateMatch = norm(db.fecha) === norm(mapped.fecha);
        const idMatch = normId(db.identificacion) === normId(mapped.identificacion);
        return (docMatch && accMatch && debMatch && creMatch) && (dateMatch || idMatch);
    });
    
    if (candidate) {
        if (isRowChanged(mapped, candidate)) counts.updates++;
        else counts.identical++;
        return;
    }
    
    counts.new++;
});

console.log(JSON.stringify(counts, null, 2));
