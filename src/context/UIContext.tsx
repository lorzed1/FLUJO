import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UIContextType {
    alertModal: {
        isOpen: boolean;
        message: string;
        title?: string;
        type?: 'success' | 'error' | 'warning' | 'info';
        onConfirm?: () => void;
        showCancel?: boolean;
        confirmText?: string;
        cancelText?: string;
    };
    setAlertModal: (alert: {
        isOpen: boolean;
        message: string;
        title?: string;
        type?: 'success' | 'error' | 'warning' | 'info';
        onConfirm?: () => void;
        showCancel?: boolean;
        confirmText?: string;
        cancelText?: string;
    }) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [alertModal, setAlertModal] = useState<{
        isOpen: boolean;
        message: string;
        title?: string;
        type?: 'success' | 'error' | 'warning' | 'info';
        onConfirm?: () => void;
        showCancel?: boolean;
        confirmText?: string;
        cancelText?: string;
    }>({ isOpen: false, message: '' });

    return (
        <UIContext.Provider value={{
            alertModal,
            setAlertModal
        }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUI must be used within UIProvider');
    return context;
};
