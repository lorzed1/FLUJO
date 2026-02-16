import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Transaction, TransactionType, RecurringExpense, Category, RecurringExpenseOverrides, RecurringExpenseOverride } from '../types';
import { DataService } from '../services/storage';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { useGeneratedTransactions } from '../hooks/useGeneratedTransactions';
import { useUI } from './UIContext';

// ============================================
// Tipos
// ============================================

export interface DataContextType {
    // State
    isLoading: boolean;
    isDataLoaded: boolean;
    categories: Category[];
    transactions: Transaction[];
    recurringExpenses: RecurringExpense[];
    recordedDays: Set<string>;

    // Computed
    memoizedAllTransactions: Transaction[];

    // CRUD Transacciones
    addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
    updateTransaction: (id: string, updatedFields: Partial<Transaction>) => void;
    deleteTransaction: (id: string) => void;
    updateTransactionDate: (id: string, newDate: string) => void;
    updateTransactionAmount: (id: string, amount: number) => void;

    // CRUD Gastos Recurrentes
    addRecurringExpense: (expense: Omit<RecurringExpense, 'id'>) => void;
    updateRecurringExpense: (id: string, updatedFields: Partial<RecurringExpense>) => void;
    deleteRecurringExpense: (id: string) => void;
    updateRecurringExpenseOverride: (recurringId: string, originalDateKey: string, newOverride: Partial<RecurringExpenseOverride>) => void;

    // CRUD Categorías
    addCategory: (category: Omit<Category, 'id'>) => void;
    deleteCategory: (id: string) => void;

    // Días Registrados
    recordDay: (date: string) => void;

    // Import/Export
    handleExport: () => Promise<void>;
    handleImport: (file: File) => Promise<void>;

    // Setters internos (para carga inicial desde AppContext)
    setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    setRecurringExpenses: React.Dispatch<React.SetStateAction<RecurringExpense[]>>;
    setRecurringOverrides: React.Dispatch<React.SetStateAction<RecurringExpenseOverrides>>;
    setRecordedDays: React.Dispatch<React.SetStateAction<Set<string>>>;
}

// ============================================
// Context
// ============================================

const DataContext = createContext<DataContextType | undefined>(undefined);

// ============================================
// Provider
// ============================================

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { setAlertModal } = useUI();

    // State
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [recurringOverrides, setRecurringOverrides] = useState<RecurringExpenseOverrides>({});
    const [recordedDays, setRecordedDays] = useState<Set<string>>(new Set());

    // ====== Carga Inicial ======
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setIsLoading(true);
                setIsDataLoaded(false);

                const data = await DataService.loadInitialData();

                console.log(`📊 DEBUG DataContext: Recibidas ${data.transactions.length} transacciones, ${data.categories.length} categorías.`);

                setCategories(data.categories);
                setTransactions(data.transactions);
                setRecurringExpenses(data.recurringExpenses);
                setRecurringOverrides(data.recurringOverrides);
                setRecordedDays(new Set(data.recordedDays));

                setIsDataLoaded(true);
                console.log('✅ DataContext: Datos de presupuesto cargados.');
            } catch (error) {
                console.error('❌ Error cargando datos de presupuesto:', error);
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

    // ====== Auto-Save ======
    useDebouncedSave(categories, DataService.saveCategories, 2000, isDataLoaded && !isLoading);
    useDebouncedSave(transactions, DataService.saveTransactions, 2000, isDataLoaded && !isLoading);
    useDebouncedSave(recurringExpenses, DataService.saveRecurringExpenses, 2000, isDataLoaded && !isLoading);
    useDebouncedSave(recurringOverrides, DataService.saveRecurringOverrides, 2000, isDataLoaded && !isLoading);
    useDebouncedSave(recordedDays, DataService.saveRecordedDays, 2000, isDataLoaded && !isLoading);

    // ====== Transacciones Generadas ======
    const memoizedAllTransactions = useGeneratedTransactions(
        transactions,
        recurringExpenses,
        recurringOverrides,
        recordedDays,
        6
    );

    // ====== ACTIONS ======

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
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error al importar los datos.';
            setAlertModal({ isOpen: true, message, type: 'error', title: 'Error de Importación' });
        }
    };

    return (
        <DataContext.Provider value={{
            isLoading, isDataLoaded,
            categories, transactions, recurringExpenses, recordedDays,
            memoizedAllTransactions,
            addTransaction, updateTransaction, deleteTransaction, updateTransactionDate, updateTransactionAmount,
            addRecurringExpense, updateRecurringExpense, deleteRecurringExpense, updateRecurringExpenseOverride,
            addCategory, deleteCategory, recordDay,
            handleExport, handleImport,
            setCategories, setTransactions, setRecurringExpenses, setRecurringOverrides, setRecordedDays
        }}>
            {children}
        </DataContext.Provider>
    );
};

// ============================================
// Hook
// ============================================

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within a DataProvider');
    return context;
};
