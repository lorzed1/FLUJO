import { ArqueoRecord, SalesEvent } from '../types';
import { getDay, subWeeks, parseISO, isAfter, getMonth } from 'date-fns';

export interface ProjectionOptions {
    lookbackWeeks: number; // e.g. 8
    inflationPercentage: number; // Ajuste por IPC (Precios)
    growthPercentage: number; // Meta de crecimiento global (Legacy)

    // Configuración Avanzada Pro
    trafficGrowthPercentage?: number; // % extra de clientes
    ticketGrowthPercentage?: number;  // % extra de gasto por cliente
    anomalyThreshold?: number;        // Porcentaje para detectar días atípicos (0-100, default 20)
    recencyWeightMode?: 'equal' | 'linear' | 'aggressive'; // Cómo valoramos el pasado cercano
}

export interface ProjectionResult {
    // ═══════════════════════════════════════════════════════════
    // SECCIÓN 1: COMPARATIVOS HISTÓRICOS (Year-over-Year & Trends)
    // ═══════════════════════════════════════════════════════════
    historicalComparisons: {
        yoySameDaySale?: number;        // Venta del mismo día del año anterior (ej: 9 Feb 2025)
        yoySameDayVisits?: number;      // Visitas del mismo día año anterior
        yoyEquivalentDaySale?: number;  // Venta del día equivalente año anterior (mismo día semana más cercano)
        yoyEquivalentDayVisits?: number;
        yoyGrowthPercent?: number;      // % crecimiento vs año anterior

        avg4WeeksSale: number;          // Promedio móvil 4 semanas (mismo día semana)
        avg4WeeksVisits: number;
        avg8WeeksSale: number;          // Promedio móvil 8 semanas
        avg8WeeksVisits: number;

        historicalMonthAvgSale?: number;    // Promedio histórico del mismo mes (todos los años)
        historicalMonthAvgVisits?: number;

        recordsUsedCount: number;       // N° de registros históricos usados en el cálculo
    };

    // ═══════════════════════════════════════════════════════════
    // SECCIÓN 2: TRÁFICO Y TICKET PROMEDIO
    // ═══════════════════════════════════════════════════════════
    traffic: {
        avgVisits: number;              // Promedio de visitas/clientes
        avgTransactions: number;        // Promedio de transacciones/mesas
        avgTicket: number;              // Ticket promedio (venta/transacciones)
        projectedVisits: number;        // Visitas proyectadas para el día objetivo
        projectedTransactions: number;  // Transacciones proyectadas
        projectedTicket: number;        // Ticket promedio proyectado
    };

    // ═══════════════════════════════════════════════════════════
    // SECCIÓN 3: PROYECCIÓN MONETARIA (Cascada de Ajustes)
    // ═══════════════════════════════════════════════════════════
    rawAverage: number;                 // Promedio puro de los históricos (filtrados)
    baseline: number;                   // Promedio + Inflación + Crecimiento
    final: number;                      // Baseline * Factor del Evento del día objetivo

    // Desglose de Ajustes (para visualización en tabla)
    adjustments: {
        inflationAmount: number;        // Monto del ajuste por inflación ($)
        growthAmount: number;           // Monto del ajuste por crecimiento ($)
        eventsImpactAmount: number;     // Monto del impacto de eventos ($)
    };

    // ═══════════════════════════════════════════════════════════
    // SECCIÓN 4: TRÁFICO (Legacy - mantener compatibilidad)
    // ═══════════════════════════════════════════════════════════
    rawAverageTickets: number;          // Promedio de mesas/transacciones
    baselineTickets: number;
    finalTickets: number;

    // ═══════════════════════════════════════════════════════════
    // SECCIÓN 5: INTERVALOS DE CONFIANZA
    // ═══════════════════════════════════════════════════════════
    range: {
        lower: number;                  // Escenario Pesimista (Optimizado para cubrir costos)
        upper: number;                  // Escenario Optimista (Optimizado para stock)
        stdDev: number;                 // Volatilidad detectada (desviación estándar)
    };

    // ═══════════════════════════════════════════════════════════
    // SECCIÓN 6: FACTORES Y METADATOS
    // ═══════════════════════════════════════════════════════════
    factors: {
        inflation: number;              // Factor de inflación aplicado
        growth: number;                 // Factor de crecimiento aplicado
        eventModifier: number;          // Modificador por eventos especiales
        weightingApplied: boolean;      // Si se usó ponderación reciente
    };

    // Registros históricos utilizados
    usedHistory: ArqueoRecord[];        // Registros usados en el cálculo
    excludedHistory: ArqueoRecord[];    // Registros ignorados (por eventos pasados)

    // Indicador de confiabilidad
    confidence: 'high' | 'medium' | 'low'; // Basado en N° registros y volatilidad
}

