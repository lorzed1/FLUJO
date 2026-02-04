import * as XLSX from 'xlsx';
import { ArqueoRecord } from '../types';

export interface AccountingConfig {
    documentType: string; // e.g., 'FV'
    startConsecutive: number;
    defaultCostCenter: string;
    globalDate?: string; // If set, overrides record date
    nitTerceroDefault: string; // Generic third party ID
}

export type ConceptType =
    | 'income' // Venta
    | 'tax'    // INC/IVA
    | 'tip'    // Propina
    | 'cover'  // Cover
    | 'cash'   // Efectivo
    | 'card'   // Datafono
    | 'transfer' // Bancolombia, Nequi, etc
    | 'adjustment'; // Descuadre

export interface AccountMapping {
    conceptId: string;
    label: string;
    type: ConceptType;
    accountCode: string; // PUC
    nature: 'debit' | 'credit' | 'auto';
    thirdPartyId?: string; // If empty, use default
    taxRate?: number; // For separating base/tax (e.g., 0.08 for 8% INC)
}

export interface AccountingRow {
    TipoDocumento: string;
    Consecutivo: number;
    Fecha: string;
    FechaVencimiento: string;
    CodigoCuenta: string;
    IdContacto: string; // Tercero
    CentroCosto: string;
    Debito: number;
    Credito: number;
    Base: number;
    Descripcion: string;
    DescripcionMovimiento: string;
}

// Default concepts available for mapping
export const DEFAULT_CONCEPTS: AccountMapping[] = [
    { conceptId: 'venta', label: 'Venta POS (Ingreso)', type: 'income', accountCode: '', nature: 'credit', taxRate: 0 },
    { conceptId: 'inc', label: 'Impuesto (INC)', type: 'tax', accountCode: '', nature: 'credit' },
    { conceptId: 'propina', label: 'Propinas', type: 'tip', accountCode: '', nature: 'credit' },
    { conceptId: 'covers', label: 'Covers', type: 'cover', accountCode: '', nature: 'credit' },
    { conceptId: 'efectivo', label: 'Caja General (Efectivo)', type: 'cash', accountCode: '', nature: 'debit' },
    { conceptId: 'datafono1', label: 'Datafono 1 (Bancos)', type: 'card', accountCode: '', nature: 'debit' },
    { conceptId: 'datafono2', label: 'Datafono 2 (Bancos)', type: 'card', accountCode: '', nature: 'debit' },
    { conceptId: 'bancolombia', label: 'Bancolombia (Transferencia)', type: 'transfer', accountCode: '', nature: 'debit' },
    { conceptId: 'nequi', label: 'Nequi', type: 'transfer', accountCode: '', nature: 'debit' },
    { conceptId: 'rappi', label: 'Rappi', type: 'transfer', accountCode: '', nature: 'debit' },
    { conceptId: 'descuadre', label: 'Ajuste al Peso/Descuadre', type: 'adjustment', accountCode: '', nature: 'auto' },
];

