import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, LightBulbIcon, ChartBarIcon, CalculatorIcon, ShoppingCartIcon, CurrencyDollarIcon, BanknotesIcon, PresentationChartLineIcon } from '../../../components/ui/Icons';

interface DashboardInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DashboardInfoModal: React.FC<DashboardInfoModalProps> = ({ isOpen, onClose }) => {
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
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left align-middle shadow-2xl transition-all border border-gray-200 dark:border-slate-700">

                                {/* Header */}
                                <div className="bg-gray-50 dark:bg-slate-800/50 px-5 py-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                    <Dialog.Title as="h3" className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <LightBulbIcon className="h-5 w-5 text-purple-500" />
                                        Metodología del Dashboard (KPIs y Gráficas)
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 p-1 transition-colors"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-5 space-y-6 max-h-[65vh] overflow-y-auto custom-scrollbar">

                                    <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">
                                        A continuación, te explicamos cómo se calculan las métricas clave y qué datos de base toman para reflejarse en los diferentes tableros de Business Intelligence.
                                    </p>

                                    {/* 1. Módulo de Compras */}
                                    <section>
                                        <div className="flex items-center gap-2 mb-3">
                                            <ShoppingCartIcon className="h-5 w-5 text-purple-600" />
                                            <h4 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest">Módulo de Compras</h4>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="p-3 rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                                                <p className="font-semibold text-[13px] text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                    Total Compras (Mensual)
                                                </p>
                                                <p className="text-[12px] text-gray-500 dark:text-gray-400 ml-3.5 leading-tight">
                                                    Es la suma directa de todos los valores registrados en la columna <code>debito</code> de la tabla <code>budget_purchases</code> ocurridos durante el mes.
                                                    El indicador "% vs mes anterior" compara esa sumatoria completa con el equivalente exacto del mes cronológico anterior.
                                                </p>
                                            </div>

                                            <div className="p-3 rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                                                <p className="font-semibold text-[13px] text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                    % Compras vs Ventas
                                                </p>
                                                <p className="text-[12px] text-gray-500 dark:text-gray-400 ml-3.5 leading-tight mb-2">
                                                    Relaciona la proporción de dinero gastado en insumos u operaciones (compras) respecto al total verdadero vendido en local (Venta Bruta descontando el Ingreso por Covers).
                                                </p>
                                                <div className="bg-white dark:bg-slate-800 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded">
                                                    <p className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold text-center">
                                                        Total Compras / (∑ Venta Bruta [arqueos] - ∑ Ingreso Covers)
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="p-3 rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                                                <p className="font-semibold text-[13px] text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    Evolución de Compras y Presupuesto
                                                </p>
                                                <p className="text-[12px] text-gray-500 dark:text-gray-400 ml-3.5 leading-tight mb-2">
                                                    Para la Gráfica de <b>Evolución por Semana</b>, agrupamos las fechas de compras bajo un número de Semana ISO (<code>getISOWeekNumber</code>).
                                                    El "Presupuesto" de la Semana Actual (Línea Verde) toma como ley que solo debes gastar máximo un <b>40%</b> sobre las Ventas logradas en la <i>Semana Anterior</i>, garantizando rentabilidad y flujo de caja seguro. Los "Anillos" simplemente expresan si te has pasado del 100% de dicho presupuesto.
                                                </p>
                                                <div className="bg-white dark:bg-slate-800 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded">
                                                    <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold text-center mb-1">
                                                        Límite Presupuesto = Ventas Netas(Semana Anterior) × 0.40
                                                    </p>
                                                    <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold text-center">
                                                        % Cumplimiento = (Compras de la Semana / Límite Presupuesto) × 100
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Divider */}
                                    <div className="border-t border-gray-100 dark:border-slate-700" />

                                    {/* 2. Módulo de Ventas e Ingresos Generales */}
                                    <section>
                                        <div className="flex items-center gap-2 mb-3">
                                            <ChartBarIcon className="h-5 w-5 text-sky-500" />
                                            <h4 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest">Módulo de Ventas</h4>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="p-3 rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                                                <p className="font-semibold text-[13px] text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                                                    Venta Bruta vs Neta
                                                </p>
                                                <ul className="text-[12px] text-gray-500 dark:text-gray-400 ml-3.5 leading-tight list-disc pl-4 space-y-1">
                                                    <li><b>Venta Bruta Mensual:</b> Suma directa de <code>venta_pos</code> de la tabla <code>arqueos</code>. Es el total crudo que entró al negocio.</li>
                                                    <li><b>Venta Neta (Local):</b> Es la Venta Bruta restando los reportes de <code>ingreso_covers</code>. Representa tu verdadero volumen de negocio por venta de productos de inventario.</li>
                                                    <li><b>Covers Totales:</b> Suma de <code>ingreso_covers</code> de la tabla <code>arqueos</code> dentro del periodo seleccionado.</li>
                                                </ul>
                                            </div>
                                            <div className="p-3 rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                                                <p className="font-semibold text-[13px] text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                                                    Bancos vs Efectivo
                                                </p>
                                                <p className="text-[12px] text-gray-500 dark:text-gray-400 ml-3.5 leading-tight">
                                                    Compara gráficamente a dónde está entrando la liquidez. Toma y totaliza los campos <code>ingreso_bancos</code> y <code>ingreso_efectivo</code> directamente de cada formulario de Cierre/Arqueo diario.
                                                </p>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Divider */}
                                    <div className="border-t border-gray-100 dark:border-slate-700" />

                                    {/* 3. Módulo General y Otros */}
                                    <section>
                                        <div className="flex items-center gap-2 mb-3">
                                            <PresentationChartLineIcon className="h-5 w-5 text-gray-600" />
                                            <h4 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest">General, Egresos y Reglas</h4>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="p-3 rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                                                <p className="font-semibold text-[13px] text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                    Total Egresos (Módulo de Egresos)
                                                </p>
                                                <p className="text-[12px] text-gray-500 dark:text-gray-400 ml-3.5 leading-tight">
                                                    Funciona tomando todos los movimientos de la tabla <code>transactions</code> (Registro de Transacciones manuales) cuyo <code>type</code> sea etiquetado como "Gasto" o valor negativo.
                                                    Los desglosa por categorías como "Nómina", "Servicios", etc. para construir las donas analíticas.
                                                </p>
                                            </div>
                                            <div className="p-3 rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                                                <p className="font-semibold text-[13px] text-gray-700 dark:text-gray-200 mb-1 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                    Agrupamiento de Datos (Fechas Semanales)
                                                </p>
                                                <p className="text-[12px] text-gray-500 dark:text-gray-400 ml-3.5 leading-tight">
                                                    El sistema entero agrupa información financiera en el calendario desde el <b>Lunes hasta el Domingo</b> de cada semana como una unidad comercial.
                                                    Para gráficas mensuales, un filtro limitará los datos <i>estrictamente</i> al día 1 y último del mes calendario.
                                                </p>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                {/* Footer */}
                                <div className="bg-gray-50 dark:bg-slate-800/50 px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                                    <button
                                        onClick={onClose}
                                        className="h-8 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
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
