

import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Category, ExpenseType, RecurringExpenseOverride } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, formatCOP, parseCOP } from '../../components/ui/Input';
import { formatDateToDisplay } from '../../utils/dateUtils';
import { Select } from '../../components/ui/Select';
import { PlusCircleIcon, TrashIcon, LockClosedIcon, CheckCircleIcon, ArrowPathIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ChevronLeftIcon, ChevronRightIcon } from '../../components/ui/Icons';

// --- PROPS ---
interface CalendarViewProps {
    transactions: Transaction[];
    updateTransactionDate: (id: string, newDate: string) => void;
    updateTransactionAmount: (id: string, amount: number) => void;
    updateTransaction?: (id: string, updates: Partial<Transaction>) => void;
    updateRecurringExpenseOverride: (recurringId: string, dateKey: string, override: Partial<RecurringExpenseOverride>) => void;
    addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
    deleteTransaction: (id: string) => void;
    categories: Category[];
    recordedDays: Set<string>;
    recordDay: (date: string) => void;
}

type CalendarDisplayMode = 'month' | 'week' | 'day';

type EditingInfo = {
    id: string;
    originalAmount: number;
    currentAmount: string;
    isRecurring: boolean;
    recurringId?: string;
    date: string;
};

// --- HELPERS ---
const isTransactionExecuted = (t: Transaction) => t.status ? t.status === 'completed' : !t.isRecurring;

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

