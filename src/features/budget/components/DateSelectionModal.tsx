import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { DatePicker } from '../../../components/ui/DatePicker';
import { Modal } from '../../../components/ui/Modal';
import { FormGroup } from '../../../components/ui/FormGroup';

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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            maxWidth="max-w-sm"
        >
            <div className="p-6">

                {description && (
                    <div className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
                        {description}
                    </div>
                )}

                <FormGroup label={label} className="mb-6">
                    <div className="relative group">
                        <DatePicker
                            value={date}
                            onChange={(val) => setDate(val)}
                            className="w-full"
                            required
                        />
                    </div>
                </FormGroup>

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
        </Modal>
    );
};
