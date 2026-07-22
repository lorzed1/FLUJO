import { supabase } from './supabaseClient';

export interface MonthlyFinancialSummary {
    month_year: string;  // YYYY-MM
    year: number;
    month: number;
    total_income: number;
    total_expense: number;
    net_profit: number;
    transaction_count: number;
}

export interface CategoryExpenseSummary {
    month_year: string;
    category_name: string;
    category_type: string;
    total_amount: number;
    transaction_count: number;
}

export const dashboardService = {
    /**
     * Obtiene el resumen financiero de ingresos y egresos del mes.
     * Basado en arqueos (venta bruta) y pagos efectivos.
     */
    async getMonthlyIncomeAndExpensesKPI(year: number, month: number) {
        const currentMonthYear = `${year}-${String(month).padStart(2, '0')}`;

        // 1. Ingresos totales (todos los medios de pago)
        const { data: salesData, error: salesError } = await supabase
            .from('view_monthly_sales_summary')
            .select('venta_bruta')
            .eq('month_year', currentMonthYear)
            .single();

        // Si no hay ventas, no lanzamos error, simplemente es 0
        const totalIncome = salesError ? 0 : Number(salesData?.venta_bruta) || 0;

        // 2. Egresos totales (pagos efectivos / ya saldados de caja)
        // Definición: compromisos del mes actual que ya están pagados
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        const { data: egresosData, error: egresosError } = await supabase
            .from('budget_commitments')
            .select('amount, status, paid_date')
            .gte('due_date', startDate)
            .lte('due_date', endDate)
            .eq('status', 'paid');

        if (egresosError) {
            console.error('Error fetching expenses:', egresosError);
            // No rompemos todo el try catch
        }

        const totalExpense = (egresosData || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        return {
            total_income: totalIncome,
            total_expense: totalExpense
        };
    },

    /**
     * Obtiene el desglose de gastos por categoría para un mes específico.
     * Ideal para gráficos de torta (Pie Charts).
     */
    async getCategoryExpenseSummary(monthYear: string): Promise<CategoryExpenseSummary[]> {
        const { data, error } = await supabase
            .from('category_expense_summary')
            .select('*')
            .eq('month_year', monthYear)
            .order('total_amount', { ascending: false });

        if (error) {
            console.error('Error fetching category summary:', error);
            throw error;
        }
        return data || [];
    },

    /**
     * Obtiene el resumen de ventas para un mes específico.
     * Usa la vista SQL `view_monthly_sales_summary` para máximo rendimiento.
     */
    async getSalesSummary(year: number, month: number) {
        const currentMonthYear = `${year}-${String(month).padStart(2, '0')}`;

        // Mes anterior
        const prevDate = new Date(year, month - 2, 1);
        const prevMonthYear = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

        const { data, error } = await supabase
            .from('view_monthly_sales_summary')
            .select('*')
            .in('month_year', [currentMonthYear, prevMonthYear]);

        if (error) throw error;

        const curr = (data || []).find(d => d.month_year === currentMonthYear);
        const prev = (data || []).find(d => d.month_year === prevMonthYear);

        const currSales = Number(curr?.venta_bruta) || 0;
        const currVisits = Number(curr?.total_visitas) || 0;
        const currTicket = Number(curr?.ticket_promedio) || 0;

        const prevSales = Number(prev?.venta_bruta) || 0;
        const prevVisits = Number(prev?.total_visitas) || 0;
        const prevTicket = Number(prev?.ticket_promedio) || 0;

        const calcTrend = (c: number, p: number) => p === 0 ? 0 : ((c - p) / p) * 100;

        return {
            totalSales: currSales,
            totalVisits: currVisits,
            salesTrend: calcTrend(currSales, prevSales),
            visitsTrend: calcTrend(currVisits, prevVisits),
            ticketTrend: calcTrend(currTicket, prevTicket)
        };
    },

    /**
     * Obtiene el desglose de ventas diarias para un mes específico.
     */
    async getDailySalesSummary(year: number, month: number) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        const { data, error } = await supabase
            .from('arqueos')
            .select('parsed_date, venta_pos, visitas')
            .gte('parsed_date', startDate)
            .lte('parsed_date', endDate)
            .order('parsed_date', { ascending: true });

        if (error) {
            console.error('Error fetching daily sales summary:', error);
            throw error;
        }

        // Obtener todos los días del mes
        const dailyDataMap = new Map();
        (data || []).forEach(item => {
            if (item.parsed_date) {
                const day = new Date(item.parsed_date + 'T00:00:00').getDate().toString();
                dailyDataMap.set(day, {
                    sales: Number(item.venta_pos) || 0,
                    visits: Number(item.visitas) || 0
                });
            }
        });

        const result = [];
        for (let d = 1; d <= lastDay; d++) {
            const dayStr = d.toString();
            const dayData = dailyDataMap.get(dayStr) || { sales: 0, visits: 0 };
            result.push({
                day: dayStr,
                ...dayData
            });
        }

        return result;
    },

    /**
     * Obtiene la distribución de métodos de pago para un mes específico.
     * Usa la vista SQL `view_payment_method_stats` para máximo rendimiento.
     */
    async getPaymentMethodsSummary(year: number, month: number) {
        const monthYear = `${year}-${String(month).padStart(2, '0')}`;

        const { data, error } = await supabase
            .from('view_payment_method_stats')
            .select('*')
            .eq('month_year', monthYear);

        if (error) {
            console.error('Error fetching payment methods summary:', error);
            throw error;
        }

        const methods = (data || []).map(d => ({
            method: String(d.method_name),
            amount: Number(d.total_amount) || 0
        }));

        const totalAmount = methods.reduce((sum, m) => sum + m.amount, 0);

        return methods
            .filter(item => item.amount > 0)
            .map(item => ({
                ...item,
                percentage: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0
            }));
    },

    /**
     * Obtiene el resumen de ventas semanal para un mes específico.
     * La semana se considera de Lunes a Domingo.
     * Utiliza venta_pos - ingreso_covers.
     */
    async getWeeklySalesSummary(year: number, month: number) {
        // First day of the selected month
        const firstDayOfMonth = new Date(year, month - 1, 1);
        let firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon
        if (firstDayOfWeek === 0) firstDayOfWeek = 7;

        // Monday of the first week
        const startOfFirstWeek = new Date(year, month - 1, 1);
        startOfFirstWeek.setDate(firstDayOfMonth.getDate() - (firstDayOfWeek - 1));

        // Last day of the selected month
        const lastDayOfMonth = new Date(year, month, 0);
        let lastDayOfWeek = lastDayOfMonth.getDay();
        if (lastDayOfWeek === 0) lastDayOfWeek = 7;

        // Sunday of the last week
        const endOfLastWeek = new Date(year, month, 0);
        endOfLastWeek.setDate(lastDayOfMonth.getDate() + (7 - lastDayOfWeek));

        // Helper string to avoid timezone shifts
        const toLocalISODate = (d: Date) => {
            const z = (n: number) => ('0' + n).slice(-2);
            return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
        };

        const startDateStr = toLocalISODate(startOfFirstWeek);
        const endDateStr = toLocalISODate(endOfLastWeek);

        const { data, error } = await supabase
            .from('arqueos')
            .select('parsed_date, venta_pos, ingreso_covers, visitas')
            .gte('parsed_date', startDateStr)
            .lte('parsed_date', endDateStr)
            .order('parsed_date', { ascending: true });

        if (error) {
            console.error('Error fetching weekly sales summary:', error);
            throw error;
        }

        const weeklyData: { [key: number]: { sales: number; visits: number } } = {};

        // Función para obtener la semana ISO (1-53) del año
        const getISOWeekNumber = (dateString: string) => {
            const [y, m, d] = dateString.split('-');
            const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
            const dayNum = date.getUTCDay() || 7;
            date.setUTCDate(date.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
            return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        };

        (data || []).forEach(item => {
            if (item.parsed_date) {
                const weekNum = getISOWeekNumber(item.parsed_date);
                const netSale = (Number(item.venta_pos) || 0) - (Number(item.ingreso_covers) || 0);
                const visitCount = Number(item.visitas) || 0;

                if (!weeklyData[weekNum]) {
                    weeklyData[weekNum] = { sales: 0, visits: 0 };
                }
                weeklyData[weekNum].sales += netSale;
                weeklyData[weekNum].visits += visitCount;
            }
        });

        const result = [];
        const currentMonday = new Date(startOfFirstWeek);

        while (currentMonday <= endOfLastWeek) {
            const isoWeek = getISOWeekNumber(toLocalISODate(currentMonday));
            result.push({
                week: `Sem ${isoWeek}`,
                sales: weeklyData[isoWeek]?.sales || 0,
                visits: weeklyData[isoWeek]?.visits || 0,
                target: 0 // Placeholder
            });
            currentMonday.setDate(currentMonday.getDate() + 7);
        }

        return result;
    },

    /**
     * Obtiene el resumen de compras semanal para un mes específico.
     * La semana se considera de Lunes a Domingo.
     * Incluye días de meses adyacentes para completar las semanas (ej. semana 6).
     * Muestra el número de semana correspondiente a la semana del año (ISO Week).
     */
    async getWeeklyPurchasesSummary(year: number, month: number) {
        // First day of the selected month
        const firstDayOfMonth = new Date(year, month - 1, 1);
        let firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon
        if (firstDayOfWeek === 0) firstDayOfWeek = 7;

        // Monday of the first week
        const startOfFirstWeek = new Date(year, month - 1, 1);
        startOfFirstWeek.setDate(firstDayOfMonth.getDate() - (firstDayOfWeek - 1));

        // Last day of the selected month
        const lastDayOfMonth = new Date(year, month, 0);
        let lastDayOfWeek = lastDayOfMonth.getDay();
        if (lastDayOfWeek === 0) lastDayOfWeek = 7;

        // Sunday of the last week
        const endOfLastWeek = new Date(year, month, 0);
        endOfLastWeek.setDate(lastDayOfMonth.getDate() + (7 - lastDayOfWeek));

        // Monday of the previous week (to fetch sales for budget calculation)
        const startOfPrevWeek = new Date(startOfFirstWeek);
        startOfPrevWeek.setDate(startOfFirstWeek.getDate() - 7);

        // Helper string to avoid timezone shifts
        const toLocalISODate = (d: Date) => {
            const z = (n: number) => ('0' + n).slice(-2);
            return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
        };

        const startDateStr = toLocalISODate(startOfFirstWeek);
        const endDateStr = toLocalISODate(endOfLastWeek);
        const prevStartDateStr = toLocalISODate(startOfPrevWeek);

        const [purchasesRes, salesRes] = await Promise.all([
            supabase
                .from('budget_purchases')
                .select('fecha, base, debito')
                .gte('fecha', startDateStr)
                .lte('fecha', endDateStr)
                .order('fecha', { ascending: true }),
            supabase
                .from('arqueos')
                .select('parsed_date, venta_pos, ingreso_covers')
                .gte('parsed_date', prevStartDateStr)
                .lte('parsed_date', endDateStr)
        ]);

        const { data: purchasesData, error: purchasesError } = purchasesRes;
        const { data: salesData, error: salesError } = salesRes;

        if (purchasesError) {
            console.error('Error fetching weekly purchases summary:', purchasesError);
            throw purchasesError;
        }

        const weeklyPurchases: { [key: number]: number } = {};
        const weeklySales: { [key: number]: number } = {};

        // Función para obtener la semana ISO (1-53) del año
        const getISOWeekNumber = (dateString: string) => {
            const [y, m, d] = dateString.split('-');
            const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
            const dayNum = date.getUTCDay() || 7;
            date.setUTCDate(date.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
            return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        };

        (purchasesData || []).forEach(item => {
            if (item.fecha) {
                const weekNum = getISOWeekNumber(item.fecha);
                const amount = Number(item.debito) || Number(item.base) || 0;
                if (!weeklyPurchases[weekNum]) weeklyPurchases[weekNum] = 0;
                weeklyPurchases[weekNum] += amount;
            }
        });

        (salesData || []).forEach(item => {
            if (item.parsed_date) {
                const weekNum = getISOWeekNumber(item.parsed_date);
                // La venta real (neta de covers) corresponde a venta_pos - ingreso_covers
                const grossSale = Number(item.venta_pos) || 0;
                const covers = Number(item.ingreso_covers) || 0;
                const netAmount = Math.max(0, grossSale - covers);

                if (!weeklySales[weekNum]) weeklySales[weekNum] = 0;
                weeklySales[weekNum] += netAmount;
            }
        });

        const result = [];
        const currentMonday = new Date(startOfFirstWeek);

        while (currentMonday <= endOfLastWeek) {
            const isoWeek = getISOWeekNumber(toLocalISODate(currentMonday));

            // Get previous week number for sales
            const prevMonday = new Date(currentMonday);
            prevMonday.setDate(currentMonday.getDate() - 7);
            const prevIsoWeek = getISOWeekNumber(toLocalISODate(prevMonday));

            const prevWeekSales = weeklySales[prevIsoWeek] || 0;

            result.push({
                week: `Sem ${isoWeek}`,
                amount: weeklyPurchases[isoWeek] || 0,
                budget: prevWeekSales * 0.40,
            });
            currentMonday.setDate(currentMonday.getDate() + 7);
        }

        return result;
    },

    /**
     * Obtiene el total de compras del mes actual y su variación respecto al mes anterior.
     * Usa la vista SQL `view_monthly_purchases_summary` para máximo rendimiento.
     */
    async getMonthlyPurchasesKPI(year: number, month: number) {
        const currentMonthYear = `${year}-${String(month).padStart(2, '0')}`;

        let prevYear = year;
        let prevMonth = month - 1;
        if (prevMonth === 0) { prevMonth = 12; prevYear--; }
        const prevMonthYear = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

        const { data, error } = await supabase
            .from('view_monthly_purchases_summary')
            .select('*')
            .in('month_year', [currentMonthYear, prevMonthYear]);

        if (error) throw error;

        const curr = (data || []).find(d => d.month_year === currentMonthYear);
        const prev = (data || []).find(d => d.month_year === prevMonthYear);

        const currentTotal = Number(curr?.total_debito) || 0;
        const prevTotal = Number(prev?.total_debito) || 0;

        let change = 0;
        if (prevTotal > 0) {
            change = ((currentTotal - prevTotal) / prevTotal) * 100;
        }

        return {
            total: currentTotal,
            prevTotal: prevTotal,
            change: change,
            isUp: change >= 0
        };
    },

    /**
     * KPI de porcentaje de compras respecto a ventas brutas (sin covers).
     * Combina las vistas `view_monthly_purchases_summary` y `view_monthly_sales_summary`.
     */
    async getMonthlyPurchasesPercentageKPI(year: number, month: number) {
        const currentMonthYear = `${year}-${String(month).padStart(2, '0')}`;

        let prevYear = year;
        let prevMonth = month - 1;
        if (prevMonth === 0) { prevMonth = 12; prevYear--; }
        const prevMonthYear = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

        const [purchasesRes, salesRes] = await Promise.all([
            supabase
                .from('view_monthly_purchases_summary')
                .select('*')
                .in('month_year', [currentMonthYear, prevMonthYear]),
            supabase
                .from('view_monthly_sales_summary')
                .select('*')
                .in('month_year', [currentMonthYear, prevMonthYear])
        ]);

        if (purchasesRes.error) throw purchasesRes.error;
        if (salesRes.error) throw salesRes.error;

        const currPurchases = Number((purchasesRes.data || []).find(d => d.month_year === currentMonthYear)?.total_debito) || 0;
        const prevPurchases = Number((purchasesRes.data || []).find(d => d.month_year === prevMonthYear)?.total_debito) || 0;
        const currSales = Number((salesRes.data || []).find(d => d.month_year === currentMonthYear)?.venta_bruta) || 0;
        const prevSales = Number((salesRes.data || []).find(d => d.month_year === prevMonthYear)?.venta_bruta) || 0;

        const currentPercentage = currSales > 0 ? (currPurchases / currSales) * 100 : 0;
        const prevPercentage = prevSales > 0 ? (prevPurchases / prevSales) * 100 : 0;

        let change = 0;
        if (prevPercentage > 0) {
            change = currentPercentage - prevPercentage;
        }

        return {
            percentage: currentPercentage,
            change: change,
            isUp: change > 0
        };
    },

    /**
     * KPI: Cumplimiento del presupuesto de compras del mes.
     * Presupuesto se calcula como el 40% de las ventas brutas del mes anterior. (Convención del negocio)
     */
    async getMonthlyPurchasesPerformanceKPI(year: number, month: number) {
        const currentMonthYear = `${year}-${String(month).padStart(2, '0')}`;
        let prevYear = year;
        let prevMonth = month - 1;
        if (prevMonth === 0) { prevMonth = 12; prevYear--; }
        const prevMonthYear = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

        const [purchasesRes, salesRes] = await Promise.all([
            supabase
                .from('view_monthly_purchases_summary')
                .select('*')
                .eq('month_year', currentMonthYear),
            supabase
                .from('view_monthly_sales_summary')
                .select('*')
                .eq('month_year', prevMonthYear)
        ]);

        if (purchasesRes.error) throw purchasesRes.error;
        if (salesRes.error) throw salesRes.error;

        const currPurchases = Number((purchasesRes.data || [])[0]?.total_debito) || 0;
        const prevSales = Number((salesRes.data || [])[0]?.venta_bruta) || 0;

        // El presupuesto mensual asignado a compras es el 40% de las ventas del mes anterior
        const budget = prevSales * 0.40;
        const percentage = budget > 0 ? (currPurchases / budget) * 100 : 0;

        return {
            amount: currPurchases,
            budget: budget,
            percentage: percentage
        };
    },

    /**
     * KPI: Cumplimiento de la meta de ventas del mes.
     * Aquí simulamos la meta como el 105% de las ventas brutas del mes pasado,
     * ya que no tenemos una tabla de metas explícita por ahora.
     */
    async getMonthlySalesPerformanceKPI(year: number, month: number) {
        const currentMonthYear = `${year}-${String(month).padStart(2, '0')}`;
        let prevYear = year;
        let prevMonth = month - 1;
        if (prevMonth === 0) { prevMonth = 12; prevYear--; }
        const prevMonthYear = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

        const { data, error } = await supabase
            .from('view_monthly_sales_summary')
            .select('*')
            .in('month_year', [currentMonthYear, prevMonthYear]);

        if (error) throw error;

        const currSales = Number((data || []).find(d => d.month_year === currentMonthYear)?.venta_bruta) || 0;
        const prevSales = Number((data || []).find(d => d.month_year === prevMonthYear)?.venta_bruta) || 0;

        const goal = prevSales > 0 ? prevSales * 1.05 : currSales > 0 ? currSales * 1.05 : 0;
        const percentage = goal > 0 ? (currSales / goal) * 100 : 0;

        return {
            amount: currSales,
            goal: goal,
            percentage: percentage
        };
    },

    /**
     * Gráfica de ventas del año (incluye visitas)
     */
    async getYearlySalesAndVisits(year: number) {
        const { data, error } = await supabase
            .from('view_monthly_sales_summary')
            .select('*')
            .gte('month_year', `${year}-01`)
            .lte('month_year', `${year}-12`)
            .order('month_year', { ascending: true });

        if (error) throw error;

        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        // Ensure we have 12 months
        return Array.from({ length: 12 }, (_, i) => {
            const monthStr = String(i + 1).padStart(2, '0');
            const monthYear = `${year}-${monthStr}`;
            const monthData = (data || []).find(d => d.month_year === monthYear);

            return {
                name: months[i],
                sales: Number(monthData?.venta_bruta) || 0,
                visits: Number(monthData?.total_visitas) || 0
            };
        });
    },

    /**
     * Gráfica de ventas por semana del año (incluye visitas)
     */
    async getYearlyWeeklySalesAndVisits(year: number) {
        const startDateStr = `${year}-01-01`;
        const endDateStr = `${year}-12-31`;

        const { data, error } = await supabase
            .from('arqueos')
            .select('parsed_date, venta_pos, ingreso_covers, visitas')
            .gte('parsed_date', startDateStr)
            .lte('parsed_date', endDateStr)
            .order('parsed_date', { ascending: true });

        if (error) throw error;

        const weeklyData: { [key: number]: { sales: number; visits: number } } = {};

        const getISOWeekNumber = (dateString: string) => {
            const [y, m, d] = dateString.split('-');
            const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
            const dayNum = date.getUTCDay() || 7;
            date.setUTCDate(date.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
            return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        };

        let maxWeek = 0;
        (data || []).forEach(item => {
            if (item.parsed_date) {
                const weekNum = getISOWeekNumber(item.parsed_date);
                if (weekNum > maxWeek) maxWeek = weekNum;

                const netSale = (Number(item.venta_pos) || 0) - (Number(item.ingreso_covers) || 0);
                const visitCount = Number(item.visitas) || 0;

                if (!weeklyData[weekNum]) {
                    weeklyData[weekNum] = { sales: 0, visits: 0 };
                }
                weeklyData[weekNum].sales += netSale;
                weeklyData[weekNum].visits += visitCount;
            }
        });

        const result = [];
        for (let i = 1; i <= maxWeek; i++) {
            result.push({
                week: `Sem ${i}`,
                sales: weeklyData[i]?.sales || 0,
                visits: weeklyData[i]?.visits || 0
            });
        }

        return result;
    },

    /**
     * KPI: Cartera no pagada del mes (compromisos pendientes y vencidos)
     * Estos son del módulo de Egresos.
     */
    async getMonthlyUnpaidCommitmentsKPI(year: number, month: number) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        const { data, error } = await supabase
            .from('budget_commitments')
            .select('amount, status')
            .gte('due_date', startDate)
            .lte('due_date', endDate)
            .in('status', ['pending', 'overdue']);

        if (error) {
            console.error('Error fetching unpaid commitments:', error);
            throw error;
        }

        const totalUnpaid = (data || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        return {
            amount: totalUnpaid
        };
    }
};
