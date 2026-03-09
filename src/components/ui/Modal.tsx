import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@/components/ui/Icons';
import clsx from 'clsx'; // O asumimos concatenación simple si no está clsx

export interface ModalProps {
    /** Controla si el modal está visible */
    isOpen: boolean;
    /** Función a ejecutar cuando el usuario intenta cerrar el modal (clic fuera, ESC o X) */
    onClose: () => void;
    /** Título opcional a mostrar en la cabecera por defecto */
    title?: React.ReactNode;
    /** Contenido interno del modal */
    children: React.ReactNode;
    /** Ancho máximo (ej. max-w-md, max-w-2xl, max-w-7xl). Por defecto max-w-lg */
    maxWidth?: string;
    /** Clases de Tailwind adicionales para inyectar en el panel flotante (background, padding, etc) */
    className?: string;
    /** Oculta el IconButton (X) de cerrado en la esquina superior derecha */
    hideCloseIcon?: boolean;
    /** Inhabilita cerrar al dar clic por fuera del modal (se debe pasar un noop () => {} a onClose si se quiere forzar) */
    disableClickOutside?: boolean;
    /** Subtítulo o texto descriptivo que acompaña al título principal */
    description?: React.ReactNode;
}

/**
 * Componente `<Modal>` Maestro (Átomo UI)
 * 
 * Reemplaza la escritura manual intensiva de `<div className="fixed inset-0 bg-black/60...` 
 * Asegura animaciones suaves, accesibilidad ARIA completa mediante HeadlessUI
 * y control de z-index centralizado para todo el proyecto.
 */
export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'max-w-lg',
    className = '',
    hideCloseIcon = false,
    disableClickOutside = false,
    description
}) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog
                as="div"
                className="relative z-[100]" // Global Z-Index unificado para modales base
                onClose={disableClickOutside ? () => { } : onClose}
            >
                {/* Overlay Oscuro Blur */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px]" aria-hidden="true" />
                </Transition.Child>

                {/* Contenedor del Scroll Flotante */}
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
                            <Dialog.Panel
                                className={`w-full ${maxWidth} transform overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow-2xl text-left align-middle transition-all border border-slate-100 dark:border-slate-700 flex flex-col ${className}`}
                            >
                                {/* Default Header Rendereader si pasan title */}
                                {(title || !hideCloseIcon) && (
                                    <div className="flex justify-between items-start px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 shrink-0">
                                        <div>
                                            {title && (
                                                <Dialog.Title as="h3" className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                                                    {title}
                                                </Dialog.Title>
                                            )}
                                            {description && (
                                                <Dialog.Description className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">
                                                    {description}
                                                </Dialog.Description>
                                            )}
                                        </div>

                                        {!hideCloseIcon && (
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors p-1.5 rounded-lg ml-auto focus:outline-none"
                                            >
                                                <XMarkIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Slot Inyectable (Body o Custom Layouts completos) */}
                                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                                    {children}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};
