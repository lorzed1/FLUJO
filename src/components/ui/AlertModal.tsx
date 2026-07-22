import React from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from './Icons';
import { Modal } from './Modal';
import { Button } from './Button';

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

    const headerTitle = (
        <div className="flex items-center gap-3">
            {getIcon()}
            <span>{title || (type === 'error' ? 'Error' : type === 'success' ? 'Éxito' : 'Información')}</span>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={headerTitle}
            maxWidth="max-w-md"
        >
            <div className="p-5">
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {message}
                </p>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800/50 px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3 mt-auto">
                {(showCancel || onConfirm) && (
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        className="h-8 !px-3 text-xs"
                    >
                        {cancelText}
                    </Button>
                )}
                <Button
                    type="button"
                    variant={type === 'error' ? 'danger' : 'primary'}
                    onClick={() => {
                        if (onConfirm) {
                            onConfirm();
                        } else {
                            onClose();
                        }
                    }}
                    className="h-8 !px-4 text-xs"
                >
                    {confirmText}
                </Button>
            </div>
        </Modal>
    );
};

export default AlertModal;
