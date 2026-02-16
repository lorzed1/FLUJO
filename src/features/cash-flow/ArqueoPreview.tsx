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

    useEffect(() => {
        if (location.pathname.includes('/history')) {
            setActiveTab('historial');
        } else if (location.pathname.includes('/transfers')) {
            setActiveTab('transferencias');
        } else {
            setActiveTab('arqueo');
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

    return (
        <div className={form.isDarkMode ? 'dark' : ''}>
            <div className="w-full max-w-full lg:max-w-[98%] mx-auto pb-32 sm:pb-20 overflow-x-hidden min-h-[100dvh] transition-colors duration-300 dark:bg-slate-900">

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
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-primary dark:text-blue-400">Historial de Arqueos</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => form.setShowAccountingWizard(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors shadow-sm"
                                    disabled={arqueos.length === 0}
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4" /> Exportar Contabilidad
                                </button>
                                <button
                                    onClick={() => form.setShowImportModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 text-primary dark:text-blue-400 font-bold rounded-lg border border-primary/20 dark:border-blue-400/20 hover:bg-primary/5 dark:hover:bg-blue-400/10 transition-colors shadow-sm"
                                >
                                    <ArrowUpTrayIcon className="h-4 w-4" /> Importar Excel
                                </button>
                            </div>
                        </div>
                        <ArqueosTable
                            ref={tableRef}
                            arqueos={arqueos}
                            onUpdate={onUpdateArqueo}
                            onDelete={onDeleteArqueo}
                            userRole={userRole}
                        />
                        <AccountingExportWizard
                            isOpen={form.showAccountingWizard}
                            onClose={() => form.setShowAccountingWizard(false)}
                            selectedArqueos={arqueos}
                        />

                        {/* Import Modal */}
                        {form.showImportModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[85dvh]">
                                    <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                        <h3 className="text-xl font-bold text-dark-text dark:text-white flex items-center gap-2">
                                            <ArrowUpTrayIcon className="h-6 w-6 text-primary" /> Importar Arqueos desde Excel
                                        </h3>
                                        <button
                                            onClick={() => form.setShowImportModal(false)}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="p-4 sm:p-6 overflow-y-auto">
                                        <ExcelImportTab onBatchImport={(rows) => form.handleBatchImport(rows, onSave)} />
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 rounded-b-2xl flex justify-end">
                                        <button
                                            onClick={() => form.setShowImportModal(false)}
                                            className="px-6 py-2 text-gray-600 dark:text-gray-300 font-semibold hover:text-gray-800 dark:hover:text-white transition-colors"
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
                        <div className="bg-white dark:bg-slate-800 p-3 sm:p-6 rounded-none sm:rounded-xl shadow-sm border-y sm:border border-gray-100 dark:border-slate-700">
                            <h3 className="text-base sm:text-lg font-semibold text-primary dark:text-blue-400 mb-3 sm:mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Información General</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Fecha</label>
                                    <input type="date" name="fecha" value={form.formData.fecha} onChange={form.handleSimpleChange}
                                        className="w-full py-3 sm:py-2.5 px-3 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-gray-900 dark:text-white dark:bg-slate-700 shadow-sm transition-all"
                                        required />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Cajero</label>
                                    <input type="text" name="cajero" value={form.formData.cajero} onChange={form.handleSimpleChange}
                                        placeholder="Nombre del responsable"
                                        className="w-full py-3 sm:py-2.5 px-3 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-gray-900 dark:text-white dark:bg-slate-700 shadow-sm transition-all"
                                        required />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Total Visitas (Personas)</label>
                                    <input type="number" name="visitas" value={form.formData.visitas || ''} onChange={form.handleSimpleChange}
                                        className="w-full py-3 sm:py-2.5 px-3 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-gray-900 dark:text-white dark:bg-slate-700 shadow-sm transition-all"
                                        placeholder="0" />
                                </div>
                            </div>
                        </div>

                        {/* Ventas y Esperado */}
                        <div className="bg-white dark:bg-slate-800 p-3 sm:p-6 rounded-none sm:rounded-xl shadow-sm border-y sm:border border-gray-100 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-3 sm:mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">
                                <h3 className="text-base sm:text-lg font-semibold text-primary dark:text-blue-400">Ventas del Sistema (Esperado)</h3>
                                <div className="text-right">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold block">Total Esperado (Venta + Propina)</span>
                                    <span className="text-lg font-bold text-primary dark:text-blue-400">{formatCurrencyValue(form.ventaTotalEsperada)}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <CurrencyInput label="Covers (Informativo)" name="ingresoCovers" value={form.formData.ingresoCovers} onChange={form.handleCurrencyChange} sublabel="No suma al Total Esperado" useMonoFont={useMonoFont} />
                                <CurrencyInput label="Venta POS" name="ventaBruta" value={form.formData.ventaBruta} onChange={form.handleCurrencyChange} sublabel="Venta reportada por el sistema" useMonoFont={useMonoFont} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                                <CurrencyInput label="Propina" name="propina" value={form.formData.propina} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                            </div>
                        </div>

                        {/* Medios de Pago */}
                        <div className="bg-white dark:bg-slate-800 p-3 sm:p-6 rounded-none sm:rounded-xl shadow-sm border-y sm:border border-gray-100 dark:border-slate-700">
                            <h3 className="text-base sm:text-lg font-semibold text-light-text dark:text-blue-400 mb-3 sm:mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Medios de Pago (Recaudado)</h3>
                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                <CurrencyInput label="Efectivo Total" name="efectivo" value={form.formData.efectivo} onChange={form.handleCurrencyChange}
                                    readOnly={true} onDetailClick={() => form.setIsCalculatorExpanded(true)}
                                    sublabel={<><TableCellsIcon className="h-4 w-4 inline-block mr-1 text-gray-400" /> Sincronizar desde la calculadora de arriba</>}
                                    useMonoFont={useMonoFont} />
                            </div>
                            <div className="mt-3 sm:mt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <CurrencyInput label="Datáfono David" name="datafonoDavid" value={form.formData.datafonoDavid} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                                    <CurrencyInput label="Datáfono Julián" name="datafonoJulian" value={form.formData.datafonoJulian} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                                    <CurrencyInput label="Transf. Bancolombia" name="transfBancolombia" value={form.formData.transfBancolombia} onChange={form.handleCurrencyChange}
                                        onDetailClick={() => form.openDetailModal('transfBancolombia', 'Transf. Bancolombia')} readOnly={true} useMonoFont={useMonoFont} />
                                    <CurrencyInput label="Nequi" name="nequi" value={form.formData.nequi} onChange={form.handleCurrencyChange}
                                        onDetailClick={() => form.openDetailModal('nequi', 'Nequi')} readOnly={true} useMonoFont={useMonoFont} />
                                </div>
                                <CurrencyInput label="Rappi" name="rappi" value={form.formData.rappi} onChange={form.handleCurrencyChange} useMonoFont={useMonoFont} />
                            </div>
                            <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-light-text/10 dark:bg-light-text/5 rounded-lg flex justify-between items-center">
                                <span className="text-xs sm:text-sm font-semibold text-light-text dark:text-blue-400">Total Recaudado</span>
                                <span className="text-base sm:text-lg font-bold text-light-text dark:text-blue-400">{formatCurrencyValue(form.totalRecaudado)}</span>
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
