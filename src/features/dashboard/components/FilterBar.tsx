import React from 'react';
import { FilterState, PeriodMode, ComparisonMode, ViewMode } from '../../../hooks/useBusinessIntelligence';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { CalendarDaysIcon, FunnelIcon, ArrowPathIcon } from '../../../components/ui/Icons';

interface FilterBarProps {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters }) => {

    const handleYearChange = (increment: number) => {
        const newDate = new Date(filters.selectedDate);
        newDate.setFullYear(newDate.getFullYear() + increment);
        setFilters(prev => ({ ...prev, selectedDate: newDate }));
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const month = parseInt(e.target.value);
        const newDate = new Date(filters.selectedDate);
        newDate.setMonth(month);
        setFilters(prev => ({ ...prev, selectedDate: newDate }));
    };

    const toggleWeekday = (dayIndex: number) => {
        setFilters(prev => {
            const current = prev.selectedWeekdays;
            if (current.includes(dayIndex)) {
                return { ...prev, selectedWeekdays: current.filter(d => d !== dayIndex) };
            } else {
                return { ...prev, selectedWeekdays: [...current, dayIndex] };
            }
        });
    };

    return (
        <Card noPadding className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm sticky top-0 z-30 mb-6">

            {/* 1. GLOBAL CONTEXT (YEAR) */}
            <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-500">
                        <CalendarDaysIcon className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Contexto Global</span>
                    </div>

                    <div className="flex items-center bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-600">
                        <button
                            onClick={() => handleYearChange(-1)}
                            className="px-3 py-1 hover:bg-slate-50 text-slate-600 dark:text-slate-300 border-r border-slate-200"
                        >←</button>
                        <span className="px-4 py-1 font-bold text-slate-800 dark:text-white text-lg">
                            {filters.selectedDate.getFullYear()}
                        </span>
                        <button
                            onClick={() => handleYearChange(1)}
                            className="px-3 py-1 hover:bg-slate-50 text-slate-600 dark:text-slate-300 border-l border-slate-200"
                        >→</button>
                    </div>
                </div>

                {/* View Mode Switcher (Global Visual Preference) */}
                <div className="flex bg-slate-200/50 dark:bg-slate-700/50 p-1 rounded-lg">
                    {[
                        { id: 'all', label: 'Consolidado' },
                        { id: 'sales', label: 'Ventas' },
                        { id: 'visits', label: 'Visitas' }
                    ].map(mode => (
                        <button
                            key={mode.id}
                            onClick={() => setFilters(prev => ({ ...prev, viewMode: mode.id as ViewMode }))}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${filters.viewMode === mode.id
                                    ? 'bg-white shadow text-indigo-600 dark:bg-slate-600 dark:text-white'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                }`}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. SPECIFIC SCOPE (Period & Drill-down) */}
            <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">

                {/* Left: Period Type Selector */}
                <div className="lg:col-span-5 flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Periodo Específico</label>
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <Button
                                variant={filters.periodMode === 'year' ? 'white' : 'ghost'}
                                size="sm"
                                onClick={() => setFilters(prev => ({ ...prev, periodMode: 'year' }))}
                            >Todo el Año</Button>
                            <Button
                                variant={filters.periodMode === 'month' ? 'white' : 'ghost'}
                                size="sm"
                                onClick={() => setFilters(prev => ({ ...prev, periodMode: 'month' }))}
                            >Mes</Button>
                            <Button
                                variant={filters.periodMode === 'week' ? 'white' : 'ghost'}
                                size="sm"
                                onClick={() => setFilters(prev => ({ ...prev, periodMode: 'week' }))}
                            >Semana</Button>
                            <Button
                                variant={filters.periodMode === 'range' ? 'white' : 'ghost'}
                                size="sm"
                                onClick={() => setFilters(prev => ({ ...prev, periodMode: 'range' }))}
                            >Rango</Button>
                        </div>

                        {/* Drill Down Inputs */}
                        {filters.periodMode === 'month' && (
                            <Select
                                value={filters.selectedDate.getMonth()}
                                onChange={handleMonthChange}
                                className="w-40"
                            >
                                {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </Select>
                        )}

                        {filters.periodMode === 'week' && (
                            <Input
                                type="week"
                                value={filters.selectedWeek}
                                onChange={(e) => setFilters(prev => ({ ...prev, selectedWeek: e.target.value }))}
                                className="w-40"
                            />
                        )}

                        {filters.periodMode === 'range' && (
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={filters.dateRange.start}
                                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, start: e.target.value } }))}
                                    className="w-32"
                                />
                                <span className="text-slate-400">→</span>
                                <Input
                                    type="date"
                                    value={filters.dateRange.end}
                                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, end: e.target.value } }))}
                                    className="w-32"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Middle: Weekday Filter */}
                <div className="lg:col-span-4 flex flex-col gap-2 items-center lg:items-start border-l border-slate-100 pl-6">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                        <FunnelIcon className="w-3 h-3" /> Filtro de Días
                        {filters.selectedWeekdays.length > 0 && <span onClick={() => setFilters(prev => ({ ...prev, selectedWeekdays: [] }))} className="text-red-500 cursor-pointer hover:underline text-[9px] lowercase ml-auto">(limpiar)</span>}
                    </label>
                    <div className="flex gap-1">
                        {[
                            { label: 'dm', idx: 0 },
                            { label: 'lu', idx: 1 },
                            { label: 'ma', idx: 2 },
                            { label: 'mi', idx: 3 },
                            { label: 'ju', idx: 4 },
                            { label: 'vi', idx: 5 },
                            { label: 'sa', idx: 6 },
                        ].map(({ label, idx }) => {
                            const isSelected = filters.selectedWeekdays.includes(idx);
                            const isAllSelected = filters.selectedWeekdays.length === 0;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => toggleWeekday(idx)}
                                    className={`
                                         w-8 h-8 rounded-full text-[10px] font-bold uppercase transition-all flex items-center justify-center
                                         ${isSelected
                                            ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                                            : isAllSelected
                                                ? 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100'
                                                : 'bg-white text-slate-300 border border-slate-100 opacity-60'
                                        }
                                     `}
                                >
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Right: Comparison & Tools */}
                <div className="lg:col-span-3 flex flex-col gap-2 items-end lg:items-end border-l border-slate-100 pl-6">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                        <ArrowPathIcon className="w-3 h-3" /> Comparativa
                    </label>
                    <Select
                        value={filters.comparisonMode}
                        onChange={(e) => setFilters(prev => ({ ...prev, comparisonMode: e.target.value as ComparisonMode }))}
                        className="w-full text-xs"
                    >
                        <option value="none">Sin Comparar</option>
                        <option value="previous_period">Vs Periodo Anterior</option>
                        <option value="year_over_year">Vs Año Anterior (YoY)</option>
                    </Select>
                </div>

            </div>
        </Card>
    );
};
