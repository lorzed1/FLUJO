import React from 'react';
import {
    ArrowDownTrayIcon,
    BanknotesIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from '../../../components/ui/Icons';
import { type ConfirmationData, formatCurrencyValue } from '../hooks/useArqueoForm';

interface ArqueoConfirmationModalProps {
    isOpen: boolean;
    confirmationData: ConfirmationData | null;
    isSaving: boolean;
    onClose: () => void;
    onConfirmSave: () => void;
    onExportPDF: () => void;
}

export const ArqueoConfirmationModal: React.FC<ArqueoConfirmationModalProps> = ({
    isOpen,
    confirmationData,
    isSaving,
    onClose,
    onConfirmSave,
    onExportPDF
}) => {
    if (!isOpen || !confirmationData) return null;

    const { descuadre, ventaEsperada, totalRecaudado, summary } = confirmationData;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-all">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md transform transition-all">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                        Confirmar Arqueo de Caja
                    </h2>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Totales */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="block text-xs font-semibold text-gray-500 uppercase mb-1">Total Esperado</span>
                            <span className="block text-lg font-bold text-gray-800 dark:text-gray-100">{formatCurrencyValue(ventaEsperada)}</span>
                        </div>
                        <div>
                            <span className="block text-xs font-semibold text-gray-500 uppercase mb-1">Total Recaudado</span>
                            <span className="block text-lg font-bold text-gray-800 dark:text-gray-100">{formatCurrencyValue(totalRecaudado)}</span>
                        </div>
                    </div>

                    {/* Estado del Descuadre */}
                    <div className={`p-4 rounded-lg flex items-center gap-4 ${descuadre === 0 ? 'bg-green-50 text-green-700' : descuadre > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                        <div className={`p-2 rounded-full ${descuadre === 0 ? 'bg-green-100' : descuadre > 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                            {descuadre === 0
                                ? <CheckCircleIcon className="h-6 w-6" />
                                : descuadre > 0
                                    ? <BanknotesIcon className="h-6 w-6" />
                                    : <ExclamationTriangleIcon className="h-6 w-6" />
                            }
                        </div>
                        <div>
                            <span className="block text-xs font-bold uppercase opacity-80">
                                {descuadre === 0 ? 'Cuadre Perfecto' : descuadre > 0 ? 'Sobrante' : 'Faltante'}
                            </span>
                            <span className="block text-xl font-bold">
                                {formatCurrencyValue(Math.abs(descuadre))}
                            </span>
                        </div>
                    </div>

                    {/* PDF Link */}
                    <button
                        onClick={onExportPDF}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2 transition-colors"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Descargar Resumen PDF
                    </button>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3 bg-gray-50 dark:bg-slate-800/50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 bg-white border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirmSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Guardando...
                            </>
                        ) : (
                            'Confirmar y Cerrar'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
