import React, { useState, useRef, useEffect, useCallback } from 'react';
import { format, addMonths, subMonths, setMonth, setYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

/* ══════════════════════════════════════════════════════════
   DateNavigator – Aliaddo Design System §4 Zona 2
   Componente reutilizable de navegación temporal.

   Funciones:
   • Navegar mes a mes con ◄ ►
   • Click en el label abre un popover con grid 4×3 de meses
   • Navegar año en el popover con ◄ ► en la cabecera
   • Botón "Hoy" para volver al mes actual
   ══════════════════════════════════════════════════════════ */

interface DateNavigatorProps {
    value: Date;
    onChange: (date: Date) => void;
    /** Muestra botón "Hoy" para volver al presente */
    showToday?: boolean;
    className?: string;
}

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const DateNavigator: React.FC<DateNavigatorProps> = ({
    value,
    onChange,
    showToday = true,
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [popoverYear, setPopoverYear] = useState(value.getFullYear());
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Sync popover year when value changes externally
    useEffect(() => {
        setPopoverYear(value.getFullYear());
    }, [value]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    const handlePrevMonth = useCallback(() => onChange(subMonths(value, 1)), [value, onChange]);
    const handleNextMonth = useCallback(() => onChange(addMonths(value, 1)), [value, onChange]);
    const handleToday = useCallback(() => onChange(new Date()), [onChange]);

    const handleSelectMonth = useCallback((monthIdx: number) => {
        const next = setYear(setMonth(value, monthIdx), popoverYear);
        onChange(next);
        setIsOpen(false);
    }, [value, popoverYear, onChange]);

    const currentMonth = value.getMonth();
    const currentYear = value.getFullYear();
    const now = new Date();
    const isCurrentMonth = currentMonth === now.getMonth() && currentYear === now.getFullYear();

    return (
        <div className={`relative flex items-center gap-1.5 ${className}`}>
            {/* ◄ Prev Month */}
            <button
                onClick={handlePrevMonth}
                className="h-10 w-9 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm text-slate-400 hover:text-purple-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                aria-label="Mes anterior"
            >
                <ChevronLeftIcon className="h-4 w-4" />
            </button>

            {/* Center label – clickable to open popover */}
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    h-10 px-4 flex items-center justify-center gap-1.5 rounded-md border shadow-sm transition-all select-none min-w-[180px]
                    ${isOpen
                        ? 'border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 ring-2 ring-purple-200 dark:ring-purple-800/40'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white hover:border-purple-200 dark:hover:border-purple-700/50'
                    }
                `}
            >
                <span className="text-[13px] font-bold uppercase tracking-widest">
                    {format(value, 'MMMM', { locale: es })}
                </span>
                <span className="text-[13px] font-bold text-slate-400 dark:text-slate-500">
                    {currentYear}
                </span>
                {/* Dropdown indicator */}
                <svg className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* ► Next Month */}
            <button
                onClick={handleNextMonth}
                className="h-10 w-9 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm text-slate-400 hover:text-purple-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                aria-label="Mes siguiente"
            >
                <ChevronRightIcon className="h-4 w-4" />
            </button>

            {/* Hoy Button */}
            {showToday && !isCurrentMonth && (
                <button
                    onClick={handleToday}
                    className="h-10 px-3 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm text-[11px] font-bold uppercase tracking-widest text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                >
                    Hoy
                </button>
            )}

            {/* ═══════ Popover (Month/Year Picker) ═══════ */}
            {isOpen && (
                <div
                    ref={popoverRef}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-[260px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                >
                    {/* Year Header */}
                    <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                        <button
                            onClick={() => setPopoverYear(y => y - 1)}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-purple-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                        >
                            <ChevronLeftIcon className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-[14px] font-bold text-slate-800 dark:text-white tracking-wide">
                            {popoverYear}
                        </span>
                        <button
                            onClick={() => setPopoverYear(y => y + 1)}
                            className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-purple-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                        >
                            <ChevronRightIcon className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Month Grid 4×3 */}
                    <div className="grid grid-cols-4 gap-1 p-2.5">
                        {MONTHS_SHORT.map((label, idx) => {
                            const isSelected = idx === currentMonth && popoverYear === currentYear;
                            const isCurrent = idx === now.getMonth() && popoverYear === now.getFullYear();

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectMonth(idx)}
                                    className={`
                                        h-9 rounded-md text-[12px] font-semibold transition-all
                                        ${isSelected
                                            ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20 font-bold'
                                            : isCurrent
                                                ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700/50'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-purple-600'
                                        }
                                    `}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Quick Year Jump */}
                    <div className="flex items-center justify-center gap-1 px-2.5 pb-2.5">
                        {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                            <button
                                key={y}
                                onClick={() => setPopoverYear(y)}
                                className={`
                                    flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all
                                    ${popoverYear === y
                                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }
                                `}
                            >
                                {y}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DateNavigator;
