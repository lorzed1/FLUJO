import React, { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { SalesEvent, SalesProjection } from '../../../types';
import { ProjectionResult } from '../../../utils/projections';
import { SmartDataTable } from '../../../components/ui/SmartDataTable';

interface ProjectionsDataTableProps {
    currentDate: Date;
    events: SalesEvent[];
    calculatedProjections: Record<string, ProjectionResult>;
    storedProjections: Record<string, SalesProjection>;
    realSales?: Record<string, number>;
    containerClassName?: string;
    onInfoClick?: () => void;
}

export const ProjectionsDataTable: React.FC<ProjectionsDataTableProps> = ({
    currentDate,
    events,
    calculatedProjections,
    storedProjections,
    realSales = {},
    containerClassName,
    onInfoClick
}) => {
    // Estado para ordenamiento (inicial: por fecha descendente - más reciente arriba)
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'dateStr',
        direction: 'desc'
    });

    // Preparar datos
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const data = useMemo(() => {
        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const projection = calculatedProjections[dateStr];
            const stored = storedProjections[dateStr];
            const real = realSales[dateStr] || 0;
            const meta = stored?.amountAdjusted ?? projection?.final ?? 0;

            // Extraer todos los datos calculados
            const hc = projection?.historicalComparisons;
            const traffic = projection?.traffic;
            const adj = projection?.adjustments;

            return {
                id: dateStr,
                dateStr,
                dateFormatted: format(day, 'dd/MM/yyyy'),

                // Comparativos Históricos
                yoySameDaySale: hc?.yoySameDaySale,
                yoyEquivalentDaySale: hc?.yoyEquivalentDaySale,
                yoyGrowthPercent: hc?.yoyGrowthPercent,
                avg4WeeksSale: hc?.avg4WeeksSale ?? 0,
                avg8WeeksSale: hc?.avg8WeeksSale ?? 0,
                historicalMonthAvgSale: hc?.historicalMonthAvgSale,
                recordsUsedCount: hc?.recordsUsedCount ?? 0,

                // Tráfico
                avgVisits: traffic?.avgVisits ?? 0,
                avgTransactions: traffic?.avgTransactions ?? 0,
                avgTicket: traffic?.avgTicket ?? 0,

                // Proyección
                baseSale: projection?.rawAverage ?? 0,
                inflationAdj: adj?.inflationAmount ?? 0,
                growthAdj: adj?.growthAmount ?? 0,
                eventsImpactAdj: adj?.eventsImpactAmount ?? 0,
                baseline: projection?.baseline ?? 0,
                meta,
                rangeMin: projection?.range.lower ?? 0,
                rangeMax: projection?.range.upper ?? 0,
                volatility: projection?.range.stdDev ?? 0,

                // Real vs Proyección
                real,
                hasReal: realSales[dateStr] !== undefined,
                compliance: meta > 0 ? ((real - meta) / meta) * 100 : 0,
                complianceStatus: real >= meta ? 'positive' : 'negative',

                // Metadatos
                confidence: projection?.confidence ?? 'low'
            };
        });
    }, [days, calculatedProjections, storedProjections, realSales]);

    // Formatear moneda ($ 1.234)
    const formatCurrency = (value: number | undefined) => {
        if (value === undefined || value === null) return '-';
        const formatted = value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
        return `$ ${formatted}`;
    };

    // Formatear porcentaje
    const formatPercent = (value: number | undefined) => {
        if (value === undefined || value === null) return '-';
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(1)}%`;
    };

    // Indicador de confiabilidad
    const renderConfidence = (value: 'high' | 'medium' | 'low') => {
        const config = {
            high: { label: 'Alta', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800' },
            medium: { label: 'Media', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800' },
            low: { label: 'Baja', color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800' }
        };
        const c = config[value];
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${c.bg} ${c.color}`}>
                {c.label}
            </span>
        );
    };

    // Definir columnas
    const columns = useMemo(() => [
        {
            key: 'dateStr',
            label: 'Fecha',
            tooltip: 'Fecha del día proyectado. Los cálculos se basan en este día de la semana.',
            sortable: true,
            filterable: true,
            width: 'w-24',
            render: (_: string, item: any) => (
                <span className="text-slate-700 dark:text-slate-200">
                    {item.dateFormatted}
                </span>
            )
        },
        // ═══ COMPARATIVOS HISTÓRICOS ═══
        {
            key: 'yoySameDaySale',
            label: 'YoY Mismo Día',
            tooltip: 'Venta bruta exacta del mismo día del año anterior (Year over Year).',
            sortable: true,
            align: 'text-right' as const,
            defaultHidden: true,
            render: (value: number) => (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: 'yoyEquivalentDaySale',
            label: 'YoY Equivalente',
            tooltip: 'Venta del día de la semana más cercano del año anterior (ej: el viernes equivalente).',
            sortable: true,
            align: 'text-right' as const,
            render: (value: number) => (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: 'avg4WeeksSale',
            label: 'Prom. 4 Sem',
            tooltip: 'Promedio de ventas de las últimas 4 semanas para este mismo día de la semana.',
            sortable: true,
            align: 'text-right' as const,
            render: (value: number) => (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: 'avg8WeeksSale',
            label: 'Prom. 8 Sem',
            tooltip: 'Promedio de ventas de las últimas 8 semanas para este mismo día de la semana.',
            sortable: true,
            align: 'text-right' as const,
            defaultHidden: true,
            render: (value: number) => (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: 'historicalMonthAvgSale',
            label: 'Prom. Mes Histórico',
            tooltip: 'Promedio histórico de todos los años anteriores para este mes y día de la semana.',
            sortable: true,
            align: 'text-right' as const,
            defaultHidden: true,
            render: (value: number) => (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: 'recordsUsedCount',
            label: 'N° Registros',
            tooltip: 'Cantidad de días históricos válidos encontrados para calcular el promedio (excluyendo anomalías).',
            sortable: true,
            align: 'text-center' as const,
            width: 'w-24',
            render: (value: number) => (
                <span className="inline-flex items-center justify-center px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md font-mono text-xs border border-slate-100 dark:border-slate-700">
                    {value}
                </span>
            )
        },
        // ═══ TRÁFICO ═══
        {
            key: 'avgVisits',
            label: 'Visitas Prom',
            tooltip: 'Promedio histórico de visitas de clientes para este tipo de día.',
            sortable: true,
            align: 'text-right' as const,
            defaultHidden: true,
            render: (value: number) => (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {Math.round(value)}
                </span>
            )
        },
        {
            key: 'avgTicket',
            label: 'Ticket Prom',
            tooltip: 'Venta promedio por transacción/mesa en base a los registros históricos usados.',
            sortable: true,
            align: 'text-right' as const,
            render: (value: number) => (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(value)}
                </span>
            )
        },
        // ═══ PROYECCIÓN (CASCADA) ═══
        {
            key: 'baseSale',
            label: 'Venta Base',
            tooltip: 'Promedio ponderado de los históricos seleccionados (Venta de donde partimos).',
            sortable: true,
            align: 'text-right' as const,
            render: (value: number) => (
                <span className="font-mono text-slate-600 dark:text-slate-300">
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: 'inflationAdj',
            label: '+ Inflación',
            tooltip: 'Monto sumado para ajustar la venta histórica a los precios actuales (Costo de vida).',
            sortable: true,
            align: 'text-right' as const,
            render: (value: number) => (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: 'growthAdj',
            label: '+ Crecimiento',
            tooltip: 'Monto sumado por la meta de crecimiento real en volumen de ventas.',
            sortable: true,
            align: 'text-right' as const,
            render: (value: number) => (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: 'eventsImpactAdj',
            label: '+ Eventos',
            tooltip: 'Impacto monetario de los eventos del día (Festivos, quincenas, promociones, etc).',
            sortable: true,
            align: 'text-right' as const,
            render: (value: number) => (
                <span className={`font-mono text-xs font-medium ${value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {value >= 0 ? '+' : ''}{formatCurrency(value)}
                </span>
            )
        },
        // ═══ META Y RANGO ═══
        {
            key: 'meta',
            label: 'Meta Total',
            tooltip: 'Venta final proyectada (Venta Base + Inflación + Crecimiento + Eventos).',
            sortable: true,
            align: 'text-right' as const,
            className: 'font-result',
            render: (value: number) => (
                <span className="font-mono">
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: 'rangeMin',
            label: 'Rango Mín',
            tooltip: 'Escenario pesimista (Límite inferior sugerido para cubrir costos).',
            sortable: true,
            align: 'text-right' as const,
            defaultHidden: true,
            render: (value: number) => (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: 'rangeMax',
            label: 'Rango Máx',
            tooltip: 'Escenario optimista (Límite superior sugerido para preparación de stock).',
            sortable: true,
            align: 'text-right' as const,
            defaultHidden: true,
            render: (value: number) => (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: 'volatility',
            label: 'Volatilidad (σ)',
            tooltip: 'Desviación estándar de los históricos. Entre más alto, más impredecible es el día.',
            sortable: true,
            align: 'text-right' as const,
            defaultHidden: true,
            render: (value: number) => (
                <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                    ±{formatCurrency(value)}
                </span>
            )
        },
        // ═══ REAL VS PROYECCIÓN ═══
        {
            key: 'real',
            label: 'Venta Real',
            tooltip: 'Venta bruta registrada realmente ese día en el arqueo.',
            sortable: true,
            align: 'text-right' as const,
            render: (value: number, item: any) => {
                if (!item.hasReal) {
                    return <span className="text-slate-300 dark:text-slate-600">-</span>;
                }
                return (
                    <span className={`font-mono font-bold ${item.complianceStatus === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(value)}
                    </span>
                );
            }
        },
        {
            key: 'compliance',
            label: 'Cumplimiento',
            tooltip: 'Porcentaje de la meta alcanzado (Venta Real vs Meta Total).',
            sortable: true,
            align: 'text-right' as const,
            render: (value: number, item: any) => {
                if (!item.hasReal) {
                    return <span className="text-slate-300 dark:text-slate-600">-</span>;
                }
                return (
                    <span className={`font-bold ${item.complianceStatus === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatPercent(value)}
                    </span>
                );
            }
        },
        {
            key: 'yoyGrowthPercent',
            label: 'Crec. YoY',
            tooltip: 'Crecimiento porcentual comparado con el mismo día del año anterior.',
            sortable: true,
            align: 'text-right' as const,
            defaultHidden: true,
            render: (value: number) => (
                <span className={`font-bold text-xs ${(value ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatPercent(value)}
                </span>
            )
        },
        // ═══ CONFIABILIDAD ═══
        {
            key: 'confidence',
            label: 'Confianza',
            tooltip: 'Nivel de precisión de la meta basado en la cantidad de datos y su estabilidad (σ).',
            sortable: true,
            filterable: true,
            align: 'text-center' as const,
            width: 'w-24',
            render: (value: 'high' | 'medium' | 'low') => renderConfidence(value)
        }
    ], []);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            <SmartDataTable
                id="projections-data-table"
                data={data}
                columns={columns}
                enableSearch={true}
                enableColumnConfig={true}
                enableExport={true}
                enableSelection={true}
                searchPlaceholder="Buscar por fecha..."
                containerClassName="border-none shadow-none"
                exportDateField="dateStr"
                sortConfig={sortConfig}
                onSortChange={setSortConfig}
                onInfoClick={onInfoClick}
            />
        </div>
    );
};
