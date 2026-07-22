
import { Category, TransactionType, RecurringExpense, Frequency, ExpenseType } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
    { id: 'cat-arr', name: 'ARRENDAMIENTO', type: TransactionType.EXPENSE },
    { id: 'cat-nom', name: 'GASTOS DE NOMINA', type: TransactionType.EXPENSE },
    { id: 'cat-mus', name: 'GASTOS MUSICA', type: TransactionType.EXPENSE },
    { id: 'cat-hon', name: 'HONORARIOS', type: TransactionType.EXPENSE },
    { id: 'cat-imp', name: 'IMPUESTOS', type: TransactionType.EXPENSE },
    { id: 'cat-obl', name: 'OBLIGACIONES FINANCIERAS', type: TransactionType.EXPENSE },
    { id: 'cat-dig', name: 'SERVICIOS DIGITALES', type: TransactionType.EXPENSE },
    { id: 'cat-pub', name: 'SERVICIOS PUBLICOS', type: TransactionType.EXPENSE },
    { id: 'cat-inc', name: 'VENTAS', type: TransactionType.INCOME },
];

export const DEFAULT_RECURRING_EXPENSES: RecurringExpense[] = [];

