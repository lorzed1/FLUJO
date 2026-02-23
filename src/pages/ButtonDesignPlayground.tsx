import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import {
    PlusIcon,
    CogIcon,
    ArrowDownTrayIcon,
    CalendarIcon,
    ListBulletIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';

const ButtonDesignPlayground: React.FC = () => {
    const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
    const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'history'>('overview');

    return (
        <div className="w-full max-w-6xl mx-auto space-y-12 pb-20">
            {/* INSTRUCCIONES GLOBALES */}
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-6 rounded-lg border border-blue-100 dark:border-blue-800/50 mt-6">
                <h2 className="text-xl font-bold mb-2">Playground de Botonera (Action Bar)</h2>
                <p className="text-[13px] leading-relaxed">
                    Esta página no está conectada a ninguna tabla ni base de datos. Es un campo de pruebas visual para
                    estandarizar la posición, tamaño y colores de los botones externos a las tablas en todo Aliaddo.
                    <br /><br />
                    La regla de oro es subdividir el <strong>PageHeader</strong> en 3 Zonas:
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Zona 1 (Izquierda):</strong> Título principal + Sub-navegación (Tabs) o Selector de Vista (Tabla/Calendario).</li>
                        <li><strong>Zona 2 (Centro):</strong> Controles Universales de Tiempo (Filtros de Mes/Año).</li>
                        <li><strong>Zona 3 (Derecha):</strong> Acciones (Botones Secundarios y 1 solo Botón Primario).</li>
                    </ul>
                </p>
            </div>

            {/* EJEMPLO 1: HEADER COMPÚESTO COMPLETO (Ideal para Presupuesto / Proyecciones) */}
            <section className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Ejemplo 1: Header Completo Módulo Pesado</h3>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">

                        {/* ZONA 1: Identidad y Sub-Navegación */}
                        <div className="flex flex-col gap-3 w-full md:w-auto overflow-x-auto">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Presupuesto</h1>

                            {/* Toggle Group View Mode (Segmented Control Estricto) */}
                            <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md w-fit shadow-sm overflow-hidden h-9">
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`flex items-center justify-center gap-2 px-4 h-full text-[13px] font-semibold transition-colors border-r border-slate-200 dark:border-slate-700 ${viewMode === 'table'
                                        ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                        : 'bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700'
                                        }`}
                                >
                                    <ListBulletIcon className="w-4 h-4" />
                                    Tabla
                                </button>
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={`flex items-center justify-center gap-2 px-4 h-full text-[13px] font-semibold transition-colors ${viewMode === 'calendar'
                                        ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                        : 'bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700'
                                        }`}
                                >
                                    <CalendarIcon className="w-4 h-4" />
                                    Calendario
                                </button>
                            </div>
                        </div>

                        {/* ZONA 2: Controladores de Tiempo (Densidad Media) */}
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-1 h-10 shadow-sm shrink-0">
                            <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-purple-600 transition-colors">
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            <span className="px-3 text-[12px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-widest min-w-[120px] text-center">
                                FEBRERO 2026
                            </span>
                            <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-purple-600 transition-colors">
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* ZONA 3: Acciones Globales */}
                        <div className="flex items-center justify-end gap-2 w-full md:w-auto shrink-0 h-10">
                            {/* Botón Secundario con Icono */}
                            <button className="h-full px-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md hover:bg-slate-50 hover:text-purple-600 dark:hover:bg-slate-700/80 text-[13px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 transition-all shadow-sm active:scale-95 group">
                                <CogIcon className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                                <span className="hidden sm:inline">Configurar</span>
                            </button>

                            {/* Botón Secundario de Exportación (Outline style) */}
                            <button className="h-full px-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md hover:bg-slate-50 hover:text-purple-600 dark:hover:bg-slate-700/80 text-[13px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 transition-all shadow-sm active:scale-95 group">
                                <ArrowDownTrayIcon className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                                <span className="hidden sm:inline">Exportar</span>
                            </button>

                            {/* Botón Primario Dominante (Usando azul corporativo intenso) */}
                            <button className="h-full px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-md shadow-purple-500/20 font-bold text-[13px] flex items-center gap-2 transition-all active:scale-95 border border-transparent hover:border-purple-400/50">
                                <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                                Nuevo Egreso
                            </button>
                        </div>

                    </div>
                </div>
            </section>

            {/* EJEMPLO 2: HEADER SIMPLIFICADO CON TABS (Ideal para Configuraciones o Settings) */}
            <section className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Ejemplo 2: Header de Ajustes (Solo Tabs y Acciones)</h3>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-md shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row items-end justify-between w-full border-b border-gray-100 dark:border-slate-800 pb-0 gap-4">

                        {/* ZONA 1: Identidad y TABS nativos (Sin Píldora) */}
                        <div className="flex flex-col gap-4 w-full md:w-auto">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ajustes del Sistema</h1>

                            {/* Tabs estilo Aliaddo (Subrayado Azul fuerte e inactivo tenue) */}
                            <div className="flex gap-1 border-b border-transparent">
                                {['Resumen', 'Detalles', 'Historial'].map((tab) => {
                                    const key = tab.toLowerCase() as any;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setActiveTab(key)}
                                            className={`px-4 pb-3 text-[13px] font-bold tracking-wide transition-all border-b-2 ${activeTab === key
                                                ? 'border-purple-600 text-purple-600'
                                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                        >
                                            {tab}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ZONA 2: Vacía en este caso (sin controles de tiempo) */}

                        {/* ZONA 3: Acciones Globales (Alienadas a la línea inferior del border) */}
                        <div className="flex items-center gap-2 mb-2">
                            <button className="h-10 px-4 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 rounded-md text-[13px] font-semibold transition-colors active:scale-95">
                                Cancelar
                            </button>
                            <button className="h-10 px-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-md shadow-md shadow-black/10 font-bold text-[13px] transition-transform active:scale-95 border border-transparent">
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ANATOMÍA DE BOTONES INDIVIDUALES (Fichas) */}
            <section className="space-y-4 pt-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Catalogo de Botones Permitidos</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">


                    {/* Tarjeta Botón Primario */}
                    <div className="bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6 rounded-lg border border-slate-100 dark:border-slate-800 gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <button className="h-10 px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-md shadow-purple-500/20 font-bold text-[13px] flex items-center gap-2 transition-all active:scale-95">
                            <PlusIcon className="w-4 h-4 stroke-[2.5]" /> Primario
                        </button>
                        <p className="text-[10px] text-slate-400 text-center font-mono uppercase tracking-widest">bg-purple-600 rounded-md font-bold shadow-md</p>
                    </div>

                    {/* Tarjeta Botón Secundario (Outline) */}
                    <div className="bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6 rounded-lg border border-slate-100 dark:border-slate-800 gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <button className="h-10 px-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md hover:bg-slate-50 hover:text-purple-600 text-[13px] font-semibold text-slate-600 transition-all shadow-sm active:scale-95 flex items-center gap-2">
                            <ArrowDownTrayIcon className="w-4 h-4" /> Secundario
                        </button>
                        <p className="text-[10px] text-slate-400 text-center font-mono uppercase tracking-widest">border-slate-200 font-semibold shadow-sm rounded-md</p>
                    </div>

                    {/* Tarjeta Botón Tercioario (Puro Ghost) */}
                    <div className="bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6 rounded-lg border border-slate-100 dark:border-slate-800 gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <button className="h-10 px-5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md text-[13px] font-semibold transition-colors active:scale-95">
                            Fantasma
                        </button>
                        <p className="text-[10px] text-slate-400 text-center font-mono uppercase tracking-widest">text-slate-500 hover:bg-slate-100 rounded-md</p>
                    </div>

                    {/* Tarjeta Peligro (Danger) */}
                    <div className="bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6 rounded-lg border border-slate-100 dark:border-slate-800 gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <button className="h-10 px-5 border border-red-200 bg-red-50 hover:bg-red-100 text-[13px] font-bold text-red-600 transition-all shadow-sm rounded-md active:scale-95 flex items-center gap-2">
                            Eliminar
                        </button>
                        <p className="text-[10px] text-slate-400 text-center font-mono uppercase tracking-widest">bg-red-50 text-red-600 border-red-200 rounded-md</p>
                    </div>

                </div>
            </section>

        </div>
    );
};

export default ButtonDesignPlayground;
