/**
 * Template de ejecución para cálculos de arqueo
 * Sigue las reglas de negocio establecidas en BUSINESS_RULES.md
 */

export interface ArqueoBase {
    ventaBruta: number; // Venta POS
    propina: number;
    ingresoCovers: number;
    totalRecaudado: number; // Suma de medios de pago
}

export function calculateArqueoStatus(data: ArqueoBase) {
    // 1. Calcular Ingresos (POS + Propina)
    const totalIngresos = (data.ventaBruta || 0) + (data.propina || 0);

    // 2. Calcular Descuadre (Egresos - Ingresos)
    // Nota: El cover se ignora en esta resta porque no hace parte del esperado contable vs real
    const descuadre = (data.totalRecaudado || 0) - totalIngresos;

    return {
        totalIngresos,
        descuadre,
        isSobrante: descuadre > 0,
        isFaltante: descuadre < 0,
        isCuadrado: descuadre === 0
    };
}
