import { useMemo } from 'react';
import { ProjectionResult } from '../../../utils/projections';
import { SalesProjection } from '../../../types';
import { format, getDaysInMonth, differenceInCalendarDays, isSameMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface UseProjectionsKPIsProps {
    currentDate: Date;
    calculatedProjections: Record<string, ProjectionResult>;
    storedProjections: Record<string, SalesProjection>;
    realSales: Record<string, number>;
    mode?: 'statistical' | 'financial';
}

export const useProjectionsKPIs = ({
    currentDate,
    calculatedProjections,
    storedProjections,
    realSales,
    mode = 'statistical'
}: UseProjectionsKPIsProps) => {

    const stats = useMemo(() => {
        let totalMeta = 0;
        let totalReal = 0;
        let countDaysWithReal = 0;
        let daysCumplidos = 0;
        let daysNoCumplidos = 0;
        let bestDay = { date: '', value: 0 };
        let worstDay = { date: '', value: Infinity };
        // const dailyDetails: Array<{ date: string; meta: number; real: number }> = [];

        Object.keys(calculatedProjections).forEach(dateStr => {
            const projection = calculatedProjections[dateStr];
            const stored = storedProjections[dateStr];
            const real = realSales[dateStr] || 0;

            // Filtrar estrictamente solo el mes actual
            if (!isSameMonth(parseISO(dateStr), currentDate)) return;

            // Meta:
            // En modo 'financial' (Punto de Equilibrio), la meta es estrictamente el Gasto Calculado (projection.final).
            // En modo 'statistical', la meta puede ser ajustada manualmente (stored.amountAdjusted) o la calculada (projection.final).
            const metaDia = mode === 'financial'
                ? (projection?.final ?? 0)
                : (stored?.amountAdjusted ?? projection?.final ?? 0);

            totalMeta += metaDia;

            if (realSales[dateStr] !== undefined && real > 0) {
                totalReal += real;
                countDaysWithReal++;

                // Días cumplidos vs no cumplidos
                if (real >= metaDia) {
                    daysCumplidos++;
                } else {
                    daysNoCumplidos++;
                }

                // Mejor y peor día
                if (real > bestDay.value) {
                    bestDay = { date: dateStr, value: real };
                }
                if (real < worstDay.value) {
                    worstDay = { date: dateStr, value: real };
                }

                // dailyDetails.push({ date: dateStr, meta: metaDia, real });
            }
        });

        const cumplimiento = totalMeta > 0 ? (totalReal / totalMeta) * 100 : 0;
        const faltante = Math.max(0, totalMeta - totalReal);
        const superavit = totalReal > totalMeta ? totalReal - totalMeta : 0;

        // Run rate: promedio diario actual → proyección de cierre
        const avgDiario = countDaysWithReal > 0 ? totalReal / countDaysWithReal : 0;
        const daysInMonth = getDaysInMonth(currentDate);

        // Días restantes en el mes considerando la fecha actual
        const today = new Date();
        const daysRemaining = Math.max(0, daysInMonth - differenceInCalendarDays(today, new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)));
        const proyeccionCierre = totalReal + (avgDiario * Math.max(0, daysRemaining - countDaysWithReal));

        // Formatear mejor día
        let bestDayLabel = '-';
        if (bestDay.date) {
            try {
                const parts = bestDay.date.split('-');
                const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
                bestDayLabel = format(d, "EEE d MMM", { locale: es });
            } catch {
                bestDayLabel = bestDay.date;
            }
        }

        return {
            totalMeta,
            totalReal,
            cumplimiento,
            faltante,
            superavit,
            countDaysWithReal,
            daysCumplidos,
            daysNoCumplidos,
            avgDiario,
            proyeccionCierre,
            bestDay,
            bestDayLabel,
            daysInMonth
        };
    }, [calculatedProjections, storedProjections, realSales, currentDate, mode]);

    return stats;
};
