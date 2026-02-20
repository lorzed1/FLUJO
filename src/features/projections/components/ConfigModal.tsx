import React, { useState } from 'react';
import { ProjectionOptions } from '../../../utils/projections';
import {
    Cog6ToothIcon,
    ArrowTrendingUpIcon,
    CalendarIcon,
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-lg border border-gray-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >

                {/* Header */}
                <div className="bg-gray-50 dark:bg-slate-800/50 px-5 py-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Cog6ToothIcon className="w-5 h-5 text-gray-500" />
                        Configuración de Proyecciones
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 p-1 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Segmented Control Tabs */}
                <div className="px-5 py-2 border-b border-gray-100 dark:border-slate-700">
                    <div className="bg-gray-100 dark:bg-slate-700/50 p-1 rounded-lg flex gap-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition-all
                                    ${activeTab === tab.id
                                        ? 'bg-white dark:bg-slate-800 shadow-sm text-gray-900 dark:text-white'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}
                                `}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
                    {/* TAB 1: ALGORITMO */}
                    {activeTab === 'algorithm' && (
                        <div className="space-y-4">
                            {/* Lookback */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <CalendarIcon className="w-3.5 h-3.5" />
                                        Ventana de Análisis
                                    </label>
                                    <span className="text-sm font-bold text-gray-800 dark:text-white">{localConfig.lookbackWeeks} <span className="text-[10px] font-medium text-gray-400 uppercase">semanas</span></span>
                                </div>
                                <p className="text-[11px] text-gray-400 mb-2">Semanas históricas para detectar tendencias.</p>
                                <input
                                    type="range" min="4" max="24" step="1"
                                    className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                    value={localConfig.lookbackWeeks}
                                    onChange={(e) => setLocalConfig({ ...localConfig, lookbackWeeks: parseInt(e.target.value) })}
                                />
                            </div>

                            {/* Anomaly Threshold */}
                            <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <ScaleIcon className="w-3.5 h-3.5" />
                                        Filtro de Anomalías
                                    </label>
                                    <span className="text-sm font-bold text-gray-800 dark:text-white">{localConfig.anomalyThreshold}%</span>
                                </div>
                                <p className="text-[11px] text-gray-400 mb-2">Días excluidos por ser atípicamente bajos.</p>
                                <input
                                    type="range" min="5" max="50" step="5"
                                    className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                    value={localConfig.anomalyThreshold}
                                    onChange={(e) => setLocalConfig({ ...localConfig, anomalyThreshold: parseInt(e.target.value) })}
                                />
                            </div>

                            {/* Weight Mode */}
                            <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <SparklesIcon className="w-3.5 h-3.5" />
                                    Sensibilidad Temporal
                                </label>
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                    {[
                                        { id: 'equal', label: 'Equilibrado', desc: 'Todo pesa igual' },
                                        { id: 'linear', label: 'Reciente', desc: 'Lo nuevo +5' },
                                        { id: 'aggressive', label: 'Agresivo', desc: 'Tendencia Pro' },
                                    ].map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setLocalConfig({ ...localConfig, recencyWeightMode: mode.id as any })}
                                            className={`
                                                p-2.5 rounded border text-left transition-all
                                                ${localConfig.recencyWeightMode === mode.id
                                                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-600/20'
                                                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'}
                                            `}
                                        >
                                            <p className={`text-[11px] font-bold ${localConfig.recencyWeightMode === mode.id ? 'text-purple-600' : 'text-gray-700 dark:text-gray-300'}`}>{mode.label}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{mode.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: ESTRATEGIA */}
                    {activeTab === 'strategy' && (
                        <div className="space-y-4">
                            {/* Inflación (IPC) */}
                            <div>
                                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                    <BanknotesIcon className="w-3.5 h-3.5" />
                                    Ajuste por Inflación (IPC)
                                </label>
                                <p className="text-[11px] text-gray-400 mb-2">Normalizar precios históricos.</p>
                                <div className="relative">
                                    <input
                                        type="number" step="0.1"
                                        className="w-full h-9 px-3 pr-8 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded text-[13px] font-medium text-gray-700 dark:text-white focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
                                        value={localConfig.inflationPercentage}
                                        onChange={(e) => setLocalConfig({ ...localConfig, inflationPercentage: parseFloat(e.target.value) || 0 })}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">%</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 italic leading-relaxed">
                                    Aplica este ajuste si tus precios actuales son más altos que el promedio del año pasado.
                                </p>
                            </div>

                            {/* Metas Segmentadas */}
                            <div className="border-t border-gray-100 dark:border-slate-700 pt-4">
                                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3 block">
                                    Metas de Crecimiento
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Tráfico */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                            <UsersIcon className="w-3.5 h-3.5" />
                                            Tráfico
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number" step="1"
                                                className="w-full h-9 px-3 pr-8 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded text-[13px] font-medium text-gray-700 dark:text-white focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
                                                value={localConfig.trafficGrowthPercentage}
                                                onChange={(e) => setLocalConfig({ ...localConfig, trafficGrowthPercentage: parseInt(e.target.value) || 0 })}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">%</span>
                                        </div>
                                        <p className="mt-1 text-[10px] text-gray-400 leading-tight">Meta para atraer más clientes.</p>
                                    </div>

                                    {/* Ticket */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                            <BanknotesIcon className="w-3.5 h-3.5" />
                                            Ticket
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number" step="1"
                                                className="w-full h-9 px-3 pr-8 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded text-[13px] font-medium text-gray-700 dark:text-white focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
                                                value={localConfig.ticketGrowthPercentage}
                                                onChange={(e) => setLocalConfig({ ...localConfig, ticketGrowthPercentage: parseInt(e.target.value) || 0 })}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">%</span>
                                        </div>
                                        <p className="mt-1 text-[10px] text-gray-400 leading-tight">Meta para aumentar el consumo.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: AUTOMATIZACIÓN */}
                    {activeTab === 'events' && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    Generadores Automáticos
                                </label>
                                <p className="text-[11px] text-gray-400 mb-3">Importación masiva de estacionalidad oficial.</p>
                            </div>

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
                                className="w-full flex items-center gap-3 p-3 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left"
                            >
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded text-emerald-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <div>
                                    <p className="text-[13px] font-medium text-gray-700 dark:text-gray-200">Festivos Colombia {new Date().getFullYear()}</p>
                                    <p className="text-[11px] text-gray-400">Ponderación automática para feriados oficiales.</p>
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
                                className="w-full flex items-center gap-3 p-3 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left"
                            >
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <p className="text-[13px] font-medium text-gray-700 dark:text-gray-200">Ciclo de Quincenas</p>
                                    <p className="text-[11px] text-gray-400">Marca los días 15 y 30 con boost (+15%).</p>
                                </div>
                            </button>

                            {seedMsg && (
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium text-center rounded border border-emerald-100 dark:border-emerald-800/50">
                                    {seedMsg}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-slate-800/50 px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-2">
                    <button
                        type="button"
                        className="h-8 px-3 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 shadow-sm transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-600"
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="h-8 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-xs font-medium text-white shadow-sm transition-colors"
                        onClick={handleSave}
                    >
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};
