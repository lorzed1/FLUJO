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
    QuestionMarkCircleIcon
} from '../../components/ui/Icons';
import { InfoModal, DataDefinition } from '../../components/ui/InfoModal';
import AlertModal from '../../components/ui/AlertModal';
import { TransferRecord, TransferType, ArqueoRecord } from '../../types';
import { useArqueos } from '../../context/ArqueoContext';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { AccountingExportWizard } from './components/AccountingExportWizard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import ExcelImportTab from './ExcelImportTab';
import ArqueosTable, { type ArqueosTableHandle } from './ArqueosTable';
import TransfersView from './TransfersView';
import { DatabaseService } from '../../services/database';
import { tipsService } from '../../services/tipsService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extracted components & hook
import { CurrencyInput } from './components/CurrencyInput';
import { PaymentDetailModal } from './components/PaymentDetailModal';
import { ArqueoConfirmationModal } from './components/ArqueoConfirmationModal';
import { CashCalculator } from './components/CashCalculator';
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
    const [historySubTab, setHistorySubTab] = useState<'cierres' | 'medios'>('cierres');
    const location = useLocation();
    const navigate = useNavigate();

    // --- Date Selection Logic ---
    const [isDateConfirmed, setIsDateConfirmed] = useState(false);

    useEffect(() => {
        if (location.pathname.includes('/history')) {
            setActiveTab('historial');
            setHistorySubTab('cierres');
            setIsDateConfirmed(true);
        } else if (location.pathname.includes('/transfers')) {
            setActiveTab('historial');
            setHistorySubTab('medios');
            setIsDateConfirmed(true);
        } else {
            setActiveTab('arqueo');
            setIsDateConfirmed(false);
        }
    }, [location.pathname]);

    const getPageDetails = () => {
        switch (activeTab) {
            case 'historial': return {
                title: historySubTab === 'cierres' ? 'Historial de Cierres' : 'Medios de Pago',
                subtitle: historySubTab === 'cierres' ? 'Registro histórico y auditoría' : 'Control de transferencias'
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
                        const division = Number(form.formData.noTrabajadores) || 0;
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

    if (activeTab === 'arqueo' && !isDateConfirmed) {
        return (
            <div className={form.isDarkMode ? 'dark' : ''}>
                <ArqueoDateSelector
                    currentDate={form.formData.fecha}
                    onDateChange={(date) => form.setFormData(prev => ({ ...prev, fecha: date }))}
                    onConfirm={() => setIsDateConfirmed(true)}
                />
            </div>
        );
    }

    return (
        <div className={cn("animate-fadeIn", form.isDarkMode ? 'dark' : '')}>
            <div className="w-full h-full flex flex-col overflow-x-hidden space-y-6 bg-gray-50 dark:bg-slate-900 min-h-full">
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

                <PageHeader
                    title={pageDetails.title}
                    breadcrumbs={[
                        { label: 'Caja', path: '/arqueo' },
                        { label: pageDetails.title }
                    ]}
                    icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
                    actions={
                        <div className="flex items-center gap-2">
                            {activeTab === 'historial' && (
                                <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm overflow-hidden h-10 mr-2">
                                    <button
                                        onClick={() => setHistorySubTab('cierres')}
                                        className={`
                                        flex items-center justify-center px-4 h-full text-[13px] font-semibold transition-colors border-r border-slate-200 dark:border-slate-700
                                        ${historySubTab === 'cierres'
                                                ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                                : 'bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700'
                                            }
                                    `}
                                    >
                                        <CalendarDaysIcon className="h-4 w-4 mr-2" />
                                        Cierres
                                    </button>
                                    <button
                                        onClick={() => setHistorySubTab('medios')}
                                        className={`
                                        flex items-center justify-center px-4 h-full text-[13px] font-semibold transition-colors
                                        ${historySubTab === 'medios'
                                                ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                                : 'bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700'
                                            }
                                    `}
                                    >
                                        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                                        Medios
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm h-10">
                                <button
                                    onClick={() => form.setAlertConfig({
                                        isOpen: true,
                                        title: 'Guía Rápida',
                                        message: '1. Completa la Información General.\n2. Abre la Calculadora de Efectivo para registrar el conteo físico.\n3. Verifica el descuadre y finaliza el arqueo.',
                                        type: 'info',
                                        confirmText: 'Entendido',
                                        showCancel: false
                                    })}
                                    className="p-2 text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <InformationCircleIcon className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => form.setIsDarkMode(!form.isDarkMode)}
                                    className="p-2 text-gray-500 hover:bg-gray-50 dark:text-yellow-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    {form.isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    }
                />

                <div className="mt-4 sm:mt-6">
                    {activeTab === 'historial' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden animate-fadeIn">
                            {historySubTab === 'medios' ? (
                                <TransfersView />
                            ) : (
                                <>
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
                                                    onClick={() => form.setShowImportModal(true)}
                                                    className="h-8 gap-2 bg-white dark:bg-slate-800 text-xs font-medium border border-slate-200 dark:border-slate-700 hidden sm:flex"
                                                >
                                                    <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                                                    Importar
                                                </Button>
                                            </div>
                                        }
                                    />
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
                                    {form.showImportModal && (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[85dvh] animate-in zoom-in-95 duration-200">
                                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                        <ArrowUpTrayIcon className="h-6 w-6 text-indigo-600" /> Importar Arqueos
                                                    </h3>
                                                    <button onClick={() => form.setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                                <div className="p-4 sm:p-6 overflow-y-auto">
                                                    <ExcelImportTab onBatchImport={(rows) => form.handleBatchImport(rows, onSave)} />
                                                </div>
                                                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t flex justify-end">
                                                    <button onClick={() => form.setShowImportModal(false)} className="px-6 py-2 text-slate-600 font-semibold">Cerrar</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'arqueo' && (
                        <div className="mx-auto w-full lg:max-w-6xl pb-24 px-0 sm:px-0">
                            <form onSubmit={form.handleSubmit} className="space-y-4 sm:space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">

                                {/* LEFT COLUMN */}
                                <div className="space-y-6">
                                    {/* Info General Card */}
                                    <Card className="p-3 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border-0 dark:bg-slate-800">
                                        <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 sm:mb-6 flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                                            Información General
                                        </h3>

                                        <div className="space-y-3 sm:space-y-5">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide">Fecha del Arqueo</label>
                                                <input type="date" name="fecha" value={form.formData.fecha}
                                                    readOnly
                                                    className="w-full h-14 px-4 text-lg font-medium rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                                    required />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide">Cajero Responsable</label>
                                                <input type="text" name="cajero" value={form.formData.cajero} onChange={form.handleSimpleChange}
                                                    placeholder="Nombre..."
                                                    className="w-full h-14 px-4 text-lg font-medium rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                                    required />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide">Total Visitas</label>
                                                <input type="number" name="visitas" value={form.formData.visitas || ''} onChange={form.handleSimpleChange}
                                                    className="w-full h-14 px-4 text-lg font-medium rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                                    placeholder="0" />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide">No Trabajadores</label>
                                                <input type="number" name="noTrabajadores" value={form.formData.noTrabajadores || ''} onChange={form.handleSimpleChange}
                                                    className="w-full h-14 px-4 text-lg font-medium rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-purple-500 outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                                    placeholder="0" />
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Ventas y Esperado Card */}
                                    <Card className="p-3 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border-0 dark:bg-slate-800">
                                        <div className="flex justify-between items-end mb-4 sm:mb-6">
                                            <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                                                Ventas
                                            </h3>
                                            <div className="text-right">
                                                <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Total Esperado</div>
                                                <div className="text-xl font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg">
                                                    {formatCurrencyValue(form.ventaTotalEsperada)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 sm:space-y-4">
                                            <CurrencyInput label="Covers (Ingreso)" name="ingresoCovers" value={form.formData.ingresoCovers} onChange={form.handleCurrencyChange} sublabel="No suma al total esperado" useMonoFont={useMonoFont} />
                                            <CurrencyInput label="Venta POS" name="ventaPos" value={form.formData.ventaPos} onChange={form.handleCurrencyChange} sublabel="Según reporte del sistema" useMonoFont={useMonoFont} />
                                            <CurrencyInput label="Propina Recaudada" name="propina" value={form.formData.propina} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                                        </div>
                                    </Card>
                                </div>

                                {/* RIGHT COLUMN */}
                                <div className="space-y-4 sm:space-y-6">
                                    {/* Calculadora Button / Wrapper */}
                                    <div className="rounded-2xl overflow-hidden shadow-sm">
                                        <CashCalculator
                                            isExpanded={form.isCalculatorExpanded}
                                            onToggleExpanded={() => form.setIsCalculatorExpanded(!form.isCalculatorExpanded)}
                                            baseCaja={form.baseCaja}
                                            cuadreVenta={form.cuadreVenta}
                                            consumoPersonal={form.consumoPersonal}
                                            facturas={form.facturas}
                                            totalBaseCaja={form.totalBaseCaja}
                                            totalCuadreVenta={form.totalCuadreVenta}
                                            totalFinalCuadre={form.totalFinalCuadre}
                                            onUpdateDenomination={form.updateDenomination}
                                            onSetBaseCaja={form.setBaseCaja}
                                            onSetCuadreVenta={form.setCuadreVenta}
                                            onSetConsumoPersonal={form.setConsumoPersonal}
                                            onSetFacturas={form.setFacturas}
                                            onSendToArqueo={form.handleSendToArqueo}
                                        />
                                    </div>

                                    {/* Medios de Pago Card */}
                                    <Card className="p-3 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border-0 dark:bg-slate-800 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600"></div>
                                        <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 sm:mb-6 flex items-center gap-2">
                                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                                            Recaudo y Medios
                                        </h3>

                                        <div className="space-y-6">
                                            {/* Primary */}
                                            <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                                <CurrencyInput
                                                    label="Efectivo en Caja"
                                                    name="efectivo"
                                                    value={form.formData.efectivo}
                                                    onChange={form.handleCurrencyChange}
                                                    readOnly={true}
                                                    onDetailClick={() => form.setIsCalculatorExpanded(true)}
                                                    sublabel="Sincronizado desde Calculadora"
                                                    useMonoFont={useMonoFont}
                                                />
                                            </div>

                                            {/* Datafonos */}
                                            <div className="space-y-4">
                                                <CurrencyInput label="Datáfono David" name="datafonoDavid" value={form.formData.datafonoDavid} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                                                <CurrencyInput label="Datáfono Julián" name="datafonoJulian" value={form.formData.datafonoJulian} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                                            </div>

                                            {/* Digital */}
                                            <div className="pt-4 border-t border-dashed border-gray-200 dark:border-slate-700 space-y-4">
                                                <CurrencyInput label="Rappi" name="rappi" value={form.formData.rappi} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                                                    <CurrencyInput
                                                        label="Bancolombia"
                                                        name="transfBancolombia"
                                                        value={form.formData.transfBancolombia}
                                                        onChange={form.handleCurrencyChange}
                                                        onDetailClick={() => form.openDetailModal('transfBancolombia', 'Transf. Bancolombia')}
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
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Recaudado</span>
                                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrencyValue(form.totalRecaudado)}</span>
                                        </div>
                                    </Card>
                                </div>

                                {/* Action Button: sticky on mobile, inline on desktop */}
                                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-slate-800 z-50 flex justify-center shadow-2xl lg:static lg:bg-transparent lg:dark:bg-transparent lg:backdrop-blur-none lg:border-0 lg:shadow-none lg:p-0 lg:mt-8 col-span-1 lg:col-span-2">
                                    <div className="max-w-xl lg:max-w-none w-full">
                                        <button type="submit"
                                            className="w-full py-4 bg-gray-900 dark:bg-blue-600 active:bg-black dark:active:bg-blue-700 text-white text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all transform active:scale-[0.98] flex justify-center items-center gap-3"
                                        >
                                            <span>Finalizar Arqueo</span>
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                        </button>
                                    </div>
                                </div>
                                {/* Spacer for sticky button on mobile only */}
                                <div className="h-24 lg:h-0"></div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default ArqueoPreview;
