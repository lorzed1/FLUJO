
export const MOCK_OVERVIEW_DATA = {
    kpis: [
        { title: "Ingresos Totales", value: "---", change: "0%", trend: "neutral", period: "Período actual" },
        { title: "Gastos Operativos", value: "---", change: "0%", trend: "neutral", period: "Período actual" },
        { title: "Margen Neto", value: "---", change: "0%", trend: "neutral", period: "Período actual" },
        { title: "Proyección Cumplimiento", value: "---", change: "0%", trend: "neutral", period: "Período actual" },
    ],
    salesTrend: [],
    budgetDistribution: []
};

export const MOCK_BUDGET_DATA = {
    kpis: [
        { title: "Presupuesto Asignado", value: "---", change: "0%", trend: "neutral", period: "Anual" },
        { title: "Ejecutado", value: "---", change: "0%", trend: "neutral", period: "% del total" },
        { title: "Disponible", value: "---", change: "0%", trend: "neutral", period: "% restante" },
    ],
    executionByArea: []
};

export const MOCK_PROJECTIONS_DATA = {
    forecast: []
};

export const MOCK_EXPENSES_DATA = {
    topExpenses: [],
    trend: []
};

export const MOCK_SALES_DATA = {
    kpis: [
        { title: "VENTA BRUTA", value: "---", change: "0%", trend: "neutral", period: "vs mes anterior" },
        { title: "TICKET PROMEDIO", value: "---", change: "0%", trend: "neutral", period: "vs mes anterior" },
        { title: "TOTAL VISITAS", value: "---", change: "0%", trend: "neutral", period: "vs mes anterior" },
        { title: "CONVERSIÓN", value: "---", change: "0%", trend: "neutral", period: "vs mes anterior" },
    ],
    dailySales: [],
    topProducts: [],
    paymentMethods: [],
    weeklySummary: [],
};
