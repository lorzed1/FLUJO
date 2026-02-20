import React, { useMemo } from 'react';
import { useExpenseProjections } from '../hooks/useExpenseProjections';
import { format, getISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatMoney } from '../../../utils/formatters';
import { SmartDataTable, Column } from '../../../components/ui/SmartDataTable';

// Definición de tipos para la fila de datatable
interface EquilibriumRow {
    id: string; // date string yyyy-MM-dd
    date: Date;
    weekNumber: number;
    dayName: string;
    monthlyGoal: number;
    weeklyGoal: number; // Base de cálculo (Semana Siguiente)
    dailyGoal: number; // Proyección Diaria
    realSale: number;
    difference: number;
    status: 'cumplido' | 'pendiente' | 'no_cumplido';
}

interface EquilibriumDatabasePageProps {
    currentDate: Date; // Fecha seleccionada en el contexto global (mes)
    realSales: Record<string, number>; // Ventas reales pasadas desde el padre o contexto
}

export const EquilibriumDatabasePage: React.FC<EquilibriumDatabasePageProps> = ({
    currentDate,
    realSales
}) => {
    const {
        projections: expenseProjections, // Array diario plano
        weeks: expenseWeeks,
        totalMonthlyExpenses
    } = useExpenseProjections(currentDate);

    // 1. Transformar datos a estructura plana (Rows)
    const rawRows = useMemo(() => {
        const rows: EquilibriumRow[] = [];

        // Mapear días a filas
        expenseProjections.forEach(dayProj => {
            const dateStr = format(dayProj.date, 'yyyy-MM-dd');
            const real = realSales[dateStr] || 0;
            const diff = real - dayProj.amount;

            let status: EquilibriumRow['status'] = 'pendiente';
            if (real > 0) {
                status = real >= dayProj.amount ? 'cumplido' : 'no_cumplido';
            } else if (dayProj.date < new Date() && !format(dayProj.date, 'yyyy-MM-dd').includes(format(new Date(), 'yyyy-MM-dd'))) {
                status = 'no_cumplido';
            }

            const relatedWeek = expenseWeeks.find(w =>
                dayProj.date >= w.startDate && dayProj.date <= w.endDate
            );

            rows.push({
                id: dateStr,
                date: dayProj.date,
                weekNumber: getISOWeek(dayProj.date),
                dayName: format(dayProj.date, 'EEEE', { locale: es }),
                monthlyGoal: totalMonthlyExpenses,
                weeklyGoal: relatedWeek?.baseExpenses || 0,
                dailyGoal: dayProj.amount,
                realSale: real,
                difference: diff,
                status
            });
        });

        return rows;
    }, [expenseProjections, expenseWeeks, totalMonthlyExpenses, realSales]);

    // 2. Definir Columnas
    const columns: Column<EquilibriumRow>[] = useMemo(() => [
        {
            key: 'date',
            label: 'Fecha',
            sortable: true,
            filterable: true,
            render: (value: Date) => (
                <span className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {format(value, 'dd MMM yyyy', { locale: es })}
                </span>
            )
        },
        {
            key: 'weekNumber',
            label: 'Semana',
            sortable: true,
            render: (value: number) => (
                <span className="text-gray-600 dark:text-gray-400">
                    Semana {value}
                </span>
            )
        },
        {
            key: 'dayName',
            label: 'Día',
            sortable: true,
            render: (value: string) => (
                <span className="capitalize text-gray-600 dark:text-gray-400">
                    {value}
                </span>
            )
        },
        {
            key: 'dailyGoal',
            label: 'Proyección',
            sortable: true,
            align: 'text-right',
            render: (value: number) => (
                <span className="font-mono font-medium text-purple-600 dark:text-purple-400 tabular-nums">
                    {formatMoney(value)}
                </span>
            )
        },
        {
            key: 'realSale',
            label: 'Real',
            sortable: true,
            align: 'text-right',
            render: (value: number) => (
                <span className="font-mono font-bold text-gray-900 dark:text-white tabular-nums">
                    {value > 0 ? formatMoney(value) : <span className="text-gray-300">-</span>}
                </span>
            )
        },
        {
            key: 'difference',
            label: 'Diferencia',
            sortable: true,
            align: 'text-right',
            render: (value: number) => (
                <span className={`font-mono font-medium tabular-nums ${value > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                    value < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'
                    }`}>
                    {value > 0 ? '+' : ''}{formatMoney(value)}
                </span>
            )
        },
        {
            key: 'status',
            label: 'Estado',
            sortable: true,
            align: 'text-center',
            render: (value: string) => {
                const config = {
                    cumplido: { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-100 dark:border-emerald-800', dot: 'bg-emerald-500' },
                    pendiente: { color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-slate-700', border: 'border-gray-200 dark:border-slate-600', dot: 'bg-gray-400' },
                    no_cumplido: { color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-900/30', border: 'border-rose-100 dark:border-rose-800', dot: 'bg-rose-500' }
                };
                // @ts-ignore
                const style = config[value] || config.pendiente;

                return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${style.bg} ${style.color} ${style.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                        {value.replace('_', ' ')}
                    </span>
                );
            }
        }
    ], []);

    return (
        <div className="flex flex-col w-full h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Main Card (Grows with content) */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col">
                    <div className="p-4">
                        <SmartDataTable
                            id="equilibrium-table"
                            data={rawRows}
                            columns={columns}
                            enableColumnConfig={true}
                            enableExport={true}
                            enableSelection={true}
                            searchPlaceholder="Buscar por fecha, día, estado..."
                            containerClassName=""
                            exportDateField="date"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
