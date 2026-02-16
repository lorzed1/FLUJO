import React, { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { UIProvider } from '../context/UIContext';
import { DataProvider } from '../context/DataContext';
import { ArqueoProvider, ReconciliationProvider } from '../context/ArqueoContext';

/**
 * AppProviders: Composición optimizada de contextos
 * 
 * Orden de importancia (de afuera hacia adentro):
 * 1. Router (base de navegación)
 * 2. Auth (autenticación global)
 * 3. UI (estado de interfaz — alertas, modales)
 * 4. Data (transacciones, categorías, presupuestos)
 * 5. Arqueo (arqueos de caja — Firestore)
 * 6. Reconciliation (conciliación bancaria)
 * 

 */
export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <UIProvider>
                    <DataProvider>
                        <ArqueoProvider>
                            <ReconciliationProvider>
                                {children}
                            </ReconciliationProvider>
                        </ArqueoProvider>
                    </DataProvider>
                </UIProvider>
            </AuthProvider>
        </BrowserRouter>
    );
};
