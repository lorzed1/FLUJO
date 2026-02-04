
import React, { useState, useEffect } from 'react';
import { RecurringExpense, ExpenseType, Category, Frequency } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, formatCOP, parseCOP } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { TrashIcon, PencilIcon } from '../../components/ui/Icons';
import { SmartDataTable } from '../../components/ui/SmartDataTable';

interface RecurringExpensesViewProps {
    recurringExpenses: RecurringExpense[];
    categories: Category[];
    addRecurringExpense: (expense: Omit<RecurringExpense, 'id'>) => void;
    updateRecurringExpense: (id: string, expense: Partial<RecurringExpense>) => void;
    deleteRecurringExpense: (id: string) => void;
}

const expenseTypeTranslations: Record<ExpenseType, string> = {
    [ExpenseType.FIXED]: 'Fijo',
    [ExpenseType.VARIABLE]: 'Variable',
};



const RecurringExpensesView: React.FC<RecurringExpensesViewProps> = ({ recurringExpenses, categories, addRecurringExpense, updateRecurringExpense, deleteRecurringExpense }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [frequency, setFrequency] = useState<Frequency>(Frequency.MONTHLY);
    const [dayOfMonth, setDayOfMonth] = useState('15');
    const [dayOfWeek, setDayOfWeek] = useState('1'); // 1 = Lunes
    const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || '');
    const [expenseType, setExpenseType] = useState<ExpenseType>(ExpenseType.FIXED);

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numeric = parseCOP(e.target.value);
        setAmount(numeric > 0 ? numeric.toString() : '');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseCOP(amount);
        if (!description || !numericAmount || !categoryId || !startDate) return;

        const expenseData = {
            description,
            amount: numericAmount,
            frequency,
            dayOfMonth: frequency === Frequency.MONTHLY ? parseInt(dayOfMonth) : undefined,
            dayOfWeek: frequency === Frequency.WEEKLY ? parseInt(dayOfWeek) : undefined,
            startDate,
            categoryId,
            expenseType,
        };

        if (editingId) {
            updateRecurringExpense(editingId, expenseData);
            setEditingId(null);
        } else {
            addRecurringExpense(expenseData);
        }

        resetForm();
    };

    const resetForm = () => {
        setDescription('');
        setAmount('');
        setEditingId(null);
    };

    const handleEdit = (re: RecurringExpense) => {
        setEditingId(re.id);
        setDescription(re.description);
        setAmount(re.amount.toString());
        setFrequency(re.frequency);
        setStartDate(re.startDate);
        setCategoryId(re.categoryId);
        setExpenseType(re.expenseType);
        if (re.dayOfMonth) setDayOfMonth(re.dayOfMonth.toString());
        if (re.dayOfWeek !== undefined) setDayOfWeek(re.dayOfWeek.toString());

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const daysOfWeekNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-semibold text-dark-text dark:text-white">Egresos Recurrentes</h1>
            <Card className={editingId ? 'border-primary ring-1 ring-primary/20 dark:ring-primary/40' : ''}>
                <h2 className="text-xl font-semibold mb-4 text-dark-text dark:text-white">
                    {editingId ? 'Editando Gasto Recurrente' : 'Añadir Nuevo Gasto Recurrente'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                        <div className="lg:col-span-2">
                            <label htmlFor="re-description" className="block text-sm font-medium text-medium-text dark:text-gray-300">Detalle / Rubro</label>
                            <Input id="re-description" type="text" value={description} onChange={e => setDescription(e.target.value)} required placeholder="Ej: Pago de Nómina Cocina" />
                        </div>
                        <div>
                            <label htmlFor="re-amount" className="block text-sm font-medium text-medium-text dark:text-gray-300">Monto</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">$</span>
                                <Input
                                    id="re-amount"
                                    type="text"
                                    value={formatCOP(amount)}
                                    onChange={handleAmountChange}
                                    required
                                    placeholder="1.500.000"
                                    className="pl-7"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="re-frequency" className="block text-sm font-medium text-medium-text dark:text-gray-300">Frecuencia</label>
                            <Select id="re-frequency" value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}>
                                <option value={Frequency.MONTHLY}>Mensual</option>
                                <option value={Frequency.WEEKLY}>Semanal</option>
                            </Select>
                        </div>

                        {frequency === Frequency.MONTHLY ? (
                            <div>
                                <label htmlFor="re-day" className="block text-sm font-medium text-medium-text dark:text-gray-300">Día del Mes</label>
                                <Input id="re-day" type="number" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} required min="1" max="31" />
                            </div>
                        ) : (
                            <div>
                                <label htmlFor="re-dow" className="block text-sm font-medium text-medium-text dark:text-gray-300">Día de la Semana</label>
                                <Select id="re-dow" value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}>
                                    {daysOfWeekNames.map((name, i) => <option key={i} value={i}>{name}</option>)}
                                </Select>
                            </div>
                        )}

                        <div>
                            <label htmlFor="re-start-date" className="block text-sm font-medium text-medium-text dark:text-gray-300">Fecha de Inicio Proyección</label>
                            <Input id="re-start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                        </div>

                        <div>
                            <label htmlFor="re-category" className="block text-sm font-medium text-medium-text dark:text-gray-300">Categoría</label>
                            <Select id="re-category" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </Select>
                        </div>

                        <div>
                            <label htmlFor="re-expenseType" className="block text-sm font-medium text-medium-text dark:text-gray-300">Tipo de Gasto</label>
                            <Select id="re-expenseType" value={expenseType} onChange={e => setExpenseType(e.target.value as ExpenseType)}>
                                {Object.values(ExpenseType).map(et => <option key={et} value={et}>{expenseTypeTranslations[et]}</option>)}
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        {editingId && (
                            <Button type="button" onClick={resetForm} className="bg-gray-100 dark:bg-slate-700 !text-medium-text dark:!text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 shadow-none">
                                Cancelar
                            </Button>
                        )}
                        <Button type="submit" className={editingId ? 'bg-indigo-600' : ''}>
                            {editingId ? 'Guardar Cambios' : 'Añadir Gasto'}
                        </Button>
                    </div>
                </form>
            </Card>

            <Card>
                <h2 className="text-xl font-semibold mb-4 text-dark-text dark:text-white">Gastos Programados</h2>
                <SmartDataTable
                    data={recurringExpenses}
                    columns={[
                        {
                            key: 'frequency',
                            label: 'Recurrencia',
                            width: 'w-1/4',
                            render: (_, re) => (
                                <span>
                                    {re.frequency === Frequency.MONTHLY
                                        ? `Día ${re.dayOfMonth} de cada mes`
                                        : `Todos los ${daysOfWeekNames[re.dayOfWeek || 0]}s`}
                                </span>
                            )
                        },
                        { key: 'description', label: 'Descripción', width: 'w-1/3', sortable: true, filterable: true },
                        {
                            key: 'categoryId',
                            label: 'Categoría',
                            width: 'w-1/6',
                            filterable: true,
                            render: (val) => categories.find(c => c.id === val)?.name || 'N/A'
                        },
                        {
                            key: 'amount',
                            label: 'Monto',
                            width: 'w-1/6',
                            align: 'text-right',
                            sortable: true,
                            render: (val) => (
                                <span className="font-semibold text-red-600 dark:text-red-400">
                                    - {formatCurrency(val)}
                                </span>
                            )
                        },
                        {
                            key: 'actions' as any,
                            label: 'Acciones',
                            width: 'w-24',
                            align: 'text-right',
                            render: (_, re) => (
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => handleEdit(re)} className="text-indigo-500 dark:text-blue-400 hover:text-indigo-700 dark:hover:text-blue-300 p-1" title="Editar">
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => deleteRecurringExpense(re.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1" title="Eliminar">
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            )
                        }
                    ]}
                    enableSelection={false}
                    enableExport={true}
                    onRowClick={handleEdit}
                />
            </Card>
        </div>
    );
};

export default RecurringExpensesView;
