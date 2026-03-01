export interface TipCalculationParams {
    totalPropinas: number;
    division: number;
}

export interface TipCalculationResult {
    comisionMediosElectronicos: number;
    basePropinas: number;
    totalPersona: number;
    unp: number;
}

/**
 * Función centralizada que contiene toda la lógica matemática 
 * para el reparto de propinas y cálculo del fondo UNP.
 * 
 * Centralizar esto aquí garantiza que tanto los formularios,
 * como la tabla editable y los importadores de Excel usen SIEMPRE
 * la misma fórmula.
 */
export const calculateTipDistribution = (
    totalPropinas: number,
    division: number
): TipCalculationResult => {
    const safeTotal = Number(totalPropinas) || 0;
    const safeDivision = Number(division) > 0 ? Number(division) : 1;

    // 1. Comisión del 3%
    const comisionMediosElectronicos = safeTotal * 0.03;

    // 2. Base neta a repartir
    const basePropinas = safeTotal - comisionMediosElectronicos;

    // 3. Valor exacto por persona (redondeado hacia abajo)
    const totalPersona = Math.floor(basePropinas / safeDivision);

    // 4. Fondo UNP (Comisión + la cuota equivalente a 1 persona)
    const unp = comisionMediosElectronicos + totalPersona;

    return {
        comisionMediosElectronicos,
        basePropinas,
        totalPersona,
        unp
    };
};
