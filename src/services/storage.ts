
import { Transaction, Category, RecurringExpense, RecurringExpenseOverrides } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_RECURRING_EXPENSES } from '../data/defaultData';
import { DatabaseService } from './database';

const STORAGE_KEYS = {
    TRANSACTIONS: 'finance_app_transactions',
    CATEGORIES: 'finance_app_categories',
    RECURRING: 'finance_app_recurring',
    RECURRING_OVERRIDES: 'finance_app_recurring_overrides',
    RECORDED_DAYS: 'finance_app_recorded_days',
    ACCOUNT_MAPPINGS: 'finance_app_account_mappings',
    BANK_TRANSACTIONS: 'finance_app_bank_transactions',
    RECONCILIATION_RESULTS: 'finance_app_reconciliation_results',
    USE_SUPABASE: 'finance_app_use_supabase', // Flag para determinar si usar Supabase
};

// Flag para determinar si usar Supabase (true) o LocalStorage (false)
let useSupabase = true;

// Helpers para cargar datos de LocalStorage
const loadLocal = <T>(key: string, defaultValue: T): T => {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
        console.error(`Error loading ${key}`, e);
        return defaultValue;
    }
};

const saveLocal = <T>(key: string, value: T): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error(`Error saving ${key}`, e);
    }
};

/**
 * Servicio de datos híbrido que puede usar Supabase o LocalStorage
 * Por defecto usa Supabase, pero guarda una copia en LocalStorage como cache
 */
