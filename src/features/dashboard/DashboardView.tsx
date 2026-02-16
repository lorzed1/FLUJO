import React from 'react';
import { Transaction, Category, ArqueoRecord } from '../../types';
import { useBusinessIntelligence } from '../../hooks/useBusinessIntelligence';

import {
  DailySalesChart,
  WeeklySalesChart,
  DayOfWeekByWeekChart,
  MonthlyYearOverYearChart,
  PaymentMixPieChart,
  AvgByDayOfWeekChart,
  MonthlySummaryChart
} from './components/NewCharts';
import { Card } from '../../components/ui/Card';
import {
  BanknotesIcon,
  UserIcon,
  UsersIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PresentationChartLineIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '../../components/ui/Icons';
import { PageHeader } from '../../components/layout/PageHeader';
import { formatCurrency } from '../../components/ui/Input';

interface DashboardViewProps {
  projectedTransactions: Transaction[];
  realTransactions: Transaction[];
  categories: Category[];
  arqueos?: ArqueoRecord[];
}

interface KPICardProps {
  label: string;
  value: string | number;
  vsLastMonth?: number;
  vsLastYear?: number;
  icon: React.ReactNode;
  colorClass: string;
  compact?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, vsLastMonth, vsLastYear, icon, colorClass, compact = false }) => {
  return (
    <Card className="hover:shadow-md transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 relative overflow-hidden group bg-white dark:bg-slate-800" noPadding={false}>
      {/* Background decoration - más sutil */}
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br from-slate-50 to-transparent dark:from-slate-700/10 rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            {/* Label más legible */}
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
            {/* Valor principal - reducido de font-black a font-bold */}
            <p className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-slate-900 dark:text-slate-100 truncate`}>{value}</p>
          </div>
          {/* Icono más sutil */}
          <div className={`p-2.5 rounded-lg ${colorClass} bg-opacity-10 shadow-sm`}>
            {icon}
          </div>
        </div>

        {(vsLastMonth !== undefined || vsLastYear !== undefined) && (
          <div className="flex gap-2 text-xs">
            {vsLastMonth !== undefined && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium ${vsLastMonth >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                {vsLastMonth >= 0 ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />}
                <span>{Math.abs(vsLastMonth).toFixed(1)}% vs mes ant.</span>
              </div>
            )}
            {vsLastYear !== undefined && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium ${vsLastYear >= 0 ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'}`}>
                <span>{Math.abs(vsLastYear).toFixed(1)}% vs año ant.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

interface MiniStatCardProps {
  label: string;
  value: string;
  date?: string;
  type: 'success' | 'warning' | 'info';
}

const MiniStatCard: React.FC<MiniStatCardProps> = ({ label, value, date, type }) => {
  const colors = {
    success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    warning: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    info: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
  };

  return (
    <div className={`rounded-lg p-3 border ${colors[type]} transition-transform hover:scale-105 hover:shadow-sm`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 opacity-90">{label}</p>
      <p className="text-lg font-bold leading-tight">{value}</p>
      {date && <p className="text-[10px] mt-1.5 font-medium opacity-75">{new Date(date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
    </div>
  );
};

interface ComparisonStatCardProps {
  label: string;
  bestValue: string;
  bestDate?: string;
  worstValue: string;
  worstDate?: string;
}

const ComparisonStatCard: React.FC<ComparisonStatCardProps> = ({ label, bestValue, bestDate, worstValue, worstDate }) => {
  return (
    <div className="rounded-lg p-3 border bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700 transition-transform hover:scale-105 hover:shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide mb-2.5 text-slate-600 dark:text-slate-400">{label}</p>
      <div className="space-y-2.5">
        <div>
          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">↑ Mejor</p>
          <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">{bestValue}</p>
          {bestDate && <p className="text-[9px] opacity-70 mt-0.5 font-medium">{new Date(bestDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</p>}
        </div>
        <div className="border-t border-slate-300 dark:border-slate-600 pt-2.5">
          <p className="text-[9px] text-rose-600 dark:text-rose-400 font-semibold mb-0.5">↓ Peor</p>
          <p className="text-base font-bold text-rose-700 dark:text-rose-400">{worstValue}</p>
          {worstDate && <p className="text-[9px] opacity-70 mt-0.5 font-medium">{new Date(worstDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</p>}
        </div>
      </div>
    </div>
  );
};

interface MiniChartCardProps {
  label: string;
  data: Array<{ dayName: string; avgSales: number }>;
}

const MiniChartCard: React.FC<MiniChartCardProps> = ({ label, data }) => {
  const maxValue = Math.max(...data.map(d => d.avgSales || 0));

  return (
    <div className="rounded-xl p-3 border-2 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 transition-transform hover:scale-105 col-span-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-3">{label}</p>
      <div className="flex items-end justify-between gap-1 h-20">
        {data.map((item, idx) => {
          const value = item.avgSales || 0;
          const heightPx = maxValue > 0 ? Math.max((value / maxValue) * 60, value > 0 ? 4 : 0) : 0;

          return (
            <div key={idx} className="flex flex-col items-center flex-1 group">
              <div className="relative w-full flex items-end" style={{ height: '60px' }}>
                {value > 0 ? (
                  <div
                    className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 dark:from-indigo-500 dark:to-indigo-300 rounded-t transition-all hover:from-indigo-500 hover:to-indigo-300"
                    style={{ height: `${heightPx}px` }}
                  />
                ) : (
                  <div className="w-full h-1 bg-slate-300 dark:bg-slate-600 rounded opacity-30" />
                )}
              </div>
              <p className="text-[7px] font-semibold text-slate-600 dark:text-slate-400 mt-1 text-center leading-tight">
                {item.dayName.substring(0, 3)}
              </p>
              <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 dark:bg-slate-700 text-white text-[9px] px-2 py-1 rounded mt-16 pointer-events-none z-10 whitespace-nowrap">
                {formatCurrency(value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DashboardView: React.FC<DashboardViewProps> = ({ arqueos = [] }) => {
  const { filters, setFilters, extendedKPIs, charts, rawData } = useBusinessIntelligence(arqueos);
  const [viewMode, setViewMode] = React.useState<'sales' | 'visits' | 'combined'>('sales');

  const hasData = rawData.current.length > 0;

  // Extraer semanas únicas para el gráfico de comparación
  const weekKeys = React.useMemo(() => {
    if (!charts.dayOfWeekByWeek || charts.dayOfWeekByWeek.length === 0) return [];
    const firstRow = charts.dayOfWeekByWeek[0];
    return Object.keys(firstRow).filter(k => k.startsWith('Semana'));
  }, [charts.dayOfWeekByWeek]);

  return (
    <div className="space-y-6 p-6 pb-12 animate-in fade-in duration-500 bg-slate-50/50 dark:bg-slate-900 min-h-screen">
      {/* Header */}
      <PageHeader
        title="Business Intelligence"
        breadcrumbs={[
          { label: 'Control', path: '/dashboard' },
          { label: 'BI Dashboard' }
        ]}
        icon={<PresentationChartLineIcon className="h-6 w-6" />}
      />

      {/* Control Compacto de Mes/Año */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Período:</span>
          <span className="text-base font-bold text-slate-800 dark:text-slate-200">
            {filters.selectedDate.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Navegación */}
          <button
            onClick={() => {
              const newDate = new Date(filters.selectedDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setFilters({ ...filters, selectedDate: newDate });
            }}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            title="Mes anterior"
          >
            <ChevronLeftIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>

          <button
            onClick={() => {
              const newDate = new Date(filters.selectedDate);
              newDate.setMonth(newDate.getMonth() + 1);
              setFilters({ ...filters, selectedDate: newDate });
            }}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            title="Mes siguiente"
          >
            <ChevronRightIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>

          <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>

          {/* Selector de Año */}
          <select
            value={filters.selectedDate.getFullYear()}
            onChange={(e) => {
              const newDate = new Date(filters.selectedDate);
              newDate.setFullYear(parseInt(e.target.value));
              setFilters({ ...filters, selectedDate: newDate });
            }}
            className="px-2 py-1 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>

          {/* Botón Hoy */}
          <button
            onClick={() => {
              setFilters({ ...filters, selectedDate: new Date() });
            }}
            className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded transition-colors"
          >
            Hoy
          </button>
        </div>
      </div>


      {!hasData ? (
        <Card className="py-20 text-center border-dashed bg-white/50 dark:bg-slate-800/50">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 mb-4">
            <CalendarIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Sin datos para el periodo</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Intenta ajustando los filtros de fecha o selecciona otro periodo.</p>
        </Card>
      ) : (
        <>
          {/* ========== ZONA DE KPIS ========== */}
          <div>
            <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">📊 Indicadores Clave</h2>

            {/* Row 1: KPIs Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <KPICard
                label="Ventas del Mes"
                value={formatCurrency(extendedKPIs.totalSales.value)}
                vsLastMonth={extendedKPIs.totalSales.vsLastMonth}
                vsLastYear={extendedKPIs.totalSales.vsLastYear}
                icon={<BanknotesIcon className="w-6 h-6 text-indigo-600" />}
                colorClass="bg-indigo-100 dark:bg-indigo-900"
              />
              <KPICard
                label="Ticket Promedio"
                value={formatCurrency(extendedKPIs.avgTicket.value)}
                vsLastMonth={extendedKPIs.avgTicket.vsLastMonth}
                icon={<UserIcon className="w-6 h-6 text-emerald-600" />}
                colorClass="bg-emerald-100 dark:bg-emerald-900"
              />
              <KPICard
                label="Visitas Totales"
                value={extendedKPIs.totalVisits}
                icon={<UsersIcon className="w-6 h-6 text-orange-600" />}
                colorClass="bg-orange-100 dark:bg-orange-900"
              />
              <KPICard
                label="Ventas Domicilios (Rappi)"
                value={formatCurrency(extendedKPIs.rappiSales)}
                icon={<ArrowsRightLeftIcon className="w-6 h-6 text-purple-600" />}
                colorClass="bg-purple-100 dark:bg-purple-900"
              />
            </div>

            {/* Row 2: Mini Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ComparisonStatCard
                label="Ventas del Día"
                bestValue={formatCurrency(extendedKPIs.bestSale.value)}
                bestDate={extendedKPIs.bestSale.date}
                worstValue={formatCurrency(extendedKPIs.worstSale.value)}
                worstDate={extendedKPIs.worstSale.date}
              />
              <ComparisonStatCard
                label="Ticket del Día"
                bestValue={formatCurrency(extendedKPIs.bestTicket.value)}
                bestDate={extendedKPIs.bestTicket.date}
                worstValue={formatCurrency(extendedKPIs.worstTicket.value)}
                worstDate={extendedKPIs.worstTicket.date}
              />
            </div>
          </div>

          {/* ========== ZONA DE GRÁFICAS DE VENTAS ========== */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">📈 Análisis de Ventas y Visitas</h2>

              {/* View Mode Selector */}
              <div className="flex gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => setViewMode('sales')}
                  className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${viewMode === 'sales' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  Ventas
                </button>
                <button
                  onClick={() => setViewMode('visits')}
                  className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${viewMode === 'visits' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  Visitas
                </button>
                <button
                  onClick={() => setViewMode('combined')}
                  className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${viewMode === 'combined' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  Combinado
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ventas Diarias del Mes */}
              {filters.periodMode === 'month' && (
                <Card className="p-5">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <ChartBarIcon className="w-5 h-5 text-indigo-600" />
                      Ventas Diarias del Mes
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Evolución día a día (1-31)</p>
                  </div>
                  <DailySalesChart data={charts.dailySales} viewMode={viewMode} />
                </Card>
              )}

              {/* Ventas por Semana */}
              {filters.periodMode === 'month' && charts.weeklySales.length > 0 && (
                <Card className="p-5">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-amber-600" />
                      Ventas por Semana
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Total acumulado por semana del mes</p>
                  </div>
                  <WeeklySalesChart data={charts.weeklySales} viewMode={viewMode} />
                </Card>
              )}

              {/* Día de Semana por Semana */}
              {filters.periodMode === 'month' && weekKeys.length > 0 && (
                <Card className="p-5 lg:col-span-2">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">Comparación Semanal por Día</h3>
                    <p className="text-xs text-slate-400 mt-1">Lunes de semana 1 vs Lunes de semana 2, etc.</p>
                  </div>
                  <DayOfWeekByWeekChart data={charts.dayOfWeekByWeek} weeks={weekKeys} viewMode={viewMode} />
                </Card>
              )}

              {/* Resumen Mensual Año sobre Año */}
              {filters.periodMode === 'year' && (
                <Card className="p-5 lg:col-span-2">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">Resumen Anual vs Año Anterior</h3>
                    <p className="text-xs text-slate-400 mt-1">Comparación mes a mes</p>
                  </div>
                  <MonthlyYearOverYearChart data={charts.monthlyYearOverYear} viewMode={viewMode} />
                </Card>
              )}

              {/* Promedio por Día de Semana (Ventas y/o Visitas) */}
              <Card className="p-5">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-purple-600" />
                    Promedio por Día de Semana
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {viewMode === 'sales' && 'Ventas promedio según el día de la semana'}
                    {viewMode === 'visits' && 'Visitas promedio según el día de la semana'}
                    {viewMode === 'combined' && 'Ventas y visitas promedio según el día de la semana'}
                  </p>
                </div>
                <AvgByDayOfWeekChart data={charts.avgSalesByDayOfWeek} viewMode={viewMode} />
              </Card>

              {/* Resumen Anual (todos los meses del año) */}
              <Card className="p-5">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-indigo-600" />
                    Resumen Anual {filters.selectedDate.getFullYear()}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {viewMode === 'sales' && 'Ventas totales por mes del año'}
                    {viewMode === 'visits' && 'Visitas totales por mes del año'}
                    {viewMode === 'combined' && 'Ventas y visitas totales por mes del año'}
                  </p>
                </div>
                <MonthlySummaryChart data={charts.monthlySummary} viewMode={viewMode} />
              </Card>
            </div>
          </div>

          {/* ========== ZONA DE GRÁFICAS DE INGRESOS ========== */}
          <div>
            <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">💰 Análisis de Ingresos</h2>

            <Card className="p-6">
              <div className="mb-6">
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Distribución por Medio de Pago</h3>
                <p className="text-xs text-slate-400 mt-1">Porcentaje de ingresos según método de pago</p>
              </div>
              <PaymentMixPieChart data={charts.paymentMix} />
            </Card>
          </div>

          {/* ========== ZONA DE ANÁLISIS PERSONALIZADO ========== */}
          <div>
            <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">🔍 Análisis Personalizado</h2>

            <Card className="p-6">
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
                  <PresentationChartLineIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">Próximamente</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Aquí podrás aplicar filtros personalizados para comparaciones específicas: mejor día del año,
                  promedios por día de semana, comparaciones entre periodos personalizados y mucho más.
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardView;
