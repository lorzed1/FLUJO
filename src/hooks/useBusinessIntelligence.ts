import { useMemo, useState } from 'react';
import { ArqueoRecord } from '../types';

export type PeriodMode = 'month' | 'year' | 'range' | 'semester' | 'trimester' | 'week';
export type ComparisonMode = 'none' | 'previous_period' | 'year_over_year';
export type ViewMode = 'all' | 'sales' | 'visits';

export interface FilterState {
    periodMode: PeriodMode;
    selectedDate: Date; // For month/year selection
    selectedWeek: string; // For week selection (YYYY-Www)
    dateRange: { start: string; end: string }; // For custom range
    selectedWeekdays: number[]; // 0=Sunday, 1=Monday...
    comparisonMode: ComparisonMode;
    viewMode: ViewMode;
}

export interface KPI {
    label: string;
    value: number;
    previousValue?: number;
    changePercentage?: number;
    format: 'currency' | 'number' | 'percent';
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

export const useBusinessIntelligence = (data: ArqueoRecord[]) => {
    // Initial State for Filters
    const [filters, setFilters] = useState<FilterState>({
        periodMode: 'month',
        selectedDate: new Date(),
        selectedWeek: (() => {
            const now = new Date();
            // Simple ISO week estimation for default
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
        selectedWeekdays: [], // Empty = All days
        comparisonMode: 'previous_period',
        viewMode: 'all'
    });

    // --- HELPER FUNCTIONS ---

    const getDayIndex = (dateParams: string | Date) => {
        // Adjust to match 0=Sunday standard date.getDay()
        const d = new Date(typeof dateParams === 'string' ? dateParams + 'T12:00:00' : dateParams);
        return d.getDay();
    };

    const getWeekRange = (weekStr: string) => {
        try {
            const [y, w] = weekStr.split('-W');
            const year = parseInt(y);
            const week = parseInt(w);

            // Jan 4th is always in week 1
            const jan4 = new Date(year, 0, 4);
            const day = jan4.getDay(); // 0-6
            const isoDay = day === 0 ? 7 : day; // 1-7

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
            // Fallback to current week if parse fails
            const now = new Date();
            return {
                start: now.toISOString().split('T')[0],
                end: now.toISOString().split('T')[0]
            };
        }
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
            // Previous Period logic
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

    // --- CORE LOGIC ---

    const { currentData, previousData, periodRange } = useMemo(() => {
        // 1. Determine Date Range
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

        const prevRange = getPreviousPeriodRange(start, end, filters.comparisonMode);

        // 2. Filter Function
        const filterData = (rangeStart: string, rangeEnd: string) => {
            return data.filter(record => {
                // Date Range Check
                if (!isInPeriod(record.fecha, rangeStart, rangeEnd)) return false;

                // Weekday Filter Check
                if (filters.selectedWeekdays.length > 0) {
                    const dayIdx = getDayIndex(record.fecha);
                    // Map Sunday (0) to match if needed, but standard logic 0=Sunday works
                    // NOTE: UI might assume 0=Monday, be careful. Standard Date.getDay() 0=Sun, 1=Mon...
                    // Let's assume standard JS 0-6 (Sun-Sat) for internal logic
                    if (!filters.selectedWeekdays.includes(dayIdx)) return false;
                }

                return true;
            }).sort((a, b) => a.fecha.localeCompare(b.fecha));
        };

        return {
            currentData: filterData(start, end),
            previousData: filters.comparisonMode !== 'none' ? filterData(prevRange.start, prevRange.end) : [],
            periodRange: { start, end, prevStart: prevRange.start, prevEnd: prevRange.end }
        };

    }, [data, filters]);

    // --- KPI CALCULATION ---

    const kpis = useMemo(() => {
        const calculateStats = (dataset: ArqueoRecord[]) => {
            const totalSales = dataset.reduce((sum, r) => sum + (r.ventaBruta || 0), 0);
            const totalVisits = dataset.reduce((sum, r) => sum + (r.visitas || 0), 0);
            const daysOperated = dataset.length;
            const avgTicket = totalVisits > 0 ? totalSales / totalVisits : 0;
            const avgDailySales = daysOperated > 0 ? totalSales / daysOperated : 0;

            // Find Best Day
            const bestDay = dataset.reduce((best, curr) => (curr.ventaBruta > (best?.ventaBruta || 0) ? curr : best), null as ArqueoRecord | null);

            return { totalSales, totalVisits, avgTicket, avgDailySales, bestDay };
        };

        const current = calculateStats(currentData);
        const previous = calculateStats(previousData);

        const getChange = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : 0;

        return {
            totalSales: {
                value: current.totalSales,
                previousValue: previous.totalSales,
                change: getChange(current.totalSales, previous.totalSales)
            },
            visits: {
                value: current.totalVisits,
                previousValue: previous.totalVisits,
                change: getChange(current.totalVisits, previous.totalVisits)
            },
            avgPerPax: {
                value: current.avgTicket,
                previousValue: previous.avgTicket,
                change: getChange(current.avgTicket, previous.avgTicket)
            },
            bestDay: current.bestDay
        };
    }, [currentData, previousData]);

    // --- AGGREGATIONS ---

    const dayOfWeekAnalysis = useMemo(() => {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const stats: Record<number, DayStats> = {};

        // Initialize
        days.forEach((name, idx) => {
            stats[idx] = { dayName: name, dayIndex: idx, totalSales: 0, avgSales: 0, count: 0, totalPax: 0, avgPax: 0 };
        });

        currentData.forEach(record => {
            const idx = getDayIndex(record.fecha);
            stats[idx].totalSales += record.ventaBruta || 0;
            stats[idx].totalPax += record.visitas || 0;
            stats[idx].count += 1;
        });

        // Compute averages
        Object.values(stats).forEach(stat => {
            if (stat.count > 0) {
                stat.avgSales = stat.totalSales / stat.count;
                stat.avgPax = stat.totalPax / stat.count;
            }
        });

        // Reorder to start on Monday if preferred, but Standard starts on Sunday (index 0)
        // Usually charts look better starting on Monday. Let's return sorted 1-6 then 0
        return [1, 2, 3, 4, 5, 6, 0].map(i => stats[i]);

    }, [currentData]);

    const paymentMix = useMemo(() => {
        const mix = {
            efectivo: 0,
            nequi: 0,
            bancolombia: 0,
            datafono: 0, // Datafono Julian
            rappi: 0
        };

        currentData.forEach(r => {
            mix.efectivo += r.efectivo || 0;
            mix.nequi += r.nequi || 0;
            mix.bancolombia += r.transfBancolombia || 0;
            mix.datafono += r.datafonoJulian || 0; // Assuming this is the main card terminal
            mix.rappi += r.rappi || 0;
        });

        const total = Object.values(mix).reduce((a, b) => a + b, 0);

        return Object.entries(mix).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            percentage: total > 0 ? (value / total) * 100 : 0
        })).sort((a, b) => b.value - a.value);

        return Object.entries(mix).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            percentage: total > 0 ? (value / total) * 100 : 0
        })).sort((a, b) => b.value - a.value);

    }, [currentData]);

    const paymentEvolution = useMemo(() => {
        // Map data for Stacked Bar Chart (Time series of payment methods)
        return currentData.map(r => ({
            date: r.fecha,
            Efectivo: r.efectivo || 0,
            Nequi: r.nequi || 0,
            Bancolombia: r.transfBancolombia || 0,
            Datafono: r.datafonoJulian || 0,
            Rappi: r.rappi || 0
        }));
    }, [currentData]);

    const advancedStats = useMemo(() => {
        if (currentData.length === 0) return null;

        const metric = (filters.viewMode === 'visits') ? 'visitas' : 'ventaBruta';
        const label = (filters.viewMode === 'visits') ? 'Visitas' : 'Venta';

        // Filter out zero-days for "Worst" calculation to avoid trivial zeroes (unless all are zero)
        // Actually, typically businesses want to know the worst *operating* day. 
        const operatingDays = currentData.filter(d => (d[metric] || 0) > 0);
        const dataset = operatingDays.length > 0 ? operatingDays : currentData;

        // Sort by value
        const sorted = [...dataset].sort((a, b) => (a[metric] || 0) - (b[metric] || 0));

        const worst = sorted[0];
        const best = sorted[sorted.length - 1];

        const total = currentData.reduce((sum, r) => sum + (r[metric] || 0), 0);
        const average = total / (currentData.length || 1);

        return {
            best: { date: best.fecha, value: best[metric] || 0, label: `Mejor ${label}` },
            worst: { date: worst.fecha, value: worst[metric] || 0, label: `Peor ${label}` },
            average: { value: average, label: `Promedio ${label}` }
        };
    }, [currentData, filters.viewMode]);

    const salesTrend = useMemo(() => {
        if (filters.periodMode === 'year') {
            // Initialize 12 months for the selected year
            const year = filters.selectedDate.getFullYear();
            const monthlyData = Array.from({ length: 12 }, (_, i) => {
                const date = new Date(year, i, 1);
                // Basic ISO format, but might be adjusted for chart display if needed
                const dateStr = `${year}-${(i + 1).toString().padStart(2, '0')}-01`;
                return {
                    date: dateStr,
                    sales: 0,
                    visits: 0,
                    monthName: date.toLocaleDateString('es-CO', { month: 'long' })
                };
            });

            // Aggregate data
            currentData.forEach(r => {
                const d = new Date(r.fecha + 'T12:00:00');
                const monthIdx = d.getMonth();
                if (monthlyData[monthIdx]) {
                    monthlyData[monthIdx].sales += (r.ventaBruta || 0);
                    monthlyData[monthIdx].visits += (r.visitas || 0);
                }
            });

            return monthlyData;
        }

        // Default daily map
        return currentData.map(r => ({
            date: r.fecha,
            sales: r.ventaBruta,
            visits: r.visitas
        }));
    }, [currentData, filters.periodMode, filters.selectedDate]);

    const comparativeAnalysis = useMemo(() => {
        if (currentData.length === 0) return { data: [], keys: [], type: 'weekly' };

        const getValue = (r: ArqueoRecord) => (filters.viewMode === 'visits' || filters.viewMode === 'all') ? (r.visitas || 0) : (r.ventaBruta || 0);

        if (filters.periodMode === 'year') {
            // YEAR MODE: Overlay Months
            const daysInMonth = Array.from({ length: 31 }, (_, i) => ({ name: (i + 1).toString(), dayIndex: i + 1 }));
            const monthsSeen = new Set<string>();

            currentData.forEach(r => {
                const d = new Date(r.fecha + 'T12:00:00');
                const dayOfMonth = d.getDate();
                const monthName = d.toLocaleDateString('es-CO', { month: 'long' });
                const key = monthName.charAt(0).toUpperCase() + monthName.slice(1);

                monthsSeen.add(key);

                const row = daysInMonth.find(item => item.dayIndex === dayOfMonth);
                if (row) {
                    if (!(row as any)[key]) (row as any)[key] = 0;
                    (row as any)[key] += getValue(r);
                }
            });

            const SPANISH_MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const sortedKeys = Array.from(monthsSeen).sort((a, b) => SPANISH_MONTHS.indexOf(a) - SPANISH_MONTHS.indexOf(b));

            return { data: daysInMonth, keys: sortedKeys, type: 'monthly' };

        } else {
            // WEEKLY OVERLAP Logic
            const getWeekKey = (d: Date) => {
                const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
                const dayNum = date.getUTCDay() || 7;
                date.setUTCDate(date.getUTCDate() + 4 - dayNum);
                const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
                const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                return `${date.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
            };

            const weeksSet = new Set<string>();
            currentData.forEach(r => weeksSet.add(getWeekKey(new Date(r.fecha + 'T12:00:00'))));
            const sortedWeeks = Array.from(weeksSet).sort();

            const weekLabelMap: Record<string, string> = {};
            sortedWeeks.forEach((w, idx) => {
                weekLabelMap[w] = `Semana ${idx + 1}`;
            });

            const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const orderedIndices = [1, 2, 3, 4, 5, 6, 0];

            const result = orderedIndices.map(idx => ({
                name: days[idx],
                dayIndex: idx,
            }));

            currentData.forEach(r => {
                const d = new Date(r.fecha + 'T12:00:00');
                const dayIdx = d.getDay();
                const weekKey = getWeekKey(d);
                const label = weekLabelMap[weekKey];

                const row = result.find(item => item.dayIndex === dayIdx);
                if (row) {
                    if (!(row as any)[label]) (row as any)[label] = 0;
                    (row as any)[label] += getValue(r);
                }
            });

            return {
                data: result,
                keys: Object.values(weekLabelMap),
                type: 'weekly'
            };
        }
    }, [currentData, filters.periodMode, filters.viewMode]);

    return {
        filters,
        setFilters,
        kpis,
        charts: {
            dayOfWeekAnalysis,
            paymentMix,
            salesTrend,
            comparativeAnalysis,
            paymentEvolution
        },
        advancedStats,
        rawData: { current: currentData, previous: previousData }
    };
};
