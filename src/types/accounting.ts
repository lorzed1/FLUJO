
export type AccountingNature = 'Debit' | 'Credit';

export interface AccountMapping {
    sourceField: string;      // ID field in Arqueo (e.g., 'ventaPos', 'efectivo')
    label: string;            // Human readable label (e.g., 'Venta Bruta', 'Efectivo')
    accountCode: string;      // PUC Code (e.g., '41402001')
    thirdPartyId: string;     // NIT / CC
    costCenter: string;       // Default 'Principal'
    nature: AccountingNature;
    descriptionTemplate?: string; // Optional override for functionality
}

export interface AccountingConfig {
    mappings: AccountMapping[];
    defaultDocumentType: string; // e.g., 'FV'
}

export const AVAILABLE_SOURCE_FIELDS = [
    { id: 'ventaPos', label: 'VENTA POS' },
    { id: 'propina', label: 'PROPINA' },
    { id: 'ingresoCovers', label: 'COVERS' },
    // Calculated Fields
    { id: 'ventaSC', label: 'VENTA SC' },
    { id: 'baseImpuesto', label: 'BASE' },
    { id: 'impuestoConsumo', label: 'INC (8%)' },
    // Means of Payment
    { id: 'efectivo', label: 'EFECTIVO' },
    { id: 'datafonoDavid', label: 'DATAFONO 1' },
    { id: 'datafonoJulian', label: 'DATAFONO 2' },
    { id: 'transfBancolombia', label: 'BANCOLOMBIA' },
    { id: 'nequi', label: 'NEQUI' },
    { id: 'rappi', label: 'RAPPI' },
    // Adjustments
    { id: 'sobrante', label: 'DESCUADRE (Sobrante)' },
    { id: 'faltante', label: 'DESCUADRE (Faltante)' }
];

export interface AccountingEntry {
    tipoDocumento: string;
    consecutivo: number;
    fecha: string; // DD/MM/YYYY
    fechaVencimiento: string; // DD/MM/YYYY
    codigoCuenta: string;
    idTercero: string;
    centroCosto: string;
    debito: number;
    credito: number;
    base: number;
    descripcion: string;
    descripcionMovimiento: string;
}
