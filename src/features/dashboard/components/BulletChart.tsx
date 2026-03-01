import React from 'react';

export interface BulletChartItem {
    label: string;
    actual: number;
    target: number;
    subtitle?: string;
}

interface BulletChartProps {
    items: BulletChartItem[];
    formatValue?: (value: number) => string;
    className?: string;
    /**
     * Cuando `inverted` es true, la lógica de colores se invierte:
     * - ≤80%  = Verde (bien dentro del presupuesto)
     * - 80-100% = Ámbar (acercándose al límite)
     * - >100% = Rojo (excedido)
     *
     * Útil para presupuestos de gasto donde MENOS es MEJOR.
     * Ejemplo: Compras vs Presupuesto de Compras.
     */
    inverted?: boolean;
    /** Etiqueta para el valor real en la leyenda (default: "Real") */
    actualLabel?: string;
    /** Etiqueta para el target en la leyenda (default: "Meta") */
    targetLabel?: string;
}

/**
 * Bullet Chart — Diseñado por Stephen Few para comparar valores reales vs objetivos.
 * Muestra rangos cualitativos, valor actual como barra, y el target como marcador vertical.
 *
 * Dos modos:
 * - Normal (ventas): más es mejor → ≥100% verde
 * - Invertido (compras/gastos): menos es mejor → ≤80% verde, >100% rojo
 *
 * Usado en: ProjectionsView (metas semanales), PurchasesView (presupuesto semanal)
 */
