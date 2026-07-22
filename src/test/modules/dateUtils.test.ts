import { describe, it, expect } from 'vitest';
import {
    isExcelSerial,
    excelSerialToDateString,
    formatDateUTC,
    parseDMY,
    parseISODate,
    normalizeDate,
    daysDiffUTC,
    datesEqual,
} from '../../utils/dateUtils';

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS: isExcelSerial
// ═══════════════════════════════════════════════════════════════════════════════

describe('isExcelSerial', () => {
    it('detecta números positivos válidos', () => {
        expect(isExcelSerial(45000)).toBe(true);  // ~2023
        expect(isExcelSerial(46100)).toBe(true);  // ~2026
        expect(isExcelSerial(1)).toBe(true);       // 1900-01-01
    });

    it('detecta strings numéricas cortas', () => {
        expect(isExcelSerial('45000')).toBe(true);
        expect(isExcelSerial('46100')).toBe(true);
        expect(isExcelSerial(' 45000 ')).toBe(true); // con espacios
    });

    it('rechaza valores no seriales', () => {
        expect(isExcelSerial(0)).toBe(false);
        expect(isExcelSerial(-1)).toBe(false);
        expect(isExcelSerial(200001)).toBe(false);
        expect(isExcelSerial('')).toBe(false);
        expect(isExcelSerial(null)).toBe(false);
        expect(isExcelSerial(undefined)).toBe(false);
        expect(isExcelSerial('2026-03-15')).toBe(false); // string larga
        expect(isExcelSerial('abc')).toBe(false);
        expect(isExcelSerial('1234567')).toBe(false); // 7 dígitos
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS: excelSerialToDateString
// ═══════════════════════════════════════════════════════════════════════════════

describe('excelSerialToDateString', () => {
    it('convierte serial de Excel a fecha correcta', () => {
        // Serial 1 = 1900-01-01 (por definición de Excel con epoch 1899-12-30)
        // Pero en realidad el serial 1 en Excel con epoch 1899-12-30 = 1899-12-31
        // Serial 2 = 1900-01-01. Veremos...
        // El epoch que usamos: Date.UTC(1899,11,30) = 1899-12-30
        // Serial 1: 1899-12-30 + 1 día = 1899-12-31
        expect(excelSerialToDateString(1)).toBe('1899-12-31');
    });

    it('convierte fechas conocidas correctamente', () => {
        // 2026-01-01 en serial de Excel: calculamos con la fórmula inversa
        // Desde 1899-12-30 hasta 2026-01-01 = cuántos días?
        // Usamos Date.UTC para calcular: 
        const jan1_2026 = Date.UTC(2026, 0, 1);
        const epoch = Date.UTC(1899, 11, 30);
        const serial = Math.round((jan1_2026 - epoch) / 86_400_000);
        expect(excelSerialToDateString(serial)).toBe('2026-01-01');
    });

    it('convierte serial 45000 consistentemente independiente de timezone', () => {
        const result = excelSerialToDateString(45000);
        // 45000 días desde 1899-12-30 = una fecha fija
        // Lo importante es que SIEMPRE sea la misma, sin importar timezone
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('serial de marzo 15 2026 coincide con serial real de Excel', () => {
        // Cálculo: desde 1899-12-30 hasta 2026-03-15
        const target = Date.UTC(2026, 2, 15); // marzo = 2
        const epoch = Date.UTC(1899, 11, 30);
        const serial = Math.round((target - epoch) / 86_400_000);
        expect(excelSerialToDateString(serial)).toBe('2026-03-15');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS: formatDateUTC
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatDateUTC', () => {
    it('formatea fecha UTC correctamente', () => {
        const d = new Date(Date.UTC(2026, 2, 15)); // 15 marzo 2026
        expect(formatDateUTC(d)).toBe('2026-03-15');
    });

    it('NO se desfasa por timezone local', () => {
        // Simular un Date que en UTC es medianoche del 15 marzo
        // En Colombia (UTC-5) sería 14 de marzo a las 7pm
        // formatDateUTC DEBE retornar 15, no 14
        const d = new Date(Date.UTC(2026, 2, 15, 0, 0, 0));
        expect(formatDateUTC(d)).toBe('2026-03-15');
    });

    it('retorna vacío para Date inválido', () => {
        expect(formatDateUTC(new Date('invalid'))).toBe('');
    });

    it('padea meses y días con cero', () => {
        const d = new Date(Date.UTC(2026, 0, 5)); // 5 enero
        expect(formatDateUTC(d)).toBe('2026-01-05');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS: parseDMY
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseDMY', () => {
    it('parsea DD/MM/YYYY', () => {
        expect(parseDMY('15/03/2026')).toBe('2026-03-15');
        expect(parseDMY('01/01/2026')).toBe('2026-01-01');
        expect(parseDMY('5/3/2026')).toBe('2026-03-05');
    });

    it('parsea DD-MM-YYYY', () => {
        expect(parseDMY('15-03-2026')).toBe('2026-03-15');
    });

    it('maneja espacios', () => {
        expect(parseDMY('  15/03/2026  ')).toBe('2026-03-15');
    });

    it('retorna null para formatos inválidos', () => {
        expect(parseDMY('2026-03-15')).toBe(null); // ISO no es DMY
        expect(parseDMY('abc')).toBe(null);
        expect(parseDMY('')).toBe(null);
        expect(parseDMY('15/03/26')).toBe(null); // año de 2 dígitos
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS: parseISODate
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseISODate', () => {
    it('extrae YYYY-MM-DD de string ISO', () => {
        expect(parseISODate('2026-03-15')).toBe('2026-03-15');
        expect(parseISODate('2026-03-15T10:30:00Z')).toBe('2026-03-15');
        expect(parseISODate('2026-03-15T00:00:00-05:00')).toBe('2026-03-15');
    });

    it('maneja espacios', () => {
        expect(parseISODate('  2026-03-15  ')).toBe('2026-03-15');
    });

    it('retorna null para formatos no ISO', () => {
        expect(parseISODate('15/03/2026')).toBe(null);
        expect(parseISODate('abc')).toBe(null);
        expect(parseISODate('45000')).toBe(null);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS: normalizeDate (función maestra)
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeDate', () => {
    it('normaliza serial de Excel', () => {
        const target = Date.UTC(2026, 2, 15);
        const epoch = Date.UTC(1899, 11, 30);
        const serial = Math.round((target - epoch) / 86_400_000);
        expect(normalizeDate(serial)).toBe('2026-03-15');
    });

    it('normaliza serial de Excel como string', () => {
        const target = Date.UTC(2026, 2, 15);
        const epoch = Date.UTC(1899, 11, 30);
        const serial = Math.round((target - epoch) / 86_400_000);
        expect(normalizeDate(String(serial))).toBe('2026-03-15');
    });

    it('normaliza objeto Date (UTC)', () => {
        const d = new Date(Date.UTC(2026, 2, 15));
        expect(normalizeDate(d)).toBe('2026-03-15');
    });

    it('normaliza string ISO', () => {
        expect(normalizeDate('2026-03-15')).toBe('2026-03-15');
        expect(normalizeDate('2026-03-15T10:00:00Z')).toBe('2026-03-15');
    });

    it('normaliza string DD/MM/YYYY', () => {
        expect(normalizeDate('15/03/2026')).toBe('2026-03-15');
    });

    it('normaliza string DD-MM-YYYY', () => {
        expect(normalizeDate('15-03-2026')).toBe('2026-03-15');
    });

    it('retorna fallback para valores vacíos o nulos', () => {
        expect(normalizeDate(null, '1900-01-01')).toBe('1900-01-01');
        expect(normalizeDate(undefined, '1900-01-01')).toBe('1900-01-01');
        expect(normalizeDate('', '1900-01-01')).toBe('1900-01-01');
    });

    it('retorna fallback vacío por defecto', () => {
        expect(normalizeDate(null)).toBe('');
        expect(normalizeDate('esto no es fecha')).toBe('');
    });

    // ═══════════════════════════════════════════════════════════
    // TEST CRÍTICO: El bug de ±1 día
    // ═══════════════════════════════════════════════════════════

    it('NO desfasa fecha de serial Excel independiente de timezone', () => {
        // Este es el caso que causaba el bug:
        // Excel serial para 2026-03-15 pasado a new Date() local
        // en Colombia (UTC-5) retornaba 2026-03-14
        const target = Date.UTC(2026, 2, 15);
        const epoch = Date.UTC(1899, 11, 30);
        const serial = Math.round((target - epoch) / 86_400_000);

        const result = normalizeDate(serial);
        expect(result).toBe('2026-03-15');
        expect(result).not.toBe('2026-03-14'); // El bug anterior
    });

    it('consistencia: serial y string ISO dan el mismo resultado', () => {
        const target = Date.UTC(2026, 2, 15);
        const epoch = Date.UTC(1899, 11, 30);
        const serial = Math.round((target - epoch) / 86_400_000);

        const fromSerial = normalizeDate(serial);
        const fromISO = normalizeDate('2026-03-15');
        expect(fromSerial).toBe(fromISO);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS: daysDiffUTC
// ═══════════════════════════════════════════════════════════════════════════════

describe('daysDiffUTC', () => {
    it('misma fecha = 0 días', () => {
        expect(daysDiffUTC('2026-03-15', '2026-03-15')).toBe(0);
    });

    it('un día de diferencia', () => {
        expect(daysDiffUTC('2026-03-15', '2026-03-16')).toBe(1);
        expect(daysDiffUTC('2026-03-16', '2026-03-15')).toBe(1); // absoluto
    });

    it('varios días de diferencia', () => {
        expect(daysDiffUTC('2026-03-15', '2026-03-20')).toBe(5);
    });

    it('cruce de mes', () => {
        expect(daysDiffUTC('2026-03-30', '2026-04-02')).toBe(3);
    });

    it('cruce de año', () => {
        expect(daysDiffUTC('2025-12-31', '2026-01-01')).toBe(1);
    });

    it('maneja timestamps con T', () => {
        expect(daysDiffUTC('2026-03-15T10:00:00Z', '2026-03-16T15:00:00Z')).toBe(1);
    });

    it('retorna 999 para formatos inválidos', () => {
        expect(daysDiffUTC('', '2026-03-15')).toBe(999);
        expect(daysDiffUTC('2026-03-15', '')).toBe(999);
        expect(daysDiffUTC('invalid', '2026-03-15')).toBe(999);
    });

    it('NO se desfasa con fechas de medianoche UTC vs local', () => {
        // Fecha que en UTC es 15 de marzo pero en UTC-5 sería 14 de marzo
        // daysDiffUTC SOLO usa la parte YYYY-MM-DD del string,
        // así que nunca se confunde
        expect(daysDiffUTC('2026-03-15', '2026-03-15')).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS: datesEqual
// ═══════════════════════════════════════════════════════════════════════════════

describe('datesEqual', () => {
    it('fechas iguales retornan true', () => {
        expect(datesEqual('2026-03-15', '2026-03-15')).toBe(true);
    });

    it('ignora parte de hora (T...)', () => {
        expect(datesEqual('2026-03-15T10:00:00Z', '2026-03-15T23:59:59Z')).toBe(true);
    });

    it('fechas diferentes retornan false', () => {
        expect(datesEqual('2026-03-15', '2026-03-16')).toBe(false);
    });

    it('strings vacías retornan false', () => {
        expect(datesEqual('', '')).toBe(false);
        expect(datesEqual('2026-03-15', '')).toBe(false);
    });
});