export const DataService = {

    /**
     * Cambiar entre Supabase y LocalStorage
     */
    setStorageMode: (supabase: boolean) => {
        useSupabase = supabase;
        localStorage.setItem(STORAGE_KEYS.USE_SUPABASE, JSON.stringify(supabase));
    },

    /**
     * Obtener modo de almacenamiento actual
     */
    getStorageMode: (): boolean => {
        return useSupabase;
    },

    // ============ TRANSACCIONES ============

    getTransactions: async (): Promise<Transaction[]> => {
        if (useSupabase) {
            try {
                const data = await DatabaseService.getTransactions();
                if (data.length > 0) {
                    saveLocal(STORAGE_KEYS.TRANSACTIONS, data);
                    return data;
                }
            } catch (error) {
                // Si falla Firestore, intentar Local
            }
        }

        let localData = loadLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);

        // MIGRATION CHECK: Si Firestore estaba vacío (o falló) y tenemos datos locales,
        // asumimos que es una migración. Retornamos datos locales.
        // El useEffect en App.tsx se encargará de guardarlos en Firestore eventualmente.
        return localData;
    },

    saveTransactions: async (transactions: Transaction[]) => {
        saveLocal(STORAGE_KEYS.TRANSACTIONS, transactions);
        if (useSupabase) {
            try {
                await DatabaseService.saveTransactions(transactions);
            } catch (error) {
                console.error('Error saving transactions to Supabase:', error);
            }
        }
    },

    // ============ CATEGORÍAS ============

    getCategories: async (): Promise<Category[]> => {
        if (useSupabase) {
            try {
                const data = await DatabaseService.getCategories();
                if (data.length > 0) {
                    saveLocal(STORAGE_KEYS.CATEGORIES, data);
                    return data;
                }
            } catch (error) {
                // Fallback local
            }
        }
        return loadLocal<Category[]>(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    },

    saveCategories: async (categories: Category[]) => {
        saveLocal(STORAGE_KEYS.CATEGORIES, categories);
        if (useSupabase) {
            try {
                await DatabaseService.saveCategories(categories);
            } catch (error) {
                console.error('Error saving categories to Supabase:', error);
            }
        }
    },

    // ============ GASTOS RECURRENTES ============

    getRecurringExpenses: async (): Promise<RecurringExpense[]> => {
        if (useSupabase) {
            try {
                const data = await DatabaseService.getRecurringExpenses();
                if (data.length > 0) {
                    saveLocal(STORAGE_KEYS.RECURRING, data); // Changed from RECURRING_EXPENSES to RECURRING
                    return data;
                }
            } catch (error) {
                // Fallback local
            }
        }
        return loadLocal<RecurringExpense[]>(STORAGE_KEYS.RECURRING, DEFAULT_RECURRING_EXPENSES); // Changed from RECURRING_EXPENSES to RECURRING and added DEFAULT_RECURRING_EXPENSES
    },

    saveRecurringExpenses: async (expenses: RecurringExpense[]) => {
        saveLocal(STORAGE_KEYS.RECURRING, expenses); // Changed from RECURRING_EXPENSES to RECURRING
        if (useSupabase) {
            try {
                await DatabaseService.saveRecurringExpenses(expenses);
            } catch (error) {
                console.error('Error saving recurring expenses to Supabase:', error);
            }
        }
    },

    // ============ OVERRIDES ============

    getRecurringOverrides: async (): Promise<RecurringExpenseOverrides> => {
        if (useSupabase) {
            try {
                const data = await DatabaseService.getRecurringOverrides();
                if (Object.keys(data).length > 0) {
                    saveLocal(STORAGE_KEYS.RECURRING_OVERRIDES, data);
                    return data;
                }
            } catch (error) {
                // Fallback local
            }
        }
        return loadLocal<RecurringExpenseOverrides>(STORAGE_KEYS.RECURRING_OVERRIDES, {});
    },

    saveRecurringOverrides: async (overrides: RecurringExpenseOverrides) => {
        saveLocal(STORAGE_KEYS.RECURRING_OVERRIDES, overrides);
        if (useSupabase) {
            try {
                await DatabaseService.saveRecurringOverrides(overrides);
            } catch (error) {
                console.error('Error saving overrides to Supabase:', error);
            }
        }
    },

    // ============ DÍAS REGISTRADOS ============

    getRecordedDays: async (): Promise<string[]> => {
        if (useSupabase) {
            try {
                const data = await DatabaseService.getRecordedDays();
                if (data.length > 0) {
                    saveLocal(STORAGE_KEYS.RECORDED_DAYS, data);
                    return data;
                }
            } catch (error) {
                // Fallback local
            }
        }
        return loadLocal<string[]>(STORAGE_KEYS.RECORDED_DAYS, []);
    },

    saveRecordedDays: async (days: Set<string>) => {
        const daysArray = Array.from(days);
        saveLocal(STORAGE_KEYS.RECORDED_DAYS, daysArray);
        if (useSupabase) {
            try {
                await DatabaseService.saveRecordedDays(days);
            } catch (error) {
                console.error('Error saving recorded days to Supabase:', error);
            }
        }
    },

    // ============ MAPEOS DE CUENTAS ============

    getAccountMappings: async () => {
        if (useSupabase) {
            try {
                const mappings = await DatabaseService.getAccountMappings();
                saveLocal(STORAGE_KEYS.ACCOUNT_MAPPINGS, mappings);
                return mappings;
            } catch (error) {
                return loadLocal(STORAGE_KEYS.ACCOUNT_MAPPINGS, []);
            }
        }
        return loadLocal(STORAGE_KEYS.ACCOUNT_MAPPINGS, []);
    },

    saveAccountMappings: async (mappings: any[]) => {
        saveLocal(STORAGE_KEYS.ACCOUNT_MAPPINGS, mappings);
        if (useSupabase) {
            try {
                await DatabaseService.saveAccountMappings(mappings);
            } catch (error) { }
        }
    },

    // ============ EXTRACTOS BANCARIOS (LADO A) ============

    getBankTransactions: async (): Promise<Record<string, Transaction[]>> => {
        let data: Record<string, Transaction[]> = {};

        if (useSupabase) {
            try {
                const supabaseData = await DatabaseService.getBankTransactions();
                if (Object.keys(supabaseData).length > 0) {
                    saveLocal(STORAGE_KEYS.BANK_TRANSACTIONS, supabaseData);
                    return supabaseData;
                }
            } catch (error) {
                // Fallback to local
            }
        }

        data = loadLocal(STORAGE_KEYS.BANK_TRANSACTIONS, {});

        // MIGRATION: Check legacy key if empty
        if (Object.keys(data).length === 0) {
            try {
                const legacy = localStorage.getItem('conciliaciones_bank_transactions_multi');
                if (legacy) {
                    data = JSON.parse(legacy);
                }
            } catch (e) { console.warn('Error migrating legacy bank transactions', e); }
        }

        return data;
    },

    saveBankTransactions: async (data: Record<string, Transaction[]>) => {
        saveLocal(STORAGE_KEYS.BANK_TRANSACTIONS, data);
        if (useSupabase) {
            try {
                await DatabaseService.saveBankTransactions(data);
            } catch (error) { }
        }
    },

    // ============ RESULTADOS DE CONCILIACIÓN ============

    getReconciliationResults: async (): Promise<Record<string, any>> => {
        let data: Record<string, any> = {};

        if (useSupabase) {
            try {
                const supabaseData = await DatabaseService.getReconciliationResults();

                // DATA SAFETY: Only use Firestore if it has data. 
                // If it's empty, we might be facing a sync error or fresh start.
                // We check if we have local backup.
                if (Object.keys(supabaseData).length > 0) {
                    saveLocal(STORAGE_KEYS.RECONCILIATION_RESULTS, supabaseData);
                    return supabaseData;
                } else {
                    // Firestore is empty. Check local.
                    const localBackup = loadLocal(STORAGE_KEYS.RECONCILIATION_RESULTS, {});
                    if (Object.keys(localBackup).length > 0) {
                        console.warn("Supabase returned empty, but local backup found. Using local data.");
                        // Optional: Trigger background save to restore cloud?
                        return localBackup;
                    }
                }
            } catch (error) {
                console.warn("Error loading from Supabase, falling back to local", error);
                // Fallback handles below
            }
        }

        data = loadLocal(STORAGE_KEYS.RECONCILIATION_RESULTS, {});

        // MIGRATION: Check legacy key if empty
        if (Object.keys(data).length === 0) {
            try {
                const legacy = localStorage.getItem('conciliaciones_result_multi');
                if (legacy) {
                    data = JSON.parse(legacy);
                }
            } catch (e) { console.warn('Error migrating legacy reconciliation results', e); }
        }

        return data;
    },

    saveReconciliationResults: async (data: Record<string, any>) => {
        saveLocal(STORAGE_KEYS.RECONCILIATION_RESULTS, data);
        if (useSupabase) {
            try {
                await DatabaseService.saveReconciliationResults(data);
            } catch (error) { }
        }
    },

    // ============ SINCRONIZACIÓN INICIAL ============

    /**
     * Cargar todos los datos iniciales
     * Esta función se debe llamar al inicio de la app
     */
    loadInitialData: async () => {
        try {
            const [transactions, categories, expenses, overrides, days, mappings, banks, reconciliationResults] = await Promise.all([
                DataService.getTransactions(),
                DataService.getCategories(),
                DataService.getRecurringExpenses(),
                DataService.getRecurringOverrides(),
                DataService.getRecordedDays(),
                DataService.getAccountMappings(),
                DataService.getBankTransactions(),
                DataService.getReconciliationResults(),
            ]);

            return {
                transactions,
                categories,
                recurringExpenses: expenses,
                recurringOverrides: overrides,
                recordedDays: days,
                accountMappings: mappings,
                bankTransactions: banks,
                reconciliationResults: reconciliationResults,
            };
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            throw error;
        }
    },

    // ============ MIGRAR DE LOCALSTORAGE A SUPABASE ============

    /**
     * Migrar todos los datos de LocalStorage a Supabase
     */
    migrateToSupabase: async (): Promise<boolean> => {
        try {
            const localData = {
                transactions: loadLocal(STORAGE_KEYS.TRANSACTIONS, []),
                categories: loadLocal(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES),
                recurringExpenses: loadLocal(STORAGE_KEYS.RECURRING, DEFAULT_RECURRING_EXPENSES),
                recurringOverrides: loadLocal(STORAGE_KEYS.RECURRING_OVERRIDES, {}),
                recordedDays: loadLocal(STORAGE_KEYS.RECORDED_DAYS, []),
            };

            await Promise.all([
                DatabaseService.saveTransactions(localData.transactions),
                DatabaseService.saveCategories(localData.categories),
                DatabaseService.saveRecurringExpenses(localData.recurringExpenses),
                DatabaseService.saveRecurringOverrides(localData.recurringOverrides),
                DatabaseService.saveRecordedDays(new Set(localData.recordedDays)),
                DatabaseService.saveBankTransactions(loadLocal(STORAGE_KEYS.BANK_TRANSACTIONS, {})),
                DatabaseService.saveReconciliationResults(loadLocal(STORAGE_KEYS.RECONCILIATION_RESULTS, {})),
            ]);

            console.log('✅ Migración a Supabase completada exitosamente');
            return true;
        } catch (error) {
            console.error('❌ Error durante la migración a Supabase:', error);
            return false;
        }
    },

    // ============ IMPORT / EXPORT ============

    exportData: async () => {
        try {
            let data;

            if (useSupabase) {
                data = await DatabaseService.exportAllData();
            } else {
                data = {
                    transactions: loadLocal(STORAGE_KEYS.TRANSACTIONS, []),
                    categories: loadLocal(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES),
                    recurringExpenses: loadLocal(STORAGE_KEYS.RECURRING, DEFAULT_RECURRING_EXPENSES),
                    recurringOverrides: loadLocal(STORAGE_KEYS.RECURRING_OVERRIDES, {}),
                    recordedDays: loadLocal(STORAGE_KEYS.RECORDED_DAYS, []),
                    exportDate: new Date().toISOString(),
                };
            }

            const exportData = {
                ...data,
                meta: {
                    version: 3, // Versión 3 para Supabase
                    date: new Date().toISOString(),
                    source: useSupabase ? 'supabase' : 'localStorage',
                }
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `finance_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exportando datos:', error);
            throw new Error('Error al exportar los datos');
        }
    },

    importData: async (file: File): Promise<boolean> => {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validación básica
            if (!data.meta && !data.categories) {
                throw new Error("Formato inválido");
            }

            const importData = {
                transactions: data.transactions || [],
                categories: data.categories || DEFAULT_CATEGORIES,
                recurringExpenses: data.recurringExpenses || DEFAULT_RECURRING_EXPENSES,
                recurringOverrides: data.recurringOverrides || {},
                recordedDays: data.recordedDays || [],
                bankTransactions: data.bankTransactions || {},
                reconciliationResults: data.reconciliationResults || {},
            };

            if (useSupabase) {
                await DatabaseService.importAllData(importData);
            } else {
                saveLocal(STORAGE_KEYS.TRANSACTIONS, importData.transactions);
                saveLocal(STORAGE_KEYS.CATEGORIES, importData.categories);
                saveLocal(STORAGE_KEYS.RECURRING, importData.recurringExpenses);
                saveLocal(STORAGE_KEYS.RECURRING_OVERRIDES, importData.recurringOverrides);
                saveLocal(STORAGE_KEYS.RECORDED_DAYS, importData.recordedDays);
                saveLocal(STORAGE_KEYS.BANK_TRANSACTIONS, importData.bankTransactions);
                saveLocal(STORAGE_KEYS.RECONCILIATION_RESULTS, importData.reconciliationResults);
            }

            return true;
        } catch (e) {
            console.error("Error al importar", e);
            throw new Error("Error al importar el archivo. Asegúrate que sea un backup válido.");
        }
    }
};
