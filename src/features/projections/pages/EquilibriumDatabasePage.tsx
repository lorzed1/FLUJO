import React, { useMemo } from 'react';
import { SmartDataTable, Column } from '../../../components/ui/SmartDataTable';
import { useExpenseProjections } from '../hooks/useExpenseProjections';
import { format, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatMoney, formatPercent } from '../../../utils/formatters';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ChartBarIcon, QuestionMarkCircleIcon } from '../../../components/ui/Icons';
import { DateNavigator } from '../../../components/ui/DateNavigator';

// Definición de tipos para la fila de la tabla PE (Semanal)
interface EquilibriumRow {
    id: string; // ISO Week identifier (e.g. "2026-W08")
    weekNumber: number;
    dateRange: string; // "DD MMM - DD MMM"
    currentWeekExpenses: number; // Gastos que ocurren esta semana
    nextWeekGoal: number; // Gastos de la semana SIGUIENTE (lo que esta semana DEBE recaudar)
    realSales: number; // Venta Bruta lograda esta semana
    difference: number; // Brecha vs nextWeekGoal (Venta Real - Meta PE)
    compliance: number; // % de cobertura de la meta PE
    status: 'covered' | 'at_risk' | 'pending';
}

interface EquilibriumDatabasePageProps {
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    setIsHelpOpen: (open: boolean) => void;
    setIsConfigOpen: (open: boolean) => void;
    realSales: Record<string, number>;
}

