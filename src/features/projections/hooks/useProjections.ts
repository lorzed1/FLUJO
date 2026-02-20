import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SalesEvent, SalesProjection, ArqueoRecord } from '../../../types';
import { projectionsService } from '../../../services/projectionsService';
import { calculateDailyProjection, ProjectionResult, ProjectionOptions } from '../../../utils/projections';
import { startOfMonth, endOfMonth, format, addMonths, subMonths, getDay, addDays } from 'date-fns';
import { useArqueos } from '../../../context/ArqueoContext';

export const useProjections = () => {
    const { arqueos } = useArqueos(); // Need historical data
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<SalesEvent[]>([]);
    const [projections, setProjections] = useState<Record<string, SalesProjection>>({});
    const [calculatedProjections, setCalculatedProjections] = useState<Record<string, ProjectionResult>>({});
    const [loading, setLoading] = useState(false);

    // Config global avanzada
    const [config, setConfig] = useState<ProjectionOptions>({
        lookbackWeeks: 8,
        growthPercentage: 0,
        inflationPercentage: 0,
        trafficGrowthPercentage: 0,
        ticketGrowthPercentage: 0,
        anomalyThreshold: 20,
        recencyWeightMode: 'linear'
    });

    const [realSales, setRealSales] = useState<Record<string, number>>({});

    // Usar refs para evitar re-creación de loadMonthData
    const arqueosRef = useRef(arqueos);
    const configRef = useRef(config);
    useEffect(() => { arqueosRef.current = arqueos; }, [arqueos]);
    useEffect(() => { configRef.current = config; }, [config]);

    const loadMonthData = useCallback(async () => {
        setLoading(true);
        try {
            const start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
            const end = format(endOfMonth(currentDate), 'yyyy-MM-dd');

            // 1. Fetch Events
            const monthEvents = await projectionsService.getSalesEvents(start, end);
            setEvents(monthEvents);

            // 2. Fetch Stored Projections
            const stored = await projectionsService.getSalesProjections(start, end);
            const storedMap = stored.reduce((acc, p) => ({ ...acc, [p.date]: p }), {});
            setProjections(storedMap);

            // 3. Calculate Real-time Projections
            const allEvents = await projectionsService.getSalesEvents();

            const results: Record<string, ProjectionResult> = {};
            let day = startOfMonth(currentDate);
            const endDay = endOfMonth(currentDate);

            while (day <= endDay) {
                const dateStr = format(day, 'yyyy-MM-dd');
                const calc = calculateDailyProjection(
                    dateStr,
                    arqueosRef.current,
                    allEvents,
                    configRef.current
                );
                results[dateStr] = calc;
                day.setDate(day.getDate() + 1);
            }

            setCalculatedProjections(results);

        } catch (error) {
            console.error("Error loading projections:", error);
        } finally {
            setLoading(false);
        }
    }, [currentDate]); // Solo depende de currentDate ahora

    useEffect(() => {
        loadMonthData();
    }, [loadMonthData]);

    // Actions
    const addEvent = async (event: Omit<SalesEvent, 'id'>) => {
        await projectionsService.addSalesEvent(event);
        loadMonthData(); // Reload
    };

    const updateEvent = async (id: string, updates: Partial<SalesEvent>) => {
        await projectionsService.updateSalesEvent(id, updates);
        loadMonthData();
    };

    const deleteEvent = async (id: string) => {
        await projectionsService.deleteSalesEvent(id);
        loadMonthData();
    };

    const saveGoal = async (date: string, amount: number) => {
        // Guardar o actualizar la meta manual
        const existing = projections[date];
        const projection: SalesProjection = {
            date,
            amountSystem: calculatedProjections[date]?.final || 0,
            amountAdjusted: amount,
            status: 'locked', // Al editar manual se bloquea
            notes: existing?.notes
        };

        await projectionsService.saveSalesProjection(projection);

        // Update local state optimistic
        setProjections(prev => ({
            ...prev,
            [date]: projection
        }));
    };

    const seedHolidays = async (year: number) => {
        try {
            const { getColombianHolidays } = await import('../../../utils/holidays');
            const holidays = getColombianHolidays(year);

            // Fetch existing events for this year to avoid dupes?
            // For simplicity, we just try to add them. The service implementation creates new IDs.
            // Ideally we check if event with same date and name exists.

            // Optimization: Fetch all events for the year first
            const start = `${year}-01-01`;
            const end = `${year}-12-31`;
            const existingEvents = await projectionsService.getSalesEvents(start, end);
            const existingMap = new Set(existingEvents.map(e => `${e.date}|${e.name}`)); // Simple signature

            const toAdd = holidays.filter(h => !existingMap.has(`${h.date}|${h.name}`));

            if (toAdd.length === 0) return 0;

            const promises = toAdd.map(h => projectionsService.addSalesEvent({
                date: h.date,
                name: h.name,
                type: 'boost', // Default holidays as boost? Or neutral? Usually boost for restaurants
                impactFactor: 1.2, // Default 20% boost
                isRecurring: true // Holidays repeat yearly? No, dates change. So false. Emiliani changes dates.
            }));

            await Promise.all(promises);
            loadMonthData();
            return toAdd.length;
        } catch (error) {
            console.error("Error seeding holidays:", error);
            throw error;
        }
    };

    const seedPaydays = async (year: number) => {
        try {
            // Generar fechas de quincena para el año
            const paydays: { date: string, name: string }[] = [];

            for (let month = 0; month < 12; month++) {
                // Quincena 1 (Día 15)
                let day15 = new Date(year, month, 15);
                // Ajuste colombiano: Si cae domingo, pagan el viernes anterior? O lunes?
                // Sector privado suele ser viernes anterior. Sector público aveces lunes.
                // Asumamos Viernes si cae Domingo.
                if (getDay(day15) === 0) day15 = addDays(day15, -2); // Viernes
                // Si cae Sábado? Sábado es bancario. Se mantiene.

                paydays.push({ date: format(day15, 'yyyy-MM-dd'), name: 'Quincena (15)' });

                // Quincena 2 (Día 30 o fin de mes)
                // Febrero?
                const lastDay = endOfMonth(new Date(year, month, 1));
                let day30 = lastDay;
                // Si el mes tiene 31, ¿pagan el 30 o el 31? Generalmente el 30.
                if (lastDay.getDate() === 31) {
                    day30 = new Date(year, month, 30);
                }

                // Ajuste fin de semana
                if (getDay(day30) === 0) day30 = addDays(day30, -2); // Viernes

                paydays.push({ date: format(day30, 'yyyy-MM-dd'), name: 'Quincena (30)' });
            }

            // Filter existing
            const start = `${year}-01-01`;
            const end = `${year}-12-31`;
            const existingEvents = await projectionsService.getSalesEvents(start, end);
            const existingMap = new Set(existingEvents.map(e => `${e.date}`)); // Solo por fecha para no duplicar boosts

            const toAdd = paydays.filter(p => !existingMap.has(p.date));

            if (toAdd.length === 0) return 0;

            const promises = toAdd.map(p => projectionsService.addSalesEvent({
                date: p.date,
                name: p.name,
                type: 'boost',
                impactFactor: 1.15, // 15% boost conservador por quincena
                isRecurring: false
            }));

            await Promise.all(promises);
            loadMonthData();
            return toAdd.length;

        } catch (error) {
            console.error("Error seeding paydays:", error);
            throw error;
        }
    };

    // Sync Real Sales for Display
    useEffect(() => {
        const salesMap: Record<string, number> = {};
        if (arqueos) {
            arqueos.forEach(r => {
                if (!r.fecha) return;

                const dateKey = r.fecha.substring(0, 10);
                let val = 0;

                // Prioridad: Usar siempre ventaBruta como fuente de verdad
                const bruta = typeof r.ventaBruta === 'string'
                    ? parseFloat(r.ventaBruta.replace(/\./g, '').replace(',', '.'))
                    : (r.ventaBruta || 0);

                val = bruta;

                // Acumular si hay múltiples arqueos por día (turnos)
                salesMap[dateKey] = (salesMap[dateKey] || 0) + val;
            });
        }
        setRealSales(salesMap);
    }, [arqueos]);

    return {
        currentDate,
        setCurrentDate,
        events,
        projections, // Stored (Manual Goals)
        calculatedProjections, // System Suggestions
        realSales, // Actual History
        loading,
        config,
        setConfig,
        addEvent,
        updateEvent,
        deleteEvent,
        saveGoal,
        seedHolidays,
        seedPaydays,
        nextMonth: () => setCurrentDate(addMonths(currentDate, 1)),
        prevMonth: () => setCurrentDate(subMonths(currentDate, 1))
    };
};
