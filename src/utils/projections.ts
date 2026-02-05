import { ArqueoRecord, SalesEvent } from '../types';
import { getDay, subWeeks, parseISO, isAfter, getMonth } from 'date-fns';

export interface ProjectionOptions {
    lookbackWeeks: number; // e.g. 8
    inflationPercentage: number; // Ajuste por subida de precios vs histórico
    growthPercentage: number; // Meta de crecimiento real (volumen)
}

export interface ProjectionResult {
    // Monetary Metrics
    rawAverage: number; // Promedio puro de los históricos (filtrados)
    baseline: number;   // Promedio + Crecimiento (Base)
    final: number;      // Base * Factor del Evento del día objetivo

    // Traffic Metrics (New)
    rawAverageTickets: number; // Promedio de mesas/transacciones
    baselineTickets: number;
    finalTickets: number;

    // Confidence Intervals (Monetary)
    range: {
        lower: number; // Escenario Pesimista (Optimizado para cubrir costos)
        upper: number; // Escenario Optimista (Optimizado para stock)
        stdDev: number; // Volatilidad detectada
    };

    factors: {
        inflation: number; // Solo afecta dinero
        growth: number; // Afecta ambos? El crecimiento es volumen.
        eventModifier: number; // Afecta ambos
        weightingApplied: boolean; // Si se usó ponderación reciente
    };
    usedHistory: ArqueoRecord[]; // Registros usados en el cálculo
    excludedHistory: ArqueoRecord[]; // Registros ignorados (por eventos pasados)
}

/**
 * Calcula la proyección de venta para una fecha específica basada en históricos.
 * Modelo: Promedio Móvil Ponderado por Día de la Semana (ignorando eventos pasados).
 */
