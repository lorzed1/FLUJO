import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Transaction, TransactionType, RecurringExpense, Category, RecurringExpenseOverrides, RecurringExpenseOverride, ReconciliationResult } from '../types';
import { DataService } from '../services/storage';
import { FirestoreService } from '../services/firestore';
import { calculateTotalRecaudado, calculateDescuadre } from '../utils/excelParser';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { useGeneratedTransactions } from '../hooks/useGeneratedTransactions';
import { useAuth } from './AuthContext';
import { useUI } from './UIContext';

interface AppContextType {
    // State
    isLoading: boolean;
    categories: Category[];
    transactions: Transaction[];
    recurringExpenses: RecurringExpense[];
    recordedDays: Set<string>;
    arqueos: any[];
    bankTransactions: Record<string, Transaction[]>;
    reconciliationResults: Record<string, ReconciliationResult | null>;

    // Computed
    memoizedAllTransactions: Transaction[];

    // CRUD
    addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
    updateTransaction: (id: string, updatedFields: Partial<Transaction>) => void;
    deleteTransaction: (id: string) => void;
    updateTransactionDate: (id: string, newDate: string) => void;
    updateTransactionAmount: (id: string, amount: number) => void;

    addRecurringExpense: (expense: Omit<RecurringExpense, 'id'>) => void;
    updateRecurringExpense: (id: string, updatedFields: Partial<RecurringExpense>) => void;
    deleteRecurringExpense: (id: string) => void;
    updateRecurringExpenseOverride: (recurringId: string, originalDateKey: string, newOverride: Partial<RecurringExpenseOverride>) => void;

    addCategory: (category: Omit<Category, 'id'>) => void;
    deleteCategory: (id: string) => void;

    recordDay: (date: string) => void;

    // Data Handlers
    handleExport: () => Promise<void>;
    handleImport: (file: File) => Promise<void>;
    handleSaveArqueo: (data: any, total: number) => Promise<string | boolean>;
    handleUpdateArqueo: (id: string, field: string, value: string | number) => Promise<void>;
    handleDeleteArqueo: (id: string) => Promise<void>;
    handleMigrateArqueos: () => Promise<void>;

    // State Setters
    setBankTransactions: React.Dispatch<React.SetStateAction<Record<string, Transaction[]>>>;
    setReconciliationResults: React.Dispatch<React.SetStateAction<Record<string, ReconciliationResult | null>>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Consumir contextos especializados
    const { setAlertModal } = useUI();

    // Data State (sin Auth ni UI)
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [recurringOverrides, setRecurringOverrides] = useState<RecurringExpenseOverrides>({});
    const [recordedDays, setRecordedDays] = useState<Set<string>>(new Set());
    const [arqueos, setArqueos] = useState<any[]>([]);

    // Data Guardian State
    const [bankTransactions, setBankTransactions] = useState<Record<string, Transaction[]>>({});
    const [reconciliationResults, setReconciliationResults] = useState<Record<string, ReconciliationResult | null>>({});

    // === EFFECTS ===

    // Load Initial Data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setIsLoading(true);
                setIsDataLoaded(false);

                const data = await DataService.loadInitialData();

                setCategories(data.categories);
                setTransactions(data.transactions);
                setRecurringExpenses(data.recurringExpenses);
                setRecurringOverrides(data.recurringOverrides);
                setRecordedDays(new Set(data.recordedDays));
                setBankTransactions(data.bankTransactions);
                setReconciliationResults(data.reconciliationResults);

                const loadedArqueos = await FirestoreService.getArqueos();
                setArqueos(loadedArqueos);

                // Purga automática de registros antiguos (> 2 días)
                // User Request: Mantener solo últimos 2 días de Arqueos y Transferencias
                await FirestoreService.autoPurgeOldData();

