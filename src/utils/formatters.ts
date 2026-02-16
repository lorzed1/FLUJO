/**
 * Formatea centavos a string de moneda (ej. COP/USD) sin decimales.
 * 45780000 -> "$ 457.800"
 */
export function formatMoney(cents: number): string {
    const value = cents / 100
    const formatted = new Intl.NumberFormat('es-CO', { // Cambia 'es-CO' según tu región
        style: 'currency',
        currency: 'COP', // Cambia a tu moneda
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value)

    // Ajuste visual opcional
    return formatted.replace('COP', '$').replace('$', '$ ').trim()
}
