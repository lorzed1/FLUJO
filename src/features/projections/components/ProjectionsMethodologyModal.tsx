import React from 'react';
import { LightBulbIcon, ChartBarIcon, CalculatorIcon, ShieldCheckIcon } from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';

interface MethodologyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProjectionsMethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
    const headerTitle = (
        <div className="flex items-center gap-2">
            <LightBulbIcon className="h-5 w-5 text-gray-500" />
            Metodología de Proyecciones
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={headerTitle}
            maxWidth="max-w-xl"
        >
            <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto custom-scrollbar">

                {/* 1. Venta Base */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <ChartBarIcon className="h-4 w-4 text-purple-600" />
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">1. Determinación de la Venta Base</h4>
                    </div>
                    <p className="text-sm- text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                        La <span className="font-bold text-gray-800 dark:text-white">Venta Base</span> es el pilar de tu meta. Utilizamos un algoritmo de lógica gemela:
                    </p>
                    <div className="space-y-2">
                        <div className="p-3 rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                            <p className="font-semibold text-sm- text-gray-700 dark:text-gray-200 mb-0.5">Mismos Días de la Semana</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Comparamos manzanas con manzanas (Lunes con Lunes, festivos con festivos).</p>
                        </div>
                        <div className="p-3 rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                            <p className="font-semibold text-sm- text-gray-700 dark:text-gray-200 mb-0.5">Limpieza de Ruido (Anomalías)</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Detección automática de cierres o errores de digitación para no afectar el promedio.</p>
                        </div>
                        <div className="p-3 rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                            <p className="font-semibold text-sm- text-gray-700 dark:text-gray-200 mb-0.5">Ponderación por Recencia</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Lo que pasó hace 2 semanas es más relevante que lo que pasó hace 6 meses.</p>
                        </div>
                    </div>
                </section>

                {/* Divider */}
                <div className="border-t border-gray-100 dark:border-slate-700" />

                {/* 2. Fórmula */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <CalculatorIcon className="h-4 w-4 text-purple-600" />
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">2. La Fórmula de la Meta (Cascada)</h4>
                    </div>
                    <div className="bg-gray-900 dark:bg-slate-900 px-5 py-4 rounded border border-gray-800 text-center mb-3">
                        <p className="text-purple-300 text-base font-bold font-mono tracking-tight">
                            Meta = (Base × Inflación × Crecimiento) × Eventos
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="p-2.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <span className="font-semibold block text-xs2 uppercase text-purple-600 dark:text-purple-400 mb-0.5 tracking-wide">Inflación</span>
                            <span className="text-xs text-gray-500 leading-tight">Ajuste de precios históricos a valor actual.</span>
                        </div>
                        <div className="p-2.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <span className="font-semibold block text-xs2 uppercase text-purple-600 dark:text-purple-400 mb-0.5 tracking-wide">Crecimiento</span>
                            <span className="text-xs text-gray-500 leading-tight">Meta de ventas por encima de la tendencia.</span>
                        </div>
                        <div className="p-2.5 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <span className="font-semibold block text-xs2 uppercase text-purple-600 dark:text-purple-400 mb-0.5 tracking-wide">Eventos</span>
                            <span className="text-xs text-gray-500 leading-tight">Impacto de días especiales y quincenas.</span>
                        </div>
                    </div>
                </section>

                {/* Divider */}
                <div className="border-t border-gray-100 dark:border-slate-700" />

                {/* 3. Confianza */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <ShieldCheckIcon className="h-4 w-4 text-amber-500" />
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">3. Indicador de Confianza</h4>
                    </div>
                    <p className="text-sm- text-gray-600 dark:text-gray-300 mb-3">Cada meta evaluada según la calidad de los datos:</p>
                    <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                            <span className="font-semibold text-sm- text-gray-700 dark:text-gray-200">Alta:</span>
                            <span className="text-xs text-gray-500">Usa muchos datos con baja variabilidad.</span>
                        </div>
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                            <span className="font-semibold text-sm- text-gray-700 dark:text-gray-200">Media:</span>
                            <span className="text-xs text-gray-500">Suficiente historial con ligeras variaciones.</span>
                        </div>
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                            <span className="font-semibold text-sm- text-gray-700 dark:text-gray-200">Baja:</span>
                            <span className="text-xs text-gray-500">Pocos datos o volatilidad extrema detectada.</span>
                        </div>
                    </div>
                    <div className="p-3 rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                        <p className="text-xs2 uppercase font-semibold text-gray-400 dark:text-gray-500 mb-1 tracking-widest">Tip del Sistema</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 italic leading-relaxed">
                            "Una confianza baja es una invitación a registrar más arqueos para depurar el algoritmo."
                        </p>
                    </div>
                </section>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-slate-800/50 px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex justify-end mt-auto shrink-0">
                <Button
                    variant="primary"
                    onClick={onClose}
                    className="h-8 px-4 text-xs font-medium"
                >
                    Cerrar Entendido
                </Button>
            </div>
        </Modal>
    );
};
