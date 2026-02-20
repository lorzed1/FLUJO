import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from './Icons';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    showCancel?: boolean;
}

const AlertModal: React.FC<AlertModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    onConfirm,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    showCancel = false
}) => {
    const getIcon = () => {
        const iconClasses = "w-5 h-5";
        switch (type) {
            case 'success':
                return <CheckCircleIcon className={`${iconClasses} text-emerald-600`} />;
            case 'error':
                return <XCircleIcon className={`${iconClasses} text-red-600`} />;
            case 'warning':
                return <ExclamationTriangleIcon className={`${iconClasses} text-amber-500`} />;
            default:
                return <InformationCircleIcon className={`${iconClasses} text-purple-600`} />;
        }
    };

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
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xl text-left align-middle transition-all">
                                {/* Header */}
                                <div className="bg-gray-50 dark:bg-slate-800/50 px-5 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
                                    {getIcon()}
                                    <Dialog.Title as="h3" className="text-base font-bold text-gray-800 dark:text-gray-100">
                                        {title || (type === 'error' ? 'Error' : type === 'success' ? 'Éxito' : 'Información')}
                                    </Dialog.Title>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                        {message}
                                    </p>
                                </div>

                                {/* Footer */}
                                <div className="bg-gray-50 dark:bg-slate-800/50 px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
                                    {(showCancel || onConfirm) && (
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="h-8 px-3 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            {cancelText}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (onConfirm) {
                                                onConfirm();
                                            } else {
                                                onClose();
                                            }
                                        }}
                                        className="h-8 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-xs font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors border-transparent"
                                    >
                                        {confirmText}
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

export default AlertModal;
