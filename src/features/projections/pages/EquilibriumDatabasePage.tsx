import React, { useState, useMemo } from 'react';
import { useExpenseProjections } from '../hooks/useExpenseProjections';
import { format, parseISO, isSameMonth, getISOWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    MagnifyingGlassIcon,
    ArrowDownTrayIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';
import { formatMoney } from '../../../utils/formatters';
import { utils, writeFile } from 'xlsx';

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

    // Estado de la Tabla
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<keyof EquilibriumRow>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

    // 2. Filtrar y Ordenar
    const processedRows = useMemo(() => {
        let result = [...rawRows];

        // Filtro Buscador
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(row =>
                row.dayName.toLowerCase().includes(lowerTerm) ||
                row.status.includes(lowerTerm) ||
                format(row.date, 'dd/MM/yyyy').includes(lowerTerm) ||
                row.weeklyGoal.toString().includes(lowerTerm) ||
                row.dailyGoal.toString().includes(lowerTerm)
            );
        }

        // Ordenamiento
        result.sort((a, b) => {
            const aValue = a[sortField];
            const bValue = b[sortField];

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [rawRows, searchTerm, sortField, sortDirection]);

    // Handlers
    const handleSort = (field: keyof EquilibriumRow) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleExportExcel = () => {
        const ws = utils.json_to_sheet(processedRows.map(row => ({
            Fecha: format(row.date, 'yyyy-MM-dd'),
            Semana: row.weekNumber,
            Día: row.dayName,
            'Meta Mensual': row.monthlyGoal,
            'Meta Semanal (Base)': row.weeklyGoal,
            'Proyección Diaria': row.dailyGoal,
            'Venta Real': row.realSale,
            'Diferencia': row.difference,
            'Estado': row.status
        })));
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "ProyeccionEquilibrio");
        writeFile(wb, `Proyeccion_Equilibrio_${format(currentDate, 'MMM_yyyy')}.xlsx`);
    };

    // Render Helpers
    const SortIcon = ({ field }: { field: keyof EquilibriumRow }) => {
        if (sortField !== field) return <div className="w-4 h-4" />;
        return sortDirection === 'asc'
            ? <ChevronUpIcon className="w-4 h-4 text-indigo-600" />
            : <ChevronDownIcon className="w-4 h-4 text-indigo-600" />;
    };

    // Checkbox State (Mock, ya que no hay acciones masivas aún, pero el estándar lo pide visualmente)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(processedRows.map(r => r.id)));
        } else {
            setSelectedIds(new Set());
        }
    };
    const handleSelectRow = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    return (
        <div className="flex flex-col h-full p-4 sm:p-6 bg-white dark:bg-slate-900 space-y-4">

            {/* 1. Header & Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">BD Proyección Equilibrio</h1>
                    <p className="text-xs text-gray-500 mt-1">Base de datos detallada de cálculo de punto de equilibrio</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Search Input */}
                    <div className="relative group w-full sm:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por fecha, día, estado..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl leading-5 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm transition-all shadow-sm"
                        />
                    </div>

                    {/* Actions */}
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Exportar</span>
                    </button>
                    {/* Filtro Dropdown (Placeholder visual standard) */}
                    <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-indigo-100">
                        <FunnelIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* 2. Table Container */}
            <div className="flex-1 overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col relative">
                <div className="overflow-auto custom-scrollbar flex-1 relative">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest font-black bg-gray-50/90 dark:bg-slate-900/90 sticky top-0 z-10 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 shadow-sm">
                            <tr>
                                <th scope="col" className="px-4 py-4 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                                        checked={processedRows.length > 0 && selectedIds.size === processedRows.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th onClick={() => handleSort('date')} className="px-6 py-4 cursor-pointer hover:text-indigo-600 hover:bg-gray-100/50 transition-colors select-none group">
                                    <div className="flex items-center gap-2">
                                        Fecha
                                        <SortIcon field="date" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('weekNumber')} className="px-6 py-4 cursor-pointer hover:text-indigo-600 hover:bg-gray-100/50 transition-colors select-none group">
                                    <div className="flex items-center gap-2">
                                        Semana
                                        <SortIcon field="weekNumber" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('dayName')} className="px-6 py-4 cursor-pointer hover:text-indigo-600 hover:bg-gray-100/50 transition-colors select-none group">
                                    <div className="flex items-center gap-2">
                                        Día
                                        <SortIcon field="dayName" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('dailyGoal')} className="px-6 py-4 text-right cursor-pointer hover:text-indigo-600 hover:bg-gray-100/50 transition-colors select-none group">
                                    <div className="flex items-center justify-end gap-2">
                                        Proyección
                                        <SortIcon field="dailyGoal" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('realSale')} className="px-6 py-4 text-right cursor-pointer hover:text-indigo-600 hover:bg-gray-100/50 transition-colors select-none group">
                                    <div className="flex items-center justify-end gap-2">
                                        Venta Real
                                        <SortIcon field="realSale" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('difference')} className="px-6 py-4 text-right cursor-pointer hover:text-indigo-600 hover:bg-gray-100/50 transition-colors select-none group">
                                    <div className="flex items-center justify-end gap-2">
                                        Diferencia
                                        <SortIcon field="difference" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('status')} className="px-6 py-4 text-center cursor-pointer hover:text-indigo-600 hover:bg-gray-100/50 transition-colors select-none group">
                                    <div className="flex items-center justify-center gap-2">
                                        Estado
                                        <SortIcon field="status" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                            {processedRows.length > 0 ? (
                                processedRows.map((row) => {
                                    const isSelected = selectedIds.has(row.id);
                                    return (
                                        <tr
                                            key={row.id}
                                            className={`
                                                group transition-all duration-200
                                                ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-indigo-50/30 dark:hover:bg-blue-900/10'}
                                                ${!isSelected && 'even:bg-gray-50/50 dark:even:bg-slate-900/30'} 
                                            `}
                                        >
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer opacity-0 group-hover:opacity-100 checked:opacity-100 focus:opacity-100"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectRow(row.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                                {format(row.date, 'dd MMM yyyy', { locale: es })}
                                            </td>
                                            <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                                                Semana {row.weekNumber}
                                            </td>
                                            <td className="px-6 py-3 text-gray-600 dark:text-gray-300 capitalize">
                                                {row.dayName}
                                            </td>
                                            <td className="px-6 py-3 text-right font-mono font-medium text-indigo-600 dark:text-indigo-400 tabular-nums">
                                                {formatMoney(row.dailyGoal)}
                                            </td>
                                            <td className="px-6 py-3 text-right font-mono font-bold text-gray-900 dark:text-white tabular-nums">
                                                {row.realSale > 0 ? formatMoney(row.realSale) : <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className={`px-6 py-3 text-right font-mono font-medium tabular-nums ${row.difference > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                                                row.difference < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'
                                                }`}>
                                                {row.difference > 0 ? '+' : ''}{formatMoney(row.difference)}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${row.status === 'cumplido' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800' :
                                                    row.status === 'pendiente' ? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-700 dark:text-gray-400 dark:border-slate-600' :
                                                        'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800'
                                                    }`}>
                                                    {row.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-full">
                                                <MagnifyingGlassIcon className="h-8 w-8 text-gray-300 dark:text-slate-600" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">No se encontraron registros</p>
                                                <p className="text-xs text-gray-500 mt-1">Intenta ajustar tu búsqueda o filtros.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Standard */}
                <div className="border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 p-4 flex justify-between items-center text-xs text-gray-500 font-medium">
                    <div className="flex items-center gap-2">
                        <span>Mostrando <span className="font-bold text-gray-800 dark:text-white">{processedRows.length}</span> registros</span>
                        {selectedIds.size > 0 && (
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md dark:bg-indigo-900/50 dark:text-indigo-300">
                                {selectedIds.size} seleccionados
                            </span>
                        )}
                    </div>
                    {/* Placeholder de paginación si se necesitara */}
                    <div className="flex gap-1 opacity-50 cursor-not-allowed">
                        <span className="px-2 py-1 bg-white border rounded shadow-sm">Anterior</span>
                        <span className="px-2 py-1 bg-white border rounded shadow-sm">Siguiente</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
