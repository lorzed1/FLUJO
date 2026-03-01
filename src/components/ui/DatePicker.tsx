import React, { useState, useRef, useEffect, forwardRef } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    startOfWeek,
    endOfWeek,
    getYear,
    getMonth,
    setYear,
    setMonth,
    parseISO,
    isValid,
    startOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from './Icons';

interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
    value?: string; // Formato YYYY-MM-DD
    onChange?: (val: string) => void;
    className?: string;
    wrapperClassName?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    className = '',
    wrapperClassName = '',
    placeholder = 'Seleccione una fecha',
    disabled,
    ...props
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Fecha seleccionada real o null
    const selectedDate = value && isValid(parseISO(value)) ? parseISO(value) : null;
    // Fecha que estamos visualizando en el calendario (mes distinto al seleccionado si el usuario navega)
    const [viewDate, setViewDate] = useState<Date>(selectedDate || new Date());

    // Sincronizar viewDate cuando cambia la prop value desde fuera
    useEffect(() => {
        if (selectedDate) {
            setViewDate(selectedDate);
        }
    }, [value]);

    // Manejador del clic fuera para cerrar el popover
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
        // Si la fecha era válida, volver a enfocar la vista en ese mes al abrir
        if (!isOpen && selectedDate) {
            setViewDate(selectedDate);
        }
    };

    const currentMonth = startOfMonth(viewDate);
    const startDate = startOfWeek(currentMonth, { weekStartsOn: 0 }); // Domingo
    const endDate = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 0 });

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const today = startOfDay(new Date());

    // Opciones select año y mes
    const years = Array.from({ length: 20 }, (_, i) => getYear(new Date()) - 10 + i);
    const months = Array.from({ length: 12 }, (_, i) => i);

    const prevMonth = () => setViewDate(subMonths(viewDate, 1));
    const nextMonth = () => setViewDate(addMonths(viewDate, 1));

    const handleDayClick = (day: Date) => {
        if (onChange) {
            onChange(format(day, 'yyyy-MM-dd'));
        }
        setIsOpen(false);
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setViewDate(setYear(viewDate, parseInt(e.target.value, 10)));
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setViewDate(setMonth(viewDate, parseInt(e.target.value, 10)));
    };

    const displayFormat = selectedDate ? format(selectedDate, 'dd/MM/yyyy') : '';

    return (
        <div className={`relative ${wrapperClassName}`} ref={containerRef}>
            {/* Input trigger */}
            <div className="relative">
                <input
                    type="text"
                    readOnly
                    value={displayFormat}
                    placeholder={placeholder}
                    onClick={handleToggle}
                    disabled={disabled}
                    className={`block w-full px-3 py-2 pr-10 border border-gray-200 dark:border-slate-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
                    {...props}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                    <CalendarIcon className="h-5 w-5" />
                </div>
            </div>

            {/* Popover content */}
            {isOpen && (
                <div className="absolute z-50 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-3 w-[240px] animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3 gap-1">
                        <button
                            type="button"
                            onClick={prevMonth}
                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-primary transition-colors flex items-center justify-center border border-gray-200 dark:border-slate-600 w-7 h-7"
                        >
                            <ChevronLeftIcon className="w-4 h-4 font-bold" />
                        </button>

                        <div className="flex gap-1 flex-1">
                            {/* Mes selector */}
                            <select
                                value={getMonth(viewDate)}
                                onChange={handleMonthChange}
                                className="flex-1 block w-full outline-none text-xs font-semibold border border-gray-200 dark:border-slate-600 rounded-md py-0.5 px-1 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 cursor-pointer hover:border-primary focus:ring-1 focus:ring-primary focus:border-primary"
                            >
                                {months.map(m => (
                                    <option key={m} value={m}>
                                        {format(new Date(2000, m, 1), 'MMMM', { locale: es })}
                                    </option>
                                ))}
                            </select>

                            {/* Año selector */}
                            <select
                                value={getYear(viewDate)}
                                onChange={handleYearChange}
                                className="w-[4.5rem] outline-none text-xs font-semibold border border-gray-200 dark:border-slate-600 rounded-md py-0.5 px-1 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 cursor-pointer hover:border-primary focus:ring-1 focus:ring-primary focus:border-primary"
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={nextMonth}
                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 text-primary transition-colors flex items-center justify-center border border-gray-200 dark:border-slate-600 w-7 h-7"
                        >
                            <ChevronRightIcon className="w-4 h-4 font-bold" />
                        </button>
                    </div>

                    <hr className="mb-3 border-gray-100 dark:border-slate-700" />

                    {/* Días semana */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {weekDays.map(day => (
                            <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Días */}
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, dIdx) => {
                            const _isSameMonth = isSameMonth(day, currentMonth);
                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                            const isCurrentDate = isSameDay(day, today);

                            return (
                                <button
                                    key={day.toISOString()}
                                    type="button"
                                    onClick={() => handleDayClick(day)}
                                    className={`
                    w-7 h-7 mx-auto flex items-center justify-center rounded-md text-[11.5px] transition-colors
                    ${!_isSameMonth ? 'text-gray-300 dark:text-gray-600 font-light' : 'text-gray-700 dark:text-gray-200'}
                    ${isSelected ? 'bg-primary text-white font-medium shadow-md' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}
                    ${isCurrentDate && !isSelected ? 'border border-primary/50 text-primary font-medium' : ''}
                  `}
                                >
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
