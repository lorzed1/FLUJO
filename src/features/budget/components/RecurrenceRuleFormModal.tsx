import React, { useState, useEffect } from 'react';
import { RecurrenceRule, RecurrenceFrequency } from '../../../types/budget';
import { useData } from '../../../context/DataContext';
import { TransactionType } from '../../../types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Input } from '../../../components/ui/Input';
import { DatePicker } from '../../../components/ui/DatePicker';
import { CurrencyInput } from '../../../components/ui/CurrencyInput';
import { Select } from '../../../components/ui/Select';
import { Button } from '@/components/ui/Button';
import { format, parseISO } from 'date-fns';

interface RecurrenceRuleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialRule?: RecurrenceRule;
    isDuplicate?: boolean;
    onSubmit: (ruleData: Omit<RecurrenceRule, 'id' | 'createdAt' | 'updatedAt' | 'lastGeneratedDate'> & { id?: string }) => Promise<void>;
}

export const RecurrenceRuleFormModal: React.FC<RecurrenceRuleFormModalProps> = ({
    isOpen,
    onClose,
    initialRule,
    isDuplicate,
    onSubmit
}) => {
    const { categories } = useData();
    const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);

    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category: '',
        frequency: 'monthly' as RecurrenceFrequency,
        interval: 1,
        active: true,
        validFrom: format(new Date(), 'yyyy-MM-dd'),
        validUntil: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1);
    const [selectedDayOfMonth, setSelectedDayOfMonth] = useState(1);

    useEffect(() => {
        if (isOpen) {
            if (initialRule) {
                setFormData({
                    title: initialRule.title,
                    amount: String(initialRule.amount),
                    category: initialRule.category,
                    frequency: initialRule.frequency,
                    interval: initialRule.interval || 1,
                    active: initialRule.active,
                    validFrom: initialRule.startDate,
                    validUntil: initialRule.endDate || ''
                });
                const date = new Date(initialRule.startDate + 'T12:00:00');
                if (initialRule.frequency === 'weekly') {
                    setSelectedDayOfWeek(initialRule.dayToSend);
                } else {
                    setSelectedDayOfMonth(initialRule.dayToSend);
                    if (initialRule.dayToSend) setSelectedDayOfMonth(initialRule.dayToSend);
                }
            } else {
                setFormData({
                    title: '',
                    amount: '',
                    category: expenseCategories[0]?.name || 'Otros',
                    frequency: 'monthly',
                    interval: 1,
                    active: true,
                    validFrom: format(new Date(), 'yyyy-MM-dd'),
                    validUntil: ''
                });
                setSelectedDayOfWeek(1);
                setSelectedDayOfMonth(new Date().getDate());
            }
        }
    }, [isOpen, initialRule, categories]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const [y, m, d] = formData.validFrom.split('-').map(Number);
            const validFromDate = new Date(y, m - 1, d);

            let start = new Date(validFromDate);
            let dayToSend = 1;

            if (formData.frequency === 'weekly') {
                dayToSend = Number(selectedDayOfWeek);
                const currentDay = start.getDay();
                const daysUntil = (dayToSend + 7 - currentDay) % 7;
                start.setDate(start.getDate() + daysUntil);
            } else if (formData.frequency === 'monthly') {
                dayToSend = Number(selectedDayOfMonth);
                if (validFromDate.getDate() > dayToSend) {
                    start.setMonth(start.getMonth() + 1);
                }
                const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
                start.setDate(Math.min(dayToSend, daysInMonth));
            }

            const startDateStr = format(start, 'yyyy-MM-dd');

            const rulePayload: Parameters<typeof onSubmit>[0] = {
                ...(isDuplicate ? {} : { id: initialRule?.id }),
                title: formData.title,
                amount: Number(formData.amount),
                category: formData.category,
                frequency: formData.frequency,
                startDate: startDateStr,
                interval: Number(formData.interval),
                dayToSend,
                active: formData.active,
                ...(formData.validUntil ? { endDate: formData.validUntil } : {})
            };

            await onSubmit(rulePayload);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const FormLabel = ({ children }: { children: React.ReactNode }) => (
        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            {children}
        </label>
    );

    const inputClasses = "h-9 py-1 text-[13px] border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded px-2";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[2px] px-4" onClick={onClose}>
            {/* Modal Container: Max width 2xl for horizontal layout */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>

                {/* Header: Compact */}
                <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800 rounded-t-lg">
                    <h2 className="text-base font-bold text-gray-800 dark:text-white">
                        {initialRule && !isDuplicate ? 'Editar Regla' : (isDuplicate ? 'Duplicar Regla' : 'Nueva Regla')}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 p-1">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">

                    {/* Row 1: Description (Full Width) */}
                    <div>
                        <FormLabel>Descripción</FormLabel>
                        <Input
                            value={formData.title}
                            onChange={e => handleChange('title', e.target.value)}
                            placeholder="Ej: Alquiler Oficina..."
                            required
                            autoFocus
                            className={inputClasses}
                        />
                    </div>

                    {/* Row 2: 3 Columns (Amount, Category, Frequency) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <FormLabel>Monto</FormLabel>
                            <div className="relative">
                                <CurrencyInput
                                    name="amount"
                                    value={Number(formData.amount)}
                                    onChange={(val: number) => handleChange('amount', val)}
                                    required
                                    className={inputClasses}
                                />
                            </div>
                        </div>
                        <div>
                            <FormLabel>Categoría</FormLabel>
                            <Select
                                value={formData.category}
                                onChange={e => handleChange('category', e.target.value)}
                                required
                                className={inputClasses}
                            >
                                <option value="">Seleccionar...</option>
                                {expenseCategories.map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                                <option value="Otros">Otros</option>
                            </Select>
                        </div>
                        <div>
                            <FormLabel>Frecuencia</FormLabel>
                            <Select
                                value={formData.frequency}
                                onChange={e => handleChange('frequency', e.target.value)}
                                className={inputClasses}
                            >
                                <option value="weekly">Semanal</option>
                                <option value="monthly">Mensual</option>
                            </Select>
                        </div>
                    </div>

                    {/* Row 3: Configuration (4 cols for max compactness) */}
                    <div className="bg-gray-50 dark:bg-slate-700/30 p-3 rounded-lg border border-gray-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">

                        {/* 1. Day Selector */}
                        <div>
                            <FormLabel>{formData.frequency === 'weekly' ? 'Día Semana' : 'Día Mes'}</FormLabel>
                            {formData.frequency === 'weekly' ? (
                                <Select
                                    value={selectedDayOfWeek}
                                    onChange={e => setSelectedDayOfWeek(Number(e.target.value))}
                                    className={inputClasses}
                                >
                                    <option value="1">Lunes</option>
                                    <option value="2">Martes</option>
                                    <option value="3">Miércoles</option>
                                    <option value="4">Jueves</option>
                                    <option value="5">Viernes</option>
                                    <option value="6">Sábado</option>
                                    <option value="0">Domingo</option>
                                </Select>
                            ) : (
                                <Select
                                    value={selectedDayOfMonth}
                                    onChange={e => setSelectedDayOfMonth(Number(e.target.value))}
                                    className={inputClasses}
                                >
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </Select>
                            )}
                        </div>

                        {/* 2. Interval */}
                        <div>
                            <FormLabel>Cada (Mes/Sem)</FormLabel>
                            <Input
                                type="number"
                                min="1"
                                value={formData.interval}
                                onChange={e => handleChange('interval', e.target.value)}
                                required
                                className={`${inputClasses} text-center`}
                            />
                        </div>

                        {/* 3. Start Date */}
                        <div>
                            <FormLabel>Inicio</FormLabel>
                            <DatePicker
                                value={formData.validFrom}
                                onChange={val => handleChange('validFrom', val)}
                                required
                                className={inputClasses}
                            />
                        </div>

                        {/* 4. End Date */}
                        <div>
                            <FormLabel>Fin (Opcional)</FormLabel>
                            <DatePicker
                                value={formData.validUntil}
                                onChange={val => handleChange('validUntil', val)}
                                className={inputClasses}
                            />
                        </div>
                    </div>

                    {/* Summary Text (Small) */}
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 italic px-1">
                        <span className="font-semibold not-italic text-gray-700 dark:text-gray-300 mr-1">Resumen:</span>
                        {formData.frequency === 'weekly'
                            ? `Programado para todos los ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][selectedDayOfWeek]} ${formData.interval > 1 ? `(c/ ${formData.interval} semanas)` : ''}, iniciando el ${format(parseISO(formData.validFrom || new Date().toISOString()), 'dd/MM/yyyy')}.`
                            : `Programado para el día ${selectedDayOfMonth} ${formData.interval > 1 ? `(c/ ${formData.interval} meses)` : 'de cada mes'}, iniciando en ${format(parseISO(formData.validFrom || new Date().toISOString()), 'MMM yyyy')}.`}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 flex justify-end gap-2 border-t border-gray-100 dark:border-slate-700 mt-2">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            className="h-8 text-xs font-medium"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isLoading}
                            className="h-8 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isLoading ? 'Guardando...' : (initialRule && !isDuplicate ? 'Guardar Cambios' : 'Crear Regla')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
