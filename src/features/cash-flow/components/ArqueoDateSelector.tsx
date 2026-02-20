import React, { useEffect } from 'react';
import { getLocalDateISO } from '../../../utils/dateUtils';
import { CalendarDaysIcon } from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';

interface ArqueoDateSelectorProps {
    currentDate: string;
    onDateChange: (date: string) => void;
    onConfirm: () => void;
}

export const ArqueoDateSelector: React.FC<ArqueoDateSelectorProps> = ({
    currentDate,
    onDateChange,
    onConfirm
}) => {

    // Ensure we don't start with an empty date
    useEffect(() => {
        if (!currentDate) {
            onDateChange(getLocalDateISO());
        }
    }, [currentDate, onDateChange]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-slate-700">

                {/* Header (Standard Admin Style) */}
                <div className="bg-gray-50 dark:bg-slate-900/50 px-5 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                    <CalendarDaysIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
                        Confirmar Fecha de Arqueo
                    </h3>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Content (High Density) */}
                    <div className="p-5 space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-xs text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50 mb-2">
                            <p>Antes de continuar, asegúrate de que la fecha seleccionada coincida con el turno que estás cerrando.</p>
                        </div>

                        <div>
                            <label
                                htmlFor="date-selector"
                                className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1"
                            >
                                Fecha de Registro
                            </label>
                            <input
                                id="date-selector"
                                type="date"
                                required
                                value={currentDate}
                                onChange={(e) => onDateChange(e.target.value)}
                                className="w-full h-9 px-3 text-[13px] rounded border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 transition-all"
                            />
                        </div>
                    </div>

                    {/* Footer (Right Aligned Actions) */}
                    <div className="bg-gray-50 dark:bg-slate-900/50 px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                        <Button
                            type="submit"
                            className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs font-medium px-4 rounded shadow-sm"
                        >
                            Confirmar y Continuar
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
