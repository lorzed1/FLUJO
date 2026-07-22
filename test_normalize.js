const normalize = (val, fieldName) => {
    const v = (val === null || val === undefined) ? '' : String(val).trim();
    if (v === '') return '';
    
    const isNumericField = /valor|monto|total|saldo|base|impuesto|debito|credito|identificacion|nit|cuenta/i.test(fieldName);
    const contentIsNumeric = !/[a-zA-Z]/.test(v);
    
    if ((isNumericField && contentIsNumeric) || typeof val === 'number') {
        let numStr = v;
        if (numStr.includes(',') && numStr.includes('.')) {
            numStr = numStr.replace(/,/g, '');
        } else if (numStr.includes(',')) {
            const parts = numStr.split(',');
            if (parts.length > 1 && parts[parts.length - 1].length === 3) numStr = numStr.replace(/,/g, '');
            else numStr = numStr.replace(',', '.');
        }
        const n = Number(numStr.replace(/[^0-9.\-]/g, ''));
        if (isNaN(n)) return v.toLowerCase().replace(/[^a-z0-9]/g, '');
        return String(Number(n.toFixed(2)));
    }

    if (val instanceof Date) return !isNaN(val.getTime()) ? val.toISOString().split('T')[0] : '';
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    
    return v.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '');
};

const importMatchFields = ['documento', 'cuenta', 'identificacion', 'descripcion_movimiento', 'contacto', 'debito', 'credito'];

// DB records
const dbRec1 = { documento: 'RC-1278', cuenta: '11100103', identificacion: '', descripcion_movimiento: '', contacto: 'La Holandesa', debito: '0', credito: '90000' };
const dbRec2 = { documento: 'RC-1301', cuenta: '11100103', identificacion: '', descripcion_movimiento: '', contacto: 'La Holandesa', debito: '0', credito: '51800' };

// Simulate what if Excel has different data for these columns
// The mapImportRow function converts numbers to JS numbers (parseNum returns number)
// And string fields to String(val).trim()
const xlRec1 = { documento: 'RC-1278', cuenta: '11100103', identificacion: '', descripcion_movimiento: '', contacto: 'La Holandesa', debito: 0, credito: 90000 };
const xlRec2 = { documento: 'RC-1301', cuenta: '11100103', identificacion: '', descripcion_movimiento: '', contacto: 'La Holandesa', debito: 0, credito: 51800 };

console.log('=== PER FIELD COMPARISON ===');
importMatchFields.forEach(f => {
    const db = normalize(dbRec1[f], f);
    const xl = normalize(xlRec1[f], f);
    console.log(`RC-1278 [${f}]: DB='${db}' XL='${xl}' => ${db === xl ? 'MATCH' : 'MISMATCH'}`);
});

console.log();
importMatchFields.forEach(f => {
    const db = normalize(dbRec2[f], f);
    const xl = normalize(xlRec2[f], f);
    console.log(`RC-1301 [${f}]: DB='${db}' XL='${xl}' => ${db === xl ? 'MATCH' : 'MISMATCH'}`);
});

console.log('\n=== HASH COMPARISON ===');
const dbHash1 = importMatchFields.map(f => normalize(dbRec1[f], f)).join('|');
const xlHash1 = importMatchFields.map(f => normalize(xlRec1[f], f)).join('|');
console.log('DB RC-1278:', dbHash1);
console.log('XL RC-1278:', xlHash1);
console.log('Match:', dbHash1 === xlHash1);

console.log();
const dbHash2 = importMatchFields.map(f => normalize(dbRec2[f], f)).join('|');
const xlHash2 = importMatchFields.map(f => normalize(xlRec2[f], f)).join('|');
console.log('DB RC-1301:', dbHash2);
console.log('XL RC-1301:', xlHash2);
console.log('Match:', dbHash2 === xlHash2);

// Now test edge cases
console.log('\n=== EDGE CASES ===');
console.log('Empty string:', JSON.stringify(normalize('', 'identificacion')));
console.log('undefined:', JSON.stringify(normalize(undefined, 'identificacion')));
console.log('null:', JSON.stringify(normalize(null, 'identificacion')));
console.log('Number 0:', JSON.stringify(normalize(0, 'debito')));
console.log('String "0":', JSON.stringify(normalize('0', 'debito')));