export const generateAccountingRows = (
    data: ArqueoRecord[],
    config: AccountingConfig,
    mappings: AccountMapping[]
): AccountingRow[] => {
    let rows: AccountingRow[] = [];
    let currentConsecutive = config.startConsecutive;

    // Helper to find mapping
    const getMap = (id: string) => mappings.find(m => m.conceptId === id);

    data.forEach(record => {
        const dateStr = config.globalDate || record.fecha;
        // Basic description logic
        const desc = `Ventas ${dateStr} - ${record.cajero || 'General'}`;

        // 1. Calculate Income & Tax
        const ventaMap = getMap('venta');
        const incMap = getMap('inc');

        const ventaTotal = record.ventaBruta || 0;
        let baseVenta = ventaTotal;
        let incValue = 0;

        // If tax rate is configured on the INCOME mapping or if we have a separate tax mapping logic
        // For simplicity, let's assume if 'inc' mapping exists and has account, we split.
        // Actually, user should configure rate in 'venta' mapping to split it? 
        // Let's stick to the plan: rate is property of mapping.
        if (ventaMap?.taxRate && ventaMap.taxRate > 0) {
            baseVenta = Math.round(ventaTotal / (1 + ventaMap.taxRate));
            incValue = ventaTotal - baseVenta;
        }

        // --- CREDITS (ORIGINS) ---

        // Venta (Income)
        if (ventaMap && ventaMap.accountCode) {
            rows.push(createRow(config, currentConsecutive, dateStr, ventaMap, 0, baseVenta, desc, 'Ingresos'));
        }

        // INC (Tax)
        if (incValue > 0 && incMap && incMap.accountCode) {
            rows.push(createRow(config, currentConsecutive, dateStr, incMap, 0, incValue, desc, 'Impuesto INC', baseVenta));
        }

        // Propina
        const propinaMap = getMap('propina');
        if (record.propina && record.propina > 0 && propinaMap?.accountCode) {
            rows.push(createRow(config, currentConsecutive, dateStr, propinaMap, 0, record.propina, desc, 'Propinas'));
        }

        // Covers
        const coversMap = getMap('covers');
        if (record.ingresoCovers && record.ingresoCovers > 0 && coversMap?.accountCode) {
            rows.push(createRow(config, currentConsecutive, dateStr, coversMap, 0, record.ingresoCovers, desc, 'Covers'));
        }

        // --- DEBITS (DESTINATIONS) ---

        // Cash
        const cashMap = getMap('efectivo');
        if (record.efectivo && record.efectivo > 0 && cashMap?.accountCode) {
            rows.push(createRow(config, currentConsecutive, dateStr, cashMap, record.efectivo, 0, desc, 'Efectivo'));
        }

        // Datafonos
        const d1Map = getMap('datafono1');
        if (record.datafonoDavid && record.datafonoDavid > 0 && d1Map?.accountCode) {
            rows.push(createRow(config, currentConsecutive, dateStr, d1Map, record.datafonoDavid, 0, desc, 'Datafono 1'));
        }
        const d2Map = getMap('datafono2');
        if (record.datafonoJulian && record.datafonoJulian > 0 && d2Map?.accountCode) {
            rows.push(createRow(config, currentConsecutive, dateStr, d2Map, record.datafonoJulian, 0, desc, 'Datafono 2'));
        }

        // Transfers
        const bancolombiaMap = getMap('bancolombia');
        if (record.transfBancolombia && record.transfBancolombia > 0 && bancolombiaMap?.accountCode) {
            rows.push(createRow(config, currentConsecutive, dateStr, bancolombiaMap, record.transfBancolombia, 0, desc, 'Bancolombia'));
        }
        const nequiMap = getMap('nequi');
        if (record.nequi && record.nequi > 0 && nequiMap?.accountCode) {
            rows.push(createRow(config, currentConsecutive, dateStr, nequiMap, record.nequi, 0, desc, 'Nequi'));
        }
        const rappiMap = getMap('rappi');
        if (record.rappi && record.rappi > 0 && rappiMap?.accountCode) {
            rows.push(createRow(config, currentConsecutive, dateStr, rappiMap, record.rappi, 0, desc, 'Rappi'));
        }

        // --- ADJUSTMENT (DESCUADRE) ---
        // Calculate totals for this record so far to determine discrepancy
        // Filter rows for THIS consecutive
        const currentRows = rows.filter(r => r.Consecutivo === currentConsecutive);
        const totalDebits = currentRows.reduce((sum, r) => sum + r.Debito, 0);
        const totalCredits = currentRows.reduce((sum, r) => sum + r.Credito, 0);

        let diff = totalDebits - totalCredits;

        // Note: The system 'descuadre' field is informativo, but for accounting, we strictly need Debits = Credits.
        // If diff > 0 (Debits > Credits), we need a Credit to balance (Income/Surplus).
        // If diff < 0 (Credits > Debits), we need a Debit to balance (Expense/Loss).

        const adjMap = getMap('descuadre');
        if (Math.abs(diff) > 0.01 && adjMap?.accountCode) { // Tolerance for float
            if (diff > 0) {
                // Need Credit
                rows.push(createRow(config, currentConsecutive, dateStr, adjMap, 0, Math.abs(diff), desc, 'Ajuste (Sobrante)'));
            } else {
                // Need Debit
                rows.push(createRow(config, currentConsecutive, dateStr, adjMap, Math.abs(diff), 0, desc, 'Ajuste (Faltante)'));
            }
        }

        // Increment consecutive for next record
        currentConsecutive++;
    });

    return rows;
};

const createRow = (
    config: AccountingConfig,
    consecutive: number,
    date: string,
    map: AccountMapping,
    debit: number,
    credit: number,
    desc: string,
    movDesc: string,
    base: number = 0
): AccountingRow => {
    return {
        TipoDocumento: config.documentType,
        Consecutivo: consecutive,
        Fecha: date,
        FechaVencimiento: date,
        CodigoCuenta: map.accountCode,
        IdContacto: map.thirdPartyId || config.nitTerceroDefault,
        CentroCosto: config.defaultCostCenter,
        Debito: debit,
        Credito: credit,
        Base: base,
        Descripcion: desc,
        DescripcionMovimiento: movDesc
    };
};
