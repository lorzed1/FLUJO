import React from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../../../components/ui/Icons';

interface DashboardControlsProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
}

export const DashboardControls: React.FC<DashboardControlsProps> = ({ selectedDate, onDateChange }) => {
    const handleMonthChange = (offset: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(newDate.getMonth() + offset);
        onDateChange(newDate);
    };

    const handleYearChange = (year: number) => {
        const newDate = new Date(selectedDate);
        newDate.setFullYear(year);
        onDateChange(newDate);
    };

    return (
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5">
            <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">Período:</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">
                    {selectedDate.toLocaleDateString('es-CO', { month: 'long' })}
                </span>
            </div>

            <div className="flex items-center gap-1">
                {/* Navegación Mes */}
                <button
                    onClick={() => handleMonthChange(-1)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                    title="Mes anterior"
                >
                    <ChevronLeftIcon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                </button>

                <button
                    onClick={() => handleMonthChange(1)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                    title="Mes siguiente"
                >
                    <ChevronRightIcon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                </button>

                <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>

                {/* Selector de Año */}
                <select
                    value={selectedDate.getFullYear()}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    className="px-2 py-1 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                >
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>

                <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1"></div>

                {/* Botón Hoy */}
                <button
                    onClick={() => onDateChange(new Date())}
                    className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded transition-colors"
                >
                    Hoy
                </button>
            </div>
        </div>
    );
};
