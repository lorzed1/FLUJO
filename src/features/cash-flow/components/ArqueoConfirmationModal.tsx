import React from 'react';
import {
    ArrowDownTrayIcon,
    BanknotesIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from '../../../components/ui/Icons';
import { type ConfirmationData, formatCurrencyValue } from '../hooks/useArqueoForm';
import { Modal } from '../../../components/ui/Modal';
import { Spinner } from '../../../components/ui/Spinner';
import { Button } from '../../../components/ui/Button';
import type { RestofyCloseExecutionResult } from '../../../types/restofy';

export interface RestofyConfirmationStatus {
    enabled: boolean;
    loading: boolean;
    sessionId: number | null;
    registerName?: string;
    baseReturnPesos: number;
    blockers: string[];
    error: string | null;
    syncResult?: RestofyCloseExecutionResult | null;
}

interface ArqueoConfirmationModalProps {
    isOpen: boolean;
    confirmationData: ConfirmationData | null;
    isSaving: boolean;
    isBlindMode?: boolean;
    restofyStatus?: RestofyConfirmationStatus;
    onClose: () => void;
    onConfirmSave: () => void;
    onExportPDF: () => void;
    onRetryRestofyClose?: () => void;
    onOpenRestofyConfig?: () => void;
}

export const ArqueoConfirmationModal: React.FC<ArqueoConfirmationModalProps> = ({
    isOpen,
    confirmationData,
    isSaving,
    isBlindMode = false,
    restofyStatus,
    onClose,
    onConfirmSave,
    onExportPDF,
    onRetryRestofyClose,
    onOpenRestofyConfig
}) => {
    if (!isOpen || !confirmationData) return null;

    const { descuadre, ventaEsperada, totalRecaudado, summary } = confirmationData;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Confirmar Arqueo de Caja"
            maxWidth="max-w-md"
        >
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
                {/* Totales */}
                <div className={isBlindMode ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-2 gap-4'}>
                    {!isBlindMode && (
                        <div>
                            <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Total Esperado</span>
                            <span className="block text-lg font-bold text-gray-800 dark:text-gray-100">{formatCurrencyValue(ventaEsperada)}</span>
                        </div>
                    )}
                    <div>
                        <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Total Recaudado</span>
                        <span className="block text-lg font-bold text-gray-800 dark:text-gray-100">{formatCurrencyValue(totalRecaudado)}</span>
                    </div>
                </div>

                {/* Estado del Descuadre (oculto en cierre ciego) */}
                {!isBlindMode && (
                    <div className={`p-4 rounded-lg flex items-center gap-4 ${descuadre === 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : descuadre > 0 ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'}`}>
                        <div className={`p-2 rounded-full ${descuadre === 0 ? 'bg-emerald-100 dark:bg-emerald-900/40' : descuadre > 0 ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-rose-100 dark:bg-rose-900/40'}`}>
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
                )}

                {/* Desglose por Medio de Pago */}
                <div className="space-y-1">
                    <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Desglose de Recaudo</span>

                    {/* Efectivo */}
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-slate-700">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Efectivo</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatCurrencyValue(summary.efectivo)}</span>
                    </div>

                    {/* Datáfonos */}
                    <div className="flex justify-between items-center py-1.5 pl-3 border-b border-gray-50 dark:border-slate-700/50">
                        <span className="text-xs text-gray-400 dark:text-gray-500">Datáfono Bold</span>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{formatCurrencyValue(summary.datafonoDavid)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 pl-3 border-b border-gray-50 dark:border-slate-700/50">
                        <span className="text-xs text-gray-400 dark:text-gray-500">Datáfono Credibanco</span>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{formatCurrencyValue(summary.datafonoJulian)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-slate-700">
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Datáfonos (Total)</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatCurrencyValue(summary.datafonoDavid + summary.datafonoJulian)}</span>
                    </div>

                    {/* Transferencias */}
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-slate-700">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Transferencias</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatCurrencyValue(summary.transfBancolombia)}</span>
                    </div>

                    {/* Nequi */}
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-slate-700">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Nequi</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatCurrencyValue(summary.nequi)}</span>
                    </div>

                    {/* Rappi */}
                    <div className="flex justify-between items-center py-1.5">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Rappi</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatCurrencyValue(summary.rappi)}</span>
                    </div>
                </div>

                {/* PDF Link */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onExportPDF}
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 px-0 gap-2"
                >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Descargar Resumen PDF
                </Button>

                {/* Estado Integración Restofy Pro */}
                {restofyStatus?.enabled && (
                    <div className="p-3 rounded-lg border border-purple-200 dark:border-purple-800/50 bg-purple-50/70 dark:bg-purple-900/15 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                                Restofy Pro — Conteo y Cierre
                            </span>
                            {!isBlindMode && onOpenRestofyConfig && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="xs"
                                    onClick={onOpenRestofyConfig}
                                    className="text-purple-600 dark:text-purple-400 hover:underline h-auto py-0 px-1"
                                >
                                    Configurar
                                </Button>
                            )}
                        </div>

                        {restofyStatus.loading ? (
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                <Spinner size="sm" />
                                <span>Verificando sesión activa en Restofy...</span>
                            </div>
                        ) : restofyStatus.error ? (
                            <p className="text-xs text-red-600 dark:text-red-400">{restofyStatus.error}</p>
                        ) : restofyStatus.sessionId ? (
                            <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                                <p>
                                    Caja: <span className="font-semibold">{restofyStatus.registerName || 'Caja'}</span> (Sesión #{restofyStatus.sessionId})
                                </p>
                                <p>
                                    Base que vuelve al fondo: <span className="font-semibold">{formatCurrencyValue(restofyStatus.baseReturnPesos)}</span>
                                </p>
                            </div>
                        ) : (
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                No hay una sesión de caja abierta en Restofy para la caja seleccionada.
                            </p>
                        )}

                        {restofyStatus.blockers.length > 0 && (
                            <div className="p-2 rounded bg-amber-100/80 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                                <p className="font-semibold">Bloqueadores de cierre en Restofy:</p>
                                <ul className="list-disc pl-4">
                                    {restofyStatus.blockers.map((b, i) => (
                                        <li key={i}>{b}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {restofyStatus.syncResult && !restofyStatus.syncResult.success && (
                            <div className="p-2 rounded bg-red-100/80 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs space-y-2">
                                <p>{restofyStatus.syncResult.message}</p>
                                {restofyStatus.syncResult.declarationConfirmed && !restofyStatus.syncResult.closed && onRetryRestofyClose && (
                                    <Button
                                        variant="secondary"
                                        size="xs"
                                        onClick={onRetryRestofyClose}
                                        disabled={isSaving}
                                    >
                                        Reintentar Cierre en Restofy
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3 bg-gray-50 dark:bg-slate-800/50 rounded-b-xl shrink-0">
                <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={onClose}
                    disabled={isSaving}
                >
                    Cancelar
                </Button>
                <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={onConfirmSave}
                    disabled={isSaving}
                    className="gap-2"
                >
                    {isSaving ? (
                        <>
                            <Spinner size="sm" variant="white" />
                            Guardando...
                        </>
                    ) : (
                        'Confirmar y Cerrar'
                    )}
                </Button>
            </div>
        </Modal>
    );
};
