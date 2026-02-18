import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
    ClipboardDocumentListIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    InformationCircleIcon,
    MoonIcon,
    SunIcon,
    TableCellsIcon,
} from '../../components/ui/Icons';
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
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extracted components & hook
import { CurrencyInput } from './components/CurrencyInput';
import { PaymentDetailModal } from './components/PaymentDetailModal';
import { ArqueoConfirmationModal } from './components/ArqueoConfirmationModal';
import { CashCalculator } from './components/CashCalculator';
import { useArqueoForm, formatCurrencyValue } from './hooks/useArqueoForm';
import { ArqueoDateSelector } from './components/ArqueoDateSelector';


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
        handleMigrateArqueos: onMigrateArqueos
    } = useArqueos();
    const { userRole } = useAuth();
    const useMonoFont = userRole === 'admin';
    const form = useArqueoForm();
    const tableRef = React.useRef<ArqueosTableHandle>(null);

    // --- Tab routing ---
    const [activeTab, setActiveTab] = React.useState<'arqueo' | 'historial' | 'transferencias'>('arqueo');
    const location = useLocation();
    const navigate = useNavigate();

    // --- Date Selection Logic ---
    const [isDateConfirmed, setIsDateConfirmed] = React.useState(false);

    useEffect(() => {
        if (location.pathname.includes('/history')) {
            setActiveTab('historial');
            setIsDateConfirmed(true);
        } else if (location.pathname.includes('/transfers')) {
            setActiveTab('transferencias');
            setIsDateConfirmed(true);
        } else {
            setActiveTab('arqueo');
            setIsDateConfirmed(false); // Reset confirmation for 'arqueo' tab
        }
    }, [location.pathname]);


    const getPageDetails = () => {
        switch (activeTab) {
            case 'transferencias': return { title: 'Transferencias', subtitle: 'Gestión de movimientos bancarios' };
            case 'historial': return { title: 'Historial de Arqueos', subtitle: 'Registro histórico y auditoría' };
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
        doc.setTextColor(40);
        doc.text("Resumen de Arqueo de Caja", 105, 20, { align: "center" });
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Fecha: ${summary.fecha}`, 20, 35);
        doc.text(`Cajero: ${summary.cajero}`, 20, 42);
        doc.text(`Visitas: ${summary.visitas}`, 20, 49);

        autoTable(doc, {
            startY: 55,
            head: [['Concepto', 'Monto']],
            body: [
                ['Ingreso Covers', formatCurrencyValue(summary.ingresoCovers)],
                ['-----------------------', '-----------------------'],
                ['Efectivo', formatCurrencyValue(summary.efectivo)],
                ['Datafono David', formatCurrencyValue(summary.datafonoDavid)],
                ['Datafono Julián', formatCurrencyValue(summary.datafonoJulian)],
                ['Transferencia Bancolombia', formatCurrencyValue(summary.transfBancolombia)],
                ['Nequi', formatCurrencyValue(summary.nequi)],
                ['Rappi', formatCurrencyValue(summary.rappi)],
                ['-----------------------', '-----------------------'],
                ['VENTA ESPERADA', formatCurrencyValue(ventaEsperada)],
                ['TOTAL RECAUDADO', formatCurrencyValue(totalRecaudado)],
                ['DESCUADRE FINAL', formatCurrencyValue(descuadre)],
            ],
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 10, cellPadding: 3 }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 150;
        doc.setFontSize(10);
        doc.text("Generado automáticamente por Antigravity System", 105, finalY + 20, { align: "center" });
        doc.save(`Arqueo_${summary.fecha}_${summary.cajero}.pdf`);
    };

    // --- Confirm Save ---
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

                // Save automatic transfers
                try {
                    const transfersToSave: TransferRecord[] = [];
                    const timestamp = new Date().toISOString();
                    const date = form.formData.fecha;

                    const createRecord = (amount: number, type: TransferType, index: number = 0): TransferRecord => {
                        const numericAmount = Number(amount) || 0;
                        const normalizedType = type.toLowerCase() as TransferType;
                        return {
                            id: `auto-${arqueoId}-${normalizedType}-${index}`,
                            arqueoId,
                            date,
                            amount: numericAmount,
                            type: normalizedType,
                            description: `Cierre de Caja ${date}`,
                            reference: normalizedType === 'nequi' ? 'Transferencia Nequi' :
                                normalizedType === 'bancolombia' ? 'Transferencia Bancolombia' :
                                    normalizedType === 'davivienda' ? 'Transferencia Davivienda' : 'Transferencia',
                            createdAt: timestamp
                        };
                    };

                    // Nequi
                    if (form.paymentDetails.nequi.length > 0) {
                        form.paymentDetails.nequi.forEach((amount, i) => {
                            if (amount > 0) transfersToSave.push(createRecord(amount, 'nequi', i));
                        });
                    } else if (Number(form.formData.nequi) > 0) {
                        transfersToSave.push(createRecord(form.formData.nequi, 'nequi'));
                    }

                    // Bancolombia
                    if (form.paymentDetails.transfBancolombia.length > 0) {
                        form.paymentDetails.transfBancolombia.forEach((amount, i) => {
                            if (amount > 0) transfersToSave.push(createRecord(amount, 'bancolombia', i));
                        });
                    } else if (Number(form.formData.transfBancolombia) > 0) {
                        transfersToSave.push(createRecord(form.formData.transfBancolombia, 'bancolombia'));
                    }

                    if (transfersToSave.length > 0) {
                        await Promise.all(transfersToSave.map(t => DatabaseService.saveTransfer(t)));
                    }
                } catch (err) {
                    console.error('Error guardando transferencias automáticas:', err);
                }

                // Reset form on success
                form.resetForm();
                setActiveTab('arqueo');
                // Reset date confirmation to force re-entry for next session if needed, 
                // or keep it if they want to do another one for same day? 
                // Usually one per day. Let's keep date confirmed but reset form.
                // Actually, if they finished, maybe they want to close?
                // Let's leave isDateConfirmed as is.

                await DatabaseService.autoPurgeOldData();
                form.setShowConfirmation(false);
            } else {
                form.setShowConfirmation(false);
            }
        } catch (error) {
            console.error('Error en handleConfirmSave:', error);
            form.setShowConfirmation(false);
        } finally {
            form.setIsSaving(false);
        }
    };

    // If active tab is 'arqueo' and date is NOT confirmed, show selector
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
        <div className={form.isDarkMode ? 'dark' : ''}>
            <div className="w-full h-full flex flex-col overflow-x-hidden min-h-[100dvh] transition-colors duration-300 bg-gray-50 dark:bg-slate-900 pb-8 px-4 sm:px-8 lg:px-12">

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

                {/* Page Header */}
                <div className="px-3 sm:px-0">
                    <PageHeader
                        title={pageDetails.title}
                        breadcrumbs={[
                            { label: 'Finanzas', path: '/arqueo' },
                            { label: pageDetails.title }
                        ]}
                        icon={<ClipboardDocumentListIcon className="h-6 w-6" />}
                        actions={
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => form.setAlertConfig({
                                        isOpen: true,
                                        title: 'Guía Rápida',
                                        message: '1. Completa la Información General.\n2. Abre la Calculadora de Efectivo para registrar el conteo físico.\n3. Verifica que el Efectivo Total se sincronice.\n4. Revisa el descuadre y finaliza el arqueo.',
                                        type: 'info',
                                        confirmText: 'Entendido',
                                        showCancel: false
                                    })}
                                    className="bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-300 hover:text-primary dark:hover:text-blue-400 p-2 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm transition-all hover:scale-105"
                                    title="Ver guía rápida"
                                >
                                    <InformationCircleIcon className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => form.setIsDarkMode(!form.isDarkMode)}
                                    className="bg-white dark:bg-slate-700 text-gray-400 dark:text-yellow-400 hover:text-yellow-500 p-2 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm transition-all hover:scale-105"
                                    title={form.isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                                >
                                    {form.isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        }
                    />
                </div>

                {/* Tab: Transferencias */}
                {activeTab === 'transferencias' && (
                    <div className="pb-24 sm:pb-0 animate-fadeIn">
                        <TransfersView />
                    </div>
                )}

                {/* Tab: Historial */}
                {activeTab === 'historial' && (
                    <div className="bg-white dark:bg-slate-800 p-0 sm:p-0 rounded-xl shadow-none sm:shadow-sm border-none sm:border border-slate-200 dark:border-slate-700 bg-transparent sm:bg-white">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden p-4 sm:p-6">
                            <ArqueosTable
                                ref={tableRef}
                                arqueos={arqueos}
                                onUpdate={onUpdateArqueo}
                                onDelete={onDeleteArqueo}
                                userRole={userRole}
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
                                            Exportar Contabilidad
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => form.setShowImportModal(true)}
                                            className="h-8 gap-2 bg-white dark:bg-slate-800 text-xs font-medium border border-slate-200 dark:border-slate-700 hidden sm:flex"
                                        >
                                            <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                                            Importar Excel
                                        </Button>

                                        {/* Mobile Icons Only */}
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => form.setShowAccountingWizard(true)}
                                            className="h-8 w-8 p-0 sm:hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                            disabled={arqueos.length === 0}
                                        >
                                            <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => form.setShowImportModal(true)}
                                            className="h-8 w-8 p-0 sm:hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                                        >
                                            <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                }
                            />
                        </div>

                        <AccountingExportWizard
                            isOpen={form.showAccountingWizard}
                            onClose={() => form.setShowAccountingWizard(false)}
                            selectedArqueos={arqueos}
                        />

                        {/* Import Modal */}
                        {form.showImportModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[85dvh] animate-in zoom-in-95 duration-200">
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <ArrowUpTrayIcon className="h-6 w-6 text-indigo-600" /> Importar Arqueos desde Excel
                                        </h3>
                                        <button
                                            onClick={() => form.setShowImportModal(false)}
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="p-4 sm:p-6 overflow-y-auto">
                                        <ExcelImportTab onBatchImport={(rows) => form.handleBatchImport(rows, onSave)} />
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 rounded-b-2xl flex justify-end">
                                        <button
                                            onClick={() => form.setShowImportModal(false)}
                                            className="px-6 py-2 text-slate-600 dark:text-slate-300 font-semibold hover:text-slate-800 dark:hover:text-white transition-colors"
                                        >
                                            Cerrar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Arqueo Form */}
                {activeTab === 'arqueo' && (
                    <form onSubmit={form.handleSubmit} className="space-y-0 sm:space-y-6">
                        {/* Calculadora */}
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

                        {/* Info General */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 pb-2 border-b border-gray-100 dark:border-slate-700 uppercase tracking-wide">Información General</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                                    <input type="date" name="fecha" value={form.formData.fecha}
                                        readOnly
                                        className="w-full h-8 px-3 text-[13px] rounded border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 text-gray-600 bg-gray-50 dark:bg-slate-700 dark:text-gray-300 shadow-sm transition-all"
                                        required />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1">Cajero</label>
                                    <input type="text" name="cajero" value={form.formData.cajero} onChange={form.handleSimpleChange}
                                        placeholder="Nombre del responsable"
                                        className="w-full h-8 px-3 text-[13px] rounded border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 text-gray-900 dark:text-white dark:bg-slate-700 shadow-sm transition-all"
                                        required />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1">Total Visitas</label>
                                    <input type="number" name="visitas" value={form.formData.visitas || ''} onChange={form.handleSimpleChange}
                                        className="w-full h-8 px-3 text-[13px] rounded border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600 text-gray-900 dark:text-white dark:bg-slate-700 shadow-sm transition-all"
                                        placeholder="0" />
                                </div>
                            </div>
                        </div>

                        {/* Ventas y Esperado */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 mt-4">
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 dark:border-slate-700">
                                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">Ventas del Sistema</h3>
                                <div className="text-right flex items-center gap-3">
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-bold">Total Esperado</span>
                                    <span className="text-base font-bold text-purple-600 dark:text-blue-400 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">{formatCurrencyValue(form.ventaTotalEsperada)}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <CurrencyInput label="Covers" name="ingresoCovers" value={form.formData.ingresoCovers} onChange={form.handleCurrencyChange} sublabel="No suma al esperado" useMonoFont={useMonoFont} />
                                <CurrencyInput label="Venta POS (Bruta)" name="ventaBruta" value={form.formData.ventaBruta} onChange={form.handleCurrencyChange} sublabel="Reporte sistema" useMonoFont={useMonoFont} />
                                <CurrencyInput label="Propina" name="propina" value={form.formData.propina} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                            </div>
                        </div>

                        {/* Medios de Pago */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 mt-4">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 pb-2 border-b border-gray-100 dark:border-slate-700 uppercase tracking-wide">Recaudo (Medios de Pago)</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                <div className="lg:col-span-1">
                                    <CurrencyInput label="Efectivo Total" name="efectivo" value={form.formData.efectivo} onChange={form.handleCurrencyChange}
                                        readOnly={true} onDetailClick={() => form.setIsCalculatorExpanded(true)}
                                        sublabel="Sincronizar arriba"
                                        useMonoFont={useMonoFont} />
                                </div>
                                <CurrencyInput label="Datáfono David" name="datafonoDavid" value={form.formData.datafonoDavid} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                                <CurrencyInput label="Datáfono Julián" name="datafonoJulian" value={form.formData.datafonoJulian} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                                <CurrencyInput label="Rappi" name="rappi" value={form.formData.rappi} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-2 border-b border-gray-50 border-dashed mb-3">
                                <CurrencyInput label="Transf. Bancolombia" name="transfBancolombia" value={form.formData.transfBancolombia} onChange={form.handleCurrencyChange}
                                    onDetailClick={() => form.openDetailModal('transfBancolombia', 'Transf. Bancolombia')} readOnly={true} useMonoFont={useMonoFont} />
                                <CurrencyInput label="Nequi" name="nequi" value={form.formData.nequi} onChange={form.handleCurrencyChange}
                                    onDetailClick={() => form.openDetailModal('nequi', 'Nequi')} readOnly={true} useMonoFont={useMonoFont} />
                            </div>

                            <div className="mt-2 flex justify-end items-center gap-4">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Total Recaudado</span>
                                <span className="text-lg font-bold text-gray-800 dark:text-white">{formatCurrencyValue(form.totalRecaudado)}</span>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="sticky bottom-0 sm:bottom-4 pt-3 pb-3 px-3 sm:pt-4 sm:pb-4 sm:px-0 mt-0 sm:mt-6 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sm:bg-transparent sm:dark:bg-transparent sm:backdrop-blur-none border-t border-gray-100 dark:border-slate-800 sm:border-none">
                            <button type="submit"
                                className="w-full py-3 sm:py-4 bg-gray-900 dark:bg-blue-600 dark:hover:bg-blue-700 hover:bg-black text-white text-base sm:text-lg font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all transform active:scale-[0.98] focus:ring-4 focus:ring-gray-300 dark:focus:ring-blue-900 flex justify-center items-center gap-2"
                            >
                                <span>Finalizar Arqueo</span>
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ArqueoPreview;