                setIsDataLoaded(true);
                console.log('✅ AppContext: Datos cargados correctamente.');

            } catch (error) {
                console.error('❌ Error CRÍTICO cargando datos:', error);
                setAlertModal({
                    isOpen: true,
                    message: 'Error crítico al cargar los datos. Auto-guardado desactivado.',
                    type: 'error',
                    title: 'Error de Protección de Datos'
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, []);

    // 3. Auto-Save Effects (Optimized with Debouncing)
    useDebouncedSave(categories, DataService.saveCategories, 2000, isDataLoaded && !isLoading);
    useDebouncedSave(transactions, DataService.saveTransactions, 2000, isDataLoaded && !isLoading);
    useDebouncedSave(recurringExpenses, DataService.saveRecurringExpenses, 2000, isDataLoaded && !isLoading);
    useDebouncedSave(recurringOverrides, DataService.saveRecurringOverrides, 2000, isDataLoaded && !isLoading);
    useDebouncedSave(recordedDays, DataService.saveRecordedDays, 2000, isDataLoaded && !isLoading);
    useDebouncedSave(bankTransactions, DataService.saveBankTransactions, 2000, isDataLoaded && !isLoading);
    useDebouncedSave(reconciliationResults, DataService.saveReconciliationResults, 2000, isDataLoaded && !isLoading);

    // === LOGIC === (Optimized)

    // Generar transacciones recurrentes futuras (6 meses en vez de 18)
    const memoizedAllTransactions = useGeneratedTransactions(
        transactions,
        recurringExpenses,
        recurringOverrides,
        recordedDays,
        6 // Meses a futuro
    );

    // === ACTIONS ===

    const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
        const newTransaction: Transaction = {
            ...transaction,
            id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        setTransactions(prev => [...prev, newTransaction].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    };

    const updateTransaction = (id: string, updatedFields: Partial<Transaction>) => {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedFields } : t));
    };

    const deleteTransaction = (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

    const updateTransactionDate = (id: string, newDate: string) => {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, date: newDate } : t));
    };

    const updateTransactionAmount = (id: string, amount: number) => {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, amount } : t));
    };

    const addRecurringExpense = (expense: Omit<RecurringExpense, 'id'>) => {
        const newRecurringExpense: RecurringExpense = { ...expense, id: 'r' + Date.now() + Math.random() };
        setRecurringExpenses(prev => [...prev, newRecurringExpense]);
    };

    const updateRecurringExpense = (id: string, updatedFields: Partial<RecurringExpense>) => {
        setRecurringExpenses(prev => prev.map(re => re.id === id ? { ...re, ...updatedFields } : re));
    };

    const deleteRecurringExpense = (id: string) => {
        setRecurringExpenses(prev => prev.filter(t => t.id !== id));
    };

    const updateRecurringExpenseOverride = (recurringId: string, originalDateKey: string, newOverride: Partial<RecurringExpenseOverride>) => {
        setRecurringOverrides(prev => {
            const existing = prev[recurringId] || {};
            const existingDate = existing[originalDateKey] || {};
            return {
                ...prev,
                [recurringId]: {
                    ...existing,
                    [originalDateKey]: { ...existingDate, ...newOverride }
                }
            };
        });
    };

    const addCategory = (category: Omit<Category, 'id'>) => {
        const newCategory: Category = { ...category, id: 'cat-' + Date.now() };
        setCategories(prev => [...prev, newCategory]);
    };

    const deleteCategory = (id: string) => {
        const isUsed = transactions.some(t => t.categoryId === id) || recurringExpenses.some(re => re.categoryId === id);
        if (isUsed) {
            setAlertModal({ isOpen: true, message: 'No se puede eliminar la categoría porque está siendo utilizada.', type: 'warning', title: 'Categoría en Uso' });
            return;
        }
        setCategories(prev => prev.filter(c => c.id !== id));
    };

    const recordDay = (date: string) => {
        if (recordedDays.has(date)) return;
        const currentProjections = memoizedAllTransactions.filter(t => t.isRecurring && t.date === date);

        if (currentProjections.length > 0) {
            setTransactions(prev => {
                const newTxns = currentProjections.map(t => ({
                    ...t,
                    type: TransactionType.EXPENSE,
                    isRecurring: false,
                    id: `txn-rec-${Date.now()}-${Math.random()}`
                }));
                return [...prev, ...newTxns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            });
        }

        setRecordedDays(prev => {
            const newSet = new Set(prev);
            newSet.add(date);
            return newSet;
        });
    };

    const handleExport = async () => {
        try {
            await DataService.exportData();
            setAlertModal({ isOpen: true, message: 'Datos exportados correctamente.', type: 'success', title: 'Exportación Exitosa' });
        } catch (error) {
            setAlertModal({ isOpen: true, message: 'Error al exportar los datos.', type: 'error', title: 'Error de Exportación' });
        }
    };

    const handleImport = async (file: File) => {
        try {
            const success = await DataService.importData(file);
            if (success) {
                const [cats, txns, recExp, recOver, recDays] = await Promise.all([
                    DataService.getCategories(),
                    DataService.getTransactions(),
                    DataService.getRecurringExpenses(),
                    DataService.getRecurringOverrides(),
                    DataService.getRecordedDays(),
                ]);
                setCategories(cats);
                setTransactions(txns);
                setRecurringExpenses(recExp);
                setRecurringOverrides(recOver);
                setRecordedDays(new Set(recDays));
                setAlertModal({ isOpen: true, message: 'Datos importados correctamente.', type: 'success', title: 'Importación Exitosa' });
            }
        } catch (error: any) {
            setAlertModal({ isOpen: true, message: error?.message || 'Error al importar los datos.', type: 'error', title: 'Error de Importación' });
        }
    };

    const handleSaveArqueo = async (data: any, total: number): Promise<string | boolean> => {
        try {
            const totalIngresos = (Number(data.ventaBruta) || 0) + (Number(data.propina) || 0);
            const descuadreCalculado = total - totalIngresos;
            const newId = await FirestoreService.saveArqueo({
                ...data,
                totalIngresos,
                totalRecaudado: total,
                descuadre: descuadreCalculado
            });
            const updatedArqueos = await FirestoreService.getArqueos();
            setArqueos(updatedArqueos);
            setAlertModal({ isOpen: true, message: 'Arqueo guardado exitosamente.', type: 'success', title: 'Arqueo Guardado' });
            return newId;
        } catch (error: any) {
            setAlertModal({ isOpen: true, message: `Error al guardar el arqueo: ${error.message}`, type: 'error', title: 'Error de Guardado' });
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
                        const desc = totalEgresos - totalIngresos;
                        const final = { ...updated, totalIngresos, totalRecaudado: totalEgresos, descuadre: desc };
                        FirestoreService.updateArqueo(id, final);
                        return final;
                    }
                    return a;
                });
                return updatedArqueos;
            });
        } catch (error) {
            console.error(error);
            const loaded = await FirestoreService.getArqueos();
            setArqueos(loaded);
        }
    };

    const handleDeleteArqueo = async (id: string) => {
        try {
            await FirestoreService.deleteArqueo(id);
            setArqueos(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            setAlertModal({ isOpen: true, message: 'Error al eliminar el arqueo.', type: 'error', title: 'Error' });
        }
    };

    const handleMigrateArqueos = async () => {
        try {
            setAlertModal({ isOpen: true, message: 'Recalculando arqueos...', type: 'info', title: 'Migración' });
            const loadedArqueos = await FirestoreService.getArqueos();
            const migrated = loadedArqueos.map(a => {
                const totalIngresos = (Number(a.ventaBruta) || 0) + (Number(a.propina) || 0);
                const totalEgresos = calculateTotalRecaudado(a);
                const descuadre = totalEgresos - totalIngresos;
                return { ...a, totalIngresos, totalRecaudado: totalEgresos, descuadre };
            });
            for (const a of migrated) await FirestoreService.updateArqueo(a.id, a);
            setArqueos(migrated);
            setAlertModal({ isOpen: true, message: 'Migración completada.', type: 'success', title: 'Éxito' });
        } catch (error) {
            setAlertModal({ isOpen: true, message: 'Error en migración.', type: 'error', title: 'Error' });
        }
    };

    return (
        <AppContext.Provider value={{
            isLoading,
            categories, transactions, recurringExpenses, recordedDays, arqueos,
            bankTransactions, reconciliationResults,
            memoizedAllTransactions,
            addTransaction, updateTransaction, deleteTransaction, updateTransactionDate, updateTransactionAmount,
            addRecurringExpense, updateRecurringExpense, deleteRecurringExpense, updateRecurringExpenseOverride,
            addCategory, deleteCategory, recordDay,
            handleExport, handleImport, handleSaveArqueo, handleUpdateArqueo, handleDeleteArqueo, handleMigrateArqueos,
            setBankTransactions, setReconciliationResults
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within an AppProvider');
    return context;
};
