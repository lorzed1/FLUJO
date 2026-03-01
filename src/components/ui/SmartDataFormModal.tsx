import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { CurrencyInput } from './CurrencyInput';
import { XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Column } from '../../hooks/useSmartDataTable';

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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] px-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Block */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 dark:bg-slate-700 rounded-lg">
                            <DocumentTextIcon className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                                {title}
                            </h2>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-[0.15em] mt-0.5">Módulo de Ingreso Manual</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg border border-slate-100 dark:border-slate-600 hover:bg-slate-50"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-h-[60vh] overflow-y-auto px-1">
                        {editableColumns.map((col) => {
                            const val = formData[col.key as keyof T] as string | number;
                            return (
                                <div key={col.key} className={col.type === 'text' || !col.type ? 'sm:col-span-2' : ''}>
                                    <label className="block text-[11px] font-bold text-slate-500 tracking-wide mb-1.5 uppercase">
                                        {col.label}
                                    </label>

                                    {col.type === 'currency' ? (
                                        <CurrencyInput
                                            value={val as string || ''}
                                            onChange={v => handleChange(col.key as keyof T, Number(v) || 0)}
                                            placeholder="$ 0"
                                            className="!h-10 text-[14px] font-bold text-emerald-700"
                                            required={false}
                                        />
                                    ) : col.type === 'number' ? (
                                        <Input
                                            type="number"
                                            value={val || ''}
                                            onChange={e => handleChange(col.key as keyof T, Number(e.target.value))}
                                            placeholder="0"
                                            className="!h-10 text-[13px] font-medium"
                                        />
                                    ) : col.type === 'date' ? (
                                        <Input
                                            type="date"
                                            value={val as string || ''}
                                            onChange={e => handleChange(col.key as keyof T, e.target.value)}
                                            className="!h-10 text-[13px] font-medium uppercase tracking-tight"
                                        />
                                    ) : (
                                        <Input
                                            type="text"
                                            value={val as string || ''}
                                            onChange={e => handleChange(col.key as keyof T, e.target.value)}
                                            placeholder={`Ingresar ${col.label.toLowerCase()}`}
                                            className="!h-10 text-[13px] font-medium"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-6 flex justify-end items-center border-t border-gray-50 dark:border-slate-700 mt-6 gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="!h-10 !px-6 font-semibold text-[12px] tracking-wide"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="!h-10 !px-8 font-semibold text-[12px] tracking-wide shadow-md shadow-purple-500/10 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {isLoading ? 'Guardando...' : 'Guardar Registro'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
