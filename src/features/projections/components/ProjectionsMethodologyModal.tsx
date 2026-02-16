import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, LightBulbIcon, ChartBarIcon, CalculatorIcon, ShieldCheckIcon } from '../../../components/ui/Icons';

interface MethodologyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProjectionsMethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[99999]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto font-sans">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 text-left align-middle shadow-2xl transition-all border border-gray-200 dark:border-slate-800">
                                {/* Header - App Consistent */}
                                <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                                            <LightBulbIcon className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <Dialog.Title as="h3" className="text-lg font-bold text-slate-900 dark:text-white">
                                                Metodología de Proyecciones
                                            </Dialog.Title>
                                            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Transparencia en el cálculo</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="px-8 py-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
                                    {/* 1. Venta Base */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-4">
                                            <ChartBarIcon className="h-5 w-5 text-primary" />
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">1. Determinación de la Venta Base</h4>
                                        </div>
                                        <div className="pl-8 space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                            <p>
                                                La <span className="font-bold text-slate-900 dark:text-white">Venta Base</span> es el pilar de tu meta. Utilizamos un algoritmo de lógica gemela:
                                            </p>
                                            <div className="grid grid-cols-1 gap-3">
                                                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                                    <p className="font-bold text-xs text-slate-700 dark:text-slate-200 mb-1">Mismos Días de la Semana</p>
                                                    <p className="text-[11px] text-slate-500">Comparamos manzanas con manzanas (Lunes con Lunes, festivos con festivos).</p>
                                                </div>
                                                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                                    <p className="font-bold text-xs text-slate-700 dark:text-slate-200 mb-1">Limpieza de Ruido (Anomalías)</p>
                                                    <p className="text-[11px] text-slate-500">Detección automática de cierres o errores de digitación para no afectar el promedio.</p>
                                                </div>
                                                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                                    <p className="font-bold text-xs text-slate-700 dark:text-slate-200 mb-1">Ponderación por Recencia</p>
                                                    <p className="text-[11px] text-slate-500">Lo que pasó hace 2 semanas es más relevante que lo que pasó hace 6 meses.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* 2. Fórmula de Cascada */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-4">
                                            <CalculatorIcon className="h-5 w-5 text-primary" />
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">2. La Fórmula de la Meta (Cascada)</h4>
                                        </div>
                                        <div className="pl-8">
                                            <div className="bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl border border-slate-800 shadow-inner text-center mb-6">
                                                <p className="text-indigo-300 dark:text-blue-400 text-xl font-bold font-mono tracking-tighter">
                                                    Meta = (Base × Inflación × Crecimiento) × Eventos
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div className="p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <span className="font-bold block text-[10px] uppercase text-primary mb-1">Inflación</span>
                                                    <span className="text-[11px] text-slate-500 leading-tight">Ajuste de precios históricos a valor actual.</span>
                                                </div>
                                                <div className="p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <span className="font-bold block text-[10px] uppercase text-primary mb-1">Crecimiento</span>
                                                    <span className="text-[11px] text-slate-500 leading-tight">Meta de ventas por encima de la tendencia.</span>
                                                </div>
                                                <div className="p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <span className="font-bold block text-[10px] uppercase text-primary mb-1">Eventos</span>
                                                    <span className="text-[11px] text-slate-500 leading-tight">Impacto de días especiales y quincenas.</span>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* 3. Confianza */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-4">
                                            <ShieldCheckIcon className="h-5 w-5 text-amber-500" />
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">3. Indicador de Confianza</h4>
                                        </div>
                                        <div className="pl-8 flex flex-col md:flex-row gap-6 items-center">
                                            <div className="text-sm text-slate-600 dark:text-slate-400 flex-1 space-y-3">
                                                <p>Cada meta evaluada según la calidad de los datos:</p>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/20" />
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">Alta:</span>
                                                        <span className="text-xs">Usa muchos datos con baja variabilidad.</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-md shadow-amber-500/20" />
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">Media:</span>
                                                        <span className="text-xs">Suficiente historial con ligeras variaciones.</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-md shadow-rose-500/20" />
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">Baja:</span>
                                                        <span className="text-xs">Pocos datos o volatilidad extrema detectada.</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-full md:w-56 p-5 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/10 text-center">
                                                <p className="text-[10px] uppercase font-bold text-primary mb-2">Tip del Sistema</p>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-relaxed">
                                                    "Una confianza baja es una invitación a registrar más arqueos para depurar el algoritmo."
                                                </p>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="px-6 py-5 bg-slate-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                                    <button
                                        onClick={onClose}
                                        className="px-8 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold transition-all shadow-sm"
                                    >
                                        Cerrar Entendido
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};
