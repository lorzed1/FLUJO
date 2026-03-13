
import React, { useMemo } from 'react';
import { useProjections } from '../../projections/hooks/useProjections';
import { MOCK_SALES_DATA } from '../dashboard-mock-data';
import {
    ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend
} from 'recharts';
import { BulletChart, ProgressBar, BulletChartItem } from '../components/BulletChart';
import { InfoTooltip } from '../components/InfoTooltip';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getISOWeek, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { getCompleteWeeksRange } from '../../../utils/dateUtils';
import {
    ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon,
    ChartBarIcon, UsersIcon, ScaleIcon, CalendarDaysIcon, CreditCardIcon
} from '../../../components/ui/Icons';
import { dashboardService } from '../../../services/dashboardService';
import { Card } from '../../../components/ui/Card';

const PAYMENT_COLORS = ['#059669', '#7c3aed', '#3b82f6', '#d97706', '#e11d48', '#0d9488', '#4f46e5'];

const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
        minimumFractionDigits: 0
    }).format(value);
};

const formatCompact = (value: number): string => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
};

export const SalesView: React.FC<{ selectedDate: Date }> = ({ selectedDate }) => {
    // ── Hooks de Proyecciones (Contexto Meta vs Real) ──
    const {
        currentDate,
        setCurrentDate,
        calculatedProjections,
        realSales,
        projections: storedProjections,
        loading: loadingProjections,
    } = useProjections();

    // ── Estado Operativo de Ventas ──
    const [realTotalSales, setRealTotalSales] = React.useState<number | null>(null);
    const [realTicketAverage, setRealTicketAverage] = React.useState<number | null>(null);
    const [realTotalVisits, setRealTotalVisits] = React.useState<number | null>(null);
    const [realTrends, setRealTrends] = React.useState({ salesTrend: 0, visitsTrend: 0, ticketTrend: 0 });
    const [realDailySales, setRealDailySales] = React.useState<any[]>([]);
    const [realPaymentMethods, setRealPaymentMethods] = React.useState<any[]>([]);
    const [loadingSales, setLoadingSales] = React.useState(true);
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => { setIsMounted(true); }, []);

    // Sincronizar fecha en proyecciones
    React.useEffect(() => {
        const selM = selectedDate.getMonth();
        const selY = selectedDate.getFullYear();
        if (selM !== currentDate.getMonth() || selY !== currentDate.getFullYear()) {
            setCurrentDate(new Date(selY, selM, 1));
        }
    }, [selectedDate]);

    React.useEffect(() => {
        const fetchSales = async () => {
            setLoadingSales(true);
            try {
                const year = selectedDate.getFullYear();
                const month = selectedDate.getMonth() + 1;

                // KPIs
                const { totalSales, totalVisits, salesTrend, visitsTrend, ticketTrend } = await dashboardService.getSalesSummary(year, month);
                setRealTotalSales(totalSales);
                setRealTotalVisits(totalVisits);
                setRealTrends({ salesTrend, visitsTrend, ticketTrend });
                setRealTicketAverage(totalVisits > 0 ? totalSales / totalVisits : 0);

                // Diarios
                const dailyData = await dashboardService.getDailySalesSummary(year, month);
                setRealDailySales(dailyData);

                // Pagos
                const paymentData = await dashboardService.getPaymentMethodsSummary(year, month);
                setRealPaymentMethods(paymentData);
            } catch (err) {
                console.error("Error al cargar datos operativos de ventas:", err);
            } finally {
                setLoadingSales(false);
            }
        };
        fetchSales();
    }, [selectedDate]);

    // ── Datos Diarios Combinados (Meta + Realidad + Visitas) ──
    const combinedDailyData = useMemo(() => {
        const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });

        // Mapeo rápido de visitas por día devueltos por el service (1, 2, ..., n)
        const visitsMap = new Map();
        realDailySales.forEach(d => visitsMap.set(d.day, d.visits));

        return days.map(day => {
            const ds = format(day, 'yyyy-MM-dd');
            const dayNum = format(day, 'd');
            const proj = calculatedProjections[ds];
            const stored = storedProjections[ds];
            const real = realSales[ds] || 0;
            const meta = stored?.amountAdjusted ?? proj?.final ?? 0;
            const hasReal = realSales[ds] !== undefined;
            const visits = visitsMap.get(dayNum) || 0;
            const projectedVisits = proj?.traffic?.projectedVisits || 0;

            return {
                day: dayNum,
                real: hasReal ? real : 0,
                meta,
                hasReal,
                visits,
                projectedVisits
            };
        });
    }, [currentDate, calculatedProjections, storedProjections, realSales, realDailySales]);

    // ── Datos Semanales ──
    const weeklyData = useMemo(() => {
        const wm = new Map<number, { week: string; real: number; meta: number; days: number; daysWithReal: number }>();
        const { weekDays } = getCompleteWeeksRange(currentDate);

        weekDays.forEach((dayDate) => {
            const ds = format(dayDate, 'yyyy-MM-dd');
            const proj = calculatedProjections[ds];
            const stored = storedProjections[ds];
            const real = realSales[ds] || 0;
            const meta = stored?.amountAdjusted ?? proj?.final ?? 0;
            const hasReal = realSales[ds] !== undefined;

            const wn = getISOWeek(dayDate);
            const ws = startOfWeek(dayDate, { weekStartsOn: 1 });
            const we = endOfWeek(dayDate, { weekStartsOn: 1 });

            if (!wm.has(wn)) {
                wm.set(wn, {
                    week: `S${wn} (${format(ws, 'dd/MM')}–${format(we, 'dd/MM')})`,
                    real: 0, meta: 0, days: 0, daysWithReal: 0,
                });
            }
            const w = wm.get(wn)!;
            w.meta += meta;
            w.real += hasReal ? real : 0;
            w.days += 1;
            if (hasReal) w.daysWithReal += 1;
        });
        return Array.from(wm.values());
    }, [currentDate, calculatedProjections, storedProjections, realSales]);

    // ── Resumen de Metas ──
    const summary = useMemo(() => {
        const totalMeta = combinedDailyData.reduce((s, d) => s + d.meta, 0);
        const totalReal = combinedDailyData.filter(d => d.hasReal).reduce((s, d) => s + d.real, 0);
        const compliance = totalMeta > 0 ? ((totalReal / totalMeta) * 100) : 0;
        const diff = totalReal - totalMeta;

        const today = new Date();
        const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

        let metaToDate = 0;
        let metaVisitsToDate = 0;
        const totalMetaVisits = combinedDailyData.reduce((s, d) => s + d.projectedVisits, 0);

        if (isCurrentMonth) {
            const currentDay = today.getDate();
            metaToDate = combinedDailyData.filter(d => Number(d.day) <= currentDay).reduce((s, d) => s + d.meta, 0);
            metaVisitsToDate = combinedDailyData.filter(d => Number(d.day) <= currentDay).reduce((s, d) => s + d.projectedVisits, 0);
        } else if (currentDate < today) {
            metaToDate = totalMeta;
            metaVisitsToDate = totalMetaVisits;
        }

        const complianceToDate = metaToDate > 0 ? ((totalReal / metaToDate) * 100) : 0;
        const diffToDate = totalReal - metaToDate;

        // Cálculos de Ticket Promedio para comparar vs Meta Proyectada
        const realVisitsToDate = combinedDailyData.filter(d => d.hasReal).reduce((s, d) => s + d.visits, 0);
        const realTicketToDate = realVisitsToDate > 0 ? totalReal / realVisitsToDate : 0;

        const totalMetaTicket = totalMetaVisits > 0 ? totalMeta / totalMetaVisits : 0;
        const metaTicketToDate = metaVisitsToDate > 0 ? metaToDate / metaVisitsToDate : 0;

        const ticketCompliance = totalMetaTicket > 0 ? (realTicketToDate / totalMetaTicket) * 100 : 0;
        const ticketComplianceToDate = metaTicketToDate > 0 ? (realTicketToDate / metaTicketToDate) * 100 : 0;

        return {
            totalMeta, totalReal, compliance, diff,
            metaToDate, complianceToDate, diffToDate, isCurrentMonth,
            totalMetaTicket, metaTicketToDate, ticketCompliance, ticketComplianceToDate, totalMetaVisits, metaVisitsToDate
        };
    }, [combinedDailyData, currentDate]);


    if (loadingProjections || loadingSales) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-3 text-gray-500">Cargando centro de mando...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* ── KPI Row Integrada (4 KPIs) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* KPI 1: Ventas y Cumplimiento */}
                <Card className="p-4 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="flex items-center gap-1 mb-1">
                                <p className="text-xs2 font-semibold uppercase tracking-caps text-gray-500 dark:text-gray-400">
                                    Ventas & Cumplimiento
                                </p>
                                <InfoTooltip
                                    title="Cumplimiento de Meta"
                                    description="Ingresos acumulados vs la meta mensual proyectada."
                                />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCOP(summary.totalReal)}
                            </h3>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                            <ChartBarIcon className="w-5 h-5 text-emerald-500" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Meta Mes: {formatCompact(summary.totalMeta)}</span>
                        {summary.isCurrentMonth && (
                            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                                Meta Hoy: {formatCompact(summary.metaToDate)}
                            </span>
                        )}
                    </div>
                    <ProgressBar percentage={summary.isCurrentMonth ? summary.complianceToDate : summary.compliance} className="mt-2" />
                    <div className="flex justify-between items-center mt-1">
                        <span className="text-xs2 text-gray-400">{summary.isCurrentMonth ? 'Cumplimiento a la fecha' : 'Cumplimiento final'}</span>
                        <span className="text-xs2 font-bold text-gray-700 dark:text-gray-300">
                            {summary.isCurrentMonth ? summary.complianceToDate.toFixed(1) : summary.compliance.toFixed(1)}%
                        </span>
                    </div>
                </Card>

                {/* KPI 2: Estado Contra Meta (Diferencia) */}
                <Card className="p-4 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="flex items-center gap-1 mb-1">
                                <p className="text-xs2 font-semibold uppercase tracking-caps text-gray-500 dark:text-gray-400">
                                    Diferencia vs {summary.isCurrentMonth ? 'Fecha' : 'Meta'}
                                </p>
                                <InfoTooltip
                                    title="Diferencia de Meta"
                                    description={summary.isCurrentMonth ? "Indica cuánto falta (Rojo) o cuánto sobra (Verde) comparado con la meta acumulada hasta el día de hoy." : "Indica cuánto falta (Rojo) o cuánto sobra (Verde) comparado con la meta mensual total."}
                                />
                            </div>
                            <h3 className={`text-2xl font-bold ${summary.isCurrentMonth ? (summary.diffToDate >= 0 ? 'text-emerald-600' : 'text-rose-600') : (summary.diff >= 0 ? 'text-emerald-600' : 'text-rose-600')}`}>
                                {summary.isCurrentMonth ? (summary.diffToDate >= 0 ? '+' : '') + formatCOP(Math.abs(summary.diffToDate)) : (summary.diff >= 0 ? '+' : '') + formatCOP(Math.abs(summary.diff))}
                            </h3>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                            <ScaleIcon className="w-5 h-5 text-amber-500" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            {summary.isCurrentMonth ? (summary.diffToDate >= 0 ? 'Por encima de la proyección a HOY' : 'Faltante para la proyección a HOY') : (summary.diff >= 0 ? 'Por encima de la proyección total' : 'Presupuesto faltante para la meta total')}
                        </span>
                    </div>
                </Card>

                {/* KPI 3: Visitas Totales */}
                <Card className="p-4 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="flex items-center gap-1 mb-1">
                                <p className="text-xs2 font-semibold uppercase tracking-caps text-gray-500 dark:text-gray-400">
                                    Total Visitas
                                </p>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {realTotalVisits !== null ? realTotalVisits : 0}
                            </h3>
                        </div>
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                            <UsersIcon className="w-5 h-5 text-indigo-500" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        <span
                            className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${realTrends.visitsTrend >= 0
                                ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : 'text-rose-700 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400'
                                }`}
                        >
                            {realTrends.visitsTrend >= 0 ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                            {Math.abs(realTrends.visitsTrend).toFixed(1)}%
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">vs mes anterior</span>
                    </div>
                </Card>

                {/* KPI 4: Ticket Promedio */}
                <Card className="p-4 transition-all duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="flex items-center gap-1 mb-1">
                                <p className="text-xs2 font-semibold uppercase tracking-caps text-gray-500 dark:text-gray-400">
                                    Ticket Promedio
                                </p>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatCOP(realTicketAverage || 0)}
                            </h3>
                        </div>
                        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                            <CurrencyDollarIcon className="w-5 h-5 text-purple-600" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 flex-wrap">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Meta Mes: {formatCOP(summary.totalMetaTicket)}</span>
                        {summary.isCurrentMonth && (
                            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                                Meta Hoy: {formatCOP(summary.metaTicketToDate)}
                            </span>
                        )}
                    </div>
                    <ProgressBar percentage={summary.isCurrentMonth ? summary.ticketComplianceToDate : summary.ticketCompliance} className="mt-2" />
                    <div className="flex justify-between items-center mt-1">
                        <span className="text-xs2 text-gray-400">{summary.isCurrentMonth ? 'Cumplimiento a la fecha' : 'Cumplimiento final'}</span>
                        <span className="text-xs2 font-bold text-gray-700 dark:text-gray-300">
                            {summary.isCurrentMonth ? summary.ticketComplianceToDate.toFixed(1) : summary.ticketCompliance.toFixed(1)}%
                        </span>
                    </div>
                </Card>
            </div>

            {/* ── Gráfica Diaria Consolidada ── */}
            <Card className="p-4">
                <div className="mb-2 flex justify-between items-center">
                    <div className="flex items-center gap-1">
                        <h3 className="text-xs2 font-semibold uppercase tracking-caps text-gray-500 dark:text-gray-400">
                            Rendimiento Diario (Ingresos vs Meta vs Visitas)
                        </h3>
                        <InfoTooltip
                            title="Rendimiento Integrado"
                            description="Combina la venta real contra la meta proyectada, y muestra la afluencia de visitas diaria para correlacionar picos de ingresos con volumen de clientes."
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-xs2 text-gray-600 dark:text-gray-300 font-medium">Venta Real</span>
                        </div>
                        <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                            <span className="w-2 h-2 rounded-full bg-purple-500/40 border border-purple-500" />
                            <span className="text-xs2 text-gray-600 dark:text-gray-300 font-medium">Meta Diaria</span>
                        </div>
                        <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                            <div className="w-3 h-0.5 bg-blue-500 rounded-full" />
                            <span className="text-xs2 text-gray-600 dark:text-gray-300 font-medium">Visitas</span>
                        </div>
                    </div>
                </div>

                <div className="h-[280px] w-full mt-4">
                    {isMounted && (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={combinedDailyData}
                                margin={{ top: 15, right: 10, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                                    interval={0}
                                    padding={{ left: 5, right: 5 }}
                                />
                                <YAxis
                                    yAxisId="left"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                                    tickFormatter={formatCompact}
                                    width={60}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                                    width={30}
                                />
                                <Tooltip
                                    formatter={(value: number, name: string) => {
                                        if (name === 'Visitas') return [new Intl.NumberFormat('es-CO').format(value), 'Visitas'];
                                        return [formatCOP(value), name];
                                    }}
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    }}
                                    labelStyle={{ fontWeight: 600, color: '#1f2937' }}
                                />
                                <Bar
                                    yAxisId="left"
                                    dataKey="meta"
                                    name="Meta"
                                    fill="#a855f7"
                                    radius={[2, 2, 0, 0]}
                                    barSize={12}
                                    fillOpacity={0.2}
                                />
                                <Bar
                                    yAxisId="left"
                                    dataKey="real"
                                    name="Venta Real"
                                    fill="#10b981"
                                    radius={[2, 2, 0, 0]}
                                    barSize={12}
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="visits"
                                    name="Visitas"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ r: 2.5, fill: '#3b82f6', strokeWidth: 1, stroke: '#fff' }}
                                    activeDot={{ r: 4 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </Card>

            {/* ── Row 3: Cumplimiento Semanal + Mix de Pagos ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Cumplimiento Semanal — Bullet Chart */}
                <Card className="lg:col-span-2 flex flex-col p-4">
                    <div className="mb-3 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-1">
                                <h3 className="text-xs2 font-semibold uppercase tracking-caps text-gray-500 dark:text-gray-400">
                                    Cumplimiento Semanal
                                </h3>
                                <InfoTooltip
                                    title="Progreso Semanal"
                                    description="Barras de progreso de ventas reales contra la meta sumada de la semana completa. Ayuda a notar retrasos en llegar al objetivo."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 mt-2">
                        <BulletChart
                            items={weeklyData.map((w: any) => ({
                                label: w.week,
                                actual: w.real || 0,
                                target: w.meta || 0,
                                subtitle: `${w.daysWithReal || 0}/${w.days || 7} días`,
                            } as BulletChartItem))}
                            formatValue={(v) => formatCompact(v)}
                        />
                    </div>
                </Card>

                {/* Payment Mix — Barra 100% Apilada + Lista */}
                <Card className="flex flex-col p-4">
                    <h3 className="text-xs2 font-semibold uppercase tracking-caps text-gray-500 dark:text-gray-400 mb-3">
                        Mix de Pagos
                    </h3>

                    {realPaymentMethods.length > 0 ? (
                        <>
                            <div className="w-full h-6 rounded-md overflow-hidden flex" title="Distribución de métodos de pago">
                                {realPaymentMethods.map((pm, idx) => (
                                    <div
                                        key={idx}
                                        className="h-full relative group/seg transition-all duration-300 hover:opacity-80"
                                        style={{
                                            width: `${pm.percentage}%`,
                                            backgroundColor: PAYMENT_COLORS[idx % PAYMENT_COLORS.length],
                                            minWidth: pm.percentage > 0 ? '4px' : '0',
                                        }}
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs2 rounded-md whitespace-nowrap opacity-0 group-hover/seg:opacity-100 transition-opacity pointer-events-none z-20 shadow-lg">
                                            <div className="font-bold">{pm.method}</div>
                                            <div>{formatCOP(pm.amount)} · {pm.percentage.toFixed(1)}%</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center mt-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-xs2 font-medium text-gray-400">Total</span>
                                <span className="text-sm font-bold text-gray-800 dark:text-white">
                                    {formatCOP(realPaymentMethods.reduce((sum, pm) => sum + pm.amount, 0))}
                                </span>
                            </div>

                            <div className="space-y-2.5 flex-1 overflow-auto max-h-[160px] pr-2 custom-scrollbar">
                                {realPaymentMethods.map((pm, idx) => (
                                    <div key={idx} className="flex items-center gap-2 group cursor-default">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PAYMENT_COLORS[idx % PAYMENT_COLORS.length] }} />
                                        <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate">{pm.method}</span>
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 tabular-nums">{formatCOP(pm.amount)}</span>
                                        <span className="text-xs2 text-gray-400 tabular-nums w-10 text-right">{pm.percentage.toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-xs text-gray-400">Sin datos de pagos</p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Top Products Table */}
            <Card className="p-4">
                <h3 className="text-xs2 font-semibold uppercase tracking-caps text-gray-500 dark:text-gray-400 mb-3">
                    Estadísticas - Productos Más Vendidos
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className="text-left text-xs2 font-medium uppercase tracking-caps text-gray-400 px-4 py-3">Producto</th>
                                <th className="text-right text-xs2 font-medium uppercase tracking-caps text-gray-400 px-4 py-3">Cant.</th>
                                <th className="text-right text-xs2 font-medium uppercase tracking-caps text-gray-400 px-4 py-3">Ingresos</th>
                                <th className="text-right text-xs2 font-medium uppercase tracking-caps text-gray-400 px-4 py-3 w-[120px]">Participación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {MOCK_SALES_DATA.topProducts.map((prod, idx) => (
                                <tr key={idx} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 py-3.5 text-sm- font-medium text-gray-900 dark:text-gray-100">{prod.product}</td>
                                    <td className="px-4 py-3.5 text-sm- text-gray-600 dark:text-gray-300 text-right">{prod.quantity.toLocaleString()}</td>
                                    <td className="px-4 py-3.5 text-sm- text-gray-600 dark:text-gray-300 text-right">{formatCOP(prod.revenue)}</td>
                                    <td className="px-4 py-3.5 text-right">
                                        <div className="inline-flex items-center gap-2 justify-end">
                                            <div className="w-16 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${prod.share}%` }} />
                                            </div>
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 inline-block w-8 text-right">{prod.share}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

