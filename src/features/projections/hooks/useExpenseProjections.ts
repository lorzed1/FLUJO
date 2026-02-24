import { useMemo, useState, useEffect, useRef } from 'react';
import { useArqueos } from '../../../context/ArqueoContext';
import { ArqueoRecord } from '../../../types';
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    getDay,
    format,
    addWeeks,
    startOfWeek,
    endOfWeek,
    isSameDay,
    addDays,
    isSameMonth,
    getISOWeek
} from 'date-fns';
import { budgetService } from '../../../services/budget';
import { BudgetCommitment } from '../../../types/budget';

export interface ExpenseProjectionDay {
    date: Date;
    dayOfWeek: number; // 0-6
    weight: number; // Porcentaje de la semana
    amount: number; // Meta diaria (derivada de la meta semanal)
}



export interface ExpenseProjectionWeek {
    weekNumber: number;
    startDate: Date;
    endDate: Date;
    totalAmount: number; // Meta de Venta de la semana (== Gastos Semana Siguiente)
    expensesToCover: number; // Gastos reales de ESTA semana (informativo)
    baseExpenses: number; // Gastos de la semana SIGUIENTE (Base de cálculo)
    days: ExpenseProjectionDay[];
}

export const useExpenseProjections = (currentDate: Date) => {
    const { arqueos } = useArqueos();

    // Estabilizar la dependencia: solo recargar si cambia el mes real
    const monthKey = useMemo(
        () => `${currentDate.getFullYear()}-${currentDate.getMonth()}`,
        [currentDate.getFullYear(), currentDate.getMonth()]
    );

    // Estado
    const [totalMonthlyGoal, setTotalMonthlyGoal] = useState<number>(0);
    const [isLoadingExpenses, setIsLoadingExpenses] = useState<boolean>(true);
    const [commitments, setCommitments] = useState<BudgetCommitment[]>([]);
    const loadedMonthRef = useRef<string>('');

    // 1. Cargar Gastos (Rango extendido para cubrir la semana siguiente al fin de mes)
    useEffect(() => {
        // Evitar recargas duplicadas del mismo mes
        if (loadedMonthRef.current === monthKey) return;
        loadedMonthRef.current = monthKey;

        const loadBudgetExpenses = async () => {
            setIsLoadingExpenses(true);
            try {
                const monthStart = startOfMonth(currentDate);
                const monthEnd = endOfMonth(currentDate);

                const searchStart = format(startOfWeek(monthStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                const searchEnd = format(endOfWeek(addWeeks(monthEnd, 2), { weekStartsOn: 1 }), 'yyyy-MM-dd');

                const budgetData = await budgetService.getCommitments(searchStart, searchEnd);
                setCommitments(budgetData);

            } catch (error) {
                console.error("❌ Error cargando presupuesto:", error);
                setCommitments([]);
            } finally {
                setIsLoadingExpenses(false);
            }
        };

        loadBudgetExpenses();
    }, [monthKey]);

    // 2. Calcular Pesos Históricos (Igual que antes)
    const dayWeights = useMemo(() => {
        const dayTotals: Record<number, { total: number; count: number }> = {
            0: { total: 0, count: 0 }, 1: { total: 0, count: 0 }, 2: { total: 0, count: 0 },
            3: { total: 0, count: 0 }, 4: { total: 0, count: 0 }, 5: { total: 0, count: 0 }, 6: { total: 0, count: 0 },
        };

        arqueos.forEach((arqueo: ArqueoRecord) => {
            const amount = Number(arqueo.ventaPos) || 0;
            if (!arqueo.fecha || amount <= 0) return;
            const dateParts = arqueo.fecha.split('-');
            const date = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
            const dayOfWeek = getDay(date);
            dayTotals[dayOfWeek].total += amount;
            dayTotals[dayOfWeek].count += 1;
        });

        const dayAverages: Record<number, number> = {};
        Object.keys(dayTotals).forEach(key => {
            const day = Number(key);
            dayAverages[day] = dayTotals[day].count > 0 ? dayTotals[day].total / dayTotals[day].count : 1;
        });
        return dayAverages;
    }, [arqueos]);

    // 3. Procesar Semanas con Lógica de "Shift" (Meta N = Gastos N+1)
    const { weeks, projections, processedTotal } = useMemo(() => {
        if (commitments.length === 0) return { weeks: [], projections: [], processedTotal: 0 };

        const weeksArray: ExpenseProjectionWeek[] = [];
        const dailyProjections: ExpenseProjectionDay[] = [];

        // Generar semanas visuales completas (StartOfWeek del inicio de mes - EndOfWeek del fin de mes)
        // Esto asegura que veamos las semanas completas, incluyendo días del mes anterior o siguiente
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);

        const visualStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const visualEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const daysInVisualRange = eachDayOfInterval({ start: visualStart, end: visualEnd });

        // Agrupar días en semanas (respetando que la semana empieza el Lunes en UI)
        let currentWeekDays: Date[] = [];
        // weekCounter debe reiniciarse o calcularse basado en el visual range? 
        // Mejor usamos getISOWeek como ya implementamos, así que el contador interno no importa tanto, usamos el del bucle.

        // Función auxiliar para procesar una semana completa
        const processWeek = (days: Date[]) => {
            if (days.length === 0) return;

            const weekStart = days[0];
            const weekEnd = days[days.length - 1];

            // 3.1 Identificar la semana "Objetivo" (La siguiente semana completa real)
            // Tomamos el primer día de esta semana, buscamos el lunes de la semana SIGUIENTE.
            const currentWeekMonday = startOfWeek(weekStart, { weekStartsOn: 1 });
            const nextWeekMonday = addWeeks(currentWeekMonday, 1);
            const nextWeekEnd = endOfWeek(nextWeekMonday, { weekStartsOn: 1 });

            // 3.2 Sumar Gastos de la Semana Siguiente (Meta)
            const nextWeekExpenses = commitments
                .filter(c => {
                    const d = new Date(c.dueDate + 'T00:00:00'); // Fix timezone simple
                    return d >= nextWeekMonday && d <= nextWeekEnd;
                })
                .reduce((sum, c) => sum + c.amount, 0);

            // 3.3 Sumar Gastos de la Semana Actual (Solo informativo/referencia)
            const currentWeekEndFull = endOfWeek(weekStart, { weekStartsOn: 1 }); // currentWeekEndFull (Dom)
            const currentExpenses = commitments
                .filter(c => {
                    const d = new Date(c.dueDate + 'T00:00:00');
                    return d >= currentWeekMonday && d <= currentWeekEndFull;
                })
                .reduce((sum, c) => sum + c.amount, 0);


            // 3.4 Distribuir la Meta (nextWeekExpenses) en los días de ESTA semana visual
            // Usando lógica ISO: Distribuir la meta de la semana siguiente entre los 7 días de la semana actual

            const fullISODays = eachDayOfInterval({ start: currentWeekMonday, end: currentWeekEndFull });

            // Calcular total de puntos (weights) de la semana COMPLETA (Lun-Dom)
            let totalISOPoints = 0;
            fullISODays.forEach(d => {
                totalISOPoints += dayWeights[getDay(d)];
            });
            if (totalISOPoints === 0) totalISOPoints = 1;

            const weekDaysProjections: ExpenseProjectionDay[] = days.map(day => {
                const w = dayWeights[getDay(day)];
                // La meta del día es proporcional a su peso dentro de la semana completa
                // MetaDia = (PesoDia / PesoSemanaCompleta) * GastoSemanaSiguiente
                const amount = (w / totalISOPoints) * nextWeekExpenses;

                return {
                    date: day,
                    dayOfWeek: getDay(day),
                    weight: w, // Peso relativo global (informativo)
                    amount
                };
            });

            // La meta mostrada (visualWeekTarget) ahora será la meta COMPLETA de la semana
            // porque 'days' ahora incluye Lun-Dom completos gracias al rango extendido
            const visualWeekTarget = weekDaysProjections.reduce((sum, d) => sum + d.amount, 0);

            weeksArray.push({
                weekNumber: getISOWeek(weekStart),
                startDate: weekStart,
                endDate: weekEnd,
                totalAmount: visualWeekTarget,
                expensesToCover: currentExpenses,
                baseExpenses: nextWeekExpenses,
                days: weekDaysProjections
            });

            dailyProjections.push(...weekDaysProjections);
        };

        // Iterar días para agrupar (ahora sobre el rango visual extendido)
        daysInVisualRange.forEach((day, index) => {
            currentWeekDays.push(day);
            // Si es Domingo, cerramos semana (al estar en rango extendido Lun-Dom, siempre cerramos en Domingo)
            if (getDay(day) === 0) {
                processWeek(currentWeekDays);
                currentWeekDays = [];
            }
        });

        // Calcular el total del mes filtrando SOLO los días que pertenecen al mes seleccionado
        // para no inflar la meta mensual con días de Enero o Marzo
        const totalMeta = dailyProjections
            .filter(p => isSameMonth(p.date, currentDate))
            .reduce((sum, p) => sum + p.amount, 0);

        return { weeks: weeksArray, projections: dailyProjections, processedTotal: totalMeta };

    }, [currentDate, commitments, dayWeights]);

    // Actualizar el estado del total
    useEffect(() => {
        setTotalMonthlyGoal(processedTotal);
    }, [processedTotal]);

    return {
        totalMonthlyExpenses: totalMonthlyGoal, // Ahora devuelve la META TOTAL DE VENTA
        projections,
        weeks,
        commitments,
        isLoading: isLoadingExpenses,
        dayWeights
    };
};