export const BulletChart: React.FC<BulletChartProps> = ({
    items,
    formatValue = (v) => v.toLocaleString(),
    className = '',
    inverted = false,
    actualLabel = 'Real',
    targetLabel = 'Meta'
}) => {
    if (items.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-[11px] text-gray-400">
                Sin datos disponibles
            </div>
        );
    }

    // Calcular el máximo global para escala
    const maxValue = Math.max(
        ...items.map(item => Math.max(item.actual, item.target) * 1.15),
        1
    );

    return (
        <div className={`space-y-4 ${className}`}>
            {items.map((item, index) => {
                const percentage = item.target > 0 ? (item.actual / item.target) * 100 : 0;
                const actualWidth = (item.actual / maxValue) * 100;
                const targetPosition = (item.target / maxValue) * 100;

                // ── Colores según modo ──
                const getStatusColor = () => {
                    if (inverted) {
                        // Compras/Gastos: menos es mejor
                        if (percentage > 100) return 'text-rose-600';
                        if (percentage > 80) return 'text-amber-600';
                        return 'text-emerald-600';
                    }
                    // Ventas/Metas: más es mejor
                    if (percentage >= 100) return 'text-emerald-600';
                    if (percentage >= 80) return 'text-amber-600';
                    return 'text-rose-600';
                };

                const getBarColor = () => {
                    if (inverted) {
                        if (percentage > 100) return 'bg-rose-500';
                        if (percentage > 80) return 'bg-amber-500';
                        return 'bg-emerald-500';
                    }
                    if (percentage >= 100) return 'bg-emerald-500';
                    if (percentage >= 80) return 'bg-amber-500';
                    return 'bg-rose-500';
                };

                // Texto descriptivo del estado
                const getStatusLabel = () => {
                    if (inverted) {
                        if (percentage > 100) return 'Excedido';
                        if (percentage > 80) return 'Cerca del límite';
                        return 'Dentro del presupuesto';
                    }
                    return '';
                };

                return (
                    <div
                        key={index}
                        className="group animate-in fade-in slide-in-from-left-2"
                        style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
                    >
                        {/* Header: Label + Values */}
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">
                                    {item.label}
                                </span>
                                {item.subtitle && (
                                    <span className="text-[10px] text-gray-400 truncate hidden sm:inline">
                                        {item.subtitle}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[11px] font-bold tabular-nums ${getStatusColor()}`}>
                                    {percentage.toFixed(0)}%
                                </span>
                                {inverted && getStatusLabel() && (
                                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${percentage > 100
                                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                                            : percentage > 80
                                                ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                                                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                        }`}>
                                        {getStatusLabel()}
                                    </span>
                                )}
                                <span className="text-[10px] text-gray-400 tabular-nums hidden md:inline">
                                    {formatValue(item.actual)} / {formatValue(item.target)}
                                </span>
                            </div>
                        </div>

                        {/* Bullet Bar */}
                        <div className="relative h-5 rounded-sm overflow-hidden bg-gray-50 dark:bg-slate-700/30 group-hover:bg-gray-100 dark:group-hover:bg-slate-700/50 transition-colors">
                            {/* Qualitative Ranges (background) — orden depende del modo */}
                            <div className="absolute inset-0 flex">
                                {inverted ? (
                                    <>
                                        {/* Invertido: verde (bajo) → ámbar (medio) → rojo (alto) */}
                                        <div className="h-full bg-emerald-100/50 dark:bg-emerald-900/10" style={{ width: '60%' }} />
                                        <div className="h-full bg-amber-100/40 dark:bg-amber-900/10" style={{ width: '20%' }} />
                                        <div className="h-full bg-rose-100/50 dark:bg-rose-900/10" style={{ width: '20%' }} />
                                    </>
                                ) : (
                                    <>
                                        {/* Normal: rojo (bajo) → ámbar (medio) → verde (alto) */}
                                        <div className="h-full bg-rose-100/50 dark:bg-rose-900/10" style={{ width: '60%' }} />
                                        <div className="h-full bg-amber-100/40 dark:bg-amber-900/10" style={{ width: '20%' }} />
                                        <div className="h-full bg-emerald-100/40 dark:bg-emerald-900/10" style={{ width: '20%' }} />
                                    </>
                                )}
                            </div>

                            {/* Actual Value Bar */}
                            <div
                                className={`absolute top-1 bottom-1 left-0 rounded-sm ${getBarColor()} transition-all duration-700 ease-out`}
                                style={{ width: `${Math.min(actualWidth, 100)}%` }}
                            />

                            {/* Target Marker (vertical line) */}
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-gray-800 dark:bg-white z-10"
                                style={{ left: `${Math.min(targetPosition, 100)}%` }}
                            >
                                {/* Diamond marker top */}
                                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-gray-800 dark:bg-white rotate-45" />
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Legend — se adapta al modo */}
            <div className="flex items-center gap-4 pt-1 border-t border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 bg-purple-500 rounded-sm" />
                    <span className="text-[10px] text-gray-500">{actualLabel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-0.5 h-3 bg-gray-800 dark:bg-white" />
                    <span className="text-[10px] text-gray-500">{targetLabel}</span>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                    {inverted ? (
                        <>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-[9px] text-gray-400">&lt;80%</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-amber-400" />
                                <span className="text-[9px] text-gray-400">80-100%</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-rose-400" />
                                <span className="text-[9px] text-gray-400">&gt;100%</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-rose-400" />
                                <span className="text-[9px] text-gray-400">&lt;80%</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-amber-400" />
                                <span className="text-[9px] text-gray-400">80-99%</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-[9px] text-gray-400">≥100%</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Barra de progreso integrable dentro de KPI Cards.
 * Muestra el % de cumplimiento con color semántico.
 */
export const ProgressBar: React.FC<{
    percentage: number;
    className?: string;
    inverted?: boolean;
}> = ({ percentage, className = '', inverted = false }) => {
    const clampedPercentage = Math.max(0, Math.min(percentage, 120));
    const displayWidth = Math.min(clampedPercentage, 100);

    const getColor = () => {
        if (inverted) {
            if (percentage > 100) return 'bg-rose-500';
            if (percentage > 80) return 'bg-amber-500';
            return 'bg-emerald-500';
        }
        if (percentage >= 100) return 'bg-emerald-500';
        if (percentage >= 80) return 'bg-amber-500';
        return 'bg-rose-500';
    };

    const getTrackColor = () => {
        if (inverted) {
            if (percentage > 100) return 'bg-rose-100 dark:bg-rose-900/20';
            if (percentage > 80) return 'bg-amber-100 dark:bg-amber-900/20';
            return 'bg-emerald-100 dark:bg-emerald-900/20';
        }
        if (percentage >= 100) return 'bg-emerald-100 dark:bg-emerald-900/20';
        if (percentage >= 80) return 'bg-amber-100 dark:bg-amber-900/20';
        return 'bg-rose-100 dark:bg-rose-900/20';
    };

    return (
        <div className={`w-full ${className}`}>
            <div className={`relative h-1.5 rounded-full ${getTrackColor()} overflow-hidden`}>
                <div
                    className={`absolute inset-y-0 left-0 rounded-full ${getColor()} transition-all duration-700 ease-out`}
                    style={{ width: `${displayWidth}%` }}
                />
                {/* 100% marker */}
                {percentage < 120 && (
                    <div className="absolute top-0 bottom-0 w-px bg-gray-400 dark:bg-gray-500" style={{ left: '100%' }} />
                )}
            </div>
        </div>
    );
};
