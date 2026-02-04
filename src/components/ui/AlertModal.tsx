import React from 'react';
// import { Button } from './Button';
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
    if (!isOpen) return null;

    const getStyles = () => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-green-50 dark:bg-green-900/30',
                    border: 'border-green-200 dark:border-green-800',
                    icon: <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />,
                    iconBg: 'bg-green-100 dark:bg-green-900/50',
                    iconColor: 'text-green-600 dark:text-green-400',
                    titleColor: 'text-green-900 dark:text-green-100',
                    buttonBg: 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white',
                };
            case 'error':
                return {
                    bg: 'bg-red-50 dark:bg-red-900/30',
                    border: 'border-red-200 dark:border-red-800',
                    icon: <XCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />,
                    iconBg: 'bg-red-100 dark:bg-red-900/50',
                    iconColor: 'text-red-600 dark:text-red-400',
                    titleColor: 'text-red-900 dark:text-red-100',
                    buttonBg: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white',
                };
            case 'warning':
                return {
                    bg: 'bg-amber-50 dark:bg-amber-900/30',
                    border: 'border-amber-200 dark:border-amber-800',
                    icon: <ExclamationTriangleIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" />,
                    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
                    iconColor: 'text-amber-600 dark:text-amber-400',
                    titleColor: 'text-amber-900 dark:text-amber-100',
                    buttonBg: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 text-white',
                };
            default:
                return {
                    bg: 'bg-white dark:bg-slate-800',
                    border: 'border-gray-200 dark:border-slate-700',
                    icon: <InformationCircleIcon className="w-8 h-8 text-primary dark:text-blue-400" />,
                    iconBg: 'bg-indigo-50 dark:bg-indigo-900/30',
                    iconColor: 'text-primary dark:text-blue-400',
                    titleColor: 'text-gray-900 dark:text-white',
                    buttonBg: 'bg-primary hover:bg-primary/90 dark:bg-blue-600 dark:hover:bg-blue-500 text-white',
                };
        }
    };

    const styles = getStyles();

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={onClose}
        >
            <div
                className={`${styles.bg} border ${styles.border} rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-4">
                    <div className={`${styles.iconBg} ${styles.iconColor} rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold flex-shrink-0`}>
                        {styles.icon}
                    </div>
                    <div className="flex-1">
                        {title && (
                            <h3 className={`text-lg font-bold ${styles.titleColor} mb-2`}>
                                {title}
                            </h3>
                        )}
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {message}
                        </p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    {(showCancel || onConfirm) && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => {
                            if (onConfirm) {
                                onConfirm();
                            } else {
                                onClose();
                            }
                        }}
                        className={`px-6 py-2 rounded-lg font-semibold transition-colors text-sm shadow-sm ${styles.buttonBg}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;
