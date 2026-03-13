import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { DatePicker } from './DatePicker';
import { CurrencyInput } from './CurrencyInput';
import { DocumentTextIcon } from '@/components/ui/Icons';
import { Column } from '../../hooks/useSmartDataTable';
import { Modal } from './Modal';

export interface SmartDataFormModalProps<T> {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<T>) => Promise<void>;
    columns: Column<T>[];
    title?: string;
    initialData?: Partial<T>;
}

export function SmartDataFormModal<T extends Record<string, any>>({
    isOpen,
    onClose,
    onSubmit,
    columns,
    title = "Nuevo Registro",
    initialData
}: SmartDataFormModalProps<T>) {
    const [formData, setFormData] = useState<Partial<T>>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData(initialData);
                return;
            }
            const baseData: Partial<T> = {};
            columns.forEach(col => {
                if (col.type === 'date') {
                    // Pre-fill today's date automatically
                    baseData[col.key as keyof T] = new Date().toISOString().split('T')[0] as any;
                }
            });
            setFormData(baseData);
        }
    }, [isOpen, columns, initialData]);

    const handleChange = (key: keyof T, value: any) => {
        setFormData(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Hubo un error al guardar el registro.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    // Filter out columns that typically shouldn't be edited like ID, CreatedAt, or calculated fields
    const editableColumns = columns.filter(col =>
        !['id', 'created_at', 'updated_at'].includes(col.key.toLowerCase()) &&
        col.key !== 'acciones'
    );

    const headerTitle = (
        <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-slate-700 rounded-lg">
                <DocumentTextIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
                <span className="text-base font-bold text-slate-800 dark:text-white leading-tight block">
                    {title}
                </span>
                <span className="text-xs2 text-slate-400 font-semibold uppercase tracking-caps mt-0.5 block">
                    Módulo de Ingreso Manual
                </span>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={headerTitle}
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 px-1 pb-2">
                        {editableColumns.map((col) => {
                            const val = formData[col.key as keyof T] as string | number;
                            return (
                                <div key={col.key} className={col.type === 'text' || !col.type ? 'sm:col-span-2' : ''}>
                                    <label className="block text-xs font-bold text-slate-500 tracking-wide mb-1.5 uppercase">
                                        {col.label}
                                    </label>

                                    {col.type === 'currency' ? (
                                        <CurrencyInput
                                            value={val as string || ''}
                                            onChange={v => handleChange(col.key as keyof T, Number(v) || 0)}
                                            placeholder="$ 0"
                                            className="text-sm font-bold text-emerald-700"
                                            required={false}
                                        />
                                    ) : col.type === 'number' ? (
                                        <Input
                                            type="number"
                                            value={val || ''}
                                            onChange={e => handleChange(col.key as keyof T, Number(e.target.value))}
                                            placeholder="0"
                                            className="text-sm- font-medium"
                                        />
                                    ) : col.type === 'date' ? (
                                        <DatePicker
                                            value={val as string || ''}
                                            onChange={v => handleChange(col.key as keyof T, v)}
                                            className="text-sm- font-medium"
                                        />
                                    ) : (
                                        <Input
                                            type="text"
                                            value={val as string || ''}
                                            onChange={e => handleChange(col.key as keyof T, e.target.value)}
                                            placeholder={`Ingresar ${col.label.toLowerCase()}`}
                                            className="text-sm- font-medium"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="pt-5 pb-5 px-6 flex justify-end items-center border-t border-gray-50 dark:border-slate-700 gap-3 bg-white dark:bg-slate-800 shrink-0">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        className="!px-6 font-semibold text-xs tracking-wide"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="!px-8 font-semibold text-xs tracking-wide shadow-md shadow-purple-500/10 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {isLoading ? 'Guardando...' : 'Guardar Registro'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
