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
     * Obtiene el resumen financiero mensual utilizando la vista optimizada.
     * Ideal para gráficos de barras de Ingresos vs Gastos.
     */
    async getMonthlyFinancialSummary(startMonth?: string, endMonth?: string): Promise<MonthlyFinancialSummary[]> {
        let query = supabase
            .from('monthly_financial_summary')
            .select('*')
            .order('month_year', { ascending: true });

        if (startMonth) {
            query = query.gte('month_year', startMonth);
        }
        if (endMonth) {
            query = query.lte('month_year', endMonth);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching monthly summary:', error);
            throw error;
        }
        return data || [];
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
     * Obtiene el resumen de ventas (Venta Bruta) para un mes específico desde la tabla arqueos.
     */
    /**
     * Obtiene el resumen de ventas para un mes específico.
     * Calcula el total sumando los métodos de pago individuales para coincidir con el Mix de Pagos.
     */
    async getSalesSummary(year: number, month: number) {
        // Current Month Range
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        // Previous Month Range
        const prevDate = new Date(year, month - 2, 1);
        const prevYear = prevDate.getFullYear();
        const prevMonth = prevDate.getMonth() + 1;
        const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
        const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
        const prevEndDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${prevLastDay}`;

        const queryCols = `
            venta_bruta,
            visitas,
            ingreso_covers
        `;

        // Parallel Requests
        const [currRes, prevRes] = await Promise.all([
            supabase
                .from('arqueos')
                .select(queryCols)
                .gte('parsed_date', startDate)
                .lte('parsed_date', endDate)
                .is('deleted_at', null),
            supabase
                .from('arqueos')
                .select(queryCols)
                .gte('parsed_date', prevStartDate)
                .lte('parsed_date', prevEndDate)
                .is('deleted_at', null)
        ]);

        if (currRes.error) throw currRes.error;
        if (prevRes.error) throw prevRes.error;

        // Note on Logic (User Clarity):
        // "Venta POS" (System Raw) = item.venta_bruta (approx $27m)
        // "Venta Bruta" (Real Revenue) = item.venta_bruta - item.ingreso_covers (approx $26m)
        // We display "Venta Bruta" as the main KPI.

        // Current Metrics
        const currData = currRes.data || [];
        const currSales = currData.reduce((sum, item) => sum + (Number(item.venta_bruta) || 0) - (Number(item.ingreso_covers) || 0), 0);
        const currVisits = currData.reduce((sum, item) => sum + (Number(item.visitas) || 0), 0);
        const currTicket = currVisits > 0 ? currSales / currVisits : 0;

        // Previous Metrics
        const prevData = prevRes.data || [];
        const prevSales = prevData.reduce((sum, item) => sum + (Number(item.venta_bruta) || 0) - (Number(item.ingreso_covers) || 0), 0);
        const prevVisits = prevData.reduce((sum, item) => sum + (Number(item.visitas) || 0), 0);
        const prevTicket = prevVisits > 0 ? prevSales / prevVisits : 0;

        // Helper for Trend
        const calcTrend = (curr: number, prev: number) => {
            if (prev === 0) return 0;
            return ((curr - prev) / prev) * 100;
        };

        return {
            totalSales: currSales,
            totalVisits: currVisits,
            // trends
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
            .select('parsed_date, venta_bruta, visitas')
            .gte('parsed_date', startDate)
            .lte('parsed_date', endDate)
            .is('deleted_at', null)
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
                    sales: Number(item.venta_bruta) || 0,
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
     */
    async getPaymentMethodsSummary(year: number, month: number) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        const { data, error } = await supabase
            .from('arqueos')
            .select(`
                efectivo,
                datafono_david,
                datafono_julian,
                transf_bancolombia,
                nequi,
                rappi
            `)
            .gte('parsed_date', startDate)
            .lte('parsed_date', endDate)
            .is('deleted_at', null);

        if (error) {
            console.error('Error fetching payment methods summary:', error);
            throw error;
        }

        const totals = (data || []).reduce((acc, curr) => ({
            efectivo: acc.efectivo + (Number(curr.efectivo) || 0),
            datafono_david: acc.datafono_david + (Number(curr.datafono_david) || 0),
            datafono_julian: acc.datafono_julian + (Number(curr.datafono_julian) || 0),
            nequi: acc.nequi + (Number(curr.nequi) || 0),
            rappi: acc.rappi + (Number(curr.rappi) || 0)
        }), {
            efectivo: 0,
            datafono_david: 0,
            datafono_julian: 0,
            nequi: 0,
            rappi: 0
        });

        const totalAmount = Object.values(totals).reduce((a, b) => a + b, 0);

        const methods = [
            { method: 'Efectivo', amount: totals.efectivo },
            { method: 'Dataf. David', amount: totals.datafono_david },
            { method: 'Dataf. Julian', amount: totals.datafono_julian },
            { method: 'Nequi', amount: totals.nequi },
            { method: 'Rappi', amount: totals.rappi }
        ];

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
     * Utiliza venta_bruta - ingreso_covers.
     */
    async getWeeklySalesSummary(year: number, month: number) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        const { data, error } = await supabase
            .from('arqueos')
            .select('parsed_date, venta_bruta, ingreso_covers, visitas')
            .gte('parsed_date', startDate)
            .lte('parsed_date', endDate)
            .is('deleted_at', null)
            .order('parsed_date', { ascending: true });

        if (error) {
            console.error('Error fetching weekly sales summary:', error);
            throw error;
        }

        // Agrupar por semanas (Lunes a Domingo)
        const weeklyData: { [key: number]: { sales: number; visits: number } } = {};

        const getWeekNumber = (date: Date) => {
            // Nota: Esta lógica agrupa por semanas del mes actual
            // Semana 1: Días desde el 1ro hasta el primer domingo
            // Semana 2+: Lunes a Domingo posteriores
            const dayOfMonth = date.getDate();
            const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

            // getDay(): 0 (Dom) ... 6 (Sab). Ajustamos a 1 (Lun) ... 7 (Dom)
            let firstDayOfWeek = firstDayOfMonth.getDay();
            if (firstDayOfWeek === 0) firstDayOfWeek = 7;

            // Calcular offset para alinear a Lunes
            const offset = firstDayOfWeek - 1;

            return Math.ceil((dayOfMonth + offset) / 7);
        };

        (data || []).forEach(item => {
            if (item.parsed_date) {
                const date = new Date(item.parsed_date + 'T00:00:00');
                const weekNum = getWeekNumber(date);

                const netSale = (Number(item.venta_bruta) || 0) - (Number(item.ingreso_covers) || 0);
                const visitCount = Number(item.visitas) || 0;

                if (!weeklyData[weekNum]) {
                    weeklyData[weekNum] = { sales: 0, visits: 0 };
                }
                weeklyData[weekNum].sales += netSale;
                weeklyData[weekNum].visits += visitCount;
            }
        });

        // Convertir a array para gráfico, asegurando todas las semanas posibles (max 6)
        // O solo las que tienen datos? Mejor todas para que el gráfico no se vea vacío raro.
        // Averiguamos cuantas semanas tiene el mes
        const lastDate = new Date(year, month, 0);
        const totalWeeks = getWeekNumber(lastDate);

        const result = [];
        for (let i = 1; i <= totalWeeks; i++) {
            result.push({
                week: `Sem ${i}`,
                sales: weeklyData[i]?.sales || 0,
                visits: weeklyData[i]?.visits || 0,
                target: 0 // Placeholder
            });
        }

        return result;
    }
};
