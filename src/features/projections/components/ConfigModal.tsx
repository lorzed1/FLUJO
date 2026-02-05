import React, { useState } from 'react';

interface ConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: {
        lookbackWeeks: number;
        growthPercentage: number;
        inflationPercentage: number;
    };
    onSave: (newConfig: { lookbackWeeks: number; growthPercentage: number; inflationPercentage: number }) => void;
    onSeedHolidays?: (year: number) => Promise<number>;
    onSeedPaydays?: (year: number) => Promise<number>;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, config, onSave, onSeedHolidays, onSeedPaydays }) => {
    const [localConfig, setLocalConfig] = useState(config);
    const [seeding, setSeeding] = useState(false);
    const [seedMsg, setSeedMsg] = useState("");
    const [activeTab, setActiveTab] = useState<'economics' | 'events'>('economics');

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(localConfig);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-900 opacity-60 backdrop-blur-sm"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Configuración de Proyecciones
                        </h3>
                        <p className="text-indigo-100 text-sm mt-1 opacity-90">Ajusta los motores de la inteligencia artificial</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-100">
                        <button
                            onClick={() => setActiveTab('economics')}
                            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${activeTab === 'economics' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Economía y Tendencias
                        </button>
                        <button
                            onClick={() => setActiveTab('events')}
                            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${activeTab === 'events' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Eventos Automáticos
                        </button>
                    </div>

                    <div className="px-6 py-6">
                        {activeTab === 'economics' && (
                            <div className="space-y-6">
                                {/* Inflación */}
                                <div className="group">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-bold text-gray-700">Ajuste por Inflación (Precios)</label>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-100 text-orange-700">Impacto en Dinero</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="block w-full pl-4 pr-12 py-3 border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm bg-gray-50 group-hover:bg-white transition-colors"
                                            value={localConfig.inflationPercentage}
                                            onChange={(e) => setLocalConfig({ ...localConfig, inflationPercentage: parseFloat(e.target.value) })}
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                            <span className="text-gray-500 font-bold">%</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                                        Úsalo si tus precios actuales son más altos que el histórico. Si subiste precios un 10%, pon 10 aquí para que el sistema "infle" el pasado.
                                    </p>
                                </div>

                                {/* Crecimiento */}
                                <div className="group">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-bold text-gray-700">Meta de Crecimiento Real</label>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">Impacto en Tráfico</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="block w-full pl-4 pr-12 py-3 border-gray-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 shadow-sm bg-gray-50 group-hover:bg-white transition-colors"
                                            value={localConfig.growthPercentage}
                                            onChange={(e) => setLocalConfig({ ...localConfig, growthPercentage: parseFloat(e.target.value) })}
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                            <span className="text-gray-500 font-bold">%</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                                        ¿Cuánto esperas crecer en volumen de clientes (visitas) respecto al pasado? Esto aumenta la meta de mesas/tickets.
                                    </p>
                                </div>

                                {/* Lookback */}
                                <div className="pt-4 border-t border-gray-100">
                                    <label className="text-sm font-bold text-gray-700 mb-2 block">Ventana de Análisis (Semanas)</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="4"
                                            max="24"
                                            step="1"
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                            value={localConfig.lookbackWeeks}
                                            onChange={(e) => setLocalConfig({ ...localConfig, lookbackWeeks: parseInt(e.target.value) })}
                                        />
                                        <span className="text-lg font-bold text-indigo-600 w-12 text-center">{localConfig.lookbackWeeks}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Semanas hacia atrás para calcular tendencias recientes si no hay datos del año anterior.
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'events' && (
                            <div className="space-y-4">
                                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-emerald-900">Festivos Colombia</h4>
                                            <p className="text-xs text-emerald-700 mt-1 mb-3">
                                                Carga automáticamente todos los festivos oficiales del año (Ley Emiliani).
                                            </p>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (onSeedHolidays) {
                                                        setSeeding(true);
                                                        try {
                                                            const count = await onSeedHolidays(new Date().getFullYear());
                                                            setSeedMsg(`¡${count} festivos importados!`);
                                                            setTimeout(() => setSeedMsg(""), 3000);
                                                        } catch (e) {
                                                            setSeedMsg("Error al importar");
                                                        } finally {
                                                            setSeeding(false);
                                                        }
                                                    }
                                                }}
                                                disabled={seeding || !onSeedHolidays}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                            >
                                                {seeding ? 'Procesando...' : 'Importar Festivos 2026'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-blue-900">Ciclo de Quincenas</h4>
                                            <p className="text-xs text-blue-700 mt-1 mb-3">
                                                Marca los días 15 y 30 (ajustados a viernes si caen en fds) como días de alto tráfico.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (onSeedPaydays) {
                                                        setSeeding(true);
                                                        try {
                                                            const count = await onSeedPaydays(new Date().getFullYear());
                                                            setSeedMsg(`¡${count} quincenas marcadas!`);
                                                            setTimeout(() => setSeedMsg(""), 3000);
                                                        } catch (e) {
                                                            setSeedMsg("Error");
                                                        } finally {
                                                            setSeeding(false);
                                                        }
                                                    }
                                                }}
                                                disabled={seeding || !onSeedPaydays}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                            >
                                                {seeding ? 'Procesando...' : 'Marcar Pagos de Nómina'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {seedMsg && (
                                    <div className="text-center p-2 rounded bg-indigo-50 text-indigo-700 text-sm font-bold animate-pulse">
                                        {seedMsg}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3">
                        <button
                            type="button"
                            className="w-full inline-flex justify-center rounded-xl border border-transparent shadow shadow-indigo-200 px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:w-auto sm:text-sm transition-all transform hover:scale-105"
                            onClick={handleSave}
                        >
                            Guardar Cambios
                        </button>
                        <button
                            type="button"
                            className="w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:w-auto sm:text-sm"
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
