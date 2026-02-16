import React from 'react';
import { Transaction, Category, ArqueoRecord } from '../../types';
import { useBusinessIntelligence } from '../../hooks/useBusinessIntelligence';
import { PageHeader } from '../../components/layout/PageHeader';
import { PresentationChartLineIcon, CalendarIcon } from '../../components/ui/Icons';
import { Card } from '../../components/ui/Card';

// Componentes Modularizados
import { DashboardControls } from './components/DashboardControls';
import { KPISection } from './components/KPISection';
import { SalesAnalyticsSection } from './components/SalesAnalyticsSection';
import { IncomeAnalysisSection } from './components/IncomeAnalysisSection';

import { useArqueos } from '../../context/ArqueoContext';

const DashboardView: React.FC = () => {
  const { arqueos } = useArqueos();
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

      {/* Controles de Período */}
      <DashboardControls
        selectedDate={filters.selectedDate}
        onDateChange={(date) => setFilters({ ...filters, selectedDate: date })}
      />

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
          {/* Indicadores Clave */}
          <KPISection extendedKPIs={extendedKPIs} />

          {/* Gráficos de Ventas y Visitas */}
          <SalesAnalyticsSection
            charts={charts}
            filters={filters}
            weekKeys={weekKeys}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Análisis de Ingresos */}
          <IncomeAnalysisSection paymentMixData={charts.paymentMix} />

          {/* Placeholder Análisis Personalizado */}
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
