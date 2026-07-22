export interface ArqueoBaseData {
    ventaPos?: number;
    propina?: number;
    efectivo?: number;
    datafonoDavid?: number;
    datafonoJulian?: number;
    transfBancolombia?: number;
    nequi?: number;
    rappi?: number;
}

export interface ArqueoCalculationResult {
    ventaTotalEsperada: number;
    totalRecaudado: number;
    descuadre: number;
}

/**
 * Calcula el total físico y virtual recaudado.
 */
export const calculateTotalRecaudado = (data: Partial<ArqueoBaseData>): number => {
    return (
        (Number(data.efectivo) || 0) +
        (Number(data.datafonoDavid) || 0) +
        (Number(data.datafonoJulian) || 0) +
        (Number(data.transfBancolombia) || 0) +
        (Number(data.nequi) || 0) +
        (Number(data.rappi) || 0)
    );
};

/**
 * Calcula la venta total esperada según el sistema.
 */
export const calculateVentaEsperada = (data: Partial<ArqueoBaseData>): number => {
    return (Number(data.ventaPos) || 0) + (Number(data.propina) || 0);
};

/**
 * Función centralizada para calcular todos los totales de un Cuadre de Caja (Arqueo)
 */
export const calculateArqueoTotals = (data: Partial<ArqueoBaseData>): ArqueoCalculationResult => {
    const ventaTotalEsperada = calculateVentaEsperada(data);
    const totalRecaudado = calculateTotalRecaudado(data);
    const descuadre = totalRecaudado - ventaTotalEsperada;

    return {
        ventaTotalEsperada,
        totalRecaudado,
        descuadre
    };
};

/**
 * @deprecated Use calculateArqueoTotals instead. Maintain for backward compatibility.
 */
export const calculateDescuadre = (data: Partial<ArqueoBaseData>): number => {
    return calculateArqueoTotals(data).descuadre;
};
