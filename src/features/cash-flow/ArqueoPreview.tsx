import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ClipboardDocumentListIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    InformationCircleIcon,
    MoonIcon,
    SunIcon,
    CalendarDaysIcon,
    DocumentTextIcon,
    Cog6ToothIcon,
    ArrowPathIcon,
    CheckIcon,
    XMarkIcon,
} from '../../components/ui/Icons';
import { InfoModal, DataDefinition } from '../../components/ui/InfoModal';
import AlertModal from '../../components/ui/AlertModal';
import { TransferRecord, TransferType, ArqueoRecord } from '../../types';
import { useArqueos } from '../../context/ArqueoContext';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { DatePicker } from '../../components/ui/DatePicker';
import { AccountingExportWizard } from './components/AccountingExportWizard';
import { KlaveExportWizard } from './components/KlaveExportWizard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, formatCOP } from '../../components/ui/Input';
import ExcelImportTab from './ExcelImportTab';
import ArqueosTable, { type ArqueosTableHandle } from './ArqueosTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { DenominationTable } from './components/DenominationTable';
import { ArqueoStepper, ARQUEO_STEPS } from './components/ArqueoStepper';
import { GastoList } from './components/GastoList';
import { DatabaseService } from '../../services/database';
import { tipsService } from '../../services/tipsService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FormGroup } from '../../components/ui/FormGroup';

// Extracted components & hook
import { CurrencyInput } from './components/CurrencyInput';
import { PaymentDetailModal } from './components/PaymentDetailModal';
import { ArqueoConfirmationModal, type RestofyConfirmationStatus } from './components/ArqueoConfirmationModal';
import { RestofyConfigModal } from './components/RestofyConfigModal';
import { useArqueoForm, formatCurrencyValue } from './hooks/useArqueoForm';
import { ArqueoDateSelector } from './components/ArqueoDateSelector';
import { cn } from '../../lib/utils';
import { getRestofyConfig, restofyService } from '../../services/restofyService';

// ============================================
// Types (re-exported for external consumers)
// ============================================
export type { ArqueoData } from './hooks/useArqueoForm';

