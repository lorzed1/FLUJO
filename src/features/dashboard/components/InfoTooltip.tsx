import React, { useState, useRef, useEffect } from 'react';
import { InformationCircleIcon } from '../../../components/ui/Icons';

interface InfoTooltipProps {
    /** Título del tooltip (ej: "Cumplimiento") */
    title: string;
    /** Descripción o fórmula de cálculo */
    description: string;
    /** Fórmula matemática (opcional, se muestra en monospace) */
    formula?: string;
    /** Fuente de datos (ej: "Historial de Cierres + Proyecciones") */
    source?: string;
    /** Tamaño del icono */
    size?: 'sm' | 'md';
}

/**
 * InfoTooltip — Botón ⓘ que muestra un popover con la explicación
 * de cómo se calcula un KPI o de dónde provienen los datos de una gráfica.
 *
 * Usado en: KPI cards y chart headers del dashboard.
 */
export const InfoTooltip: React.FC<InfoTooltipProps> = ({
    title,
    description,
    formula,
    source,
    size = 'sm'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ left?: string, right?: string }>({ right: '0' });
    const [arrowPos, setArrowPos] = useState<{ left?: string, right?: string }>({ right: '12px' });

    // Cuando el popover se abre, detectamos inteligentemente en qué eje queda mejor
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // Determinamos si estamos en la mitad izquierda o derecha de la pantalla
            // para decidir hacia dónde expandir el tooltip sin chocar con los bordes (especialmente la sidebar)
            if (rect.left < window.innerWidth / 2) {
                setPosition({ left: '0' });
                setArrowPos({ left: '12px' });
            } else {
                setPosition({ right: '0' });
                setArrowPos({ right: '12px' });
            }
        }
    }, [isOpen]);

    // Cerrar al hacer click fuera
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Cerrar con Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    return (
        <div ref={containerRef} className="relative inline-flex">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`
                    p-0.5 rounded-full text-gray-400 hover:text-purple-500 
                    dark:text-gray-500 dark:hover:text-purple-400
                    hover:bg-purple-50 dark:hover:bg-purple-900/20
                    transition-colors cursor-pointer
                `}
                title={`Info: ${title}`}
                aria-label={`Información sobre ${title}`}
            >
                <InformationCircleIcon className={iconSize} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop sutil en móvil */}
                    <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setIsOpen(false)} />

                    {/* Popover */}
                    <div
                        ref={popoverRef}
                        className="absolute z-[100] w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 animate-in fade-in zoom-in-95 duration-150"
                        style={{
                            top: '100%',
                            marginTop: '4px',
                            ...position
                        }}
                    >
                        {/* Arrow */}
                        <div
                            className="absolute -top-1.5 w-3 h-3 bg-white dark:bg-gray-800 border-t border-l border-gray-200 dark:border-gray-700 rotate-45"
                            style={arrowPos}
                        />

                        {/* Content */}
                        <div className="relative">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                    {title}
                                </h4>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
                                {description}
                            </p>

                            {/* Formula */}
                            {formula && (
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md px-2.5 py-2 mb-2 border border-gray-100 dark:border-gray-600">
                                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fórmula</span>
                                    <p className="text-[11px] font-mono font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                                        {formula}
                                    </p>
                                </div>
                            )}

                            {/* Data Source */}
                            {source && (
                                <div className="flex items-start gap-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700">
                                    <svg className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
                                        Fuente: {source}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