export const calculateDailyProjection = (
    targetDateStr: string, // YYYY-MM-DD
    allHistory: ArqueoRecord[],
    allEvents: SalesEvent[],
    options: ProjectionOptions = { lookbackWeeks: 8, growthPercentage: 0, inflationPercentage: 0 }
): ProjectionResult => {
    const targetDate = parseISO(targetDateStr);
    const targetDayOfWeek = getDay(targetDate);

    // 1. Filtrar históricos que sean del mismo día de la semana
    // Y que sean ANTERIORES a la fecha objetivo
    // Ordenar del más reciente al más antiguo
    const candidates = allHistory
        .filter(record => {
            const recordDate = parseISO(record.fecha);
            return (
                getDay(recordDate) === targetDayOfWeek &&
                recordDate < targetDate
            );
        })
    // 1. Estrategia de Selección de Datos Inteligente ("Seasonal Match" vs "Recency Fallback")

    // Objetivo: Encontrar "Gemelos Históricos"
    // Prioridad 1: Mismo Mes y Mismo Día de la Semana de años anteriores (YoY)
    // Prioridad 2: Tendencia reciente (si no hay historia suficiente del año pasado)

    // Pre-cálculo para Detección de Anomalías (Outlier Detection)
    // Calculamos un promedio "sucio" inicial para detectar valores absurdamente bajos (ej: < 20% del promedio)
    // Esto filtra días donde abriste pero pasó algo catastrófico (o error de digitación)
    const dirtySumAll = allHistory.reduce((sum, r) => sum + r.ventaBruta, 0);
    const dirtyAvgAll = allHistory.length > 0 ? dirtySumAll / allHistory.length : 0;
    const anomalyThreshold = dirtyAvgAll * 0.20; // 20% del promedio

    const filterAnomalies = (record: ArqueoRecord): boolean => {
        // Only filter if we have enough data for the average to be reliable
        // And if the record's sales are below the anomaly threshold
        return !(allHistory.length >= 4 && record.ventaBruta < anomalyThreshold);
    };

    const targetMonth = parseISO(targetDateStr).getMonth();
    // const targetDayOfWeek = getDay(parseISO(targetDateStr)); // Already defined above

    // Filtro Estacional (Viernes de Enero históricos)
    const seasonalHistory = allHistory.filter(record => {
        const d = parseISO(record.fecha);
        // Descartar el mismo año actual para proyección (o permitirlo si es pasado reciente?)
        // Generalmente queremos ver Años Anteriores. Pero si estamos a mitades de mes, los viernes pasados de este mismo mes sirven?
        // Sí, sirven para la tendencia "Intra-mes".
        // Regla: Mismo Mes, Mismo Día Semana.
        return getMonth(d) === targetMonth && getDay(d) === targetDayOfWeek && d < targetDate && filterAnomalies(record);
    });

    // Filtro Reciente (Fallback: Últimas N semanas si no hay data de años pasados)
    const recentHistory = allHistory.filter(record => {
        const d = parseISO(record.fecha);
        const weeksDiff = (targetDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 7);
        return weeksDiff > 0 && weeksDiff <= options.lookbackWeeks && getDay(d) === targetDayOfWeek && filterAnomalies(record);
    });

    // Decisión de Estrategia
    // Si tenemos > 2 registros estacionales (ej: año pasado y antepasado, o semanas previas de este mismo mes), usamos Seasonal.
    // "No limitarnos a un lookback" -> Prioridad TOTAL a seasonalHistory si existe.

    let usedHistory = seasonalHistory.length >= 2 ? seasonalHistory : recentHistory;

    // Si aún así es poco, intentamos combinar (pero el usuario pidió YoY)
    // Ordenamos por fecha descendente (más nuevo primero)
    usedHistory.sort((a, b) => b.fecha.localeCompare(a.fecha));

    // Recalcular promedios con la selección final
    // ... (El resto del calculo de promedios se mantiene igual, pero operando sobre 'usedHistory' que ahora es inteligente)

    let weightedSum = 0;
    let weightedTickets = 0;
    let weightTotal = 0;

    // Arrays para Stats estándar (sin peso) para desviación estándar
    const values = usedHistory.map(r => r.ventaBruta);

    if (usedHistory.length > 0) {
        usedHistory.forEach((record, index) => {
            // Peso para Seasonal:
            // Si es Seasonal, el "Más reciente" (Año pasado) pesa más que el (Antepasado).
            // Aún así, la inflación nos puede engañar, pero eso se arregla con los factores abajo.

            // Peso Lineal suave
            const weight = Math.max(1, 5 - index);

            weightedSum += record.ventaBruta * weight;
            weightedTickets += (record.visitas || record.numeroTransacciones || 0) * weight;
            weightTotal += weight;
        });
    }

    // Promedios Simples
    let sumSales = 0;
    let sumTickets = 0;
    if (usedHistory.length > 0) {
        sumSales = usedHistory.reduce((acc, curr) => acc + curr.ventaBruta, 0);
        sumTickets = usedHistory.reduce((acc, curr) => acc + (curr.visitas || curr.numeroTransacciones || 0), 0);
    }
    const rawAverage = usedHistory.length > 0 ? sumSales / usedHistory.length : 0;
    const rawAverageTickets = usedHistory.length > 0 ? sumTickets / usedHistory.length : 0;

    // Promedios Ponderados
    const weightedAverage = weightTotal > 0 ? weightedSum / weightTotal : 0;
    const weightedAverageTickets = weightTotal > 0 ? weightedTickets / weightTotal : 0;

    // Preferir Weighted si tenemos varios puntos de data (suaviza outliers antiguos)
    const baseMetric = usedHistory.length >= 3 ? weightedAverage : rawAverage;
    const baseMetricTickets = usedHistory.length >= 3 ? weightedAverageTickets : rawAverageTickets;

    // 4. Intervalos de Confianza (Confidence Intervals) - MONETARIO
    let stdDev = 0;
    if (usedHistory.length > 1) {
        const variance = usedHistory.reduce((acc, r) => acc + Math.pow(r.ventaBruta - rawAverage, 2), 0) / (usedHistory.length - 1);
        stdDev = Math.sqrt(variance);
    }
    const zScore = 1.28; // 80% Confidence
    const marginOfError = stdDev * zScore;

    // 5. Aplicar Factores Económicos
    // DINERO: Se ve afectado por Inflación (Precio) Y Crecimiento (Volumen)
    // TICKET: Solo se ve afectado por Crecimiento (Volumen). La inflación no crea más clientes.
    const inflationFactor = 1 + (options.inflationPercentage / 100);
    const growthFactor = 1 + (options.growthPercentage / 100);

    // Base Monetaria = (Histórico * Inflación para actualizar precios) * Crecimiento Real esperado
    const baseline = baseMetric * inflationFactor * growthFactor;

    // Base Tráfico = Histórico * Crecimiento Real esperado
    const baselineTickets = baseMetricTickets * growthFactor;

    // 6. Aplicar Factor del Evento del Día Objetivo (incluyendo QUINCENA si existe)
    const targetEvent = allEvents.find(e => e.date === targetDateStr);
    let eventModifier = 1;

    if (targetEvent) {
        eventModifier = targetEvent.impactFactor;
        if (targetEvent.type === 'boost' && eventModifier === 1) eventModifier = 1.25;
        if (targetEvent.type === 'drag' && eventModifier === 1) eventModifier = 0.75;
    }

    const final = baseline * eventModifier;
    const finalTickets = baselineTickets * eventModifier;

    // Escalar rango de error
    const scaledMargin = marginOfError * inflationFactor * growthFactor * eventModifier;

    // Placeholder for now, as we filter everything upfront
    const excludedHistory: ArqueoRecord[] = [];

    return {
        rawAverage: baseMetric,
        baseline,
        final,

        rawAverageTickets: baseMetricTickets,
        baselineTickets,
        finalTickets,

        range: {
            lower: Math.max(0, final - scaledMargin),
            upper: final + scaledMargin,
            stdDev
        },
        factors: {
            inflation: inflationFactor,
            growth: growthFactor,
            eventModifier,
            weightingApplied: usedHistory.length >= 4
        },
        usedHistory,
        excludedHistory
    };
};
