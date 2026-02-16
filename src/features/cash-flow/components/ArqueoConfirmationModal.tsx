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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85dvh] overflow-y-auto animate-in zoom-in-95 duration-200 border-t-8 ${descuadre === 0 ? 'border-primary' : descuadre > 0 ? 'border-secondary' : 'border-red-500'}`}>
                <div className="p-4 sm:p-6">
                    <h2 className="text-xl sm:text-2xl font-black text-center text-gray-800 dark:text-white mb-4 tracking-tight">
                        Resultado del Arqueo
                    </h2>

                    {/* Resumen de Totales */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex flex-col items-center justify-center p-3 bg-gray-50/80 dark:bg-slate-700/80 rounded-xl border border-gray-100 dark:border-slate-600">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Esperado</span>
                            <span className="text-base font-bold text-gray-800 dark:text-white font-mono tracking-tight">{formatCurrencyValue(ventaEsperada)}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 bg-gray-50/80 dark:bg-slate-700/80 rounded-xl border border-gray-100 dark:border-slate-600">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Recaudado</span>
                            <span className="text-base font-bold text-gray-800 dark:text-white font-mono tracking-tight">{formatCurrencyValue(totalRecaudado)}</span>
                        </div>
                    </div>

                    {/* Descuadre */}
                    <div className={`py-5 px-4 rounded-xl mb-5 flex flex-col items-center justify-center ${descuadre === 0 ? 'bg-primary/5 dark:bg-primary/10' : descuadre > 0 ? 'bg-secondary/10 dark:bg-secondary/5' : 'bg-red-50 dark:bg-red-900/10'}`}>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-300 uppercase tracking-widest mb-1">Descuadre Final</span>
                        <p className={`text-3xl sm:text-4xl font-black mb-2 tracking-tighter ${descuadre === 0 ? 'text-primary dark:text-blue-400' : descuadre > 0 ? 'text-dark-text dark:text-white' : 'text-red-500'}`}>
                            {formatCurrencyValue(descuadre)}
                        </p>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm flex items-center gap-1.5 ${descuadre === 0 ? 'bg-primary/10 text-primary dark:text-blue-400' : descuadre > 0 ? 'bg-secondary/30 text-dark-text dark:text-white' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                            {descuadre === 0
                                ? <><CheckCircleIcon className="h-4 w-4" /> Cuadre Perfecto</>
                                : descuadre > 0
                                    ? <><BanknotesIcon className="h-4 w-4" /> Sobrante</>
                                    : <><ExclamationTriangleIcon className="h-4 w-4" /> Faltante</>
                            }
                        </div>
                    </div>

                    {/* Desglose */}
                    <div className="bg-gray-50/50 dark:bg-slate-900/50 rounded-xl p-3 mb-4 border border-gray-100 dark:border-slate-700">
                        <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 text-center">Desglose de Medios de Pago</h4>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:text-sm">
                            {[
                                { label: 'Efectivo', value: summary.efectivo },
                                { label: 'Nequi', value: summary.nequi },
                                { label: 'Bancol.', value: summary.transfBancolombia },
                                { label: 'Rappi', value: summary.rappi },
                                { label: 'Dataf. 1', value: summary.datafonoDavid },
                                { label: 'Dataf. 2', value: summary.datafonoJulian },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-1">
                                    <span className="text-gray-500">{label}:</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrencyValue(value)}</span>
                                </div>
                            ))}
                            <div className="col-span-2 flex justify-between border-t border-dashed border-gray-200 dark:border-slate-700 pt-1 mt-1">
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">Total Datáfonos:</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {formatCurrencyValue((summary.datafonoDavid || 0) + (summary.datafonoJulian || 0))}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* PDF Button */}
                    <button
                        onClick={onExportPDF}
                        className="w-full mb-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all border border-red-100 dark:border-red-900/40"
                    >
                        <ArrowDownTrayIcon className="h-3 w-3" />
                        Descargar Resumen PDF
                    </button>

                    {/* Action Buttons */}
                    <div className="flex flex-col-reverse sm:flex-row gap-2">
                        <button
                            onClick={onClose}
                            className="w-full sm:flex-1 py-3 px-4 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 active:bg-gray-100 transition-colors text-sm"
                        >
                            Volver
                        </button>
                        <button
                            onClick={onConfirmSave}
                            disabled={isSaving}
                            className={`w-full sm:flex-1 py-4 sm:py-3.5 px-4 font-bold rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 transform active:scale-95 text-sm sm:text-base ${isSaving ? 'bg-gray-400 cursor-not-allowed text-gray-100' : 'bg-gray-900 text-white hover:bg-black'}`}
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <><span>Confirmar Cierre</span> <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
