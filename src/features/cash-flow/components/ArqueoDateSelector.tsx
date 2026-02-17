import React from 'react';
import { getLocalDateISO } from '../../../utils/dateUtils';
import { CalendarDaysIcon } from '../../../components/ui/Icons';

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
    React.useEffect(() => {
        if (!currentDate) {
            onDateChange(getLocalDateISO());
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">

                {/* Header */}
                <div className="bg-primary dark:bg-blue-600 p-6 text-center">
                    <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <CalendarDaysIcon className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                        Bienvenido
                    </h2>
                    <p className="text-blue-100 text-sm">
                        Antes de continuar, confirma la fecha del arqueo
                    </p>
                </div>

                {/* Body */}
                <div className="p-6 pt-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label
                                htmlFor="date-selector"
                                className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2"
                            >
                                Fecha de Registro
                            </label>
                            <input
                                id="date-selector"
                                type="date"
                                required
                                value={currentDate}
                                onChange={(e) => onDateChange(e.target.value)}
                                className="w-full text-center py-4 px-4 text-xl font-bold rounded-xl border-2 border-gray-200 dark:border-slate-600 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-gray-900 dark:text-white dark:bg-slate-700 transition-all"
                            />
                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                                Asegúrate de que la fecha coincida con el turno que estás cerrando.
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-primary dark:bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Confirmar y Continuar
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
