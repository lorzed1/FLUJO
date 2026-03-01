import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarDaysIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { DatePicker } from '../../../components/ui/DatePicker';

interface DateSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: string) => void;
    title: string;
    description?: React.ReactNode;
    label?: string;
    initialDate?: string;
    confirmText?: string;
    confirmButtonClass?: string;
}

export const DateSelectionModal: React.FC<DateSelectionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    label = "Fecha",
    initialDate,
    confirmText = "Confirmar",
    confirmButtonClass = "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
}) => {
    const [date, setDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        if (isOpen) {
            setDate(initialDate || format(new Date(), 'yyyy-MM-dd'));
        }
    }, [isOpen, initialDate]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200 overflow-visible"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-500 transition-colors">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {description && (
                    <div className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
                        {description}
                    </div>
                )}

                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                        {label}
                    </label>
                    <div className="relative group">
                        <DatePicker
                            value={date}
                            onChange={(val) => setDate(val)}
                            className="w-full"
                            required
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium text-sm transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(date)}
                        className={`px-6 py-2 text-white rounded-lg shadow-lg font-medium text-sm transition-all hover:-translate-y-0.5 ${confirmButtonClass}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