const getColombianHolidays = (year: number): Set<string> => {
    const holidays = new Set<string>();
    const years = [year - 1, year, year + 1];
    years.forEach(y => {
        if (y === 2024) ['2024-01-01', '2024-01-08', '2024-03-25', '2024-03-28', '2024-03-29', '2024-05-01', '2024-05-13', '2024-06-03', '2024-06-10', '2024-07-01', '2024-07-20', '2024-08-07', '2024-08-19', '2024-10-14', '2024-11-04', '2024-11-11', '2024-12-08', '2024-12-25'].forEach(date => holidays.add(date));
        if (y === 2025) ['2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17', '2025-04-18', '2025-05-01', '2025-06-02', '2025-06-23', '2025-06-30', '2025-07-07', '2025-07-20', '2025-08-07', '2025-08-18', '2025-10-13', '2025-11-03', '2025-11-17', '2025-12-08', '2025-12-25'].forEach(date => holidays.add(date));
        if (y === 2026) ['2026-01-01', '2026-01-05', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-01', '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29', '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25'].forEach(date => holidays.add(date));
    });
    return holidays;
};

// --- ACTION MENU COMPONENT ---
const FloatingActionMenu: React.FC<{
    transaction: Transaction;
    onClose: () => void;
    handlers: any;
    isDayRecorded: boolean;
}> = ({ transaction, onClose, handlers, isDayRecorded }) => {
    const isExecuted = isTransactionExecuted(transaction);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-full max-w-sm animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-dark-text dark:text-white">{transaction.description}</h3>
                        <p className="text-sm text-medium-text dark:text-gray-400 font-medium">{formatCurrency(transaction.amount)} • {formatDateToDisplay(transaction.date)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-50 dark:bg-slate-700 rounded-full">✕</button>
                </div>

                <div className="space-y-3">
                    {!isDayRecorded && (
                        <>
                            {!isExecuted ? (
                                <button
                                    onClick={() => { handlers.handleConfirmTransaction(transaction); onClose(); }}
                                    className="w-full flex items-center justify-center gap-3 p-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-100 dark:shadow-none"
                                >
                                    <CheckCircleIcon className="h-5 w-5" />
                                    Confirmar Pago Realizado
                                </button>
                            ) : (
                                <button
                                    onClick={() => { handlers.handleUndoTransaction(transaction); onClose(); }}
                                    className="w-full flex items-center justify-center gap-3 p-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors"
                                >
                                    <ArrowPathIcon className="h-5 w-5" />
                                    Deshacer y volver a Plan
                                </button>
                            )}

                            <button
                                onClick={() => { handlers.handleEditClick(transaction); onClose(); }}
                                className="w-full flex items-center justify-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-semibold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                            >
                                <ArrowPathIcon className="h-5 w-5 rotate-90" />
                                Ajustar Monto
                            </button>

                            <button
                                onClick={() => { handlers.handleDeleteClick(transaction); onClose(); }}
                                className="w-full flex items-center justify-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            >
                                <TrashIcon className="h-5 w-5" />
                                Eliminar Gasto
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- QUICK ADD MODAL ---
const QuickAddExpenseModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    date: string;
    addTransaction: (t: Omit<Transaction, 'id'>) => void;
    categories: Category[];
}> = ({ isOpen, onClose, date, addTransaction, categories }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
    const [isProjected, setIsProjected] = useState(false);

    if (!isOpen) return null;

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numeric = parseCOP(e.target.value);
        setAmount(numeric > 0 ? numeric.toString() : '');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseCOP(amount);
        if (!description || !numericAmount || !categoryId) return;
        addTransaction({
            description,
            amount: numericAmount,
            date,
            type: TransactionType.EXPENSE,
            expenseType: ExpenseType.VARIABLE,
            categoryId,
            isRecurring: false,
            status: isProjected ? 'projected' : 'completed'
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <Card className="w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4 text-dark-text dark:text-white">Añadir Gasto para {date}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Descripción</label>
                        <Input value={description} onChange={e => setDescription(e.target.value)} required placeholder="Ej: Taxi, Almuerzo..." />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Monto</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                            <Input
                                type="text"
                                value={formatCOP(amount)}
                                onChange={handleAmountChange}
                                required
                                className="pl-7"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Categoría</label>
                        <Select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is-projected"
                            checked={isProjected}
                            onChange={e => setIsProjected(e.target.checked)}
                            className="w-4 h-4 text-primary rounded border-gray-300 dark:border-slate-600 focus:ring-primary dark:bg-slate-700"
                        />
                        <label htmlFor="is-projected" className="text-sm font-medium text-gray-700 dark:text-gray-300">Marcar como Proyección (No ejecutado)</label>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button type="submit" className="flex-1 font-semibold">Añadir</Button>
                        <Button type="button" onClick={onClose} className="flex-1 bg-gray-100 dark:bg-slate-700 !text-gray-600 dark:!text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 shadow-none font-semibold border-0">Cancelar</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

// --- CONFIRM DELETE MODAL ---
const ConfirmDeleteModal: React.FC<{
    transaction: Transaction | null;
    onClose: () => void;
    onConfirm: () => void;
}> = ({ transaction, onClose, onConfirm }) => {
    if (!transaction) return null;

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <Card className="w-full max-w-sm border-red-50 dark:border-red-900/40 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">¿Eliminar Gasto?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-6 leading-relaxed">
                    Esta acción eliminará "{transaction.description}" de tu {transaction.isRecurring ? 'proyección' : 'historial'}. No se puede deshacer.
                </p>
                <div className="flex gap-2">
                    <button onClick={onConfirm} className="flex-1 py-2.5 px-4 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors">Eliminar</button>
                    <button onClick={onClose} className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
                </div>
            </Card>
        </div>
    );
};

// --- DAY CELL ---
const DayCell: React.FC<{
    date: Date;
    transactions: Transaction[];
    isToday: boolean;
    isHoliday: boolean;
    isFaded: boolean;
    draggedOverDay: string | null;
    draggingItemId: string | null;
    recordedDays: Set<string>;
    onFocusTransaction: (t: Transaction) => void;
    handlers: any;
}> = ({ date, transactions, isToday, isHoliday, isFaded, draggedOverDay, draggingItemId, recordedDays, onFocusTransaction, handlers }) => {
    const day = date.getDate();
    const incomeSum = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const expenseSum = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const dateStr = date.toISOString().slice(0, 10);
    const isDayRecorded = recordedDays.has(dateStr);
    const isPastOrToday = date <= new Date();

    return (
        <div className="flex flex-col border-r border-b border-gray-100 dark:border-slate-700">
            <div
                className={`p-2.5 min-h-[140px] flex-grow flex flex-col relative transition-all duration-200 group cursor-pointer ${isFaded ? 'bg-gray-50/30 dark:bg-slate-900/30' : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700'} ${isHoliday ? '!bg-indigo-50/20 dark:!bg-indigo-900/20' : ''} ${isToday ? '!bg-amber-50/50 dark:!bg-amber-900/20 ring-inset ring-1 ring-amber-200 dark:ring-amber-900/40' : ''} ${draggedOverDay === dateStr ? 'bg-primary/5 dark:bg-primary/10 border-2 border-primary' : ''} ${isDayRecorded ? '!bg-green-50/30 dark:!bg-green-900/20 cursor-default' : ''}`}
                onDragOver={handlers.handleDragOver}
                onDrop={(e) => handlers.handleDrop(e, dateStr)}
                onDragEnter={() => handlers.handleDragEnter(dateStr)}
                onDragLeave={handlers.handleDragLeave}
                onClick={() => !isDayRecorded && handlers.setModalInfo({ open: true, date: dateStr })}
                title={!isDayRecorded ? "Clic para añadir egreso" : ""}
            >
                <div className="flex justify-between items-center mb-2">
                    <span className={`text-[13px] font-medium ${isToday ? 'text-primary' : 'text-medium-text dark:text-gray-400'} ${isFaded ? 'text-gray-300 dark:text-slate-600' : ''}`}>{day}</span>
                    <div className="flex items-center gap-1 opacity-100 transition-opacity">
                        {!isDayRecorded && isPastOrToday && transactions.length > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); handlers.recordDay(dateStr); }} className="text-green-500 hover:text-green-600 p-0.5" title="Cerrar Día">
                                <LockClosedIcon className="h-3.5 w-3.5" />
                            </button>
                        )}
                        {/* Icono + visualmente sutil para reforzar affordance pero no es el único trigger */}
                        {!isDayRecorded && (
                            <div className="text-primary/40 dark:text-primary/60 p-0.5 group-hover:text-primary">
                                <PlusCircleIcon className="h-4 w-4" />
                            </div>
                        )}
                    </div>
                    {isDayRecorded && <LockClosedIcon className="h-3.5 w-3.5 text-green-500" title="Día Cerrado" />}
                </div>

                <div className="space-y-1.5 flex-grow">
                    {transactions.map(t => {
                        const isExecuted = isTransactionExecuted(t);
                        const isDraggable = !isDayRecorded;
                        return (
                            <div
                                key={t.id}
                                onClick={(e) => { e.stopPropagation(); onFocusTransaction(t); }}
                                className={`cursor-pointer px-2 py-1.5 rounded-lg border-l-2 shadow-sm text-[10px] leading-tight transition-all hover:bg-white dark:hover:bg-slate-700 hover:ring-1 hover:ring-black/5 dark:hover:ring-white/5 ${isExecuted ? 'bg-green-50/80 dark:bg-green-900/40 text-green-900 dark:text-green-300 border-green-400 dark:border-green-800' : 'bg-indigo-50/40 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 border-dashed'} ${draggingItemId === t.id ? 'opacity-30' : 'opacity-100'}`}
                                draggable={isDraggable}
                                onDragStart={(e) => handlers.handleDragStart(e, t)}
                                onDragEnd={handlers.handleDragEnd}
                            >
                                <div className="flex justify-between items-start gap-1">
                                    <div className="flex items-center gap-1 min-w-0 flex-1">
                                        {t.type === TransactionType.INCOME ? (
                                            <ArrowDownTrayIcon className="h-2.5 w-2.5 text-green-600 dark:text-green-400 shrink-0" title="Ingreso" />
                                        ) : (
                                            <ArrowUpTrayIcon className="h-2.5 w-2.5 text-red-500 dark:text-red-400 shrink-0" title="Egreso" />
                                        )}
                                        <span className="font-normal truncate">{t.description}</span>
                                    </div>
                                    {isExecuted && <CheckCircleIcon className="h-2.5 w-2.5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />}
                                </div>
                                <div className="font-medium mt-0.5 text-gray-600 dark:text-gray-400">{formatCurrency(t.amount)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="min-h-[28px] px-2 py-1 border-t border-gray-50 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/30 flex flex-col justify-center gap-0.5">
                {(incomeSum > 0 || expenseSum > 0) ? (
                    <>
                        {incomeSum > 0 && (
                            <div className="flex justify-between items-center text-[9px] leading-none">
                                <span className="text-green-600 dark:text-green-500 font-bold uppercase">Ing</span>
                                <span className="text-green-700 dark:text-green-400 font-bold">{formatCurrency(incomeSum)}</span>
                            </div>
                        )}
                        {expenseSum > 0 && (
                            <div className="flex justify-between items-center text-[9px] leading-none">
                                <span className="text-red-500 dark:text-red-400 font-bold uppercase">Egr</span>
                                <span className="text-red-600 dark:text-red-300 font-bold">{formatCurrency(expenseSum)}</span>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-[9px] text-gray-300 dark:text-gray-600 italic text-center">Sin movs</div>
                )}
            </div>
        </div>
    );
};

// --- VIEWS ---
const MonthView: React.FC<any> = ({ currentDate, transactionsByDay, draggedOverDay, draggingItemId, handlers, recordedDays, onFocusTransaction }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const startDate = new Date(year, month, 1 - adjustedFirstDay);

    const lastDayOfMonth = new Date(year, month + 1, 0);
    const diffInDays = Math.ceil((lastDayOfMonth.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalDaysToShow = diffInDays > 35 ? 42 : 35;

    const calendarDays = Array.from({ length: totalDaysToShow }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        return d;
    });

    return (
        <div className="grid grid-cols-7 border-t border-l border-gray-100 dark:border-slate-700 overflow-hidden rounded-b-xl">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="text-center font-semibold text-gray-400 dark:text-gray-500 p-2.5 border-r border-b border-gray-100 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/40 text-[10px] uppercase tracking-widest">{day}</div>
            ))}
            {calendarDays.map((date) => {
                const dateStr = date.toISOString().slice(0, 10);
                return (
                    <DayCell
                        key={dateStr}
                        date={date}
                        transactions={transactionsByDay.get(dateStr) || []}
                        isToday={new Date().toDateString() === date.toDateString()}
                        isHoliday={getColombianHolidays(year).has(dateStr)}
                        isFaded={date.getMonth() !== currentDate.getMonth()}
                        draggedOverDay={draggedOverDay}
                        draggingItemId={draggingItemId}
                        handlers={handlers}
                        recordedDays={recordedDays}
                        onFocusTransaction={onFocusTransaction}
                    />
                );
            })}
        </div>
    );
};

const WeekView: React.FC<any> = ({ currentDate, transactionsByDay, draggedOverDay, draggingItemId, handlers, recordedDays, onFocusTransaction }) => {
    const weekDates = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        const dayOfWeek = currentDate.getDay();
        const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        return Array.from({ length: 7 }, (_, i) => new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i));
    }, [currentDate]);
    return (
        <div className="grid grid-cols-7 border-t border-l border-gray-100 dark:border-slate-700 rounded-b-xl overflow-hidden">
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day, index) => <div key={day} className="text-center font-semibold text-gray-400 dark:text-gray-500 p-3.5 border-r border-b border-gray-100 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-900/40 text-[10px] uppercase tracking-widest">{day} <span className="block text-xs font-bold text-primary dark:text-blue-400 mt-1">{weekDates[index].getDate()}</span></div>)}
            {weekDates.map(date => <DayCell key={date.toISOString().slice(0, 10)} date={date} transactions={transactionsByDay.get(date.toISOString().slice(0, 10)) || []} isToday={new Date().toDateString() === date.toDateString()} isHoliday={getColombianHolidays(currentDate.getFullYear()).has(date.toISOString().slice(0, 10))} isFaded={date.getMonth() !== currentDate.getMonth()} draggedOverDay={draggedOverDay} draggingItemId={draggingItemId} handlers={handlers} recordedDays={recordedDays} onFocusTransaction={onFocusTransaction} />)}
        </div>
    );
};

const DayView: React.FC<any> = ({ currentDate, transactionsForDay, categories, handlers, recordedDays }) => {
    const dateStr = currentDate.toISOString().slice(0, 10);
    const isDayRecorded = recordedDays.has(dateStr);
    const isPastOrToday = currentDate.setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0);
    return (
        <div className="p-8 border-t border-gray-50 dark:border-slate-700 space-y-8 bg-white dark:bg-slate-800">
            <div className="flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-700">
                <div className="flex flex-col"><span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Estado de Operación</span><span className={`text-sm font-medium flex items-center gap-2 ${isDayRecorded ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{isDayRecorded ? <><LockClosedIcon className="h-4 w-4" /> Jornada Verificada</> : 'Jornada Abierta'}</span></div>
                {!isDayRecorded && isPastOrToday && transactionsForDay.length > 0 && <Button onClick={() => handlers.recordDay(dateStr)} className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100/30 dark:shadow-none px-8 py-3.5 rounded-xl font-semibold"><LockClosedIcon className="h-4 w-4 mr-2" />Cerrar y Veridicar Caja</Button>}
            </div>
            <div className="space-y-4">
                {transactionsForDay.length === 0 ? <div className="text-center py-20 bg-gray-50/20 dark:bg-slate-900/20 rounded-2xl border-2 border-dashed border-gray-100 dark:border-slate-700"><p className="text-gray-400 dark:text-gray-500 font-medium italic">Sin movimientos programados.</p></div> : transactionsForDay.map((t: Transaction) => {
                    const isExecuted = !t.isRecurring;
                    return (
                        <div key={t.id} className={`flex flex-col sm:flex-row items-center justify-between p-6 rounded-2xl border transition-all shadow-sm ${isExecuted ? 'bg-green-50/40 dark:bg-green-900/20 border-green-100 dark:border-green-800' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
                            <div className="flex items-center gap-5 w-full sm:w-auto mb-4 sm:mb-0"><div className={`p-4 rounded-xl ${isExecuted ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'}`}>{isExecuted ? <CheckCircleIcon className="h-6 w-6" /> : <PlusCircleIcon className="h-6 w-6" />}</div><div className="flex-1"><div className="flex items-center gap-3"><h4 className="font-medium text-dark-text dark:text-white text-lg">{t.description}</h4>{!isExecuted && <span className="text-[9px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold tracking-widest">PLAN</span>}</div><p className="text-xs text-medium-text dark:text-gray-400 font-medium uppercase tracking-tight opacity-50">{categories.find((c: Category) => c.id === t.categoryId)?.name}</p></div></div>
                            <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-end"><span className={`text-xl font-bold ${isExecuted ? 'text-green-600 dark:text-green-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{formatCurrency(t.amount)}</span>
                                {!isDayRecorded && (
                                    <div className="flex gap-2">
                                        {!isExecuted ? <button onClick={() => handlers.handleConfirmTransaction(t)} className="bg-green-600 text-white p-3.5 rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-100 dark:shadow-none" title="Confirmar"><CheckCircleIcon className="h-5 w-5" /></button> : <button onClick={() => handlers.handleUndoTransaction(t)} className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 p-3.5 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all" title="Deshacer"><ArrowPathIcon className="h-5 w-5" /></button>}
                                        <button onClick={() => handlers.handleEditClick(t)} className="bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300 p-3.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 transition-all" title="Ajustar"><ArrowPathIcon className="h-5 w-5 rotate-90" /></button>
                                        <button onClick={() => handlers.handleDeleteClick(t)} className="bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 p-3.5 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all" title="Borrar"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {!isDayRecorded && <button onClick={() => handlers.setModalInfo({ open: true, date: dateStr })} className="w-full py-6 border-2 border-dashed border-gray-100 dark:border-slate-700 rounded-2xl text-gray-400 dark:text-gray-500 font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900 transition-all flex items-center justify-center gap-2 text-sm tracking-wide"><PlusCircleIcon className="h-5 w-5" />Añadir Gasto Extraordinario</button>}
        </div>
    );
};

// --- MAIN CALENDAR COMPONENT ---
const CalendarView: React.FC<CalendarViewProps> = ({ transactions, updateTransactionDate, updateTransactionAmount, updateTransaction, updateRecurringExpenseOverride, addTransaction, deleteTransaction, categories, recordedDays, recordDay }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [displayMode, setDisplayMode] = useState<CalendarDisplayMode>('month');
    const [draggedOverDay, setDraggedOverDay] = useState<string | null>(null);
    const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
    const [modalInfo, setModalInfo] = useState<{ open: boolean, date: string | null }>({ open: false, date: null });
    const [editingInfo, setEditingInfo] = useState<EditingInfo | null>(null);
    const [confirmDeleteInfo, setConfirmDeleteInfo] = useState<Transaction | null>(null);
    const [focusedTransaction, setFocusedTransaction] = useState<Transaction | null>(null);

    const handleDragStart = (e: React.DragEvent, transaction: Transaction) => {
        e.dataTransfer.setData('transactionId', transaction.id);
        e.dataTransfer.setData('isRecurring', String(!!transaction.isRecurring));
        const sourceKey = transaction.originalDate || transaction.date;
        e.dataTransfer.setData('sourceDate', sourceKey);
        if (transaction.isRecurring && transaction.recurringId) e.dataTransfer.setData('recurringId', transaction.recurringId);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => setDraggingItemId(transaction.id), 0);
    };

    const handleDrop = (e: React.DragEvent, targetDateStr: string) => {
        e.preventDefault();
        const isRecurring = e.dataTransfer.getData('isRecurring') === 'true';
        const sourceDate = e.dataTransfer.getData('sourceDate');
        const transactionId = e.dataTransfer.getData('transactionId');
        if (isRecurring) {
            const recurringId = e.dataTransfer.getData('recurringId');
            if (recurringId && sourceDate) updateRecurringExpenseOverride(recurringId, sourceDate, { date: targetDateStr });
        } else if (transactionId) {
            updateTransactionDate(transactionId, targetDateStr);
        }
        setDraggedOverDay(null); setDraggingItemId(null);
    };

    const handleEditClick = (t: Transaction) => setEditingInfo({ id: t.id, originalAmount: t.amount, currentAmount: String(t.amount), isRecurring: !!t.isRecurring, recurringId: t.recurringId, date: t.originalDate || t.date });

    const handleSaveAmount = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!editingInfo) return;
        const newAmount = parseCOP(editingInfo.currentAmount);
        if (editingInfo.isRecurring && editingInfo.recurringId) updateRecurringExpenseOverride(editingInfo.recurringId, editingInfo.date, { amount: newAmount });
        else updateTransactionAmount(editingInfo.id, newAmount);
        setEditingInfo(null);
    };

    const handleConfirmTransaction = (t: Transaction) => {
        if (t.id.startsWith('gen-') || t.isRecurring) {
            // Is a virtual projection -> Create Real
            addTransaction({
                date: t.date,
                description: t.description,
                amount: t.amount,
                type: TransactionType.EXPENSE,
                expenseType: t.expenseType || ExpenseType.VARIABLE,
                categoryId: t.categoryId,
                isRecurring: false,
                recurringId: t.recurringId,
                originalDate: t.originalDate,
                status: 'completed'
            });
        } else {
            // Is a manual projection -> Update status
            if (updateTransaction) updateTransaction(t.id, { status: 'completed' });
        }
    };
    const handleUndoTransaction = (t: Transaction) => {
        if (t.recurringId) {
            // Was generated from recurring -> Delete to return to virtual state
            deleteTransaction(t.id);
        } else {
            // Was manual -> Set back to projected
            if (updateTransaction) updateTransaction(t.id, { status: 'projected' });
        }
    };
    const handleDeleteClick = (transaction: Transaction) => setConfirmDeleteInfo(transaction);
    const handleConfirmDelete = () => { if (!confirmDeleteInfo) return; if (confirmDeleteInfo.isRecurring && confirmDeleteInfo.recurringId) updateRecurringExpenseOverride(confirmDeleteInfo.recurringId, confirmDeleteInfo.originalDate || confirmDeleteInfo.date, { amount: 0 }); else deleteTransaction(confirmDeleteInfo.id); setConfirmDeleteInfo(null); };

    const navigateDate = (delta: number) => { setCurrentDate(prev => { const newDate = new Date(prev); if (displayMode === 'month') { newDate.setDate(1); newDate.setMonth(newDate.getMonth() + delta); } else if (displayMode === 'week') { newDate.setDate(newDate.getDate() + (delta * 7)); } else { newDate.setDate(newDate.getDate() + delta); } return newDate; }); };

    // --- FILTER HELPERS ---
    const isArqueoTransaction = (t: Transaction) => {
        return t.id.startsWith('txn-arq-') ||
            t.description.toLowerCase().includes('ventas del día') ||
            t.description.toLowerCase().includes('arqueo');
    };

    const transactionsByDay = useMemo(() => {
        const map = new Map<string, Transaction[]>();

        if (!transactions || !Array.isArray(transactions)) {
            return map;
        }

        transactions.forEach(t => {
            if (isArqueoTransaction(t)) return; // Skip arqueo transactions
            if (!map.has(t.date)) map.set(t.date, []);
            map.get(t.date)!.push(t);
        });
        return map;
    }, [transactions]);

    const viewHandlers = { handleDrop, handleDragOver: (e: any) => e.preventDefault(), handleDragEnter: (d: any) => setDraggedOverDay(d), handleDragLeave: () => setDraggedOverDay(null), handleDragStart, handleDragEnd: () => { setDraggingItemId(null); setDraggedOverDay(null); }, handleEditClick, setModalInfo, handleDeleteClick, handleConfirmTransaction, handleUndoTransaction, recordDay };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-dark-text dark:text-white tracking-tight">Vista de Calendario</h1>
                    <p className="text-sm text-medium-text dark:text-gray-400 font-medium opacity-60">Planificación visual de movimientos.</p>
                </div>
            </div>

            <Card className="!p-0 overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm rounded-2xl">
                <div className="flex items-center justify-between p-6 bg-white dark:bg-slate-800 border-b border-gray-50 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigateDate(-1)} className="p-2.5 bg-gray-50 dark:bg-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 text-dark-text dark:text-gray-200 transition-all border border-gray-100 dark:border-slate-600 text-sm"><ChevronLeftIcon className="h-4 w-4" /></button>
                        <button onClick={() => navigateDate(1)} className="p-2.5 bg-gray-50 dark:bg-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 text-dark-text dark:text-gray-200 transition-all border border-gray-100 dark:border-slate-600 text-sm"><ChevronRightIcon className="h-4 w-4" /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-5 py-2.5 text-[10px] font-bold bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-dark-text dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 rounded-xl transition-all ml-2 uppercase tracking-widest">Hoy</button>
                    </div>
                    <h2 className="text-lg font-semibold text-dark-text dark:text-white capitalize tracking-tight">
                        {currentDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: displayMode === 'day' ? 'numeric' : undefined })}
                    </h2>
                    <div className="flex bg-gray-50 dark:bg-slate-900 p-1 rounded-xl border border-gray-100 dark:border-slate-800">
                        {(['day', 'week', 'month'] as CalendarDisplayMode[]).map(mode => (
                            <button key={mode} onClick={() => setDisplayMode(mode)} className={`px-4 py-1.5 text-[10px] font-semibold rounded-lg transition-all tracking-widest uppercase ${displayMode === mode ? 'bg-white dark:bg-slate-700 text-primary dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-medium-text dark:text-gray-400 hover:text-primary dark:hover:text-blue-400'}`}>
                                {mode === 'day' ? 'DÍA' : mode === 'week' ? 'SEM' : 'MES'}
                            </button>
                        ))}
                    </div>
                </div>

                {displayMode === 'month' && <MonthView currentDate={currentDate} transactionsByDay={transactionsByDay} draggedOverDay={draggedOverDay} draggingItemId={draggingItemId} handlers={viewHandlers} recordedDays={recordedDays} onFocusTransaction={setFocusedTransaction} />}
                {displayMode === 'week' && <WeekView currentDate={currentDate} transactionsByDay={transactionsByDay} draggedOverDay={draggedOverDay} draggingItemId={draggingItemId} handlers={viewHandlers} recordedDays={recordedDays} onFocusTransaction={setFocusedTransaction} />}
                {displayMode === 'day' && <DayView currentDate={currentDate} transactionsForDay={transactions.filter(t => t.date === currentDate.toISOString().slice(0, 10) && !isArqueoTransaction(t))} categories={categories} handlers={viewHandlers} recordedDays={recordedDays} />}
            </Card>

            <div className="flex flex-wrap gap-8 px-6 py-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm w-fit">
                <div className="flex items-center gap-2.5 text-indigo-500 dark:text-indigo-400 font-medium text-[9px] uppercase tracking-widest">
                    <span className="w-4 h-4 bg-indigo-50/40 dark:bg-indigo-900/20 border border-indigo-300 dark:border-indigo-600 border-dashed block rounded-md"></span> Planificado
                </div>
                <div className="flex items-center gap-2.5 text-green-500 dark:text-green-400 font-medium text-[9px] uppercase tracking-widest">
                    <span className="w-4 h-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 block rounded-md"></span> Verificado
                </div>
                <div className="flex items-center gap-2.5 text-gray-400 dark:text-gray-500 font-medium text-[9px] uppercase tracking-widest">
                    <LockClosedIcon className="h-4 w-4" /> Ejecutado
                </div>
            </div>

            {focusedTransaction && (
                <FloatingActionMenu
                    transaction={focusedTransaction}
                    onClose={() => setFocusedTransaction(null)}
                    handlers={viewHandlers}
                    isDayRecorded={recordedDays.has(focusedTransaction.date)}
                />
            )}

            {editingInfo && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setEditingInfo(null); }}
                >
                    <Card className="w-full max-w-sm rounded-[1.5rem] shadow-2xl p-8 border-0" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-semibold mb-1 text-dark-text dark:text-white tracking-tight text-center">Ajustar Monto</h3>
                        <p className="text-[10px] text-gray-400 mb-8 text-center uppercase tracking-widest font-medium">Fecha de ajuste: {formatDateToDisplay(editingInfo.date)}</p>
                        <form onSubmit={handleSaveAmount} className="space-y-8">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-xl font-bold">$</span>
                                <Input
                                    type="text"
                                    value={formatCOP(editingInfo.currentAmount)}
                                    onChange={e => setEditingInfo({ ...editingInfo, currentAmount: parseCOP(e.target.value).toString() })}
                                    className="text-3xl font-bold pl-10 h-16 bg-gray-50/50 dark:bg-slate-700 border-gray-100 dark:border-slate-600 rounded-2xl text-center focus:ring-4 focus:ring-primary/5 transition-all text-dark-text dark:text-white"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button type="submit" className="flex-1 py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 bg-primary text-white">GUARDAR</Button>
                                <Button type="button" onClick={() => setEditingInfo(null)} className="flex-1 bg-gray-50 dark:bg-slate-700 !text-gray-500 dark:!text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-600 shadow-none py-4 rounded-xl font-bold text-xs uppercase tracking-widest border-0">Cerrar</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {modalInfo.open && modalInfo.date && (
                <QuickAddExpenseModal isOpen={modalInfo.open} onClose={() => setModalInfo({ open: false, date: null })} date={modalInfo.date} addTransaction={addTransaction} categories={categories} />
            )}
            <ConfirmDeleteModal transaction={confirmDeleteInfo} onClose={() => setConfirmDeleteInfo(null)} onConfirm={handleConfirmDelete} />
        </div>
    );
};

export default CalendarView;
