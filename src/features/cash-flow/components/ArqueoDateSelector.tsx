import React, { useEffect } from 'react';
import { getLocalDateISO } from '../../../utils/dateUtils';
import { CalendarDaysIcon } from '../../../components/ui/Icons';
import { DatePicker } from '../../../components/ui/DatePicker';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { FormGroup } from '../../../components/ui/FormGroup';

interface ArqueoDateSelectorProps {
    currentDate: string;
    onDateChange: (date: string) => void;
    onConfirm: () => void;
    onCancel?: () => void;
}

export const ArqueoDateSelector: React.FC<ArqueoDateSelectorProps> = ({
    currentDate,
    onDateChange,
    onConfirm,
    onCancel
}) => {

    // Ensure we don't start with an empty date
    useEffect(() => {
        if (!currentDate) {
            onDateChange(getLocalDateISO());
        }
    }, [currentDate, onDateChange]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm();
    };

    const headerTitle = (
        <span className="flex items-center gap-2">
            <CalendarDaysIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
                Confirmar Fecha de Arqueo
            </h3>
        </span>
    );

    return (
        <Modal
            isOpen={true}
            onClose={onCancel || (() => { })}
            title={headerTitle}
            maxWidth="max-w-md"
            hideCloseIcon={!onCancel}
            disableClickOutside={!onCancel}
            className="p-0 overflow-hidden"
        >
            <form onSubmit={handleSubmit}>
                {/* Content (High Density) */}
                <div className="p-5 space-y-4">
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-xs text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/50 mb-2">
                        <p>Antes de continuar, asegúrate de que la fecha seleccionada coincida con el turno que estás cerrando.</p>
                    </div>

                    <FormGroup label="Fecha de Registro" required htmlFor="date-selector">
                        <DatePicker
                            id="date-selector"
                            value={currentDate}
                            onChange={(val) => onDateChange(val)}
                            className="w-full"
                            required
                        />
                    </FormGroup>
                </div>

                {/* Footer (Right Aligned Actions) */}
                <div className="bg-gray-50 dark:bg-slate-900/50 px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={onCancel}
                        >
                            Cancelar
                        </Button>
                    )}
                    <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                    >
                        Confirmar y Continuar
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
