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
    QuestionMarkCircleIcon,
    DocumentTextIcon,
    TrashIcon
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
import { Input } from '../../components/ui/Input';
import ExcelImportTab from './ExcelImportTab';
import ArqueosTable, { type ArqueosTableHandle } from './ArqueosTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { DenominationTable } from './components/DenominationTable';
import { DatabaseService } from '../../services/database';
import { tipsService } from '../../services/tipsService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FormGroup } from '../../components/ui/FormGroup';

// Extracted components & hook
import { CurrencyInput } from './components/CurrencyInput';
import { PaymentDetailModal } from './components/PaymentDetailModal';
import { ArqueoConfirmationModal } from './components/ArqueoConfirmationModal';
import { useArqueoForm, formatCurrencyValue } from './hooks/useArqueoForm';
import { ArqueoDateSelector } from './components/ArqueoDateSelector';
import { cn } from '../../lib/utils';

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
    const useMonoFont = userRole === 'admin';
    const form = useArqueoForm();
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

    // --- Date Selection Logic ---
    const [isDateConfirmed, setIsDateConfirmed] = useState(false);
    const [showDateModal, setShowDateModal] = useState(false);

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

        autoTable(doc, {
            startY: 55,
            head: [['Concepto', 'Monto']],
            body: [
                ['Ingreso Covers', formatCurrencyValue(summary.ingresoCovers)],
                ['Efectivo', formatCurrencyValue(summary.efectivo)],
                ['Datáfono David', formatCurrencyValue(summary.datafonoDavid)],
                ['Datáfono Julián', formatCurrencyValue(summary.datafonoJulian)],
                ['Bancolombia', formatCurrencyValue(summary.transfBancolombia)],
                ['Nequi', formatCurrencyValue(summary.nequi)],
                ['Rappi', formatCurrencyValue(summary.rappi)],
                ['-----------------------', '-----------------------'],
                ['VENTA ESPERADA', formatCurrencyValue(ventaEsperada)],
                ['TOTAL RECAUDADO', formatCurrencyValue(totalRecaudado)],
                ['DESCUADRE FINAL', formatCurrencyValue(descuadre)],
            ],
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }
        });

        doc.save(`Arqueo_${summary.fecha}.pdf`);
    };

    const handleConfirmSave = async () => {
        form.setIsSaving(true);
        try {
            const dataToSave = {
                ...form.formData,
                baseDetail: form.baseCaja,
                cuadreDetail: form.cuadreVenta
            };
            const result = await onSave(dataToSave, form.totalRecaudado);

            if (result !== false) {
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

                form.resetForm();
                await DatabaseService.autoPurgeOldData();
                form.setShowConfirmation(false);
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
                    onClose={() => form.setShowConfirmation(false)}
                    onConfirmSave={handleConfirmSave}
                    onExportPDF={handleExportPDF}
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
                                        onClick={() => form.setAlertConfig({
                                            isOpen: true,
                                            title: 'Guía Rápida',
                                            message: '1. Completa la Información General.\n2. Abre la Calculadora de Efectivo para registrar el conteo físico.\n3. Verifica el descuadre y finaliza el arqueo.',
                                            type: 'info',
                                            confirmText: 'Entendido',
                                            showCancel: false
                                        })}
                                        className="p-1 h-8 w-8 text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-700"
                                    >
                                        <InformationCircleIcon className="h-5 w-5" />
                                    </Button>
                                    <Button
                                        variant="ghost" size="sm"
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
                                            <ArrowUpTrayIcon className="h-6 w-6 text-indigo-600" /> Importar Arqueos
                                        </h3>
                                        <Button variant="ghost" size="sm" onClick={() => form.setShowImportModal(false)} className="h-8 w-8 p-1 text-slate-400 rounded-full">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
                                    title="Ningún arqueo en curso"
                                    description="Para comenzar a registrar el cierre de caja, inicia un nuevo arqueo."
                                    action={
                                        <Button 
                                            variant="primary" 
                                            size="lg" 
                                            onClick={() => setShowDateModal(true)}
                                            className="mt-4 shadow-lg shadow-purple-500/30 font-semibold tracking-wide"
                                        >
                                            Iniciar Nuevo Arqueo
                                        </Button>
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
                            {/* Stepper Header */}
                            <div className="flex justify-between items-center mb-4 overflow-x-auto hide-scrollbar">
                                {['Info', 'Ventas', 'Base', 'Conteo', 'Gastos', 'Pagos', 'Resumen'].map((label, idx) => {
                                    const stepNumber = idx + 1;
                                    const isActive = form.currentStep === stepNumber;
                                    const isPast = form.currentStep > stepNumber;
                                    return (
                                        <div key={label} className="flex flex-col items-center flex-1 min-w-[50px] sm:min-w-[70px]">
                                            <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm mb-1 transition-colors", 
                                                isActive ? "bg-purple-600 text-white shadow-md shadow-purple-500/30" : 
                                                isPast ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-gray-400"
                                            )}>
                                                {stepNumber}
                                            </div>
                                            <span className={cn("text-[10px] sm:text-xs text-center", isActive ? "font-bold text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-gray-400")}>
                                                {label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                form.handleSendToArqueo(); // ensure synced
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
                                                <DatePicker value={form.formData.fecha} onChange={() => {}} className="w-full h-10" required />
                                            </FormGroup>
                                            <FormGroup label="Cajero Responsable" required>
                                                <Input type="text" name="cajero" value={form.formData.cajero} onChange={form.handleSimpleChange} placeholder="Nombre..." className="text-sm h-10" required />
                                            </FormGroup>
                                        </div>
                                    </Card>
                                )}

                                {form.currentStep === 2 && (
                                    <Card className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border-0 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-300">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                                            Registro de Venta
                                        </h3>
                                        <div className="space-y-4">
                                            <CurrencyInput label="Venta POS" name="ventaPos" value={form.formData.ventaPos} onChange={form.handleCurrencyChange} sublabel="Según reporte del sistema" useMonoFont={useMonoFont} />
                                            <CurrencyInput label="Propinas Recaudadas" name="propina" value={form.formData.propina} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                                            
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
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
                                            Base de Caja
                                        </h3>
                                        <div className="space-y-6">
                                            <FormGroup label="Base Inicial Declarada (Informativo)">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">$</span>
                                                    <Input 
                                                        type="text" 
                                                        value={form.baseInicialDeclarada || ''} 
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                                                            form.setBaseInicialDeclarada(val);
                                                        }}
                                                        className="pl-7 text-sm h-10" 
                                                        placeholder="Ej. 200000" 
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
                                            
                                            {form.baseInicialDeclarada > 0 && (
                                                <div className={cn("p-4 rounded-xl text-center font-bold", 
                                                    form.totalBaseCaja === form.baseInicialDeclarada ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
                                                    Diferencia: {formatCurrencyValue(form.totalBaseCaja - form.baseInicialDeclarada)}
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                )}

                                {form.currentStep === 4 && (
                                    <Card className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border-0 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-300">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
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
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
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
                                            <div className="pt-4 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center text-lg">
                                                <span className="font-bold text-gray-700 dark:text-gray-300">Total Gastos:</span>
                                                <span className="font-black text-indigo-600 dark:text-indigo-400">{formatCurrencyValue(form.totalGastosPersonal + form.totalGastosProveedores)}</span>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {form.currentStep === 6 && (
                                    <Card className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border-0 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-300">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-cyan-500 rounded-full"></span>
                                            Medios Digitales
                                        </h3>
                                        <div className="space-y-4">
                                            <CurrencyInput label="Datáfono David" name="datafonoDavid" value={form.formData.datafonoDavid} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                                            <CurrencyInput label="Datáfono Julián" name="datafonoJulian" value={form.formData.datafonoJulian} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                                            
                                            <div className="pt-4 border-t border-dashed border-gray-200 dark:border-slate-700 space-y-4">
                                                <CurrencyInput
                                                    label="Código QR"
                                                    name="transfBancolombia"
                                                    value={form.formData.transfBancolombia}
                                                    onChange={form.handleCurrencyChange}
                                                    onDetailClick={() => form.openDetailModal('transfBancolombia', 'Código QR')}
                                                    readOnly={true}
                                                    useMonoFont={useMonoFont}
                                                />
                                                <CurrencyInput
                                                    label="Nequi"
                                                    name="nequi"
                                                    value={form.formData.nequi}
                                                    onChange={form.handleCurrencyChange}
                                                    onDetailClick={() => form.openDetailModal('nequi', 'Nequi')}
                                                    readOnly={true}
                                                    useMonoFont={useMonoFont}
                                                />
                                                <CurrencyInput label="Rappi" name="rappi" value={form.formData.rappi} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {form.currentStep === 7 && (
                                    <Card className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border-0 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">
                                            Resumen del Arqueo
                                        </h3>
                                        
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-center">
                                                <span className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Total Esperado</span>
                                                <span className="block text-base font-bold text-blue-700 dark:text-blue-300">{formatCurrencyValue(form.ventaTotalEsperada)}</span>
                                            </div>
                                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl text-center">
                                                <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Total Recaudado</span>
                                                <span className="block text-base font-bold text-emerald-700 dark:text-emerald-300">{formatCurrencyValue(form.totalRecaudado)}</span>
                                            </div>
                                        </div>
                                        
                                        <div className={cn("p-3 rounded-xl text-center font-bold text-sm mb-6", 
                                            form.descuadre === 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                            Descuadre Final: {formatCurrencyValue(form.descuadre)}
                                        </div>
                                        
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="md"
                                            className="w-full flex justify-center items-center gap-2"
                                        >
                                            <span>Finalizar Arqueo</span>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        </Button>
                                    </Card>
                                )}

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
                                                if (form.currentStep === 3 && form.totalBaseCaja !== form.baseInicialDeclarada) {
                                                    setAlertState({
                                                        isOpen: true,
                                                        message: "El conteo físico no concuerda con la Base Inicial Declarada. Ajusta el conteo o el valor inicial para continuar."
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

const GastoList = ({ title, gastos, total, onAdd, onRemove }: { title: string, gastos: any[], total: number, onAdd: (desc: string, val: number) => void, onRemove: (id: string) => void }) => {
    const [desc, setDesc] = useState('');
    const [val, setVal] = useState('');
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center px-2">
                <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">{title}</h4>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrencyValue(total)}</span>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900/30 rounded-xl p-3 space-y-3 border border-gray-100 dark:border-slate-700">
                {gastos.map(g => (
                    <div key={g.id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm">
                        <span className="text-sm font-medium flex-1 truncate">{g.descripcion}</span>
                        <span className="text-sm font-bold w-24 text-right mx-2">{formatCurrencyValue(g.valor)}</span>
                        <Button variant="icon-danger" size="icon-sm" type="button" onClick={() => onRemove(g.id)}>
                            <TrashIcon className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                
                <div className="flex gap-2 items-center pt-2">
                    <div className="flex-1 min-w-0">
                        <Input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción" className="text-sm h-9" />
                    </div>
                    <div className="w-28 shrink-0">
                        <Input type="text" value={val} onChange={e => setVal(e.target.value.replace(/\D/g, ''))} placeholder="Valor" className="text-sm text-right h-9" />
                    </div>
                    <Button variant="primary" size="sm" type="button" disabled={!desc || !val} onClick={() => { onAdd(desc, parseInt(val) || 0); setDesc(''); setVal(''); }}>
                        Añadir
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ArqueoPreview;
