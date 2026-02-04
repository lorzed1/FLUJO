import React, { useState, useEffect } from 'react';
import { RecurrenceRule, RecurrenceFrequency } from '../../../types/budget';
import { useApp } from '../../../context/AppContext';
import { TransactionType } from '../../../types';
import { XMarkIcon } from '@heroicons/react/24/outline'; // IMPORT FIX: Ensure this line is present if it was previously removed or changed
import { Input } from '../../../components/ui/Input';
import { CurrencyInput } from '../../../components/ui/CurrencyInput';
import { Select } from '../../../components/ui/Select';
import { LabeledField } from '../../../components/ui/LabeledField';
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
    const { categories } = useApp();
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
    const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1); // 1 = Monday
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
                // Initialize selectors
                const date = new Date(initialRule.startDate + 'T12:00:00');
                if (initialRule.frequency === 'weekly') {
                    setSelectedDayOfWeek(initialRule.dayToSend);
                } else {
                    setSelectedDayOfMonth(initialRule.dayToSend);
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
                setSelectedDayOfWeek(1); // Default Monday
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
            // Calcular fecha de inicio real (Primera Ocurrencia) basada en "Válido Desde" y el patrón de recurrencia
            // Esto asegura que la regla comience sincronizada con el patrón deseado
            const validFromDate = parseISO(formData.validFrom); // Fecha base para buscar la siguiente ocurrencia
            let start = new Date(validFromDate);
            let dayToSend = 1;

            if (formData.frequency === 'weekly') {
                dayToSend = Number(selectedDayOfWeek);
                // Calcular próximo día de la semana
                const currentDay = start.getDay();
                const daysUntil = (dayToSend + 7 - currentDay) % 7;
                start.setDate(start.getDate() + daysUntil);
            } else if (formData.frequency === 'monthly') {
                dayToSend = Number(selectedDayOfMonth);
                // Ajustar al día del mes seleccionado
                // Si el día seleccionado es menor al día de 'validFrom', pasar al siguiente mes
                // Ejemplo: ValidFrom=20-Feb, Day=5. First=05-Mar
                if (validFromDate.getDate() > dayToSend) {
                    start.setMonth(start.getMonth() + 1);
                }
                start.setDate(dayToSend);
            }

            const startDateStr = format(start, 'yyyy-MM-dd');

            await onSubmit({
                id: isDuplicate ? undefined : initialRule?.id,
                title: formData.title,
                amount: Number(formData.amount),
                category: formData.category,
                frequency: formData.frequency,
                startDate: startDateStr, // Primera ocurrencia calculada
                endDate: formData.validUntil || undefined, // Fecha límite opcional
                interval: Number(formData.interval),
                dayToSend,
                active: formData.active
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {initialRule && !isDuplicate ? 'Editar Regla Recurrente' : (isDuplicate ? 'Duplicar Regla Recurrente' : 'Nueva Regla Recurrente')}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <LabeledField label="Descripción">
                        <Input
                            value={formData.title}
                            onChange={e => handleChange('title', e.target.value)}
                            placeholder="Ej: Alquiler, Nominas..."
                            required
                        />
                    </LabeledField>

                    <div className="grid grid-cols-2 gap-4">
                        <LabeledField label="Monto">
                            <CurrencyInput
                                value={formData.amount}
                                onChange={val => handleChange('amount', val)}
                                placeholder="$ 0"
                                required
                            />
                        </LabeledField>

                        <LabeledField label="Categoría">
                            <Select
                                value={formData.category}
                                onChange={e => handleChange('category', e.target.value)}
                                required
                            >
                                <option value="">Seleccionar...</option>
                                {expenseCategories.map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                                <option value="Otros">Otros</option>
                            </Select>
                        </LabeledField>
                    </div>

                    <div className="bg-white dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Periodo de Validez</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <LabeledField label="Válido Desde">
                                <Input
                                    type="date"
                                    value={formData.validFrom}
                                    onChange={e => handleChange('validFrom', e.target.value)}
                                    required
                                />
                            </LabeledField>

                            <LabeledField label="Hasta (Opcional)">
                                <Input
                                    type="date"
                                    value={formData.validUntil}
                                    onChange={e => handleChange('validUntil', e.target.value)}
                                    placeholder="Indefinido"
                                />
                            </LabeledField>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl space-y-4">
                        <LabeledField label="Frecuencia">
                            <Select
                                value={formData.frequency}
                                onChange={e => handleChange('frequency', e.target.value)}
                            >
                                <option value="weekly">Semanal</option>
                                <option value="monthly">Mensual</option>
                            </Select>
                        </LabeledField>

                        <div className="grid grid-cols-2 gap-4">
                            {formData.frequency === 'weekly' ? (
                                <LabeledField label="Día de la semana">
                                    <Select
                                        value={selectedDayOfWeek}
                                        onChange={e => setSelectedDayOfWeek(Number(e.target.value))}
                                    >
                                        <option value="1">Lunes</option>
                                        <option value="2">Martes</option>
                                        <option value="3">Miércoles</option>
                                        <option value="4">Jueves</option>
                                        <option value="5">Viernes</option>
                                        <option value="6">Sábado</option>
                                        <option value="0">Domingo</option>
                                    </Select>
                                </LabeledField>
                            ) : (
                                <LabeledField label="Día del mes">
                                    <Select
                                        value={selectedDayOfMonth}
                                        onChange={e => setSelectedDayOfMonth(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                            <option key={day} value={day}>{day}</option>
                                        ))}
                                    </Select>
                                </LabeledField>
                            )}

                            <LabeledField label={formData.frequency === 'weekly' ? 'Intervalo (Semanas)' : 'Intervalo (Meses)'}>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.interval}
                                    onChange={e => handleChange('interval', e.target.value)}
                                    required
                                />
                            </LabeledField>
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {formData.frequency === 'weekly'
                                ? `Se programará para todos los ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][selectedDayOfWeek]} ${formData.interval > 1 ? `cada ${formData.interval} semanas` : ''}, iniciando el ${format(parseISO(formData.validFrom || new Date().toISOString()), 'dd/MM/yyyy')}.`
                                : `Se programará para el día ${selectedDayOfMonth} ${formData.interval > 1 ? `cada ${formData.interval} meses` : 'de cada mes'}, comenzando desde ${format(parseISO(formData.validFrom || new Date().toISOString()), 'MMMM yyyy')}.`}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/30 transition-all font-medium text-sm"
                        >
                            {isLoading ? 'Guardando...' : (initialRule && !isDuplicate ? 'Actualizar Regla' : 'Crear Regla')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
