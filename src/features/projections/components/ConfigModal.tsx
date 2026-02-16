import React, { useState } from 'react';
import { ProjectionOptions } from '../../../utils/projections';
import {
    Cog6ToothIcon,
    ArrowTrendingUpIcon,
    CalendarIcon,
    InformationCircleIcon,
    XMarkIcon,
    SparklesIcon,
    ScaleIcon,
    BanknotesIcon,
    UsersIcon
} from '../../../components/ui/Icons';

interface ConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: ProjectionOptions;
    onSave: (newConfig: ProjectionOptions) => void;
    onSeedHolidays?: (year: number) => Promise<number>;
    onSeedPaydays?: (year: number) => Promise<number>;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({
    isOpen,
    onClose,
    config,
    onSave,
    onSeedHolidays,
    onSeedPaydays
}) => {
    const [localConfig, setLocalConfig] = useState<ProjectionOptions>({
        ...config,
        trafficGrowthPercentage: config.trafficGrowthPercentage ?? 0,
        ticketGrowthPercentage: config.ticketGrowthPercentage ?? 0,
        anomalyThreshold: config.anomalyThreshold ?? 20,
        recencyWeightMode: config.recencyWeightMode ?? 'linear'
    });
    const [seeding, setSeeding] = useState(false);
    const [seedMsg, setSeedMsg] = useState("");
    const [activeTab, setActiveTab] = useState<'algorithm' | 'strategy' | 'events'>('algorithm');

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(localConfig);
        onClose();
    };

    const tabs = [
        { id: 'algorithm', label: 'Algoritmo', icon: <Cog6ToothIcon className="w-4 h-4" /> },
        { id: 'strategy', label: 'Estrategia', icon: <ArrowTrendingUpIcon className="w-4 h-4" /> },
        { id: 'events', label: 'Automatización', icon: <CalendarIcon className="w-4 h-4" /> },
    ];

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto font-sans">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white dark:bg-slate-900 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl sm:w-full border border-gray-200 dark:border-slate-800">

                    {/* Header - Aligned with App PageHeader style */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Cog6ToothIcon className="w-5 h-5 text-primary" />
                                Configuración de Proyecciones
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">Motor de Inteligencia & Metas</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation Tabs - Semantic Blues */}
                    <div className="flex bg-slate-50/50 dark:bg-slate-900/50 p-1.5 gap-1 border-b border-gray-100 dark:border-slate-800">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all
                                    ${activeTab === tab.id
                                        ? 'bg-white dark:bg-slate-800 text-primary shadow-sm border border-gray-100 dark:border-slate-700'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50'}
                                `}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="px-6 py-6 max-h-[60vh] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
                        {/* TAB 1: ALGORITMO */}
                        {activeTab === 'algorithm' && (
                            <div className="space-y-6">
                                {/* Lookback */}
                                <section className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                <CalendarIcon className="w-4 h-4 text-primary" />
                                                Ventana de Análisis
                                            </h4>
                                            <p className="text-[11px] text-slate-400 mt-0.5">Semanas históricas para detectar tendencias.</p>
                                        </div>
                                        <span className="text-xl font-bold text-primary">{localConfig.lookbackWeeks} <span className="text-xs font-medium text-slate-400 uppercase">sem.</span></span>
                                    </div>
                                    <input
                                        type="range" min="4" max="24" step="1"
                                        className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                        value={localConfig.lookbackWeeks}
                                        onChange={(e) => setLocalConfig({ ...localConfig, lookbackWeeks: parseInt(e.target.value) })}
                                    />
                                </section>

                                {/* Anomaly Threshold */}
                                <section className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                <ScaleIcon className="w-4 h-4 text-amber-500" />
                                                Filtro de Anomalías
                                            </h4>
                                            <p className="text-[11px] text-slate-400 mt-0.5">Días excluidos por ser atípicamente bajos.</p>
                                        </div>
                                        <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{localConfig.anomalyThreshold}%</span>
                                    </div>
                                    <input
                                        type="range" min="5" max="50" step="5"
                                        className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                        value={localConfig.anomalyThreshold}
                                        onChange={(e) => setLocalConfig({ ...localConfig, anomalyThreshold: parseInt(e.target.value) })}
                                    />
                                </section>

                                {/* Weight Mode */}
                                <section className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <SparklesIcon className="w-4 h-4 text-primary" />
                                        Sensibilidad Temporal
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'equal', label: 'Equilibrado', desc: 'Todo pesa igual' },
                                            { id: 'linear', label: 'Reciente', desc: 'Lo nuevo +5' },
                                            { id: 'aggressive', label: 'Agresivo', desc: 'Tendencia Pro' },
                                        ].map(mode => (
                                            <button
                                                key={mode.id}
                                                onClick={() => setLocalConfig({ ...localConfig, recencyWeightMode: mode.id as any })}
                                                className={`
                                                    p-2.5 rounded-xl border text-left transition-all
                                                    ${localConfig.recencyWeightMode === mode.id
                                                        ? 'border-primary bg-white dark:bg-slate-800 ring-2 ring-primary/10 shadow-sm'
                                                        : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600'}
                                                `}
                                            >
                                                <p className={`text-[11px] font-bold ${localConfig.recencyWeightMode === mode.id ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{mode.label}</p>
                                                <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{mode.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* TAB 2: ESTRATEGIA */}
                        {activeTab === 'strategy' && (
                            <div className="space-y-6">
                                {/* Inflación (IPC) */}
                                <section className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary">
                                                <BanknotesIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Ajuste por Inflación (IPC)</h4>
                                                <p className="text-[10px] text-slate-500 font-medium">Normalizar precios históricos.</p>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="number" step="0.1"
                                                className="w-20 pl-2 pr-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-sm text-slate-900 dark:text-white focus:ring-primary focus:border-primary"
                                                value={localConfig.inflationPercentage}
                                                onChange={(e) => setLocalConfig({ ...localConfig, inflationPercentage: parseFloat(e.target.value) || 0 })}
                                            />
                                            <span className="absolute right-2 top-2 text-xs font-bold text-slate-400">%</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-relaxed italic border-t border-slate-200/50 dark:border-slate-700/50 pt-3 mt-3">
                                        "Aplica este ajuste si tus precios actuales son más altos que el promedio del año pasado."
                                    </p>
                                </section>

                                {/* Metas Segmentadas */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Tráfico */}
                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                                        <div className="flex items-center gap-2 mb-3">
                                            <UsersIcon className="w-4 h-4 text-primary" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Crecimiento Tráfico</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-lg p-2 border border-slate-100 dark:border-slate-800">
                                            <input
                                                type="number" step="1"
                                                className="w-full bg-transparent border-none p-0 font-bold text-lg text-slate-900 dark:text-white focus:ring-0"
                                                value={localConfig.trafficGrowthPercentage}
                                                onChange={(e) => setLocalConfig({ ...localConfig, trafficGrowthPercentage: parseInt(e.target.value) || 0 })}
                                            />
                                            <span className="font-bold text-slate-400">%</span>
                                        </div>
                                        <p className="mt-2 text-[9px] text-slate-400 leading-tight">Meta para atraer <span className="text-slate-600 dark:text-slate-300 font-semibold underline">más clientes</span>.</p>
                                    </div>

                                    {/* Ticket */}
                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                                        <div className="flex items-center gap-2 mb-3">
                                            <BanknotesIcon className="w-4 h-4 text-emerald-500" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Crecimiento Ticket</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-lg p-2 border border-slate-100 dark:border-slate-800">
                                            <input
                                                type="number" step="1"
                                                className="w-full bg-transparent border-none p-0 font-bold text-lg text-slate-900 dark:text-white focus:ring-0"
                                                value={localConfig.ticketGrowthPercentage}
                                                onChange={(e) => setLocalConfig({ ...localConfig, ticketGrowthPercentage: parseInt(e.target.value) || 0 })}
                                            />
                                            <span className="font-bold text-slate-400">%</span>
                                        </div>
                                        <p className="mt-2 text-[9px] text-slate-400 leading-tight">Meta para <span className="text-slate-600 dark:text-slate-300 font-semibold underline">aumentar el consumo</span>.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: EVENTOS */}
                        {activeTab === 'events' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
                                        <CalendarIcon className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Generadores Automáticos</h4>
                                        <p className="text-[11px] text-slate-500">Importación masiva de estacionalidad oficial.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        onClick={async () => {
                                            if (onSeedHolidays) {
                                                setSeeding(true);
                                                try {
                                                    const count = await onSeedHolidays(new Date().getFullYear());
                                                    setSeedMsg(`¡${count} festivos importados!`);
                                                    setTimeout(() => setSeedMsg(""), 4000);
                                                } finally { setSeeding(false); }
                                            }
                                        }}
                                        disabled={seeding}
                                        className="flex items-center gap-4 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-left group"
                                    >
                                        <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Festivos Colombia {new Date().getFullYear()}</p>
                                            <p className="text-[10px] text-slate-400">Ponderación automática para feriados oficiales.</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={async () => {
                                            if (onSeedPaydays) {
                                                setSeeding(true);
                                                try {
                                                    const count = await onSeedPaydays(new Date().getFullYear());
                                                    setSeedMsg(`¡${count} quincenas configuradas!`);
                                                    setTimeout(() => setSeedMsg(""), 4000);
                                                } finally { setSeeding(false); }
                                            }
                                        }}
                                        disabled={seeding}
                                        className="flex items-center gap-4 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-left group"
                                    >
                                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Ciclo de Quincenas</p>
                                            <p className="text-[10px] text-slate-400">Marca los días 15 y 30 con boost (+15%).</p>
                                        </div>
                                    </button>
                                </div>

                                {seedMsg && (
                                    <div className="p-2.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold text-center rounded-lg border border-green-100 dark:border-green-800/50 animate-pulse">
                                        {seedMsg}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer - Standard Buttons */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-100 dark:border-slate-800">
                        <button
                            type="button"
                            className="inline-flex justify-center items-center rounded-lg px-6 py-2 bg-primary text-sm font-bold text-white hover:bg-primary/90 focus:outline-none transition-all shadow-sm"
                            onClick={handleSave}
                        >
                            Guardar Cambios
                        </button>
                        <button
                            type="button"
                            className="px-6 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
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