export const EquilibriumDatabasePage: React.FC<EquilibriumDatabasePageProps> = ({
    currentDate,
    setCurrentDate,
    setIsHelpOpen,
    setIsConfigOpen,
    realSales
}) => {
    // Extraemos los gastos proyectados del hook financiero
    const {
        weeks: expenseWeeks,
    } = useExpenseProjections(currentDate);

    // 1. Procesar datos para la tabla semanal
    const data: EquilibriumRow[] = useMemo(() => {
        if (!expenseWeeks || expenseWeeks.length === 0) return [];

        return expenseWeeks.map(week => {
            const start = week.startDate;
            const end = week.endDate;
            const weekNum = week.weekNumber;

            // Sumar ventas reales dentro de esta semana
            const daysInWeek = eachDayOfInterval({ start, end });
            const weekRealSales = daysInWeek.reduce((sum, day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                return sum + (realSales[dateKey] || 0);
            }, 0);

            // GASTOS DE ESTA SEMANA: Compromisos reales que vencen en este rango de fechas
            const currentWeekExpenses = week.expensesToCover;

            // META PE (GASTOS DE LA SEMANA SIGUIENTE): Lo que esta semana debe recaudar para la que viene
            const nextWeekGoal = week.baseExpenses;

            const diff = weekRealSales - nextWeekGoal;
            const compliance = nextWeekGoal > 0 ? (weekRealSales / nextWeekGoal) * 100 : 0;

            let status: EquilibriumRow['status'] = 'pending';
            if (weekRealSales > 0) {
                status = weekRealSales >= nextWeekGoal ? 'covered' : 'at_risk';
            }

            return {
                id: `${format(start, 'yyyy')}-W${weekNum}`,
                weekNumber: weekNum,
                dateRange: `${format(start, 'dd MMM', { locale: es })} - ${format(end, 'dd MMM', { locale: es })}`,
                currentWeekExpenses,
                nextWeekGoal,
                realSales: weekRealSales,
                difference: diff,
                compliance,
                status
            };
        });
    }, [expenseWeeks, realSales]);

    // 2. Definir Columnas
    const columns: Column<EquilibriumRow>[] = useMemo(() => [
        {
            key: 'weekNumber',
            label: 'Semana',
            sortable: true,
            width: 'w-24',
            render: (value: number) => (
                <span>
                    Semana {value}
                </span>
            )
        },
        {
            key: 'dateRange',
            label: 'Periodo',
            align: 'text-left',
            render: (value: string) => (
                <span className="block">
                    {value}
                </span>
            )
        },
        {
            key: 'currentWeekExpenses',
            label: 'Gastos esta Semana',
            tooltip: 'Compromisos que deben pagarse en este rango de fechas',
            sortable: true,
            align: 'text-right',
            render: (value: number) => (
                <span className="tabular-nums">
                    {formatMoney(value)}
                </span>
            )
        },
        {
            key: 'nextWeekGoal',
            label: 'Meta PE (Gastos Sem+1)',
            tooltip: 'Lo que se DEBE vender para cubrir los gastos de la próxima semana',
            sortable: true,
            align: 'text-right',
            render: (value: number) => (
                <span className="tabular-nums text-purple-700 dark:text-purple-400">
                    {formatMoney(value)}
                </span>
            )
        },
        {
            key: 'realSales',
            label: 'Ventas Logradas',
            tooltip: 'Acumulado de venta bruta real (Historial de Arqueos)',
            sortable: true,
            align: 'text-right',
            render: (value: number) => (
                <span className="tabular-nums">
                    {value > 0 ? formatMoney(value) : <span className="text-gray-400 dark:text-gray-500 font-normal">-</span>}
                </span>
            )
        },
        {
            key: 'difference',
            label: 'Brecha Meta',
            sortable: true,
            align: 'text-right',
            render: (value: number) => (
                <span className={`tabular-nums ${value >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {value >= 0 ? '+' : ''}{formatMoney(value)}
                </span>
            )
        },
        {
            key: 'compliance',
            label: 'Cobertura',
            sortable: true,
            align: 'text-center',
            render: (value: number) => (
                <div className="flex flex-col gap-1 items-center min-w-[70px]">
                    <span className={`font-semibold text-[11px] ${value >= 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {formatPercent(value)}
                    </span>
                    <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all ${value >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(value, 100)}%` }}
                        />
                    </div>
                </div>
            )
        },
        {
            key: 'status',
            label: 'Estado',
            align: 'text-center',
            render: (value: string) => {
                const statusMap: Record<string, { variant: 'success' | 'warning' | 'neutral'; label: string }> = {
                    covered: { variant: 'success', label: 'SALDADO' },
                    at_risk: { variant: 'warning', label: 'PENDIENTE' },
                    pending: { variant: 'neutral', label: 'SIN VENTA' }
                };
                const s = statusMap[value] || statusMap.pending;
                return <StatusBadge variant={s.variant} label={s.label} />;
            }
        }
    ], []);

    return (
        <div className="flex flex-col space-y-6">
            <PageHeader
                title="Punto de Equilibrio (PE)"
                breadcrumbs={[
                    { label: 'Proyeccion de ventas', path: '/projections' },
                    { label: 'Análisis PE (Semanal)' }
                ]}
                icon={<ChartBarIcon className="h-6 w-6" />}
                actions={
                    <div className="flex flex-wrap items-center gap-2 h-10">
                        {/* Selector de Mes – Aliaddo §4 Z2 */}
                        <DateNavigator
                            value={currentDate}
                            onChange={setCurrentDate}
                        />

                        {/* Config Button */}
                        <button
                            onClick={() => setIsConfigOpen(true)}
                            className="h-full flex items-center gap-2 px-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md hover:bg-slate-50 hover:text-purple-600 text-[13px] font-semibold text-slate-600 dark:text-slate-300 transition-all shadow-sm active:scale-95"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            Configurar
                        </button>
                    </div>
                }
            />

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                <SmartDataTable
                    id="equilibrium-table"
                    data={data}
                    columns={columns}
                    enableColumnConfig={true}
                    enableExport={true}
                    enableSelection={true}
                    onInfoClick={() => setIsHelpOpen(true)}
                    searchPlaceholder="Buscar semana..."
                    containerClassName="border-none shadow-none"
                />
            </div>
        </div>
    );
};