/**
 * Calcula la proyección de venta para una fecha específica basada en históricos.
 * Modelo: Promedio Móvil Ponderado por Día de la Semana (ignorando eventos pasados).
 */
export const calculateDailyProjection = (
    targetDateStr: string, // YYYY-MM-DD
    allHistory: ArqueoRecord[],
    allEvents: SalesEvent[],
    options: ProjectionOptions = {
        lookbackWeeks: 8,
        growthPercentage: 0,
        inflationPercentage: 0,
        anomalyThreshold: 20,
        recencyWeightMode: 'linear'
    }
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

    // Usar el umbral configurado o el 20% por defecto
    const thresholdPercent = (options.anomalyThreshold ?? 20) / 100;
    const anomalyThreshold = dirtyAvgAll * thresholdPercent;

    const filterAnomalies = (record: ArqueoRecord): boolean => {
        // Ignorar días que vendieron menos del X% del promedio histórico
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
            // Peso dinámico basado en recencia
            let weight = 1;

            if (options.recencyWeightMode === 'linear') {
                weight = Math.max(1, 5 - index);
            } else if (options.recencyWeightMode === 'aggressive') {
                // Caída exponencial: lo más reciente pesa mucho más
                weight = Math.pow(2, Math.max(0, 4 - index));
            } else {
                weight = 1; // 'equal'
            }

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

    // DINERO: Se ve afectado por Inflación (Precio) Y Crecimiento (Volumen)
    const inflationFactor = 1 + (options.inflationPercentage / 100);

    // Crecimiento Granular: Si no están definidos, usamos el growthPercentage heredado
    const trafficGrowth = options.trafficGrowthPercentage !== undefined
        ? (1 + options.trafficGrowthPercentage / 100)
        : (1 + options.growthPercentage / 100);

    const ticketGrowth = options.ticketGrowthPercentage !== undefined
        ? (1 + options.ticketGrowthPercentage / 100)
        : 1; // Por defecto no asumimos crecimiento de ticket si no se especifica

    // Base Monetaria = (Histórico * Inflación para actualizar precios) * Crecimiento Tráfico * Crecimiento Ticket
    const baseline = baseMetric * inflationFactor * trafficGrowth * ticketGrowth;

    // Base Tráfico = Histórico * Crecimiento de Tráfico esperado
    const baselineTickets = baseMetricTickets * trafficGrowth;

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
    const combinedGrowthFactor = trafficGrowth * ticketGrowth;
    const scaledMargin = marginOfError * inflationFactor * combinedGrowthFactor * eventModifier;

    // Placeholder for now, as we filter everything upfront
    const excludedHistory: ArqueoRecord[] = [];

    // ═══════════════════════════════════════════════════════════
    // CÁLCULOS ADICIONALES PARA VERSIÓN COMPLETA
    // ═══════════════════════════════════════════════════════════

    // 1. Year-over-Year Comparisons
    const targetYear = targetDate.getFullYear();
    const targetDay = targetDate.getDate();

    // Mismo día del año anterior exacto (ej: 9 Feb 2025 si buscamos 9 Feb 2026)
    const yoySameDayRecord = allHistory.find(r => {
        const d = parseISO(r.fecha);
        return d.getFullYear() === targetYear - 1
            && d.getMonth() === targetMonth
            && d.getDate() === targetDay;
    });

    // Mismo día de la semana del año anterior más cercano
    const yoyEquivalentRecords = allHistory.filter(r => {
        const d = parseISO(r.fecha);
        return d.getFullYear() === targetYear - 1
            && d.getMonth() === targetMonth
            && getDay(d) === targetDayOfWeek;
    }).sort((a, b) => {
        // Ordenar por cercanía al día objetivo
        const diffA = Math.abs(parseISO(a.fecha).getDate() - targetDay);
        const diffB = Math.abs(parseISO(b.fecha).getDate() - targetDay);
        return diffA - diffB;
    });
    const yoyEquivalentRecord = yoyEquivalentRecords[0];

    // % de crecimiento YoY
    const yoyGrowthPercent = yoySameDayRecord
        ? ((baseMetric - yoySameDayRecord.ventaBruta) / yoySameDayRecord.ventaBruta) * 100
        : undefined;

    // 2. Promedios Móviles (4 y 8 semanas)
    const fourWeeksAgo = subWeeks(targetDate, 4);
    const eightWeeksAgo = subWeeks(targetDate, 8);

    const last4WeeksRecords = allHistory.filter(r => {
        const d = parseISO(r.fecha);
        return d >= fourWeeksAgo && d < targetDate && getDay(d) === targetDayOfWeek;
    });

    const last8WeeksRecords = allHistory.filter(r => {
        const d = parseISO(r.fecha);
        return d >= eightWeeksAgo && d < targetDate && getDay(d) === targetDayOfWeek;
    });

    const avg4WeeksSale = last4WeeksRecords.length > 0
        ? last4WeeksRecords.reduce((sum, r) => sum + r.ventaBruta, 0) / last4WeeksRecords.length
        : 0;

    const avg4WeeksVisits = last4WeeksRecords.length > 0
        ? last4WeeksRecords.reduce((sum, r) => sum + (r.visitas || 0), 0) / last4WeeksRecords.length
        : 0;

    const avg8WeeksSale = last8WeeksRecords.length > 0
        ? last8WeeksRecords.reduce((sum, r) => sum + r.ventaBruta, 0) / last8WeeksRecords.length
        : 0;

    const avg8WeeksVisits = last8WeeksRecords.length > 0
        ? last8WeeksRecords.reduce((sum, r) => sum + (r.visitas || 0), 0) / last8WeeksRecords.length
        : 0;

    // 3. Promedio histórico del mismo mes (todos los años anteriores)
    const historicalMonthRecords = allHistory.filter(r => {
        const d = parseISO(r.fecha);
        return d.getMonth() === targetMonth
            && getDay(d) === targetDayOfWeek
            && d < targetDate;
    });

    const historicalMonthAvgSale = historicalMonthRecords.length > 0
        ? historicalMonthRecords.reduce((sum, r) => sum + r.ventaBruta, 0) / historicalMonthRecords.length
        : undefined;

    const historicalMonthAvgVisits = historicalMonthRecords.length > 0
        ? historicalMonthRecords.reduce((sum, r) => sum + (r.visitas || 0), 0) / historicalMonthRecords.length
        : undefined;

    // 4. Tráfico y Ticket Promedio
    const avgVisits = usedHistory.length > 0
        ? usedHistory.reduce((sum, r) => sum + (r.visitas || 0), 0) / usedHistory.length
        : 0;

    const avgTransactions = usedHistory.length > 0
        ? usedHistory.reduce((sum, r) => sum + (r.numeroTransacciones || 0), 0) / usedHistory.length
        : 0;

    const avgTicket = avgTransactions > 0
        ? baseMetric / avgTransactions
        : 0;

    // Proyecciones de tráfico
    const projectedVisits = avgVisits * trafficGrowth * eventModifier;
    const projectedTransactions = avgTransactions * trafficGrowth * eventModifier;
    const projectedTicket = projectedTransactions > 0
        ? final / projectedTransactions
        : avgTicket * ticketGrowth;

    // 5. Desglose de ajustes monetarios
    const inflationAmount = baseMetric * (inflationFactor - 1);
    const growthAmount = (baseMetric * inflationFactor) * (combinedGrowthFactor - 1);
    const eventsImpactAmount = baseline * (eventModifier - 1);

    // 6. Nivel de confiabilidad
    const recordsCount = usedHistory.length;
    const volatility = stdDev / Math.max(baseMetric, 1); // Coeficiente de variación

    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (recordsCount >= 8 && volatility < 0.2) {
        confidence = 'high';
    } else if (recordsCount >= 4 && volatility < 0.35) {
        confidence = 'medium';
    }

    // ═══════════════════════════════════════════════════════════
    // RETURN COMPLETO CON TODA LA DATA
    // ═══════════════════════════════════════════════════════════
    return {
        // Comparativos Históricos
        historicalComparisons: {
            yoySameDaySale: yoySameDayRecord?.ventaBruta,
            yoySameDayVisits: yoySameDayRecord?.visitas,
            yoyEquivalentDaySale: yoyEquivalentRecord?.ventaBruta,
            yoyEquivalentDayVisits: yoyEquivalentRecord?.visitas,
            yoyGrowthPercent,
            avg4WeeksSale,
            avg4WeeksVisits,
            avg8WeeksSale,
            avg8WeeksVisits,
            historicalMonthAvgSale,
            historicalMonthAvgVisits,
            recordsUsedCount: recordsCount
        },

        // Tráfico
        traffic: {
            avgVisits,
            avgTransactions,
            avgTicket,
            projectedVisits,
            projectedTransactions,
            projectedTicket
        },

        // Proyección Monetaria
        rawAverage: baseMetric,
        baseline,
        final,

        // Desglose de Ajustes
        adjustments: {
            inflationAmount,
            growthAmount,
            eventsImpactAmount
        },

        // Legacy (compatibilidad)
        rawAverageTickets: baseMetricTickets,
        baselineTickets,
        finalTickets,

        // Intervalos de Confianza
        range: {
            lower: Math.max(0, final - scaledMargin),
            upper: final + scaledMargin,
            stdDev
        },

        // Factores
        factors: {
            inflation: inflationFactor,
            growth: combinedGrowthFactor,
            eventModifier,
            weightingApplied: usedHistory.length >= 4
        },

        // Históricos
        usedHistory,
        excludedHistory,

        // Confiabilidad
        confidence
    };
};
