
/**
 * Script de validación para la lógica de normalización de duplicados.
 * Ejecutar con: node check_logic.cjs
 */

function normalizeForCompare(val) {
    if (val === null || val === undefined || val === '') return '';
    
    if (typeof val === 'number') {
        if (Math.abs(val - Math.round(val)) < 0.0001) return String(Math.round(val));
        return val.toFixed(2);
    }

    if (val instanceof Date) {
        if (!isNaN(val.getTime())) {
            const year = val.getFullYear();
            const month = String(val.getMonth() + 1).padStart(2, '0');
            const day = String(val.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        return '';
    }

    let str = String(val).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ');
    
    if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
        return str.split('t')[0].split(' ')[0];
    }

    if (/^\d+$/.test(str)) {
        str = str.replace(/^0+/, '') || '0';
    }
    return str;
}

const tests = [
    { input: '00123456', expected: '123456', desc: 'Ceros a la izquierda en identificaciones' },
    { input: 'Bogotá', expected: 'bogota', desc: 'Acentos y mayúsculas' },
    { input: 1250000.00001, expected: '1250000', desc: 'Números decimales insignificantes' },
    { input: 1250000.55, expected: '1250000.55', desc: 'Números decimales significativos' },
    { input: new Date('2024-03-24T05:00:00Z'), expected: '2024-03-24', desc: 'Fechas ISO (UTC conversion prevention)' },
    { input: ' 2024-03-24 ', expected: '2024-03-24', desc: 'Fechas en string con espacios' },
    { input: '', expected: '', desc: 'Vacio' },
    { input: 0, expected: '0', desc: 'Cero numérico' }
];

console.log('--- INICIANDO PRUEBAS DE NORMALIZACIÓN ---');
let passed = 0;
tests.forEach(t => {
    const result = normalizeForCompare(t.input);
    if (result === t.expected) {
        console.log(`✅ PASSED: ${t.desc}`);
        passed++;
    } else {
        console.error(`❌ FAILED: ${t.desc}`);
        console.error(`   Input: [${t.input}]`);
        console.error(`   Expected: [${t.expected}]`);
        console.error(`   Got: [${result}]`);
    }
});

console.log(`\nRESUMEN: ${passed}/${tests.length} pruebas pasadas.`);

if (passed === tests.length) {
    console.log('\n✨ LÓGICA CONFIABLE ✨');
} else {
    process.exit(1);
}
