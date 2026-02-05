import React, { useState } from 'react';
import { useProjections } from './hooks/useProjections';
import { CalendarMap } from './components/CalendarMap';
import { DayDetailsModal } from './components/DayDetailsModal';
import { ConfigModal } from './components/ConfigModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const ProjectionsView: React.FC = () => {
    const {
        currentDate,
        nextMonth,
        prevMonth,
        events,
        calculatedProjections,
        projections, // Stored
        loading,
        config,
        setConfig,
        addEvent,
        deleteEvent,
        saveGoal,
        seedHolidays,
        seedPaydays,
        realSales
    } = useProjections();

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedDate(null);
    };

    // Calculate totals for summary
    const totalProjected = Object.values(calculatedProjections).reduce((acc, curr) => acc + curr.final, 0);
    const totalReal = Object.values(realSales).reduce((acc, curr) => acc + curr, 0);

    // Calculate global compliance (only for days with real data)
    let projectedForRealDays = 0;
    // Iterate realSales keys to sum up the corresponding projection
    Object.keys(realSales).forEach(dateKey => {
        const proj = projections[dateKey]?.amountAdjusted ?? calculatedProjections[dateKey]?.final ?? 0;
        projectedForRealDays += proj;
    });

    const globalCompliance = projectedForRealDays > 0 ? (totalReal / projectedForRealDays) * 100 : 0;

    return (
        <div className="h-full flex flex-col bg-gray-50/50 font-sans p-6 overflow-hidden">

            {/* Top Bar: Navigation & Quick Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Proyecciones</h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                        Planificación Estratégica & Cumplimiento
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="text-lg font-bold text-gray-900 w-40 text-center capitalize select-none">
                        {format(currentDate, 'MMMM yyyy', { locale: es })}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>

                <button
                    onClick={() => setIsConfigOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-gray-200 hover:bg-gray-800 transition-all transform hover:scale-105"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    Configurar IA
                </button>
            </div>

            {/* KPI Cards (Compact) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 shrink-0">
                {/* Meta Card */}
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Meta Total</p>
                        <p className="text-lg font-black text-gray-900 leading-tight">${(totalProjected / 1000000).toFixed(1)}M</p>
                        <div className="flex gap-1 mt-1">
                            <div className="text-[8px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Inf {config.inflationPercentage}%</div>
                            <div className="text-[8px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">Crec {config.growthPercentage}%</div>
                        </div>
                    </div>
                    <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                </div>

                {/* Real Card */}
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Venta Real</p>
                        <p className="text-lg font-black text-gray-900 leading-tight">${(totalReal / 1000000).toFixed(1)}M</p>
                        <p className="text-[9px] text-gray-400 font-medium">Acumulado</p>
                    </div>
                    <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                </div>

                {/* Compliance Card */}
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wide">Cumplimiento</p>
                        <div className="flex items-baseline gap-2">
                            <p className={`text-lg font-black leading-tight ${globalCompliance >= 100 ? 'text-emerald-600' : 'text-gray-900'}`}>
                                {Math.round(globalCompliance)}%
                            </p>
                        </div>
                        {/* Mini Progress Bar */}
                        <div className="w-16 h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
                            <div
                                className={`h-full rounded-full ${globalCompliance >= 100 ? 'bg-emerald-500' : 'bg-purple-500'}`}
                                style={{ width: `${Math.min(100, globalCompliance)}%` }}
                            />
                        </div>
                    </div>
                    <div className="p-1.5 bg-purple-50 rounded-lg text-purple-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                </div>
            </div>

            {/* Calendar Main - Full Width & Height Dominant */}
            <div className="flex-1 overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col mb-3">
                {/* Scrollable Area */}
                <div className="flex-1 overflow-y-auto pr-1">
                    {loading ? (
                        <div className="flex h-full items-center justify-center bg-white">
                            <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-100 border-t-indigo-600 mb-3"></div>
                                <span className="text-indigo-600 font-bold text-xs">Calculando...</span>
                            </div>
                        </div>
                    ) : (
                        <CalendarMap
                            currentDate={currentDate}
                            events={events}
                            calculatedProjections={calculatedProjections}
                            storedProjections={projections}
                            realSales={realSales}
                            onDayClick={handleDayClick}
                        />
                    )}
                </div>
            </div>

            {/* Info Section (Events & Tips) - Bottom & Compact */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 shrink-0 h-28">
                {/* Events List Widget - Horizontal Compact */}
                <div className="lg:col-span-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2 text-[10px] uppercase tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Eventos del Mes
                        </h3>
                        {events.length > 0 && (
                            <span className="text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
                                {events.length}
                            </span>
                        )}
                    </div>

                    <div className="overflow-x-auto custom-scrollbar pb-1 h-full">
                        {events.length === 0 ? (
                            <div className="flex items-center gap-4 text-gray-400 h-full">
                                <span className="text-xs">Sin eventos.</span>
                                <button onClick={() => setIsConfigOpen(true)} className="text-[10px] text-indigo-600 font-bold hover:underline bg-indigo-50 px-2 py-1 rounded">
                                    + Configurar
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-3 h-full items-center">
                                {events.map(e => (
                                    <div key={e.id} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-lg border border-gray-100 min-w-[150px] shrink-0 group relative hover:bg-white hover:shadow-sm transition-all cursor-default h-14">
                                        <div className={`
                                            flex flex-col items-center justify-center w-7 h-7 rounded-md text-[9px] font-bold shrink-0
                                            ${e.type === 'boost' ? 'bg-emerald-100 text-emerald-700' : e.type === 'drag' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}
                                        `}>
                                            <span>{format(new Date(e.date), 'dd')}</span>
                                            <span className="uppercase text-[7px]">{format(new Date(e.date), 'MMM', { locale: es }).slice(0, 3)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-gray-700 truncate leading-tight" title={e.name}>{e.name}</p>
                                            <p className="text-[8px] text-gray-400 leading-tight">{e.type === 'boost' ? 'Sube venta' : e.type === 'drag' ? 'Baja venta' : 'Neutro'}</p>
                                        </div>
                                        <button
                                            onClick={(ev) => { ev.stopPropagation(); deleteEvent(e.id); }}
                                            className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-white text-gray-300 hover:text-red-500 hover:bg-red-50 w-3.5 h-3.5 rounded-full shadow-sm flex items-center justify-center transition-all text-[10px]"
                                            title="Eliminar"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Tips Widget - Super Compact */}
                <div className="lg:col-span-1 bg-gradient-to-br from-indigo-600 to-indigo-800 p-3 rounded-xl shadow-lg text-white flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" /></svg>
                    </div>
                    <h3 className="font-bold text-xs mb-0.5 flex items-center gap-1 relative z-10">
                        💡 Tips IA
                    </h3>
                    <p className="text-[9px] text-indigo-100 leading-snug opacity-90 relative z-10 line-clamp-3">
                        Viernes festivos pueden subir venta +20%. Revisa clima local.
                    </p>
                </div>
            </div>

            {/* Modals */}
            {selectedDate && (
                <DayDetailsModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    date={selectedDate}
                    projectionResult={calculatedProjections[format(selectedDate, 'yyyy-MM-dd')]}
                    storedProjection={projections[format(selectedDate, 'yyyy-MM-dd')]}
                    events={events.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd'))}
                    config={config}
                    onAddEvent={addEvent}
                    onDeleteEvent={deleteEvent}
                    onSaveGoal={saveGoal}
                />
            )}

            <ConfigModal
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                config={config}
                onSave={setConfig}
                onSeedHolidays={seedHolidays}
                onSeedPaydays={seedPaydays}
            />
        </div>
    );
};
