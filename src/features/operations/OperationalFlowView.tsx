import React, { useState } from 'react';
import CalendarView from './CalendarView';
import TransactionsView from './TransactionsView';

import RecurringExpensesView from './RecurringExpensesView';
// import ImportCSVView from '../reconciliation/ImportCSVView';
import { Transaction, Category, RecurringExpense, RecurringExpenseOverride, TransactionType } from '../../types';
import { CalendarDaysIcon, ArrowsRightLeftIcon, ArrowPathIcon, ArrowDownTrayIcon } from '../../components/ui/Icons';
import { Button } from '../../components/ui/Button'; // Import Button
import { Card } from '../../components/ui/Card';

interface OperationalFlowViewProps {
    transactions: Transaction[];
    categories: Category[];

    // Calendar Props
    updateTransactionDate: (id: string, newDate: string) => void;
    updateTransactionAmount: (id: string, amount: number) => void;
    updateRecurringExpenseOverride: (recurringId: string, dateKey: string, override: Partial<RecurringExpenseOverride>) => void;
    recordedDays: Set<string>;
    recordDay: (date: string) => void;

    // CRUD Props
    addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
    updateTransaction: (id: string, updatedFields: Partial<Transaction>) => void;
    deleteTransaction: (id: string) => void;

    // Recurring Props
    recurringExpenses: RecurringExpense[];
    addRecurringExpense: (expense: Omit<RecurringExpense, 'id'>) => void;
    updateRecurringExpense: (id: string, expense: Partial<RecurringExpense>) => void;
    deleteRecurringExpense: (id: string) => void;
}

type Tab = 'calendar' | 'transactions' | 'recurring' | 'import';

const OperationalFlowView: React.FC<OperationalFlowViewProps> = (props) => {
    const [activeTab, setActiveTab] = useState<Tab>('calendar');

    const tabs = [
        { id: 'calendar', label: 'Calendario', icon: <CalendarDaysIcon className="h-5 w-5" /> },
        { id: 'transactions', label: 'Transacciones', icon: <ArrowsRightLeftIcon className="h-5 w-5" /> },
        { id: 'recurring', label: 'Recurrentes', icon: <ArrowPathIcon className="h-5 w-5" /> },
        // { id: 'import', label: 'Importar', icon: <ArrowDownTrayIcon className="h-5 w-5" /> },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header y Navegación */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Flujo Operativo</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Gestión centralizada de movimientos</p>
                </div>

                <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-x-auto max-w-full">
                    {tabs.map(tab => (
                        <Button
                            key={tab.id}
                            variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={activeTab === tab.id ? 'shadow-sm font-black' : 'text-slate-500 hover:text-slate-700 font-medium'}
                        >
                            {tab.icon}
                            <span className="ml-2">{tab.label}</span>
                        </Button>
                    ))}
                </div>
            </div>

            {/* Contenido */}
            <div className="min-h-[500px]">
                {activeTab === 'calendar' && (
                    <CalendarView
                        transactions={props.transactions}
                        updateTransactionDate={props.updateTransactionDate}
                        updateTransactionAmount={props.updateTransactionAmount}
                        updateRecurringExpenseOverride={props.updateRecurringExpenseOverride}
                        addTransaction={props.addTransaction}
                        updateTransaction={props.updateTransaction}
                        deleteTransaction={props.deleteTransaction}
                        categories={props.categories.filter(c => c.type === TransactionType.EXPENSE)}
                        recordedDays={props.recordedDays}
                        recordDay={props.recordDay}
                    />
                )}

                {activeTab === 'transactions' && (
                    <TransactionsView
                        categories={props.categories}
                        addTransaction={props.addTransaction}
                    />
                )}

                {activeTab === 'recurring' && (
                    <RecurringExpensesView
                        recurringExpenses={props.recurringExpenses}
                        categories={props.categories.filter(c => c.type === TransactionType.EXPENSE)}
                        addRecurringExpense={props.addRecurringExpense}
                        updateRecurringExpense={props.updateRecurringExpense}
                        deleteRecurringExpense={props.deleteRecurringExpense}
                    />
                )}

                {/* activeTab === 'import' && (
                    <ImportCSVView
                        addTransaction={props.addTransaction}
                        categories={props.categories}
                        existingTransactions={props.transactions}
                        mode="full"
                    />
                ) */}
            </div>
        </div>
    );
};

export default OperationalFlowView;
