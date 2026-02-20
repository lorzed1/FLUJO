import { useMemo, useState } from 'react';
import { ArqueoRecord } from '../types';

export type PeriodMode = 'month' | 'year' | 'range' | 'semester' | 'trimester' | 'week';
export type ComparisonMode = 'none' | 'previous_period' | 'year_over_year';
export type ViewMode = 'all' | 'sales' | 'visits';

export interface FilterState {
    periodMode: PeriodMode;
    selectedDate: Date;
    selectedWeek: string;
    dateRange: { start: string; end: string };
    selectedWeekdays: number[];
    comparisonMode: ComparisonMode;
    viewMode: ViewMode;
}

export interface ExtendedKPIs {
    // Ventas
    totalSales: {
        value: number;
        vsLastMonth: number;
        vsLastYear: number;
        previousMonthValue: number;
        previousYearValue: number;
    };
    bestSale: { date: string; value: number };
    worstSale: { date: string; value: number };
    avgDailySales: number;

    // Tickets
    avgTicket: {
        value: number;
        vsLastMonth: number;
        previousMonthValue: number;
    };
    bestTicket: { date: string; value: number };
    worstTicket: { date: string; value: number };

    // Visitas
    totalVisits: number;
    avgDailyVisits: number;

    // Rappi (Domicilios)
    rappiSales: number;
}

export interface DayStats {
    dayName: string;
    dayIndex: number;
    totalSales: number;
    avgSales: number;
    count: number;
    totalPax: number;
    avgPax: number;
}

export interface WeeklySalesData {
    weekNumber: number;
    weekLabel: string;
    totalSales: number;
    totalVisits: number;
    avgTicket: number;
    dateRange: { start: string; end: string };
}

export interface DayOfWeekByWeekData {
    dayName: string;
    dayIndex: number;
    [weekKey: string]: any; // week1, week2, etc.
}

export interface MonthlyYearOverYear {
    month: string;
    monthIndex: number;
    currentYear: number;
    previousYear: number;
}

