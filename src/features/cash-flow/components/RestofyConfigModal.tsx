import React, { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { FormGroup } from '../../../components/ui/FormGroup';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import {
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    LinkIcon,
} from '../../../components/ui/Icons';
import {
    FLUJO_PAYMENT_FIELD_LABELS,
    getRestofyConfig,
    restofyService,
    saveRestofyConfig,
} from '../../../services/restofyService';
import type {
    FlujoPaymentField,
    RestofyCashRegister,
    RestofyConfig,
    RestofyPaymentMethod,
} from '../../../types/restofy';

interface RestofyConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved?: (config: RestofyConfig) => void;
}

export const RestofyConfigModal: React.FC<RestofyConfigModalProps> = ({
    isOpen,
    onClose,
    onSaved,
}) => {
    const [config, setConfig] = useState<RestofyConfig>(() => getRestofyConfig());
    const [registers, setRegisters] = useState<RestofyCashRegister[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<RestofyPaymentMethod[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [sessionNotice, setSessionNotice] = useState<string | null>(null);

    const loadRestofyMetadata = async (selectedRegisterId: number | null) => {
        setIsLoading(true);
        setErrorMsg(null);
        setSessionNotice(null);
        try {
            const regs = await restofyService.listCashRegisters();
            setRegisters(regs);

            const targetId = selectedRegisterId ?? regs[0]?.cashRegisterId ?? null;
            if (targetId !== null && selectedRegisterId === null) {
                setConfig((prev) => ({ ...prev, cashRegisterId: targetId }));
            }

            const targetReg = regs.find((r) => r.cashRegisterId === targetId);
            if (targetReg?.activeSessionId) {
                const ctx = await restofyService.getCashDeclarationContext(targetReg.activeSessionId);
                setPaymentMethods(ctx.paymentMethods || []);
            } else {
                setPaymentMethods([]);
                if (targetReg) {
                    setSessionNotice(
                        `La caja "${targetReg.name}" no tiene una sesión abierta en Restofy en este momento. Abre una sesión en Restofy para cargar sus medios de pago y mapearlos.`
                    );
                }
            }
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : 'No se pudo conectar con Restofy Pro.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        const current = getRestofyConfig();
        setConfig(current);
        loadRestofyMetadata(current.cashRegisterId);
    }, [isOpen]);

    const handleRegisterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value ? Number(e.target.value) : null;
        setConfig((prev) => ({ ...prev, cashRegisterId: val }));
        if (val) {
            await loadRestofyMetadata(val);
        } else {
            setPaymentMethods([]);
        }
    };

    const handleMappingChange = (field: FlujoPaymentField, value: string) => {
        const parsed = value ? Number(value) : null;
        setConfig((prev) => ({
            ...prev,
            paymentMethodMapping: {
                ...prev.paymentMethodMapping,
                [field]: parsed,
            },
        }));
    };

    const handleSave = () => {
        saveRestofyConfig(config);
        onSaved?.(config);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Integración Restofy Pro"
            maxWidth="max-w-lg"
        >
            <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50">
                    <div className="flex items-center gap-2.5">
                        <LinkIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                Sincronizar Arqueo y Cierre
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Registra conteo, base y cierre en Restofy al confirmar.
                            </p>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
                        className="h-4 w-4 accent-purple-600 rounded cursor-pointer"
                        aria-label="Habilitar sincronización con Restofy Pro"
                    />
                </div>

                {errorMsg && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                        <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {sessionNotice && !errorMsg && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
                        <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{sessionNotice}</span>
                    </div>
                )}

                <div className="flex items-end gap-2">
                    <div className="flex-1">
                        <FormGroup label="Caja Registradora en Restofy" required>
                            <select
                                value={config.cashRegisterId ?? ''}
                                onChange={handleRegisterChange}
                                disabled={isLoading}
                                className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">Selecciona una caja...</option>
                                {registers.map((reg) => (
                                    <option key={reg.cashRegisterId} value={reg.cashRegisterId}>
                                        {reg.name} {reg.activeSessionId ? `(Sesión #${reg.activeSessionId})` : '(Cerrada)'}
                                    </option>
                                ))}
                            </select>
                        </FormGroup>
                    </div>
                    <Button
                        variant="secondary"
                        size="md"
                        onClick={() => loadRestofyMetadata(config.cashRegisterId)}
                        disabled={isLoading}
                        title="Recargar cajas y medios de pago"
                    >
                        {isLoading ? <Spinner size="sm" /> : <ArrowPathIcon className="h-4 w-4" />}
                    </Button>
                </div>

                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Mapeo de Medios de Pago
                        </span>
                        {paymentMethods.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                {paymentMethods.length} disponibles
                            </span>
                        )}
                    </div>

                    {(Object.keys(FLUJO_PAYMENT_FIELD_LABELS) as FlujoPaymentField[]).map((field) => (
                        <FormGroup key={field} label={FLUJO_PAYMENT_FIELD_LABELS[field]}>
                            <select
                                value={config.paymentMethodMapping[field] ?? ''}
                                onChange={(e) => handleMappingChange(field, e.target.value)}
                                disabled={isLoading || paymentMethods.length === 0}
                                className="w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
                            >
                                <option value="">No sincronizar</option>
                                {paymentMethods.map((pm) => (
                                    <option key={pm.paymentMethodId} value={pm.paymentMethodId}>
                                        {pm.name}
                                    </option>
                                ))}
                            </select>
                        </FormGroup>
                    ))}
                </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-2 bg-gray-50 dark:bg-slate-800/50">
                <Button variant="secondary" size="md" onClick={onClose}>
                    Cancelar
                </Button>
                <Button variant="primary" size="md" onClick={handleSave}>
                    Guardar Configuración
                </Button>
            </div>
        </Modal>
    );
};
