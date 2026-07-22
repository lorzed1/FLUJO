import { dashboardService } from './services/dashboardService';

async function test() {
    try {
        console.log("---- Testing dashboardService for March 2026 ----");
        const sales = await dashboardService.getMonthlySalesPerformanceKPI(2026, 3);
        console.log("Sales KPI 2026-03:", sales);

        const yearly = await dashboardService.getYearlyWeeklySalesAndVisits(2026);
        console.log("Yearly 2026:", yearly.slice(-2));

        console.log("---- Testing dashboardService for Feb 2026 ----");
        const purchases = await dashboardService.getMonthlyPurchasesPerformanceKPI(2026, 2);
        console.log("Purchases KPI 2026-02:", purchases);
    } catch (e: any) {
        console.error("ERROR running dashboardService:", e.message || e);
    }
}

test();