export const useBusinessIntelligence = (data: ArqueoRecord[]) => {
    const [filters, setFilters] = useState<FilterState>({
        periodMode: 'month',
        selectedDate: new Date(),
        selectedWeek: (() => {
            const now = new Date();
            const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
        })(),
        dateRange: {
            start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
        },
        selectedWeekdays: [],
        comparisonMode: 'previous_period',
        viewMode: 'all'
    });

    // --- HELPER FUNCTIONS ---

    const getDayIndex = (dateParams: string | Date) => {
        const d = new Date(typeof dateParams === 'string' ? dateParams + 'T12:00:00' : dateParams);
        return d.getDay();
    };

    const getWeekRange = (weekStr: string) => {
        try {
            const [y, w] = weekStr.split('-W');
            const year = parseInt(y);
            const week = parseInt(w);

            const jan4 = new Date(year, 0, 4);
            const day = jan4.getDay();
            const isoDay = day === 0 ? 7 : day;

            const week1Start = new Date(jan4);
            week1Start.setDate(jan4.getDate() - (isoDay - 1));

            const start = new Date(week1Start);
            start.setDate(week1Start.getDate() + (week - 1) * 7);

            const end = new Date(start);
            end.setDate(start.getDate() + 6);

            return {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0]
            };
        } catch (e) {
            const now = new Date();
            return {
                start: now.toISOString().split('T')[0],
                end: now.toISOString().split('T')[0]
            };
        }
    };

    const getWeekNumber = (dateStr: string): number => {
        const d = new Date(dateStr + 'T12:00:00');
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    const isInPeriod = (dateStr: string, start: string, end: string) => {
        return dateStr >= start && dateStr <= end;
    };

    const getPreviousPeriodRange = (start: string, end: string, mode: ComparisonMode): { start: string, end: string } => {
        const startDate = new Date(start + 'T12:00:00');
        const endDate = new Date(end + 'T12:00:00');
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (mode === 'year_over_year') {
            const prevStart = new Date(startDate);
            prevStart.setFullYear(startDate.getFullYear() - 1);
            const prevEnd = new Date(endDate);
            prevEnd.setFullYear(endDate.getFullYear() - 1);
            return {
                start: prevStart.toISOString().split('T')[0],
                end: prevEnd.toISOString().split('T')[0]
            };
        } else {
            const prevEnd = new Date(startDate);
            prevEnd.setDate(startDate.getDate() - 1);
            const prevStart = new Date(prevEnd);
            prevStart.setDate(prevEnd.getDate() - diffDays + 1);
            return {
                start: prevStart.toISOString().split('T')[0],
                end: prevEnd.toISOString().split('T')[0]
            };
        }
    };

    const getSaleValue = (record: ArqueoRecord) => {
        // Usar ventaBruta como única fuente de verdad
        return record.ventaBruta || 0;
    };
    const getTicket = (record: ArqueoRecord) => {
        const sales = getSaleValue(record);
        const visits = record.visitas || 0;
        return visits > 0 ? sales / visits : 0;
    };

    // --- CORE DATA FILTERING ---

    const { currentData, previousMonthData, previousYearData, periodRange } = useMemo(() => {
        let start = filters.dateRange.start;
        let end = filters.dateRange.end;

        if (filters.periodMode === 'month') {
            start = new Date(filters.selectedDate.getFullYear(), filters.selectedDate.getMonth(), 1).toISOString().split('T')[0];
            end = new Date(filters.selectedDate.getFullYear(), filters.selectedDate.getMonth() + 1, 0).toISOString().split('T')[0];
        } else if (filters.periodMode === 'year') {
            start = new Date(filters.selectedDate.getFullYear(), 0, 1).toISOString().split('T')[0];
            end = new Date(filters.selectedDate.getFullYear(), 11, 31).toISOString().split('T')[0];
        } else if (filters.periodMode === 'week') {
            const range = getWeekRange(filters.selectedWeek);
            start = range.start;
            end = range.end;
        }

        // Calcular rangos de comparación
        const prevMonthRange = getPreviousPeriodRange(start, end, 'previous_period');
        const prevYearRange = getPreviousPeriodRange(start, end, 'year_over_year');

        const filterData = (rangeStart: string, rangeEnd: string) => {
            return data.filter(record => {
                if (!isInPeriod(record.fecha, rangeStart, rangeEnd)) return false;
                if (filters.selectedWeekdays.length > 0) {
                    const dayIdx = getDayIndex(record.fecha);
                    if (!filters.selectedWeekdays.includes(dayIdx)) return false;
                }
                return true;
            }).sort((a, b) => a.fecha.localeCompare(b.fecha));
        };

        return {
            currentData: filterData(start, end),
            previousMonthData: filterData(prevMonthRange.start, prevMonthRange.end),
            previousYearData: filterData(prevYearRange.start, prevYearRange.end),
            periodRange: { start, end, prevMonthStart: prevMonthRange.start, prevMonthEnd: prevMonthRange.end, prevYearStart: prevYearRange.start, prevYearEnd: prevYearRange.end }
        };
    }, [data, filters]);

    // --- EXTENDED KPIS ---

    const extendedKPIs = useMemo((): ExtendedKPIs => {
        // Current period stats
        const totalSales = currentData.reduce((sum, r) => sum + getSaleValue(r), 0);
        const totalVisits = currentData.reduce((sum, r) => sum + (r.visitas || 0), 0);
        const rappiSales = currentData.reduce((sum, r) => sum + (r.rappi || 0), 0);
        const daysCount = currentData.length;

        // Previous month stats
        const prevMonthSales = previousMonthData.reduce((sum, r) => sum + getSaleValue(r), 0);
        const prevMonthVisits = previousMonthData.reduce((sum, r) => sum + (r.visitas || 0), 0);

        // Previous year stats
        const prevYearSales = previousYearData.reduce((sum, r) => sum + getSaleValue(r), 0);

        // Tickets
        const currentTicket = totalVisits > 0 ? totalSales / totalVisits : 0;
        const prevMonthTicket = prevMonthVisits > 0 ? prevMonthSales / prevMonthVisits : 0;

        // Best/Worst Sales
        const salesSorted = [...currentData].sort((a, b) => getSaleValue(b) - getSaleValue(a));
        const bestSale = salesSorted.length > 0 ? { date: salesSorted[0].fecha, value: getSaleValue(salesSorted[0]) } : { date: '', value: 0 };
        const worstSale = salesSorted.length > 0 ? { date: salesSorted[salesSorted.length - 1].fecha, value: getSaleValue(salesSorted[salesSorted.length - 1]) } : { date: '', value: 0 };

        // Best/Worst Tickets
        const ticketsSorted = [...currentData].filter(r => r.visitas > 0).sort((a, b) => getTicket(b) - getTicket(a));
        const bestTicket = ticketsSorted.length > 0 ? { date: ticketsSorted[0].fecha, value: getTicket(ticketsSorted[0]) } : { date: '', value: 0 };
        const worstTicket = ticketsSorted.length > 0 ? { date: ticketsSorted[ticketsSorted.length - 1].fecha, value: getTicket(ticketsSorted[ticketsSorted.length - 1]) } : { date: '', value: 0 };

        return {
            totalSales: {
                value: totalSales,
                vsLastMonth: prevMonthSales > 0 ? ((totalSales - prevMonthSales) / prevMonthSales) * 100 : 0,
                vsLastYear: prevYearSales > 0 ? ((totalSales - prevYearSales) / prevYearSales) * 100 : 0,
                previousMonthValue: prevMonthSales,
                previousYearValue: prevYearSales
            },
            bestSale,
            worstSale,
            avgDailySales: daysCount > 0 ? totalSales / daysCount : 0,
            avgTicket: {
                value: currentTicket,
                vsLastMonth: prevMonthTicket > 0 ? ((currentTicket - prevMonthTicket) / prevMonthTicket) * 100 : 0,
                previousMonthValue: prevMonthTicket
            },
            bestTicket,
            worstTicket,
            totalVisits,
            avgDailyVisits: daysCount > 0 ? totalVisits / daysCount : 0,
            rappiSales
        };
    }, [currentData, previousMonthData, previousYearData]);

    // --- CHART DATA ---

    // 1. Ventas diarias del mes (1, 2, 3, ... 31)
    const dailySalesChart = useMemo(() => {
        if (filters.periodMode !== 'month') return [];

        const year = filters.selectedDate.getFullYear();
        const month = filters.selectedDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const result = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const record = currentData.find(r => r.fecha === dateStr);

            return {
                day,
                date: dateStr,
                sales: record ? getSaleValue(record) : 0,
                visits: record ? (record.visitas || 0) : 0,
                ticket: record ? getTicket(record) : 0
            };
        });

        return result;
    }, [currentData, filters]);

    // 2. Venta total por semana del mes
    const weeklySalesChart = useMemo((): WeeklySalesData[] => {
        if (filters.periodMode !== 'month') return [];

        // Obtener el año del mes seleccionado
        const selectedYear = filters.selectedDate.getFullYear();

        // Primero, identificar qué semanas tocan el mes seleccionado usando currentData
        const weeksInMonth = new Set<number>();
        currentData.forEach(record => {
            weeksInMonth.add(getWeekNumber(record.fecha));
        });

        if (weeksInMonth.size === 0) return [];

        // Ahora, para cada semana identificada, buscar TODOS los registros de esa semana
        // pero SOLO del mismo año
        const weekMap = new Map<number, { sales: number; visits: number; dates: string[]; records: any[] }>();

        // Iterar sobre TODO el dataset (data), no solo currentData
        data.forEach(record => {
            const recordYear = new Date(record.fecha).getFullYear();

            // ⚠️ CRÍTICO: Solo incluir registros del mismo año
            if (recordYear !== selectedYear) return;

            const weekNum = getWeekNumber(record.fecha);

            // Solo incluir si es una semana que toca el mes actual
            if (!weeksInMonth.has(weekNum)) return;

            if (!weekMap.has(weekNum)) {
                weekMap.set(weekNum, { sales: 0, visits: 0, dates: [], records: [] });
            }
            const week = weekMap.get(weekNum)!;
            const ventaSC = getSaleValue(record);
            week.sales += ventaSC;
            week.visits += record.visitas || 0;
            week.dates.push(record.fecha);
            week.records.push({
                fecha: record.fecha,
                ventaBruta: record.ventaBruta || 0,
                ingresoCovers: record.ingresoCovers || 0,
                venta_sc_db: record.venta_sc, // Valor de la BD
                ventaSC: ventaSC, // Valor usado (BD o calculado)
                visitas: record.visitas || 0
            });
        });


        const result: WeeklySalesData[] = [];
        weekMap.forEach((data, weekNum) => {
            const sortedDates = data.dates.sort();

            result.push({
                weekNumber: weekNum,
                weekLabel: `Semana ${weekNum}`,
                totalSales: data.sales,
                totalVisits: data.visits,
                avgTicket: data.visits > 0 ? data.sales / data.visits : 0,
                dateRange: {
                    start: sortedDates[0],
                    end: sortedDates[sortedDates.length - 1]
                }
            });
        });

        return result.sort((a, b) => a.weekNumber - b.weekNumber);
    }, [currentData, data, filters]);

    // 3. Venta por día de la semana comparada por semana
    const dayOfWeekByWeek = useMemo((): DayOfWeekByWeekData[] => {
        if (filters.periodMode !== 'month') return [];

        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        // Primero, identificar qué semanas tocan el mes seleccionado
        const weeksInMonth = new Set<number>();
        currentData.forEach(record => {
            weeksInMonth.add(getWeekNumber(record.fecha));
        });

        if (weeksInMonth.size === 0) return [];

        const weekMap = new Map<number, string>();
        weeksInMonth.forEach(weekNum => {
            weekMap.set(weekNum, `Semana ${weekNum}`);
        });

        const result: DayOfWeekByWeekData[] = days.map((dayName, dayIndex) => ({
            dayName,
            dayIndex
        }));

        // Agrupar datos de TODO el dataset para las semanas identificadas
        data.forEach(record => {
            const weekNum = getWeekNumber(record.fecha);

            // Solo incluir si es una semana que toca el mes
            if (!weeksInMonth.has(weekNum)) return;

            const dayIdx = getDayIndex(record.fecha);
            const weekLabel = weekMap.get(weekNum)!;
            const dayRow = result.find(r => r.dayIndex === dayIdx);

            if (dayRow) {
                // Guardar tanto ventas como visitas con sufijos
                const salesKey = `${weekLabel}_sales`;
                const visitsKey = `${weekLabel}_visits`;

                if (!dayRow[salesKey]) dayRow[salesKey] = 0;
                if (!dayRow[visitsKey]) dayRow[visitsKey] = 0;

                dayRow[salesKey] += getSaleValue(record);
                dayRow[visitsKey] += record.visitas || 0;

                // También guardamos con el nombre original para compatibilidad (ventas por defecto)
                if (!dayRow[weekLabel]) dayRow[weekLabel] = 0;
                dayRow[weekLabel] += getSaleValue(record);
            }
        });

        // Reordenar: Lunes a Domingo
        return [1, 2, 3, 4, 5, 6, 0].map(idx => result.find(r => r.dayIndex === idx)!);
    }, [currentData, data, filters]);

    // 4. Resumen mensual del año vs año anterior
    const monthlyYearOverYear = useMemo((): MonthlyYearOverYear[] => {
        if (filters.periodMode !== 'year') return [];

        const currentYear = filters.selectedDate.getFullYear();
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        return months.map((month, idx) => {
            const currentYearMonthData = currentData.filter(r => new Date(r.fecha + 'T12:00:00').getMonth() === idx);
            const prevYearMonthData = previousYearData.filter(r => new Date(r.fecha + 'T12:00:00').getMonth() === idx);

            return {
                month,
                monthIndex: idx,
                currentYear: currentYearMonthData.reduce((sum, r) => sum + getSaleValue(r), 0),
                previousYear: prevYearMonthData.reduce((sum, r) => sum + getSaleValue(r), 0)
            };
        });
    }, [currentData, previousYearData, filters]);

    // 5. Payment Mix (unchanged)
    const paymentMix = useMemo(() => {
        const mix = {
            efectivo: 0,
            nequi: 0,
            bancolombia: 0,
            datafono: 0,
            rappi: 0
        };

        currentData.forEach(r => {
            mix.efectivo += r.efectivo || 0;
            mix.nequi += r.nequi || 0;
            mix.bancolombia += r.transfBancolombia || 0;
            mix.datafono += (r.datafonoDavid || 0) + (r.datafonoJulian || 0);
            mix.rappi += r.rappi || 0;
        });

        const total = Object.values(mix).reduce((a, b) => a + b, 0);

        return Object.entries(mix).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            percentage: total > 0 ? (value / total) * 100 : 0
        })).sort((a, b) => b.value - a.value);
    }, [currentData]);

    // Promedio de ventas por día de la semana
    const avgSalesByDayOfWeek = useMemo((): DayStats[] => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayMap = new Map<number, { totalSales: number; totalVisits: number; count: number }>();

        // Inicializar todos los días
        for (let i = 0; i < 7; i++) {
            dayMap.set(i, { totalSales: 0, totalVisits: 0, count: 0 });
        }

        // Agrupar datos por día de la semana
        currentData.forEach(record => {
            const dayIdx = getDayIndex(record.fecha);
            const dayData = dayMap.get(dayIdx)!;
            dayData.totalSales += getSaleValue(record);
            dayData.totalVisits += record.visitas || 0;
            dayData.count += 1;
        });

        // Calcular promedios y crear resultado
        const result: DayStats[] = [];
        dayMap.forEach((data, dayIdx) => {
            result.push({
                dayName: days[dayIdx],
                dayIndex: dayIdx,
                totalSales: data.totalSales,
                avgSales: data.count > 0 ? data.totalSales / data.count : 0,
                count: data.count,
                totalPax: data.totalVisits,
                avgPax: data.count > 0 ? data.totalVisits / data.count : 0
            });
        });

        // Reordenar: Lunes a Domingo
        return [1, 2, 3, 4, 5, 6, 0].map(idx => result.find(r => r.dayIndex === idx)!);
    }, [currentData]);

    // Resumen mensual del año (para gráfica anual)
    const monthlySummary = useMemo(() => {
        const year = filters.selectedDate.getFullYear();
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        // Inicializar todos los meses
        const monthMap = new Map<number, { sales: number; visits: number }>();
        for (let i = 0; i < 12; i++) {
            monthMap.set(i, { sales: 0, visits: 0 });
        }

        // Agrupar datos por mes del año seleccionado
        data.forEach(record => {
            const recordDate = new Date(record.fecha);
            const recordYear = recordDate.getFullYear();

            // Solo incluir datos del año seleccionado
            if (recordYear !== year) return;

            const monthIdx = recordDate.getMonth();
            const monthData = monthMap.get(monthIdx)!;
            monthData.sales += getSaleValue(record);
            monthData.visits += record.visitas || 0;
        });

        // Crear resultado
        const result = [];
        for (let i = 0; i < 12; i++) {
            const monthData = monthMap.get(i)!;
            result.push({
                month: months[i],
                monthIndex: i,
                sales: monthData.sales,
                visits: monthData.visits
            });
        }

        return result;
    }, [data, filters.selectedDate]);

    return {
        filters,
        setFilters,
        extendedKPIs,
        charts: {
            dailySales: dailySalesChart,
            weeklySales: weeklySalesChart,
            dayOfWeekByWeek,
            monthlyYearOverYear,
            paymentMix,
            avgSalesByDayOfWeek,
            monthlySummary
        },
        rawData: { current: currentData, previousMonth: previousMonthData, previousYear: previousYearData }
    };
};
