import React from 'react';
import { CheckIcon } from '../../../components/ui/Icons';
import { cn } from '../../../lib/utils';

export interface ArqueoStepItem {
    id: number;
    label: string;
    fullTitle: string;
}

export const ARQUEO_STEPS: ArqueoStepItem[] = [
    { id: 1, label: 'Info', fullTitle: 'Información General' },
    { id: 2, label: 'Ventas', fullTitle: 'Registro de Venta' },
    { id: 3, label: 'Base', fullTitle: 'Base de Caja' },
    { id: 4, label: 'Conteo', fullTitle: 'Conteo de Efectivo' },
    { id: 5, label: 'Gastos', fullTitle: 'Gastos de Caja' },
    { id: 6, label: 'Pagos', fullTitle: 'Medios Digitales' },
    { id: 7, label: 'Resumen', fullTitle: 'Resumen del Arqueo' },
];

interface ArqueoStepperProps {
    currentStep: number;
    maxStepReached: number;
    onStepSelect: (step: number) => void;
}

/**
 * Stepper interactivo para el wizard de Arqueo de Caja.
 * Permite saltar a pasos ya visitados y muestra una barra compacta en móviles.
 */
export const ArqueoStepper: React.FC<ArqueoStepperProps> = ({
    currentStep,
    maxStepReached,
    onStepSelect,
}) => {
    const activeStepInfo = ARQUEO_STEPS.find((s) => s.id === currentStep) || ARQUEO_STEPS[0];
    const progressPercent = Math.round(((currentStep - 1) / (ARQUEO_STEPS.length - 1)) * 100);

    return (
        <nav aria-label="Progreso del arqueo" className="mb-5">
            {/* Vista compacta móvil */}
            <div className="sm:hidden bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-gray-100 dark:border-slate-700 shadow-sm mb-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs2 font-bold uppercase tracking-caps text-purple-600 dark:text-purple-400">
                        Paso {currentStep} de {ARQUEO_STEPS.length}
                    </span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100">
                        {activeStepInfo.fullTitle}
                    </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-purple-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(8, progressPercent)}%` }}
                    />
                </div>
            </div>

            {/* Stepper horizontal */}
            <div className="relative flex justify-between items-start overflow-x-auto hide-scrollbar py-1">
                <div
                    className="hidden sm:block absolute top-4 left-6 right-6 h-0.5 bg-gray-200 dark:bg-slate-700 -z-0"
                    aria-hidden="true"
                >
                    <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {ARQUEO_STEPS.map((step) => {
                    const isActive = currentStep === step.id;
                    const isPast = currentStep > step.id;
                    const isClickable = step.id <= maxStepReached && step.id !== currentStep;

                    return (
                        <button
                            key={step.id}
                            type="button"
                            disabled={!isClickable}
                            onClick={() => isClickable && onStepSelect(step.id)}
                            aria-current={isActive ? 'step' : undefined}
                            title={isClickable ? `Ir a ${step.fullTitle}` : step.fullTitle}
                            className={cn(
                                'relative z-10 flex flex-col items-center flex-1 min-w-[48px] sm:min-w-[70px] group focus:outline-none',
                                isClickable ? 'cursor-pointer' : 'cursor-default'
                            )}
                        >
                            <div
                                className={cn(
                                    'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm mb-1.5 transition-all',
                                    isActive
                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30 ring-4 ring-purple-100 dark:ring-purple-900/40'
                                        : isPast
                                        ? 'bg-emerald-500 text-white group-hover:bg-emerald-600'
                                        : step.id <= maxStepReached
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 group-hover:bg-purple-200'
                                        : 'bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-gray-400'
                                )}
                            >
                                {isPast ? <CheckIcon className="h-4 w-4 stroke-[2.5]" /> : step.id}
                            </div>
                            <span
                                className={cn(
                                    'text-xs2 sm:text-xs text-center transition-colors',
                                    isActive
                                        ? 'font-bold text-purple-600 dark:text-purple-400'
                                        : isClickable
                                        ? 'font-medium text-gray-600 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                                        : 'text-gray-500 dark:text-gray-400'
                                )}
                            >
                                {step.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
