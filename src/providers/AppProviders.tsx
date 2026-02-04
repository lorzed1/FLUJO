import React, { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { UIProvider } from '../context/UIContext';
import { AppProvider } from '../context/AppContext';

/**
 * AppProviders: Composición optimizada de contextos
 * 
 * Orden de importancia (de afuera hacia adentro):
 * 1. Router (base de navegación)
 * 2. Auth (autenticación global)
 * 3. UI (estado de interfaz)
 * 4. Data (transacciones, categorías, etc.)
 */
export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <UIProvider>
                    <AppProvider>
                        {children}
                    </AppProvider>
                </UIProvider>
            </AuthProvider>
        </BrowserRouter>
    );
};