const ArqueoPreview: React.FC = () => {
    const {
        arqueos,
        handleSaveArqueo: onSave,
        handleUpdateArqueo: onUpdateArqueo,
        handleDeleteArqueo: onDeleteArqueo,
    } = useArqueos();

    const { userRole } = useAuth();
    const isBlindMode = userRole === 'cajero';
    const useMonoFont = userRole === 'admin';
    const form = useArqueoForm();

    const [showRestofyConfig, setShowRestofyConfig] = useState(false);
    const [isImportingRestofy, setIsImportingRestofy] = useState(false);
    const [flujoSavedForCurrentModal, setFlujoSavedForCurrentModal] = useState(false);
    const [restofyStatus, setRestofyStatus] = useState<RestofyConfirmationStatus>({
        enabled: false,
        loading: false,
        sessionId: null,
        baseReturnPesos: 0,
        blockers: [],
        error: null,
        syncResult: null,
    });

    const loadRestofyPreCheck = async () => {
        const cfg = getRestofyConfig();
        if (!cfg.enabled) {
            setRestofyStatus({
                enabled: false,
                loading: false,
                sessionId: null,
                baseReturnPesos: form.totalBaseCaja,
                blockers: [],
                error: null,
                syncResult: null,
            });
            return;
        }

        if (!cfg.cashRegisterId) {
            setRestofyStatus({
                enabled: true,
                loading: false,
                sessionId: null,
                baseReturnPesos: form.totalBaseCaja,
                blockers: [],
                error: 'Selecciona una caja registradora en Configuración de Restofy.',
                syncResult: null,
            });
            return;
        }

        setRestofyStatus((prev) => ({
            ...prev,
            enabled: true,
            loading: true,
            baseReturnPesos: form.totalBaseCaja,
            error: null,
            blockers: [],
        }));

        try {
            const registers = await restofyService.listCashRegisters();
            const targetReg = registers.find((r) => r.cashRegisterId === cfg.cashRegisterId);
            if (!targetReg) {
                throw new Error('La caja configurada no existe en Restofy.');
            }
            if (!targetReg.activeSessionId) {
                setRestofyStatus({
                    enabled: true,
                    loading: false,
                    sessionId: null,
                    registerName: targetReg.name,
                    baseReturnPesos: form.totalBaseCaja,
                    blockers: [],
                    error: null,
                    syncResult: null,
                });
                return;
            }

            const summary = await restofyService.getCloseSummary(targetReg.activeSessionId);
            const blockers = (summary.blockers || []).map((b) =>
                typeof b === 'string' ? b : b.message || b.code || 'Bloqueador activo en Restofy'
            );

            setRestofyStatus({
                enabled: true,
                loading: false,
                sessionId: targetReg.activeSessionId,
                registerName: targetReg.name,
                baseReturnPesos: form.totalBaseCaja,
                blockers,
                error: null,
                syncResult: null,
            });
        } catch (err: unknown) {
            setRestofyStatus({
                enabled: true,
                loading: false,
                sessionId: null,
                baseReturnPesos: form.totalBaseCaja,
                blockers: [],
                error: err instanceof Error ? err.message : 'Error consultando Restofy Pro',
                syncResult: null,
            });
        }
    };

    useEffect(() => {
        if (form.showConfirmation) {
            setFlujoSavedForCurrentModal(false);
            loadRestofyPreCheck();
        }
    }, [form.showConfirmation]);

    useEffect(() => {
        if (form.currentStep !== 2 || form.formData.visitas > 0) return;
        const cfg = getRestofyConfig();
        if (!cfg.enabled || !cfg.cashRegisterId) return;

        let cancelled = false;
        const loadGuests = async () => {
            try {
                const registers = await restofyService.listCashRegisters();
                const target = registers.find((r) => r.cashRegisterId === cfg.cashRegisterId);
                if (!target?.activeSessionId || cancelled) return;
                const guests = await restofyService.fetchSessionGuestsCount(target.activeSessionId);
                if (!cancelled && guests > 0) {
                    form.setFormData((prev) => (prev.visitas === 0 ? { ...prev, visitas: guests } : prev));
                }
            } catch (err) {
                console.warn('No se pudo autocompletar visitas desde Restofy:', err);
            }
        };
        loadGuests();

        return () => {
            cancelled = true;
        };
    }, [form.currentStep]);
    const tableRef = useRef<ArqueosTableHandle>(null);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [alertState, setAlertState] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ''});

    const arqueoInfoDefinitions: DataDefinition[] = [
        {
            label: 'Venta POS',
            description: 'Venta bruta total reportada por el sistema POS de Unplugged.',
            origin: 'Reporte de Caja POS'
        },
        {
            label: 'Venta Bruta',
            description: 'Venta total neta de conceptos externos como covers o entradas.',
            calculation: 'Venta POS - Ingreso Covers'
        },
        {
            label: 'Venta Base',
            description: 'Valor neto de la venta antes de aplicar el Impuesto al Consumo (INC).',
            calculation: 'Venta Bruta / 1.108'
        },
        {
            label: 'INC (8%)',
            description: 'Impuesto Nacional al Consumo del 8% aplicado a la venta de alimentos y bebidas.',
            calculation: 'Venta Base * 0.08'
        },
        {
            label: 'Total Ingresos',
            description: 'Suma de la venta reportada más las propinas recaudadas. Es el dinero que DEBE estar en caja.',
            calculation: 'Venta POS + Propina'
        },
        {
            label: 'Total Egresos (Recaudado)',
            description: 'Suma real detectada de todos los medios de pago físicos y electrónicos.',
            origin: 'Conteo Físico + Reportes Datafonos/Apps'
        },
        {
            label: 'Descuadre',
            description: 'Diferencia neta entre el dinero recaudado y el dinero que el sistema esperaba recibir.',
            calculation: 'Total Egresos - Total Ingresos'
        }
    ];

    // --- Tab routing ---
    const [activeTab, setActiveTab] = useState<'arqueo' | 'historial'>('arqueo');
    const location = useLocation();
    const navigate = useNavigate();

    // --- Date Selection & Stepper Validation Logic ---
    const [isDateConfirmed, setIsDateConfirmed] = useState(false);
    const [showDateModal, setShowDateModal] = useState(false);
    const [maxStepReached, setMaxStepReached] = useState<number>(form.currentStep);
    const [cajeroError, setCajeroError] = useState<string>('');

    useEffect(() => {
        setMaxStepReached((prev) => Math.max(prev, form.currentStep));
    }, [form.currentStep]);

    const hasDraftInProgress =
        form.currentStep > 1 ||
        form.formData.cajero.trim() !== '' ||
        form.formData.ventaPos > 0 ||
        form.totalBaseCaja > 0 ||
        form.totalCuadreVenta > 0 ||
        form.gastosPersonal.length > 0 ||
        form.gastosProveedores.length > 0;

    useEffect(() => {
        if (location.pathname.includes('/history')) {
            setActiveTab('historial');
            setIsDateConfirmed(true);
        } else {
            setActiveTab('arqueo');
            setIsDateConfirmed(false);
            setShowDateModal(false);
        }
    }, [location.pathname]);

    const getPageDetails = () => {
        switch (activeTab) {
            case 'historial': return {
                title: 'Historial de Cierres',
                subtitle: 'Registro histórico y auditoría'
            };
            default: return { title: 'Arqueo de Caja', subtitle: 'Formulario de cierre diario' };
        }
    };
    const pageDetails = getPageDetails();

    // --- PDF Export ---
    const handleExportPDF = () => {
        if (!form.confirmationData) return;
        const doc = new jsPDF();
        const { summary, ventaEsperada, totalRecaudado, descuadre } = form.confirmationData;

        doc.setFontSize(22);
        doc.text("Resumen de Arqueo", 105, 20, { align: "center" });
        doc.setFontSize(12);
        doc.text(`Fecha: ${summary.fecha}`, 20, 35);
        doc.text(`Cajero: ${summary.cajero}`, 20, 42);

        const tableRows: Array<[string, string]> = [
            ['Ingreso Covers', formatCurrencyValue(summary.ingresoCovers)],
            ['Efectivo', formatCurrencyValue(summary.efectivo)],
            ['Datáfono Bold', formatCurrencyValue(summary.datafonoDavid)],
            ['Datáfono Credibanco', formatCurrencyValue(summary.datafonoJulian)],
            ['Bancolombia', formatCurrencyValue(summary.transfBancolombia)],
            ['Nequi', formatCurrencyValue(summary.nequi)],
            ['Rappi', formatCurrencyValue(summary.rappi)],
            ['-----------------------', '-----------------------'],
            ...(!isBlindMode ? [['VENTA ESPERADA', formatCurrencyValue(ventaEsperada)] as [string, string]] : []),
            ['TOTAL RECAUDADO', formatCurrencyValue(totalRecaudado)],
            ...(!isBlindMode ? [['DESCUADRE FINAL', formatCurrencyValue(descuadre)] as [string, string]] : []),
        ];

        autoTable(doc, {
            startY: 55,
            head: [['Concepto', 'Monto']],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }
        });

        doc.save(`Arqueo_${summary.fecha}.pdf`);
    };

    const runRestofySync = async (): Promise<boolean> => {
        const cfg = getRestofyConfig();
        if (!cfg.enabled) return true;

        if (!restofyStatus.sessionId) {
            setRestofyStatus((prev) => ({
                ...prev,
                error: 'No hay una sesión de caja abierta en Restofy para completar el cierre.',
            }));
            return false;
        }

        const result = await restofyService.executeCountAndClose({
            cashRegisterSessionId: restofyStatus.sessionId,
            cuadreDetail: form.cuadreVenta,
            cashExpensesPesos: form.totalGastosPersonal + form.totalGastosProveedores,
            paymentAmounts: {
                datafonoDavid: form.formData.datafonoDavid,
                datafonoJulian: form.formData.datafonoJulian,
                transfBancolombia: form.formData.transfBancolombia,
                nequi: form.formData.nequi,
                rappi: form.formData.rappi,
            },
            paymentMapping: cfg.paymentMethodMapping,
            baseReturnPesos: form.totalBaseCaja,
            notes: `Cierre FLUJO ${form.formData.fecha}${form.formData.cajero ? ` - Cajero: ${form.formData.cajero}` : ''}`,
        });

        setRestofyStatus((prev) => ({ ...prev, syncResult: result }));
        return result.success;
    };

    const handleImportSalesFromRestofy = async () => {
        const cfg = getRestofyConfig();
        if (!cfg.enabled || !cfg.cashRegisterId) {
            setShowRestofyConfig(true);
            return;
        }
        setIsImportingRestofy(true);
        try {
            const imported = await restofyService.fetchSessionSalesAndTips(cfg.cashRegisterId);
            form.setFormData((prev) => ({
                ...prev,
                ventaPos: imported.ventaPos,
                propina: imported.propina,
                ...(imported.visitas > 0 ? { visitas: imported.visitas } : {}),
            }));
            if (imported.baseInicial > 0) {
                form.setBaseInicialDeclarada(imported.baseInicial);
            }
            form.setAlertConfig({
                isOpen: true,
                title: 'Datos importados de Restofy',
                message: `Sesión #${imported.cashRegisterSessionId} (${imported.registerName}): Venta POS ${formatCurrencyValue(imported.ventaPos)}, Propinas ${formatCurrencyValue(imported.propina)} y Comensales: ${imported.visitas}.`,
                type: 'success',
                confirmText: 'Entendido',
                showCancel: false,
            });
        } catch (err: unknown) {
            form.setAlertConfig({
                isOpen: true,
                title: 'Error importando de Restofy',
                message: err instanceof Error ? err.message : 'No se pudieron obtener los datos de la sesión.',
                type: 'error',
                confirmText: 'Entendido',
                showCancel: false,
            });
        } finally {
            setIsImportingRestofy(false);
        }
    };

    const handleRetryRestofyClose = async () => {
        if (!restofyStatus.sessionId) return;
        form.setIsSaving(true);
        try {
            await restofyService.confirmClose(
                restofyStatus.sessionId,
                `Cierre FLUJO ${form.formData.fecha}${form.formData.cajero ? ` - Cajero: ${form.formData.cajero}` : ''}`
            );
            setRestofyStatus((prev) => ({
                ...prev,
                syncResult: {
                    success: true,
                    cashRegisterSessionId: restofyStatus.sessionId!,
                    declarationConfirmed: true,
                    baseReturnSet: true,
                    closed: true,
                    message: 'Cierre completado en Restofy.',
                },
            }));
            form.resetForm();
            await DatabaseService.autoPurgeOldData();
            form.setShowConfirmation(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'No se pudo completar el cierre en Restofy.';
            setRestofyStatus((prev) => ({
                ...prev,
                syncResult: prev.syncResult
                    ? { ...prev.syncResult, success: false, message: msg }
                    : null,
            }));
        } finally {
            form.setIsSaving(false);
        }
    };

    const handleConfirmSave = async () => {
        form.setIsSaving(true);
        try {
            let savedOk = flujoSavedForCurrentModal;
            if (!savedOk) {
                let ventaPosToSave = form.formData.ventaPos;
                let propinaToSave = form.formData.propina;
                let visitasToSave = form.formData.visitas;

                if (isBlindMode) {
                    const cfg = getRestofyConfig();
                    if (cfg.enabled && cfg.cashRegisterId) {
                        try {
                            const silentData = await restofyService.fetchSessionSalesAndTips(cfg.cashRegisterId);
                            ventaPosToSave = silentData.ventaPos;
                            propinaToSave = silentData.propina;
                            if (!visitasToSave && silentData.visitas > 0) {
                                visitasToSave = silentData.visitas;
                            }
                        } catch (err) {
                            console.warn('No se pudieron obtener ventas silenciosas de Restofy en modo ciego:', err);
                        }
                    }
                }

                const dataToSave = {
                    ...form.formData,
                    ventaPos: ventaPosToSave,
                    propina: propinaToSave,
                    visitas: visitasToSave,
                    baseDetail: form.baseCaja,
                    cuadreDetail: form.cuadreVenta
                };
                const result = await onSave(dataToSave, form.totalRecaudado);
                savedOk = result !== false;

                if (savedOk) {
                    setFlujoSavedForCurrentModal(true);
                    const arqueoId = typeof result === 'string' ? result : `legacy-${Date.now()}`;
                    try {
                    const transfersToSave: TransferRecord[] = [];
                    const timestamp = new Date().toISOString();
                    const date = form.formData.fecha;

                    const createRecord = (amount: number, type: TransferType, index: number = 0): TransferRecord => ({
                        id: `auto-${arqueoId}-${type}-${index}`,
                        arqueoId,
                        date,
                        amount: Number(amount) || 0,
                        type,
                        description: `Cierre ${date}`,
                        reference: type.toUpperCase(),
                        createdAt: timestamp
                    });

                    if (form.paymentDetails.nequi.length > 0) {
                        form.paymentDetails.nequi.forEach((amt, i) => amt > 0 && transfersToSave.push(createRecord(amt, 'nequi', i)));
                    } else if (Number(form.formData.nequi) > 0) {
                        transfersToSave.push(createRecord(Number(form.formData.nequi), 'nequi'));
                    }

                    if (form.paymentDetails.transfBancolombia.length > 0) {
                        form.paymentDetails.transfBancolombia.forEach((amt, i) => amt > 0 && transfersToSave.push(createRecord(amt, 'bancolombia', i)));
                    } else if (Number(form.formData.transfBancolombia) > 0) {
                        transfersToSave.push(createRecord(Number(form.formData.transfBancolombia), 'bancolombia'));
                    }

                    if (transfersToSave.length > 0) {
                        await Promise.all(transfersToSave.map(t => DatabaseService.saveTransfer(t)));
                    }

                    try {
                        const division = 0;
                        const totalPropinas = Number(form.formData.propina) || 0;
                        const existingTips = await tipsService.getTips(date, date);

                        // Si existe un registro este día, lo actualizamos. Sino lo creamos.
                        if (existingTips && existingTips.length > 0) {
                            const tipToUpdate = existingTips[0];
                            const base = tipToUpdate.base_propinas || 0;
                            const comision = tipToUpdate.comision_medios_electronicos || 0;
                            const repartir = totalPropinas - comision - base;
                            const unp = repartir > 0 ? Math.round(repartir * 0.10) : 0;
                            const totalPersona = division > 0 && repartir > 0 ? Math.round((repartir - unp) / division) : 0;

                            await tipsService.updateTip(tipToUpdate.id, {
                                total_propinas: totalPropinas,
                                division: division,
                                total_persona: totalPersona,
                                unp: unp
                            });
                        } else {
                            const base = 0;
                            const comision = 0;
                            const repartir = totalPropinas - comision - base;
                            const unp = repartir > 0 ? Math.round(repartir * 0.10) : 0;
                            const totalPersona = division > 0 && repartir > 0 ? Math.round((repartir - unp) / division) : 0;

                            await tipsService.addTip({
                                fecha: date,
                                total_propinas: totalPropinas,
                                comision_medios_electronicos: comision,
                                base_propinas: base,
                                division: division,
                                total_persona: totalPersona,
                                unp: unp
                            });
                        }
                    } catch (err) {
                        console.error('Error saving tips:', err);
                    }
                } catch (err) {
                    console.error('Error saving transfers:', err);
                }
                }
            }

            if (savedOk) {
                const restofyOk = await runRestofySync();
                if (restofyOk) {
                    form.resetForm();
                    await DatabaseService.autoPurgeOldData();
                    form.setShowConfirmation(false);
                }
            }
        } catch (error) {
            console.error('Error in handleConfirmSave:', error);
        } finally {
            form.setIsSaving(false);
        }
    };

    return (
        <div className={cn("animate-fadeIn", form.isDarkMode ? 'dark' : '')}>
            <div className={cn(
                "w-full h-full flex flex-col overflow-x-hidden min-h-full",
                activeTab === 'historial'
                    ? 'bg-transparent dark:bg-slate-900/20 overflow-hidden'
                    : 'space-y-6 bg-gray-50 dark:bg-slate-900'
            )}>
                {/* Modals */}
                <PaymentDetailModal
                    isOpen={!!form.activeDetailField}
                    onClose={() => form.setActiveDetailField(null)}
                    title={form.modalTitle}
                    items={form.activeDetailField ? form.paymentDetails[form.activeDetailField] : []}
                    onAddItem={form.handleAddDetail}
                    onRemoveItem={form.handleRemoveDetail}
                    useMonoFont={useMonoFont}
                />

                <AlertModal
                    isOpen={form.alertConfig.isOpen}
                    onClose={() => form.setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                    title={form.alertConfig.title}
                    message={form.alertConfig.message}
                    type={form.alertConfig.type}
                    onConfirm={form.alertConfig.onConfirm}
                    confirmText={form.alertConfig.confirmText}
                    cancelText={form.alertConfig.cancelText}
                    showCancel={form.alertConfig.showCancel}
                />

                <ArqueoConfirmationModal
                    isOpen={form.showConfirmation}
                    confirmationData={form.confirmationData}
                    isSaving={form.isSaving}
                    isBlindMode={isBlindMode}
                    restofyStatus={restofyStatus}
                    onClose={() => form.setShowConfirmation(false)}
                    onConfirmSave={handleConfirmSave}
                    onExportPDF={handleExportPDF}
                    onRetryRestofyClose={handleRetryRestofyClose}
                    onOpenRestofyConfig={() => setShowRestofyConfig(true)}
                />

                <RestofyConfigModal
                    isOpen={showRestofyConfig}
                    onClose={() => setShowRestofyConfig(false)}
                    onSaved={() => {
                        if (form.showConfirmation) loadRestofyPreCheck();
                    }}
                />

                <div className={activeTab === 'historial' ? 'px-6 pt-4 shrink-0 mb-4' : ''}>
                    <PageHeader
                        title={pageDetails.title}
                        breadcrumbs={[
                            { label: 'Caja', path: '/arqueo' },
                            { label: pageDetails.title }
                        ]}
                        icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
                        actions={
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm h-10">
                                    <Button
                                        variant="ghost" size="sm"
                                        title="Guía rápida de arqueo"
                                        aria-label="Guía rápida de arqueo"
                                        onClick={() => form.setAlertConfig({
                                            isOpen: true,
                                            title: 'Guía Rápida',
                                            message: '1. Completa la Información General.\n2. Registra la venta, base y conteo físico.\n3. Agrega gastos y medios digitales.\n4. Verifica el resumen y finaliza el arqueo.',
                                            type: 'info',
                                            confirmText: 'Entendido',
                                            showCancel: false
                                        })}
                                        className="p-1 h-8 w-8 text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-700"
                                    >
                                        <InformationCircleIcon className="h-5 w-5" />
                                    </Button>
                                    {!isBlindMode && (
                                        <Button
                                            variant="ghost" size="sm"
                                            onClick={() => setShowRestofyConfig(true)}
                                            title="Configurar integración Restofy Pro"
                                            aria-label="Configurar integración Restofy Pro"
                                            className="p-1 h-8 w-8 text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-700"
                                        >
                                            <Cog6ToothIcon className="h-5 w-5" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost" size="sm"
                                        title={form.isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                                        aria-label={form.isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                                        onClick={() => form.setIsDarkMode(!form.isDarkMode)}
                                        className="p-1 h-8 w-8 text-gray-500 hover:bg-gray-50 dark:text-yellow-400 dark:hover:bg-slate-700"
                                    >
                                        {form.isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </div>
                        }
                    />
                </div>

                {activeTab === 'historial' && (
                    <main className="flex-1 px-4 pb-4 overflow-hidden flex flex-col min-h-0">
                        <div className="flex-1 flex flex-col font-sans bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden animate-fadeIn">
                            <ArqueosTable
                                ref={tableRef}
                                arqueos={arqueos}
                                onUpdate={onUpdateArqueo}
                                onDelete={onDeleteArqueo}
                                userRole={userRole}
                                onInfoClick={() => setIsInfoOpen(true)}
                                extraActions={
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => form.setShowAccountingWizard(true)}
                                            className="h-8 gap-2 bg-white dark:bg-slate-800 text-xs font-medium border border-slate-200 dark:border-slate-700 hidden sm:flex"
                                            disabled={arqueos.length === 0}
                                        >
                                            <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                                            Contabilidad
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => form.setShowKlaveWizard(true)}
                                            className="h-8 gap-2 bg-white dark:bg-slate-800 text-xs font-medium border border-slate-200 dark:border-slate-700 hidden sm:flex"
                                            disabled={arqueos.length === 0}
                                        >
                                            <DocumentTextIcon className="h-3.5 w-3.5" />
                                            Klave
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => form.setShowImportModal(true)}
                                            className="h-8 gap-2 bg-white dark:bg-slate-800 text-xs font-medium border border-slate-200 dark:border-slate-700 hidden sm:flex"
                                        >
                                            <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                                            Importar
                                        </Button>
                                    </div>
                                }
                            />
                        </div>

                        <InfoModal
                            isOpen={isInfoOpen}
                            onClose={() => setIsInfoOpen(false)}
                            title="Información de Arqueos"
                            definitions={arqueoInfoDefinitions}
                        />
                        <AccountingExportWizard
                            isOpen={form.showAccountingWizard}
                            onClose={() => form.setShowAccountingWizard(false)}
                            selectedArqueos={arqueos}
                        />
                        <KlaveExportWizard
                            isOpen={form.showKlaveWizard}
                            onClose={() => form.setShowKlaveWizard(false)}
                            selectedArqueos={arqueos}
                        />
                        {form.showImportModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                                <Card className="w-full max-w-5xl flex flex-col max-h-[85dvh] animate-in zoom-in-95 duration-200 shadow-2xl" noPadding>
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <ArrowUpTrayIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" /> Importar Arqueos
                                        </h3>
                                        <Button
                                            variant="ghost"
                                            size="icon-md"
                                            onClick={() => form.setShowImportModal(false)}
                                            className="text-slate-400 rounded-full"
                                            aria-label="Cerrar modal de importación"
                                        >
                                            <XMarkIcon className="w-5 h-5" />
                                        </Button>
                                    </div>
                                    <div className="p-4 sm:p-6 overflow-y-auto">
                                        <ExcelImportTab onBatchImport={(rows) => form.handleBatchImport(rows, onSave)} />
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t flex justify-end">
                                        <Button variant="secondary" onClick={() => form.setShowImportModal(false)} className="px-6 py-2 font-semibold">Cerrar</Button>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </main>
                )}

                <div className={activeTab === 'historial' ? 'hidden' : 'mt-2 sm:mt-4'}>

                    {activeTab === 'arqueo' && (
                        !isDateConfirmed ? (
                            <div className="flex flex-col items-center justify-center p-8 mt-12 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 min-h-[400px]">
                                <EmptyState
                                    icon={<CalendarDaysIcon className="h-16 w-16 text-purple-500 opacity-80" />}
                                    title={hasDraftInProgress ? 'Arqueo en curso detectado' : 'Ningún arqueo en curso'}
                                    description={
                                        hasDraftInProgress
                                            ? `Tienes un borrador guardado${form.formData.cajero ? ` de ${form.formData.cajero}` : ''} en el Paso ${form.currentStep} de ${ARQUEO_STEPS.length}.`
                                            : 'Para comenzar a registrar el cierre de caja, inicia un nuevo arqueo.'
                                    }
                                    action={
                                        hasDraftInProgress ? (
                                            <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
                                                <Button
                                                    variant="primary"
                                                    size="lg"
                                                    onClick={() => setIsDateConfirmed(true)}
                                                    className="shadow-lg shadow-purple-500/30 font-semibold tracking-wide"
                                                >
                                                    Continuar Arqueo
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="lg"
                                                    onClick={() => {
                                                        form.resetForm();
                                                        setMaxStepReached(1);
                                                        setShowDateModal(true);
                                                    }}
                                                >
                                                    Empezar Uno Nuevo
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="primary"
                                                size="lg"
                                                onClick={() => setShowDateModal(true)}
                                                className="mt-4 shadow-lg shadow-purple-500/30 font-semibold tracking-wide"
                                            >
                                                Iniciar Nuevo Arqueo
                                            </Button>
                                        )
                                    }
                                />
                                {showDateModal && (
                                    <ArqueoDateSelector
                                        currentDate={form.formData.fecha}
                                        onDateChange={(date) => form.setFormData(prev => ({ ...prev, fecha: date }))}
                                        onConfirm={() => {
                                            setIsDateConfirmed(true);
                                            setShowDateModal(false);
                                        }}
                                        onCancel={() => setShowDateModal(false)}
                                    />
                                )}
                            </div>
                        ) : (
                        <div className="mx-auto w-full max-w-3xl pb-24 px-4 sm:px-0">
                            <ArqueoStepper
                                currentStep={form.currentStep}
                                maxStepReached={maxStepReached}
                                onStepSelect={(step) => {
                                    if (form.currentStep === 4 || form.currentStep === 5) {
                                        form.handleSendToArqueo();
                                    }
                                    form.setCurrentStep(step);
                                }}
                            />

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                form.handleSendToArqueo();
                                form.handleSubmit(e);
                            }} className="space-y-4">
                                
                                {form.currentStep === 1 && (
                                    <Card className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border-0 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-300">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                                            Información General
                                        </h3>
                                        <div className="space-y-5">
                                            <FormGroup label="Fecha del Arqueo" required>
                                                <DatePicker
                                                    value={form.formData.fecha}
                                                    onChange={(val) => form.setFormData((prev) => ({ ...prev, fecha: val }))}
                                                    className="w-full h-10"
                                                    required
                                                />
                                            </FormGroup>
                                            <FormGroup label="Cajero Responsable" required error={cajeroError}>
                                                <Input
                                                    type="text"
                                                    name="cajero"
                                                    value={form.formData.cajero}
                                                    onChange={(e) => {
                                                        if (cajeroError) setCajeroError('');
                                                        form.handleSimpleChange(e);
                                                    }}
                                                    placeholder="Nombre del responsable del turno..."
                                                    className="text-sm h-10"
                                                    required
                                                />
                                            </FormGroup>
                                        </div>
                                    </Card>
                                )}

                                {form.currentStep === 2 && (
                                    <Card className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border-0 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="flex items-center justify-between gap-2 mb-6">
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                <span className="w-1.5 h-6 bg-purple-600 rounded-full"></span>
                                                Registro de Venta
                                            </h3>
                                            {!isBlindMode && getRestofyConfig().enabled && (
                                                <Button
                                                    variant="secondary"
                                                    size="xs"
                                                    onClick={handleImportSalesFromRestofy}
                                                    disabled={isImportingRestofy}
                                                    className="gap-1.5"
                                                >
                                                    <ArrowPathIcon className={cn('h-3.5 w-3.5', isImportingRestofy && 'animate-spin')} />
                                                    {isImportingRestofy ? 'Cargando...' : 'Cargar de Restofy'}
                                                </Button>
                                            )}
                                        </div>
                                        <div className="space-y-4">
                                            {!isBlindMode && (
                                                <>
                                                    <CurrencyInput label="Venta POS" name="ventaPos" value={form.formData.ventaPos} onChange={form.handleCurrencyChange} sublabel="Según reporte del sistema" useMonoFont={useMonoFont} />
                                                    <CurrencyInput label="Propinas Recaudadas" name="propina" value={form.formData.propina} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                                                </>
                                            )}
                                            
                                            <FormGroup label="¿Hubo Cover?" className="mt-4">
                                                <div className="flex gap-4 mb-2">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="radio" name="hasCovers" checked={form.hasCovers} onChange={() => form.setHasCovers(true)} className="w-4 h-4 text-purple-600 focus:ring-purple-500" />
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sí</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="radio" name="hasCovers" checked={!form.hasCovers} onChange={() => form.setHasCovers(false)} className="w-4 h-4 text-purple-600 focus:ring-purple-500" />
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">No</span>
                                                    </label>
                                                </div>
                                            </FormGroup>
                                            
                                            {form.hasCovers && (
                                                <div className="animate-in fade-in slide-in-from-top-2">
                                                    <CurrencyInput label="Ingreso Covers" name="ingresoCovers" value={form.formData.ingresoCovers} onChange={form.handleCurrencyChange} sublabel="No suma al total esperado" useMonoFont={useMonoFont} />
                                                </div>
                                            )}
                                            
                                            <FormGroup label="Total Visitas" className="pt-4 border-t border-gray-100 dark:border-slate-700 mt-4">
                                                <Input type="number" name="visitas" value={form.formData.visitas || ''} onChange={form.handleSimpleChange} onWheel={(e) => e.currentTarget.blur()} className="text-sm h-10" placeholder="0" />
                                            </FormGroup>
                                        </div>
                                    </Card>
                                )}

                                {form.currentStep === 3 && (
                                    <Card className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border-0 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-300">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-purple-600 rounded-full"></span>
                                            Base de Caja
                                        </h3>
                                        <div className="space-y-6">
                                            <FormGroup label="Base Inicial Declarada (Informativo)">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm pointer-events-none">$</span>
                                                    <Input 
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={form.baseInicialDeclarada > 0 ? formatCOP(form.baseInicialDeclarada) : ''} 
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                                                            form.setBaseInicialDeclarada(val);
                                                        }}
                                                        className="pl-7 text-sm h-10 font-bold tabular-nums" 
                                                        placeholder="Ej. 200.000" 
                                                    />
                                                </div>
                                            </FormGroup>
                                            
                                            <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
                                                <DenominationTable 
                                                    title="Conteo Físico Base" 
                                                    denominations={form.baseCaja} 
                                                    total={form.totalBaseCaja} 
                                                    onUpdate={(denom, value) => form.updateDenomination(form.setBaseCaja, denom, value)} 
                                                    keyPrefix="base" 
                                                />
                                            </div>
                                            
                                            {form.baseInicialDeclarada > 0 && (() => {
                                                const diff = form.totalBaseCaja - form.baseInicialDeclarada;
                                                const isMatch = diff === 0;
                                                return (
                                                    <div className={cn(
                                                        "p-3.5 rounded-xl text-center font-bold text-sm border tabular-nums",
                                                        isMatch
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50"
                                                            : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50"
                                                    )}>
                                                        {isMatch
                                                            ? 'Base cuadrada exactamente con el monto inicial declarado'
                                                            : diff > 0
                                                                ? `Sobrante en base: ${formatCurrencyValue(diff)}`
                                                                : `Faltante en base: ${formatCurrencyValue(Math.abs(diff))}`}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </Card>
                                )}

                                {form.currentStep === 4 && (
                                    <Card className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border-0 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-300">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-purple-600 rounded-full"></span>
                                            Conteo Efectivo (Ventas)
                                        </h3>
                                        <DenominationTable 
                                            title="Billetes y Monedas" 
                                            denominations={form.cuadreVenta} 
                                            total={form.totalCuadreVenta} 
                                            onUpdate={(denom, value) => form.updateDenomination(form.setCuadreVenta, denom, value)} 
                                            keyPrefix="venta" 
                                        />
                                    </Card>
                                )}

                                {form.currentStep === 5 && (
                                    <Card className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border-0 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-300">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-purple-600 rounded-full"></span>
                                            Gastos de Caja
                                        </h3>
                                        <div className="space-y-6">
                                            <GastoList 
                                                title="Facturas Personal" 
                                                gastos={form.gastosPersonal} 
                                                total={form.totalGastosPersonal} 
                                                onAdd={form.handleAddGastoPersonal} 
                                                onRemove={form.handleRemoveGastoPersonal} 
                                            />
                                            <GastoList 
                                                title="Facturas Proveedores" 
                                                gastos={form.gastosProveedores} 
                                                total={form.totalGastosProveedores} 
                                                onAdd={form.handleAddGastoProveedor} 
                                                onRemove={form.handleRemoveGastoProveedor} 
                                            />
                                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-lg">
                                                <span className="font-bold text-slate-700 dark:text-slate-300">Total Gastos:</span>
                                                <span className="font-black text-purple-600 dark:text-purple-400 tabular-nums">{formatCurrencyValue(form.totalGastosPersonal + form.totalGastosProveedores)}</span>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {form.currentStep === 6 && (
                                    <Card className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border-0 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-300">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-purple-600 rounded-full"></span>
                                            Medios Digitales
                                        </h3>
                                        <div className="space-y-4">
                                            <CurrencyInput label="Datáfono Bold" name="datafonoDavid" value={form.formData.datafonoDavid} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                                            <CurrencyInput label="Datáfono Credibanco" name="datafonoJulian" value={form.formData.datafonoJulian} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                                            
                                            <div className="pt-4 border-t border-dashed border-gray-200 dark:border-slate-700 space-y-4">
                                                <CurrencyInput
                                                    label="Código QR"
                                                    name="transfBancolombia"
                                                    value={form.formData.transfBancolombia}
                                                    onChange={form.handleCurrencyChange}
                                                    onDetailClick={() => form.openDetailModal('transfBancolombia', 'Código QR')}
                                                    detailCount={form.paymentDetails.transfBancolombia.length}
                                                    sublabel="Haz clic en Detalle para sumar transferencias"
                                                    readOnly={true}
                                                    useMonoFont={useMonoFont}
                                                />
                                                <CurrencyInput
                                                    label="Nequi"
                                                    name="nequi"
                                                    value={form.formData.nequi}
                                                    onChange={form.handleCurrencyChange}
                                                    onDetailClick={() => form.openDetailModal('nequi', 'Nequi')}
                                                    detailCount={form.paymentDetails.nequi.length}
                                                    sublabel="Haz clic en Detalle para sumar movimientos Nequi"
                                                    readOnly={true}
                                                    useMonoFont={useMonoFont}
                                                />
                                                <CurrencyInput label="Rappi" name="rappi" value={form.formData.rappi} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {form.currentStep === 7 && (() => {
                                    const totalGastos = form.totalGastosPersonal + form.totalGastosProveedores;
                                    const totalDatafonos = form.formData.datafonoDavid + form.formData.datafonoJulian;
                                    return (
                                        <Card className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border-0 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-emerald-500"></div>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5 pb-4 border-b border-gray-100 dark:border-slate-700">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                                        Resumen del Arqueo
                                                    </h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Revisa los valores antes de confirmar el cierre definitivo.
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                                    <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-700 font-semibold text-gray-700 dark:text-gray-200">
                                                        {form.formData.fecha}
                                                    </span>
                                                    <span className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 font-semibold text-purple-700 dark:text-purple-300">
                                                        {form.formData.cajero || 'Sin cajero'}
                                                    </span>
                                                    {form.formData.visitas > 0 && (
                                                        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-200">
                                                            {form.formData.visitas} visitas
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className={isBlindMode ? 'grid grid-cols-1 gap-4 mb-5' : 'grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5'}>
                                                {!isBlindMode && (
                                                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3.5 rounded-xl text-center border border-purple-100 dark:border-purple-800/40">
                                                        <span className="block text-xs2 font-bold text-purple-600 dark:text-purple-400 uppercase tracking-caps mb-1">Total Esperado</span>
                                                        <span className="block text-lg font-black text-purple-700 dark:text-purple-300 tabular-nums">{formatCurrencyValue(form.ventaTotalEsperada)}</span>
                                                    </div>
                                                )}
                                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3.5 rounded-xl text-center border border-emerald-100 dark:border-emerald-800/40">
                                                    <span className="block text-xs2 font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-caps mb-1">Total Recaudado</span>
                                                    <span className="block text-lg font-black text-emerald-700 dark:text-emerald-300 tabular-nums">{formatCurrencyValue(form.totalRecaudado)}</span>
                                                </div>
                                            </div>

                                            {/* Desglose rápido */}
                                            <div className="bg-gray-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 space-y-2 mb-5 text-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-400">Efectivo Contado (Ventas)</span>
                                                    <span className="font-bold text-gray-800 dark:text-gray-100 tabular-nums">{formatCurrencyValue(form.totalCuadreVenta)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-400">Gastos de Caja</span>
                                                    <span className="font-bold text-gray-800 dark:text-gray-100 tabular-nums">{formatCurrencyValue(totalGastos)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-400">Datáfonos (Bold + Credibanco)</span>
                                                    <span className="font-bold text-gray-800 dark:text-gray-100 tabular-nums">{formatCurrencyValue(totalDatafonos)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-400">Código QR / Transferencias</span>
                                                    <span className="font-bold text-gray-800 dark:text-gray-100 tabular-nums">{formatCurrencyValue(form.formData.transfBancolombia)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-400">Nequi</span>
                                                    <span className="font-bold text-gray-800 dark:text-gray-100 tabular-nums">{formatCurrencyValue(form.formData.nequi)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600 dark:text-gray-400">Rappi</span>
                                                    <span className="font-bold text-gray-800 dark:text-gray-100 tabular-nums">{formatCurrencyValue(form.formData.rappi)}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-slate-700 text-xs">
                                                    <span className="text-gray-500 dark:text-gray-400">Base de Caja (Retorno al fondo)</span>
                                                    <span className="font-semibold text-gray-700 dark:text-gray-300 tabular-nums">{formatCurrencyValue(form.totalBaseCaja)}</span>
                                                </div>
                                            </div>

                                            {!isBlindMode && (
                                                <div className={cn(
                                                    "p-3.5 rounded-xl text-center font-bold text-sm mb-5 border tabular-nums",
                                                    form.descuadre === 0
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50"
                                                        : form.descuadre > 0
                                                            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/50"
                                                            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800/50"
                                                )}>
                                                    {form.descuadre === 0
                                                        ? 'Cuadre Perfecto ($ 0)'
                                                        : form.descuadre > 0
                                                            ? `Sobrante Final: ${formatCurrencyValue(form.descuadre)}`
                                                            : `Faltante Final: ${formatCurrencyValue(Math.abs(form.descuadre))}`}
                                                </div>
                                            )}

                                            <Button
                                                type="submit"
                                                variant="primary"
                                                size="lg"
                                                className="w-full flex justify-center items-center gap-2 font-bold"
                                            >
                                                <span>Finalizar Arqueo</span>
                                                <CheckIcon className="w-5 h-5" />
                                            </Button>
                                        </Card>
                                    );
                                })()}

                                {/* Nav Buttons */}
                                <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                                    <Button 
                                        variant="secondary" 
                                        type="button" 
                                        onClick={() => form.setCurrentStep(s => Math.max(1, s - 1))}
                                        disabled={form.currentStep === 1}
                                        className="w-32"
                                    >
                                        Atrás
                                    </Button>
                                    {form.currentStep < 7 ? (
                                        <Button 
                                            variant="primary" 
                                            type="button" 
                                            onClick={() => {
                                                if (form.currentStep === 1 && !form.formData.cajero.trim()) {
                                                    setCajeroError('Ingresa el nombre del cajero responsable para continuar.');
                                                    return;
                                                }
                                                if (form.currentStep === 3 && form.totalBaseCaja !== form.baseInicialDeclarada) {
                                                    const diff = form.totalBaseCaja - form.baseInicialDeclarada;
                                                    setAlertState({
                                                        isOpen: true,
                                                        message: `El conteo físico de la base (${formatCurrencyValue(form.totalBaseCaja)}) no concuerda con la Base Inicial Declarada (${formatCurrencyValue(form.baseInicialDeclarada)}). Diferencia: ${diff > 0 ? '+' : ''}${formatCurrencyValue(diff)}.`
                                                    });
                                                    return;
                                                }
                                                if (form.currentStep === 4 || form.currentStep === 5) {
                                                    form.handleSendToArqueo();
                                                }
                                                form.setCurrentStep(s => Math.min(7, s + 1));
                                            }}
                                            className="w-32"
                                        >
                                            Siguiente
                                        </Button>
                                    ) : (
                                        <div className="w-32" />
                                    )}
                                </div>
                            </form>
                        </div>
                        )
                    )}
                </div>
            </div>
            
            <AlertModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState({isOpen: false, message: ''})}
                title="Validación requerida"
                message={alertState.message}
                type="warning"
            />
        </div >
    );
};

export default ArqueoPreview;
