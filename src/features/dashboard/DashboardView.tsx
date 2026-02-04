import React from 'react';
import { Transaction, Category, ArqueoRecord } from '../../types';
import { useBusinessIntelligence } from '../../hooks/useBusinessIntelligence';
import { FilterBar } from './components/FilterBar';
import { SalesEvolutionChart, DayOfWeekAnalysis, PaymentMixChart, WeeklyOverlapChart, PaymentEvolutionChart } from './components/AnalyticsCharts';
import { Card } from '../../components/ui/Card';
import { BanknotesIcon, UserIcon, UsersIcon, CalendarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '../../components/ui/Icons';
import { formatCurrency } from '../../components/ui/Input';

interface DashboardViewProps {
  projectedTransactions: Transaction[];
  realTransactions: Transaction[];
  categories: Category[];
  arqueos?: ArqueoRecord[];
}

const KPICard: React.FC<{
  label: string,
  value: string | number,
  change: number,
  icon: React.ReactNode,
  colorClass: string
}> = ({ label, value, change, icon, colorClass }) => (
  <Card className="hover:shadow-md transition-shadow duration-200 border-l-4 border-l-transparent hover:border-l-primary" noPadding={false}>
    <div className="flex justify-between items-start mb-2">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
      <div className={`p-1.5 rounded-lg ${colorClass} bg-opacity-10 text-opacity-100`}>
        {icon}
      </div>
    </div>
    <p className="text-2xl font-bold text-slate-800 dark:text-white truncate tracking-tight">{value}</p>

    {change !== 0 && (
      <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
        {change > 0 ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
        <span>{Math.abs(change).toFixed(1)}% vs anterior</span>
      </div>
    )}
  </Card>
);

const InsightCard: React.FC<{ label: string, value: string | number, subtext: string, type?: 'positive' | 'negative' | 'neutral' }> = ({ label, value, subtext, type = 'neutral' }) => {
  const colors = {
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    negative: 'bg-rose-50 text-rose-700 border-rose-100',
    neutral: 'bg-indigo-50 text-indigo-700 border-indigo-100'
  };
  return (
    <div className={`rounded-xl p-3 border ${colors[type]} flex flex-col justify-between`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">{label}</p>
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-[10px] opacity-80">{subtext}</p>
      </div>
    </div>
  )
}

const DashboardView: React.FC<DashboardViewProps> = ({
  arqueos = []
}) => {
  const { filters, setFilters, kpis, charts, rawData, advancedStats } = useBusinessIntelligence(arqueos);
  const [auditIssues, setAuditIssues] = React.useState<any[]>([]);

  React.useEffect(() => {
    import('../../services/DataAuditor').then(({ DataAuditorService }) => {
      const issues = DataAuditorService.auditArqueos(arqueos);
      if (issues.length > 0) setAuditIssues(issues.filter(i => i.severity === 'CRITICAL'));
    });
  }, [arqueos]);

  const hasData = rawData.current.length > 0;

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">

      {/* Header & Filter Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Business Intelligence</h1>
            <p className="text-slate-500 text-sm font-medium">Análisis estratégico de {filters.viewMode === 'sales' ? 'Ventas' : filters.viewMode === 'visits' ? 'Afluencia' : 'Rendimiento'}</p>
          </div>
          {auditIssues.length > 0 && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-red-100 animate-pulse">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
              {auditIssues.length} Alertas
            </div>
          )}
        </div>
        <FilterBar filters={filters} setFilters={setFilters} />
      </div>

      {!hasData ? (
        <Card className="py-20 text-center border-dashed bg-slate-50/50">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <CalendarIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">Sin datos para el periodo</h3>
          <p className="text-slate-500 text-sm mt-1">Intenta ajustando los filtros de fecha o selecciona otro año.</p>
        </Card>
      ) : (
        <>
          {/* Row 1: KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Ventas Totales"
              value={formatCurrency(kpis.totalSales.value)}
              change={kpis.totalSales.change || 0}
              icon={<BanknotesIcon className="w-5 h-5 text-indigo-600" />}
              colorClass="bg-indigo-100"
            />
            <KPICard
              label="Total Visitas"
              value={kpis.visits.value}
              change={kpis.visits.change || 0}
              icon={<UsersIcon className="w-5 h-5 text-orange-600" />}
              colorClass="bg-orange-100"
            />
            <KPICard
              label="Ticket Promedio"
              value={formatCurrency(kpis.avgPerPax.value)}
              change={kpis.avgPerPax.change || 0}
              icon={<UserIcon className="w-5 h-5 text-emerald-600" />}
              colorClass="bg-emerald-100"
            />

            {/* Advanced Stats Mini-Grid in the 4th slot */}
            <Card className="p-0 border-none shadow-none bg-transparent">
              <div className="grid grid-cols-2 gap-2 h-full">
                {advancedStats && (
                  <>
                    <InsightCard
                      label={advancedStats.best.label}
                      value={filters.viewMode === 'visits' ? advancedStats.best.value : formatCurrency(advancedStats.best.value)}
                      subtext={new Date(advancedStats.best.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                      type="positive"
                    />
                    <InsightCard
                      label={advancedStats.worst.label}
                      value={filters.viewMode === 'visits' ? advancedStats.worst.value : formatCurrency(advancedStats.worst.value)}
                      subtext={new Date(advancedStats.worst.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                      type="negative"
                    />
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Row 2: Evolution & Comparisons */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-5">
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Tendencia Principal</h3>
                  <p className="text-xs text-slate-400">Evolución temporal del periodo seleccionado</p>
                </div>
              </div>
              <SalesEvolutionChart data={charts.salesTrend} viewMode={filters.viewMode} periodMode={filters.periodMode} />
            </Card>

            <div className="flex flex-col gap-6">
              {/* Comparative Chart (Overlay) */}
              {(filters.viewMode === 'visits' || filters.viewMode === 'all') && (
                <Card className="p-5 flex-1">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-800">
                      {charts.comparativeAnalysis.type === 'monthly' ? 'Patrón Mensual' : 'Patrón Semanal'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {charts.comparativeAnalysis.type === 'monthly'
                        ? 'Comparativa mes a mes (Eje X: Día 1-31)'
                        : 'Comparativa semana a semana (Eje X: Lun-Dom)'}
                    </p>
                  </div>
                  <WeeklyOverlapChart data={charts.comparativeAnalysis.data} keys={charts.comparativeAnalysis.keys} />
                </Card>
              )}
            </div>
          </div>

          {/* Row 3: Insights Deep Dive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Analysis */}
            {filters.viewMode !== 'visits' && (
              <Card className="p-5">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-800">Análisis de Pagos</h3>
                  <p className="text-xs text-slate-400">Distribución y evolución de métodos de pago</p>
                </div>
                {/* Toggle or just stacked layout? Let's show Evolution as it is more "Insightful" than just Pie */}
                <div className="space-y-8">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Evolución en el tiempo</h4>
                    <PaymentEvolutionChart data={charts.paymentEvolution} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Distribución Total</h4>
                    <PaymentMixChart data={charts.paymentMix} />
                  </div>
                </div>
              </Card>
            )}

            {/* Day of Week Analysis */}
            <Card className="p-5">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800">Mapa de Calor Semanal</h3>
                <p className="text-xs text-slate-400">Identifica los días de mayor rendimiento promedio</p>
              </div>
              <DayOfWeekAnalysis data={charts.dayOfWeekAnalysis} viewMode={filters.viewMode} />
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardView;
