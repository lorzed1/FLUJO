import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import {
    PlusIcon,
    CogIcon,
    ArrowDownTrayIcon,
    CalendarIcon,
    ListBulletIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    TrashIcon
} from '../components/ui/Icons';

const ButtonDesignPlayground: React.FC = () => {
    const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
    const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'history'>('overview');

    return (
        <div className="w-full max-w-6xl mx-auto space-y-12 pb-20">
            {/* INSTRUCCIONES GLOBALES */}
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-6 rounded-lg border border-blue-100 dark:border-blue-800/50 mt-6">
                <h2 className="text-xl font-bold mb-2">Playground de Botonera (Action Bar)</h2>
                <p className="text-sm- leading-relaxed">
                    Esta página no está conectada a ninguna tabla ni base de datos. Es un campo de pruebas visual para
                    estandarizar la posición, tamaño y colores de los botones externos a las tablas en todo Aliaddo.
                </p>
            </div>

            {/* SECCIÓN NUEVA: ANATOMÍA GENERAL DE PÁGINA */}
            <section className="space-y-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="border-b border-slate-200 dark:border-slate-700 pb-3 mb-6">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wider">Anatomía Global de la Página (Layout)</h2>
                    <p className="text-sm text-slate-500 mt-1">Cómo se debe organizar la información para facilitar la navegación y lectura F-Pattern.</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* ZONA SUPERIOR */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border-l-4 border-l-blue-500 shadow-sm">
                        <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 w-6 h-6 rounded flex items-center justify-center text-xs">1</span>
                            Parte Superior (Encabezados y Navegación)
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 ml-8 leading-relaxed">
                            Aquí radica el <strong className="text-slate-800 dark:text-slate-300">Contexto Visual Principal</strong>. Los usuarios leen primero de izquierda a derecha. Utiliza el componente compuesto <code>PageHeader</code> para anclar la identidad de la página.
                        </p>
                        <ul className="text-xs text-slate-500 list-disc pl-12 space-y-1">
                            <li><strong>Zona 1 (Izquierda):</strong> Título descriptivo gigante + Sub-navegación (Tabs) o Selector de Vista.</li>
                            <li><strong>Zona 2 (Centro):</strong> Solo para Controles de Tiempo universales (Mes/Año a filtrar).</li>
                            <li><strong>Zona 3 (Derecha):</strong> Acciones primarias predominantes siempre a la derecha extrema (Crear, Guardar).</li>
                        </ul>
                    </div>

                    {/* ZONA CENTRAL */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border-l-4 border-l-purple-500 shadow-sm ml-4">
                        <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 w-6 h-6 rounded flex items-center justify-center text-xs">2</span>
                            Parte Central (Main Body & Contenido)
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 ml-8 leading-relaxed">
                            El área de trabajo activa. Para mantener la legibilidad, evita contenedores que abarquen el 100% de pantallas ultra anchas.
                        </p>
                        <ul className="text-xs text-slate-500 list-disc pl-12 space-y-1">
                            <li>Usa max-width (<code>max-w-7xl</code>) para evitar líneas de texto o tablas estiradas infinitamente.</li>
                            <li>Agrupa información en <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">&lt;Card&gt;</code>s con bordes sutiles (border-gray-100).</li>
                            <li>Todo elemento clickeable debe tener <code>cursor-pointer</code> obligatorio. Evita que el <i>hover</i> desplace elementos de su lugar.</li>
                        </ul>
                    </div>

                    {/* ZONA INFERIOR */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border-l-4 border-l-emerald-500 shadow-sm ml-8">
                        <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 w-6 h-6 rounded flex items-center justify-center text-xs">3</span>
                            Parte Inferior (Footer Actions o Paginación)
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 ml-8 leading-relaxed">
                            Es el lugar de anclaje para conclusiones. Nunca escondas acciones críticas al final de una página larga.
                        </p>
                        <ul className="text-xs text-slate-500 list-disc pl-12 space-y-1">
                            <li><strong>En Formularios largos:</strong> Usa Barras Flotantes Pegajosas (Sticky Bottom Action Bar) para botones Guardar/Cancelar.</li>
                            <li><strong>En Tablas:</strong> Reservado exclusivamente para Paginación, Contadores Totales numéricos o botones de carga diferida (Load More).</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* EJEMPLO 1: HEADER COMPUESTO COMPLETO (Ideal para Presupuesto / Proyecciones) */}
            <section className="space-y-4">
                <div className="border-b pb-2 mb-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Ejemplo 1: Header Completo (Módulos de Datos)</h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-4xl">
                        <strong className="text-slate-700 dark:text-slate-300">Cuándo usar:</strong> En páginas principales que manejan bases de datos complejas, calendarios o tablas financieras (ej: Presupuesto, Caja, Proyecciones).
                        <br />
                        <strong className="text-slate-700 dark:text-slate-300">Anatomía (F-pattern layout):</strong>
                        <span className="ml-1">Incluye selectores de vista (Tabla/Calendario) en la <strong>ZONA 1</strong>, filtros de tiempo (Mes/Año) unificados en la <strong>ZONA 2</strong>, y botones de exportación o creación en la <strong>ZONA 3</strong>.</span>
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">

                        {/* ZONA 1: Identidad y Sub-Navegación */}
                        <div className="flex flex-col gap-3 w-full md:w-auto overflow-x-auto">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Presupuesto</h1>

                            {/* Toggle Group View Mode (Segmented Control Estricto) */}
                            <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md w-fit shadow-sm overflow-hidden h-9">
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`flex items-center justify-center gap-2 px-4 h-full text-sm- font-semibold transition-colors border-r border-slate-200 dark:border-slate-700 ${viewMode === 'table'
                                        ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                        : 'bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700'
                                        }`}
                                >
                                    <ListBulletIcon className="w-4 h-4" />
                                    Tabla
                                </button>
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={`flex items-center justify-center gap-2 px-4 h-full text-sm- font-semibold transition-colors ${viewMode === 'calendar'
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
                            <span className="px-3 text-xs font-bold text-slate-700 dark:text-gray-200 uppercase tracking-widest min-w-[120px] text-center">
                                FEBRERO 2026
                            </span>
                            <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-400 hover:text-purple-600 transition-colors">
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* ZONA 3: Acciones Globales */}
                        <div className="flex items-center justify-end gap-2 w-full md:w-auto shrink-0 h-10">
                            {/* Botón Secundario con Icono */}
                            <button className="h-full px-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md hover:bg-slate-50 hover:text-purple-600 dark:hover:bg-slate-700/80 text-sm- font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 transition-all shadow-sm active:scale-95 group">
                                <CogIcon className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                                <span className="hidden sm:inline">Configurar</span>
                            </button>

                            {/* Botón Secundario de Exportación (Outline style) */}
                            <button className="h-full px-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md hover:bg-slate-50 hover:text-purple-600 dark:hover:bg-slate-700/80 text-sm- font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 transition-all shadow-sm active:scale-95 group">
                                <ArrowDownTrayIcon className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                                <span className="hidden sm:inline">Exportar</span>
                            </button>

                            {/* Botón Primario Dominante (Usando azul corporativo intenso) */}
                            <button className="h-full px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-md shadow-purple-500/20 font-bold text-sm- flex items-center gap-2 transition-all active:scale-95 border border-transparent hover:border-purple-400/50">
                                <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                                Nuevo Egreso
                            </button>
                        </div>

                    </div>
                </div>
            </section>

            {/* EJEMPLO 2: HEADER SIMPLIFICADO CON TABS (Ideal para Configuraciones o Settings) */}
            <section className="space-y-4 pt-4">
                <div className="border-b pb-2 mb-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Ejemplo 2: Header Simplificado (Ajustes y Detalles)</h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-4xl">
                        <strong className="text-slate-700 dark:text-slate-300">Cuándo usar:</strong> En vistas de configuración, creación/edición de registros detallados, o dashboards secundarios.
                        <br />
                        <strong className="text-slate-700 dark:text-slate-300">Anatomía:</strong>
                        <span className="ml-1">Omite la <strong>ZONA 2</strong> (flujo ligero). Agrupa las pestañas de navegación (Tabs) en la <strong>ZONA 1</strong>, y alinea los botones de ejecución final (Guardar, Cancelar) en la <strong>ZONA 3</strong>. El borde inferior (border-b) actúa como ancla visual para los tabs.</span>
                    </p>
                </div>

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
                                            className={`px-4 pb-3 text-sm- font-bold tracking-wide transition-all border-b-2 ${activeTab === key
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
                            <button className="h-10 px-4 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 rounded-md text-sm- font-semibold transition-colors active:scale-95">
                                Cancelar
                            </button>
                            <button className="h-10 px-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-md shadow-md shadow-black/10 font-bold text-sm- transition-transform active:scale-95 border border-transparent">
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
                    <div className="bg-white dark:bg-slate-900 flex flex-col items-start p-6 rounded-lg border border-slate-100 dark:border-slate-800 gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <Button variant="primary" className="w-full justify-center">
                            <PlusIcon className="w-4 h-4 stroke-[2.5]" /> Primario
                        </Button>
                        <div className="space-y-2 w-full">
                            <p className="text-xs2 text-slate-400 font-mono uppercase tracking-widest border-b border-slate-100 pb-2">variant="primary"</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                <strong className="text-slate-900 dark:text-white">Cuándo usar:</strong> Para la acción más importante de la vista (guardar, crear). Solo debe haber <strong>uno</strong> por contexto.
                            </p>
                            <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
                                <li>Asegura 44x44px touch-target en móvil.</li>
                                <li>Deshabilitar el botón durante cargas asíncronas.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Tarjeta Botón Secundario (Outline) */}
                    <div className="bg-white dark:bg-slate-900 flex flex-col items-start p-6 rounded-lg border border-slate-100 dark:border-slate-800 gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <Button variant="secondary" className="w-full justify-center">
                            <ArrowDownTrayIcon className="w-4 h-4" /> Secundario
                        </Button>
                        <div className="space-y-2 w-full">
                            <p className="text-xs2 text-slate-400 font-mono uppercase tracking-widest border-b border-slate-100 pb-2">variant="secondary"</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                <strong className="text-slate-900 dark:text-white">Cuándo usar:</strong> Acciones complementarias de peso medio (exportar, filtrar, descargar).
                            </p>
                            <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
                                <li>Mantener estado hover claro sin mover el layout.</li>
                                <li>Usa <code>cursor-pointer</code> obligatorio.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Tarjeta Botón Tercioario (Puro Ghost) */}
                    <div className="bg-white dark:bg-slate-900 flex flex-col items-start p-6 rounded-lg border border-slate-100 dark:border-slate-800 gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <Button variant="ghost" className="w-full justify-center">
                            Fantasma
                        </Button>
                        <div className="space-y-2 w-full">
                            <p className="text-xs2 text-slate-400 font-mono uppercase tracking-widest border-b border-slate-100 pb-2">variant="ghost"</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                <strong className="text-slate-900 dark:text-white">Cuándo usar:</strong> Acciones de baja prioridad visual (cancelar, ver más).
                            </p>
                            <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
                                <li>El hover cambia opacidad/fondo suavemente (~150ms).</li>
                                <li>Evita que atraiga excesiva atención visual.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Tarjeta Peligro (Danger) */}
                    <div className="bg-white dark:bg-slate-900 flex flex-col items-start p-6 rounded-lg border border-slate-100 dark:border-slate-800 gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <Button variant="danger" className="w-full justify-center">
                            <TrashIcon className="w-4 h-4" /> Eliminar
                        </Button>
                        <div className="space-y-2 w-full">
                            <p className="text-xs2 text-slate-400 font-mono uppercase tracking-widest border-b border-slate-100 pb-2">variant="danger"</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                <strong className="text-slate-900 dark:text-white">Cuándo usar:</strong> Para acciones muy destructivas y definitivas.
                            </p>
                            <ul className="text-xs text-slate-500 list-disc pl-4 space-y-1">
                                <li>Proveer un modal de confirmación antes de ejecutar.</li>
                                <li>Combinar el color rojo semántico con iconos claros.</li>
                            </ul>
                        </div>
                    </div>

                </div>
            </section>

        </div>
    );
};

export default ButtonDesignPlayground;
