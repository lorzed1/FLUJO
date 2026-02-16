import { readFileSync, writeFileSync } from 'fs';

const d = JSON.parse(readFileSync('Ejemplos/finance_backup_2026-02-15.json', 'utf8'));

const lines = [];
lines.push('=== CLAVES PRINCIPALES DEL JSON ===');
for (const key of Object.keys(d)) {
    const val = d[key];
    if (Array.isArray(val)) {
        lines.push('  ' + key + ': Array[' + val.length + ']');
        if (val.length > 0 && typeof val[0] === 'object') {
            lines.push('    Keys ejemplo: ' + Object.keys(val[0]).slice(0, 15).join(', '));
        }
    } else if (typeof val === 'object' && val !== null) {
        const subKeys = Object.keys(val);
        lines.push('  ' + key + ': Object con ' + subKeys.length + ' sub-keys');
        for (const sk of subKeys.slice(0, 20)) {
            const sv = val[sk];
            if (Array.isArray(sv)) {
                lines.push('    ' + sk + ': Array[' + sv.length + ']');
                if (sv.length > 0 && typeof sv[0] === 'object') {
                    lines.push('      Keys ejemplo: ' + Object.keys(sv[0]).slice(0, 15).join(', '));
                }
            } else if (typeof sv === 'object' && sv !== null) {
                lines.push('    ' + sk + ': Object con keys: ' + Object.keys(sv).slice(0, 10).join(', '));
            } else {
                lines.push('    ' + sk + ': ' + typeof sv + ' = ' + String(sv).substring(0, 50));
            }
        }
    } else {
        lines.push('  ' + key + ': ' + val);
    }
}

const result = lines.join('\n');
writeFileSync('backup_analysis.txt', result, 'utf8');
console.log('Done! See backup_analysis.txt');
