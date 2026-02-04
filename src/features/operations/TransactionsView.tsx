
import React, { useState } from 'react';
import { Transaction, TransactionType, ExpenseType, Category } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, formatCOP, parseCOP } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

interface TransactionsViewProps {
    categories: Category[];
    addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

const expenseTypeTranslations: Record<ExpenseType, string> = {
    [ExpenseType.FIXED]: 'Fijo',
    [ExpenseType.VARIABLE]: 'Variable',
};

const IncomeForm: React.FC<{ addTransaction: (transaction: Omit<Transaction, 'id'>) => void; incomeCategories: Category[] }> = ({ addTransaction, incomeCategories }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState(''); // Se guarda como string del número puro
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState<string>(incomeCategories[0]?.id || '');

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numeric = parseCOP(e.target.value);
        setAmount(numeric > 0 ? numeric.toString() : '');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseCOP(amount);
        if (!description || !numericAmount || !date || !categoryId) return;
        addTransaction({
            description,
            amount: numericAmount,
            date,
            type: TransactionType.INCOME,
            categoryId,
        });
        setDescription('');
        setAmount('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label htmlFor="income-date" className="block text-sm font-medium text-medium-text dark:text-gray-300">Fecha</label>
                    <Input id="income-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div>
                    <label htmlFor="income-amount" className="block text-sm font-medium text-medium-text dark:text-gray-300">Monto</label>
                    <div className="relative">
                        <Input
                            id="income-amount"
                            type="text"
                            value={formatCOP(amount)}
                            onChange={handleAmountChange}
                            required
                            placeholder="1.500.000"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="income-category" className="block text-sm font-medium text-medium-text dark:text-gray-300">Categoría</label>
                    <Select id="income-category" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                        {incomeCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </Select>
                </div>
                <div>
                    <label htmlFor="income-description" className="block text-sm font-medium text-medium-text dark:text-gray-300">Descripción</label>
                    <Input id="income-description" type="text" value={description} onChange={e => setDescription(e.target.value)} required placeholder="Ej: Pago Cliente X" />
                </div>
            </div>
            <div className="flex justify-end">
                <Button type="submit">Añadir Ingreso</Button>
            </div>
        </form>
    );
};

const ExpenseForm: React.FC<{
    addTransaction: (t: Omit<Transaction, 'id'>) => void;
    expenseCategories: Category[]
}> = ({ addTransaction, expenseCategories }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState<string>(expenseCategories[0]?.id || '');
    const [expenseType, setExpenseType] = useState<ExpenseType>(ExpenseType.VARIABLE);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numeric = parseCOP(e.target.value);
        setAmount(numeric > 0 ? numeric.toString() : '');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseCOP(amount);
        if (!description || !numericAmount || !categoryId || !date) return;

        addTransaction({
            description,
            amount: numericAmount,
            date,
            type: TransactionType.EXPENSE,
            expenseType,
            categoryId,
        });

        setDescription('');
        setAmount('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                    <label htmlFor="expense-date" className="block text-sm font-medium text-medium-text dark:text-gray-300">Fecha</label>
                    <Input id="expense-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div>
                    <label htmlFor="expense-amount" className="block text-sm font-medium text-medium-text dark:text-gray-300">Valor</label>
                    <div className="relative">
                        <Input
                            id="expense-amount"
                            type="text"
                            value={formatCOP(amount)}
                            onChange={handleAmountChange}
                            required
                            placeholder="300.500"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="expense-category" className="block text-sm font-medium text-medium-text dark:text-gray-300">Categoría</label>
                    <Select id="expense-category" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                        {expenseCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </Select>
                </div>
                <div>
                    <label htmlFor="expenseType" className="block text-sm font-medium text-medium-text dark:text-gray-300">Tipo de Gasto</label>
                    <Select id="expenseType" value={expenseType} onChange={e => setExpenseType(e.target.value as ExpenseType)}>
                        {Object.values(ExpenseType).map(et => <option key={et} value={et}>{expenseTypeTranslations[et]}</option>)}
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-1">
                <div>
                    <label htmlFor="expense-description" className="block text-sm font-medium text-medium-text dark:text-gray-300">Detalle</label>
                    <Input id="expense-description" type="text" value={description} onChange={e => setDescription(e.target.value)} required placeholder="Ej: Compra de papelería" />
                </div>
            </div>
            <div className="flex justify-end pt-4">
                <Button type="submit">Añadir Gasto</Button>
            </div>
        </form>
    );
};


const TransactionsView: React.FC<TransactionsViewProps> = ({ categories, addTransaction }) => {
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');

    const incomeCategories = categories.filter(c => c.type === TransactionType.INCOME);
    const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-dark-text dark:text-white">Registrar Transacciones</h1>

            <Card>
                <div className="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-xl mb-6 w-fit">
                    <Button
                        variant={activeTab === 'expense' ? 'secondary' : 'ghost'}
                        onClick={() => setActiveTab('expense')}
                        size="sm"
                        className={activeTab === 'expense' ? 'shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700 font-medium'}
                    >
                        Añadir Gasto
                    </Button>
                    <Button
                        variant={activeTab === 'income' ? 'secondary' : 'ghost'}
                        onClick={() => setActiveTab('income')}
                        size="sm"
                        className={activeTab === 'income' ? 'shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700 font-medium'}
                    >
                        Añadir Ingreso
                    </Button>
                </div>
                <div className="pt-6">
                    {activeTab === 'income' && <IncomeForm addTransaction={addTransaction} incomeCategories={incomeCategories} />}
                    {activeTab === 'expense' && <ExpenseForm addTransaction={addTransaction} expenseCategories={expenseCategories} />}
                </div>
            </Card>
        </div>
    );
};

export default TransactionsView;
