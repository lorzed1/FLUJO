import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ReconciliationResult, Transaction } from '../types';
import { DataService } from '../services/storage';
import { DatabaseService } from '../services/database';
import { calculateTotalRecaudado, calculateDescuadre } from '../utils/excelParser';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { useUI } from './UIContext';

// ============================================
// Tipos
// ============================================

export interface ArqueoContextType {
    // State
    arqueos: any[];
    isArqueosLoading: boolean;

    // CRUD
    handleSaveArqueo: (data: any, total: number) => Promise<string | boolean>;
    handleUpdateArqueo: (id: string, field: string, value: string | number) => Promise<void>;
    handleDeleteArqueo: (id: string) => Promise<void>;
    handleMigrateArqueos: () => Promise<void>;

    // Setter interno
    setArqueos: React.Dispatch<React.SetStateAction<any[]>>;
}

export interface ReconciliationContextType {
    bankTransactions: Record<string, Transaction[]>;
    reconciliationResults: Record<string, ReconciliationResult | null>;
    setBankTransactions: React.Dispatch<React.SetStateAction<Record<string, Transaction[]>>>;
    setReconciliationResults: React.Dispatch<React.SetStateAction<Record<string, ReconciliationResult | null>>>;
}

// ============================================
// Contexts
// ============================================

const ArqueoContext = createContext<ArqueoContextType | undefined>(undefined);
const ReconciliationContext = createContext<ReconciliationContextType | undefined>(undefined);

// ============================================
// ArqueoProvider
// ============================================

export const ArqueoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { setAlertModal } = useUI();
    const [arqueos, setArqueos] = useState<any[]>([]);
    const [isArqueosLoading, setIsArqueosLoading] = useState(true);

    // Carga Inicial de Arqueos
    useEffect(() => {
        const loadArqueos = async () => {
            try {
                setIsArqueosLoading(true);
                const loadedArqueos = await DatabaseService.getArqueos();
                setArqueos(loadedArqueos);

                // Purga automática de registros antiguos (> 2 días)
                // await DatabaseService.autoPurgeOldData(); // DESACTIVADO TEMPORALMENTE PARA EVITAR BORRADO DE HISTORIAL

                console.log(`✅ ArqueoContext: Cargados ${loadedArqueos.length} registros de arqueo.`);
            } catch (error) {
                console.error('❌ Error cargando arqueos:', error);
            } finally {
                setIsArqueosLoading(false);
            }
        };

        loadArqueos();
    }, []);

    // ====== ACTIONS ======

    const handleSaveArqueo = async (data: any, total: number): Promise<string | boolean> => {
        try {
            const totalIngresos = (Number(data.ventaBruta) || 0) + (Number(data.propina) || 0);
            const totalRecaudadoCalc = calculateTotalRecaudado(data);
            const descuadreCalculado = calculateDescuadre(data);
            const newId = await DatabaseService.saveArqueo({
                ...data,
                totalIngresos,
                totalRecaudado: totalRecaudadoCalc,
                descuadre: descuadreCalculado
            });
            const updatedArqueos = await DatabaseService.getArqueos();
            setArqueos(updatedArqueos);
            setAlertModal({ isOpen: true, message: 'Arqueo guardado exitosamente.', type: 'success', title: 'Arqueo Guardado' });
            return newId;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            setAlertModal({ isOpen: true, message: `Error al guardar el arqueo: ${message}`, type: 'error', title: 'Error de Guardado' });
            return false;
        }
    };

    const handleUpdateArqueo = async (id: string, field: string, value: string | number) => {
        try {
            setArqueos(prev => {
                const updatedArqueos = prev.map(a => {
                    if (a.id === id) {
                        const updated = { ...a, [field]: value };
                        const totalIngresos = (Number(updated.ventaBruta) || 0) + (Number(updated.propina) || 0);
                        const totalEgresos = calculateTotalRecaudado(updated);
                        const desc = calculateDescuadre(updated);
                        const final = { ...updated, totalIngresos, totalRecaudado: totalEgresos, descuadre: desc };
                        DatabaseService.updateArqueo(id, final);
                        return final;
                    }
                    return a;
                });
                return updatedArqueos;
            });
        } catch (error) {
            console.error(error);
            const loaded = await DatabaseService.getArqueos();
            setArqueos(loaded);
        }
    };

    const handleDeleteArqueo = async (id: string) => {
        try {
            await DatabaseService.deleteArqueo(id);
            setArqueos(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            setAlertModal({ isOpen: true, message: 'Error al eliminar el arqueo.', type: 'error', title: 'Error' });
        }
    };

    const handleMigrateArqueos = async () => {
        try {
            setAlertModal({ isOpen: true, message: 'Recalculando arqueos...', type: 'info', title: 'Migración' });
            const loadedArqueos = await DatabaseService.getArqueos();
            const migrated = loadedArqueos.map(a => {
                const totalIngresos = (Number(a.ventaBruta) || 0) + (Number(a.propina) || 0);
                const totalEgresos = calculateTotalRecaudado(a);
                const descuadre = calculateDescuadre(a);
                return { ...a, totalIngresos, totalRecaudado: totalEgresos, descuadre };
            });
            for (const a of migrated) await DatabaseService.updateArqueo(a.id, a);
            setArqueos(migrated);
            setAlertModal({ isOpen: true, message: 'Migración completada.', type: 'success', title: 'Éxito' });
        } catch (error) {
            setAlertModal({ isOpen: true, message: 'Error en migración.', type: 'error', title: 'Error' });
        }
    };

    return (
        <ArqueoContext.Provider value={{
            arqueos, isArqueosLoading,
            handleSaveArqueo, handleUpdateArqueo, handleDeleteArqueo, handleMigrateArqueos,
            setArqueos
        }}>
            {children}
        </ArqueoContext.Provider>
    );
};

// ============================================
// ReconciliationProvider
// ============================================

export const ReconciliationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [bankTransactions, setBankTransactions] = useState<Record<string, Transaction[]>>({});
    const [reconciliationResults, setReconciliationResults] = useState<Record<string, ReconciliationResult | null>>({});
    const [isDataReady, setIsDataReady] = useState(false);

    // Marcar como listo después del primer render para habilitar auto-save
    useEffect(() => {
        const loadInitial = async () => {
            try {
                const data = await DataService.loadInitialData();
                setBankTransactions(data.bankTransactions);
                setReconciliationResults(data.reconciliationResults);
                setIsDataReady(true);
            } catch (error) {
                console.error('❌ Error cargando datos de reconciliación:', error);
            }
        };
        loadInitial();
    }, []);

    // Auto-Save
    useDebouncedSave(bankTransactions, DataService.saveBankTransactions, 2000, isDataReady);
    useDebouncedSave(reconciliationResults, DataService.saveReconciliationResults, 2000, isDataReady);

    return (
        <ReconciliationContext.Provider value={{
            bankTransactions, reconciliationResults,
            setBankTransactions, setReconciliationResults
        }}>
            {children}
        </ReconciliationContext.Provider>
    );
};

// ============================================
// Hooks
// ============================================

export const useArqueos = () => {
    const context = useContext(ArqueoContext);
    if (!context) throw new Error('useArqueos must be used within an ArqueoProvider');
    return context;
};

export const useReconciliation = () => {
    const context = useContext(ReconciliationContext);
    if (!context) throw new Error('useReconciliation must be used within a ReconciliationProvider');
    return context;
};
