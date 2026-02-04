import React, { useState, useEffect } from 'react';
import { ClipboardDocumentListIcon, PlusCircleIcon, TrashIcon, ArrowDownTrayIcon, BanknotesIcon, CalendarDaysIcon, ChartBarIcon, ArrowUpTrayIcon, CheckCircleIcon, ExclamationTriangleIcon, TagIcon, ArrowsRightLeftIcon, ArrowPathIcon, MoonIcon, SunIcon } from '../../components/ui/Icons';
import AlertModal from '../../components/ui/AlertModal';
import { formatCOP, parseCOP } from '../../components/ui/Input';
import { parseExcelData, calculateTotalRecaudado, calculateDescuadre, type ParsedRow } from '../../utils/excelParser';
import { getLocalDateISO } from '../../utils/dateUtils';
import ExcelImportTab from './ExcelImportTab';
import ArqueosTable, { type ArqueosTableHandle } from './ArqueosTable';
import { logoutLocal } from '../../services/auth';
import TransfersView from './TransfersView';
import { FirestoreService } from '../../services/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TransferRecord, TransferType, ArqueoRecord } from '../../types';

interface ArqueoData {
    fecha: string;
    ventaBruta: number;
    propina: number;
    efectivo: number;
    datafonoDavid: number;
    datafonoJulian: number;
    transfBancolombia: number;
    nequi: number;
    rappi: number;
    ingresoCovers: number;
    cajero: string;
    visitas: number;
    // Opcional para pasar datos extras al guardar
    baseDetail?: Record<string, number>;
}

interface CurrencyInputProps {
    label: string;
    name: string;
    value: number;
    onChange: (name: string, value: number) => void;
    sublabel?: React.ReactNode;
    readOnly?: boolean;
    onDetailClick?: () => void;
    useMonoFont?: boolean;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ label, name, value, onChange, sublabel, readOnly, onDetailClick, useMonoFont = false }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseCOP(e.target.value);
        onChange(name, val);
    };

    return (
        <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">{label}</label>
            <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none text-base sm:text-sm">$</span>
                <input
                    type="text"
                    inputMode="numeric"
                    name={name}
                    value={value === 0 ? '' : formatCOP(value)}
                    onChange={handleChange}
                    readOnly={readOnly}
                    className={`w-full pl-7 ${onDetailClick ? 'pr-10' : 'pr-3'} py-3 sm:py-2.5 text-base sm:text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${useMonoFont ? 'font-mono' : ''} transition-all shadow-sm ${readOnly ? 'bg-gray-50/80 dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 font-medium' : 'border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800'}`}
                    placeholder="0"
                    autoComplete="off"
                />
                {onDetailClick && (
                    <button
                        type="button"
                        onClick={onDetailClick}
                        className="absolute inset-y-0 right-0 pr-2 flex items-center text-primary hover:text-primary/80 transition-colors"
                        title="Ver Detalles"
                    >
                        <ClipboardDocumentListIcon className="h-6 w-6" />
                    </button>
                )}
            </div>
            {sublabel && <p className="text-[10px] sm:text-xs text-gray-500 mt-1 pl-1 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-gray-400 inline-block"></span>{sublabel}</p>}
        </div>
    );
};

interface PaymentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items: number[];
    onAddItem: (amount: number) => void;
    onRemoveItem: (index: number) => void;
    useMonoFont?: boolean;
}

const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({ isOpen, onClose, title, items, onAddItem, onRemoveItem, useMonoFont = false }) => {
    const [newVal, setNewVal] = useState('');
    // Focus ref para el input
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Auto-focus al abrir
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const num = parseCOP(newVal);
        if (num > 0) {
            onAddItem(num);
            setNewVal('');
            // Mantener foco para añadir múltiples rápidamente
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    };

    const total = items.reduce((a, b) => a + b, 0);

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
            {/* Modal Container: Full width bottom sheet on mobile, centered card on desktop */}
            {/* Modal Container: Full width bottom sheet on mobile, centered card on desktop */}
            <div className="bg-white dark:bg-slate-800 w-full sm:w-full sm:max-w-md flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                    <div>
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-0.5">Detalle</span>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-900">
                    {/* Input Area */}
                    <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm z-10">
                        <form onSubmit={handleSubmit} className="flex gap-3">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    inputMode="numeric"
                                    value={newVal}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        setNewVal(raw ? formatCOP(raw) : '');
                                    }}
                                    placeholder="0"
                                    className={`w-full pl-7 pr-3 py-3 text-lg ${useMonoFont ? 'font-mono' : ''} text-gray-800 dark:text-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all`}
                                    autoComplete="off"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!newVal}
                                onMouseDown={(e) => e.preventDefault()} // Prevenir perdida de foco en input
                                className="bg-primary disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 rounded-xl hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center shadow-md shadow-indigo-200"
                            >
                                <PlusCircleIcon className="h-6 w-6" />
                            </button>
                        </form>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                <ClipboardDocumentListIcon className="h-16 w-16 mb-2" />
                                <p className="text-sm">Sin registros agregados</p>
                            </div>
                        ) : (
                            items.map((amount, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl border border-gray-100 dark:border-slate-700 transition-colors group animate-in slide-in-from-bottom-2 duration-300 fill-mode-backwards" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 flex items-center justify-center text-xs font-bold text-gray-400 shadow-sm">
                                            {idx + 1}
                                        </div>
                                        <span className={`${useMonoFont ? 'font-mono' : ''} text-lg font-medium text-gray-700 dark:text-gray-200`}>${formatCOP(amount)}</span>
                                    </div>
                                    <button
                                        onClick={() => onRemoveItem(idx)}
                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-all"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer Totals */}
                <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 pb-8 sm:pb-4">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Total Acumulado</span>
                            <div className="text-xs text-gray-400">{items.length} movimientos</div>
                        </div>
                        <span className="text-3xl font-black text-primary tracking-tight">${formatCOP(total)}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200"
                    >
                        Confirmar y Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

interface ArqueoPreviewProps {
    onSave: (data: ArqueoData, total: number) => Promise<boolean | string> | void;
    arqueos?: ArqueoRecord[];
    onUpdateArqueo?: (id: string, field: string, value: number | string) => void;
    onDeleteArqueo?: (id: string) => void;
    onMigrateArqueos?: () => void;
    userRole?: 'admin' | 'cajero' | null;
}

const ArqueoPreview: React.FC<ArqueoPreviewProps> = ({
    onSave,
    arqueos = [],
    onUpdateArqueo = () => { },
    onDeleteArqueo = () => { },
    onMigrateArqueos = () => { },
    userRole = 'cajero' // Valor por defecto: cajero (más restrictivo)
}) => {
    const useMonoFont = userRole === 'admin';
    // Storage Keys
    const STORAGE_KEYS = {
        FORM_DATA: 'arqueo_formData',
        PAYMENT_DETAILS: 'arqueo_paymentDetails',
        BASE_CAJA: 'arqueo_baseCaja',
        CUADRE_VENTA: 'arqueo_cuadreVenta',
        CONSUMO: 'arqueo_consumoPersonal',
        FACTURAS: 'arqueo_facturas',
        ACTIVE_TAB: 'arqueo_activeTab',
        THEME: 'arqueo_theme'
    };

    const getInitialState = <T,>(key: string, fallback: T): T => {
        if (typeof window === 'undefined') return fallback;
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : fallback;
        } catch (e) {
            console.warn(`Error reading ${key} from localStorage`, e);
            return fallback;
        }
    };

    const [formData, setFormData] = useState<ArqueoData>(() => getInitialState(STORAGE_KEYS.FORM_DATA, {
        fecha: getLocalDateISO(),
        ventaBruta: 0,
        propina: 0,
        efectivo: 0,
        datafonoDavid: 0,
        datafonoJulian: 0,
        transfBancolombia: 0,
        nequi: 0,
        rappi: 0,
        ingresoCovers: 0,
        cajero: '',
        visitas: 0
    }));

    // Detail Modal State
    const [activeDetailField, setActiveDetailField] = useState<keyof typeof paymentDetails | null>(null);
    const [modalTitle, setModalTitle] = useState('');
    const [paymentDetails, setPaymentDetails] = useState<{
        nequi: number[];
        transfBancolombia: number[];
    }>(() => getInitialState(STORAGE_KEYS.PAYMENT_DETAILS, {
        nequi: [],
        transfBancolombia: []
    }));

    // Confirmation Modal State
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationData, setConfirmationData] = useState<{
        descuadre: number;
        ventaEsperada: number;
        totalRecaudado: number;
        summary: ArqueoData;
    } | null>(null);

    // Tab State
    const [activeTab, setActiveTab] = useState<'calculadora' | 'arqueo' | 'historial' | 'transferencias'>(() =>
        getInitialState(STORAGE_KEYS.ACTIVE_TAB, 'calculadora')
    );

    const [showImportModal, setShowImportModal] = useState(false);
    const [showExportOptions, setShowExportOptions] = useState(false);

    // Refs
    const tableRef = React.useRef<ArqueosTableHandle>(null);

    // Calculator State
    const [baseCaja, setBaseCaja] = useState<Record<string, number>>(() => getInitialState(STORAGE_KEYS.BASE_CAJA, {
        '50': 0, '100': 0, '200': 0, '500': 0, '1000': 0,
        '2000': 0, '5000': 0, '10000': 0, '20000': 0, '50000': 0, '100000': 0
    }));
    const [cuadreVenta, setCuadreVenta] = useState<Record<string, number>>(() => getInitialState(STORAGE_KEYS.CUADRE_VENTA, {
        '50': 0, '100': 0, '200': 0, '500': 0, '1000': 0,
        '2000': 0, '5000': 0, '10000': 0, '20000': 0, '50000': 0, '100000': 0
    }));
    const [consumoPersonal, setConsumoPersonal] = useState(() => getInitialState(STORAGE_KEYS.CONSUMO, 0));
    const [facturas, setFacturas] = useState(() => getInitialState(STORAGE_KEYS.FACTURAS, 0));

    // Generic Alert State
    const [alertConfig, setAlertConfig] = useState<{
        isOpen: boolean;
        title?: string;
        message: string;
        type?: 'success' | 'error' | 'warning' | 'info';
        onConfirm?: () => void;
        confirmText?: string;
        cancelText?: string;
        showCancel?: boolean;
    }>({ isOpen: false, message: '' });

    // Import State
    const [importData, setImportData] = useState('');
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [showImportConfirmation, setShowImportConfirmation] = useState(false);

    // Dark Mode State
    const [isDarkMode, setIsDarkMode] = useState(() => getInitialState(STORAGE_KEYS.THEME, false));

    // Calculator helper (defined early for use in useEffects)
    const calculateTotal = (denominations: Record<string, number>) => {
        return Object.entries(denominations).reduce((total, [denom, qty]) => {
            return total + (parseInt(denom) * qty);
        }, 0);
    };

    // Calculated values
    const [ventaTotalEsperada, setVentaTotalEsperada] = useState(0);
    const [totalRecaudado, setTotalRecaudado] = useState(0);
    const [descuadre, setDescuadre] = useState(0);

    // Persistence Effects
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.FORM_DATA, JSON.stringify(formData)); }, [formData, STORAGE_KEYS.FORM_DATA]);
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.PAYMENT_DETAILS, JSON.stringify(paymentDetails)); }, [paymentDetails, STORAGE_KEYS.PAYMENT_DETAILS]);
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.BASE_CAJA, JSON.stringify(baseCaja)); }, [baseCaja, STORAGE_KEYS.BASE_CAJA]);
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.CUADRE_VENTA, JSON.stringify(cuadreVenta)); }, [cuadreVenta, STORAGE_KEYS.CUADRE_VENTA]);
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.CONSUMO, JSON.stringify(consumoPersonal)); }, [consumoPersonal, STORAGE_KEYS.CONSUMO]);

    useEffect(() => { localStorage.setItem(STORAGE_KEYS.FACTURAS, JSON.stringify(facturas)); }, [facturas, STORAGE_KEYS.FACTURAS]);

    useEffect(() => { localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, JSON.stringify(activeTab)); }, [activeTab, STORAGE_KEYS.ACTIVE_TAB]);
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(isDarkMode)); }, [isDarkMode, STORAGE_KEYS.THEME]);

    // Auto-calculate Impuesto al Consumo (INC) REMOVED
    // User requested to remove this column
    /*
    useEffect(() => {
        const inc = Math.round(formData.ventaBruta * (8 / 108));
        if (formData.impuestoConsumo !== inc) {
            setFormData(prev => ({ ...prev, impuestoConsumo: inc }));
        }
    }, [formData.ventaBruta, formData.impuestoConsumo]);
    */

    // Update form totals based on detail lists
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            nequi: paymentDetails.nequi.reduce((a, b) => a + b, 0),
            transfBancolombia: paymentDetails.transfBancolombia.reduce((a, b) => a + b, 0),
        }));
    }, [paymentDetails]);

    // Manual sync from calculator to arqueo (removed auto-sync)
    // User must click "Enviar a Arqueo" button
    const handleSendToArqueo = () => {
        const calculatedTotal = calculateTotal(cuadreVenta) + consumoPersonal + facturas;
        setFormData(prev => ({
            ...prev,
            efectivo: calculatedTotal
        }));
        setActiveTab('arqueo');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Calculate overall totals
    useEffect(() => {
        // Total Expected = Venta Bruta + Propina + Ingreso x Covers
        // Total Expected = Venta Bruta + Propina (Covers excluded per user rule)
        const expected = formData.ventaBruta + formData.propina;
        setVentaTotalEsperada(expected);

        // Total Collected = Suman of payment methods (Efectivo + Bancos)
        // Ingreso x Covers is NOT a payment method, it's a sales concept derived from Excel formula
        const collected =
            formData.efectivo +
            formData.datafonoDavid +
            formData.datafonoJulian +
            formData.transfBancolombia +
            formData.nequi +
            formData.rappi;

        setTotalRecaudado(collected);

        // Discrepancy
        setDescuadre(collected - expected);
    }, [formData]);

    const handleCurrencyChange = (name: string, value: number) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'visitas') {
            setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const openDetailModal = (field: keyof typeof paymentDetails, title: string) => {
        setActiveDetailField(field);
        setModalTitle(title);
    };

    const handleAddDetail = (amount: number) => {
        if (activeDetailField) {
            setPaymentDetails(prev => ({
                ...prev,
                [activeDetailField]: [...prev[activeDetailField], amount]
            }));
        }
    };

    const handleRemoveDetail = (index: number) => {
        if (activeDetailField) {
            setPaymentDetails(prev => ({
                ...prev,
                [activeDetailField]: prev[activeDetailField].filter((_, i) => i !== index)
            }));
        }
    };

    const handleFillMockData = () => {
        const mockDate = getLocalDateISO();

        // Form Data
        setFormData({
            fecha: mockDate,
            ventaBruta: 1500000,
            propina: 120000,
            efectivo: 850000,
            datafonoDavid: 300000,
            datafonoJulian: 200000,
            transfBancolombia: 150000,
            nequi: 100000,
            rappi: 20000,
            ingresoCovers: 50000,
            cajero: 'Simulador Test',
            visitas: 45
        });

        // Payment Details
        setPaymentDetails({
            nequi: [60000, 40000],
            transfBancolombia: [150000]
        });

        // Base Caja (conteo físico simula una base de $800.000)
        setBaseCaja({
            '50': 0, '100': 0, '200': 0, '500': 0, '1000': 0,
            '2000': 0, '5000': 0, '10000': 10, '20000': 10, '50000': 6, '100000': 2
        });

        // Cuadre Venta (conteo físico simula $850.000 recaudados)
        setCuadreVenta({
            '50': 0, '100': 0, '200': 0, '500': 0, '1000': 0,
            '2000': 0, '5000': 10, '10000': 20, '20000': 20, '50000': 4, '100000': 0
        });

        setConsumoPersonal(15000);
        setFacturas(35000);

        setAlertConfig({
            isOpen: true,
            title: 'Simulación Activada',
            message: 'Se han cargado datos de prueba en todos los campos. ¡Ya puedes intentar guardar!',
            type: 'success'
        });
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
    };

    const handleExportPDF = () => {
        if (!confirmationData) return;

        const doc = new jsPDF();
        const { summary, ventaEsperada, totalRecaudado, descuadre } = confirmationData;

        // Header
        doc.setFontSize(22);
        doc.setTextColor(40);
        doc.text("Resumen de Arqueo de Caja", 105, 20, { align: "center" });

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Fecha: ${summary.fecha}`, 20, 35);
        doc.text(`Cajero: ${summary.cajero}`, 20, 42);
        doc.text(`Visitas: ${summary.visitas}`, 20, 49);

        // Tabla de Resumen
        autoTable(doc, {
            startY: 55,
            head: [['Concepto', 'Monto']],
            body: [
                ['Ingreso Covers', formatCurrency(summary.ingresoCovers)],
                ['-----------------------', '-----------------------'],
                ['Efectivo', formatCurrency(summary.efectivo)],
                ['Datafono David', formatCurrency(summary.datafonoDavid)],
                ['Datafono Julián', formatCurrency(summary.datafonoJulian)],
                ['Transferencia Bancolombia', formatCurrency(summary.transfBancolombia)],
                ['Nequi', formatCurrency(summary.nequi)],
                ['Rappi', formatCurrency(summary.rappi)],
                ['-----------------------', '-----------------------'],
                ['VENTA ESPERADA', formatCurrency(ventaEsperada)],
                ['TOTAL RECAUDADO', formatCurrency(totalRecaudado)],
                ['DESCUADRE FINAL', formatCurrency(descuadre)],
            ],
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 10, cellPadding: 3 }
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY || 150;
        doc.setFontSize(10);
        doc.text("Generado automáticamente por Antigravity System", 105, finalY + 20, { align: "center" });

        doc.save(`Arqueo_${summary.fecha}_${summary.cajero}.pdf`);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Mostrar modal de confirmación con el resultado completo
        setConfirmationData({
            descuadre,
            ventaEsperada: ventaTotalEsperada,
            totalRecaudado,
            summary: { ...formData }
        });
        setShowConfirmation(true);
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleConfirmSave = async () => {
        setIsSaving(true);
        try {
            console.log('Iniciando guardado de arqueo...');
            // User Request: Guardar detalle de conteo de base y cuadre
            const dataToSave = {
                ...formData,
                baseDetail: baseCaja,
                cuadreDetail: cuadreVenta
            };
            const result = await onSave(dataToSave, totalRecaudado);
            console.log('Resultado de guardado:', result);

            if (result !== false) {
                // Si el arqueo se guardó (result es string ID o true), procedemos.
                // Si es string, es el ID del nuevo arqueo.
                // Si es true (caso legacy o update parcial), intentamos usar una referencia fallback.
                const arqueoId = typeof result === 'string' ? result : `legacy-${Date.now()}`;

                // Guardar transferencias automáticas vinculadas relacionalmente
                try {
                    const transfersToSave: TransferRecord[] = [];
                    const timestamp = new Date().toISOString();
                    const date = formData.fecha;

                    // ID Determinístico: vincula la transferencia al arqueo de forma única.
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
                    if (paymentDetails.nequi.length > 0) {
                        paymentDetails.nequi.forEach((amount, i) => {
                            if (amount > 0) transfersToSave.push(createRecord(amount, 'nequi', i));
                        });
                    } else if (Number(formData.nequi) > 0) {
                        transfersToSave.push(createRecord(formData.nequi, 'nequi'));
                    }

                    // Bancolombia
                    if (paymentDetails.transfBancolombia.length > 0) {
                        paymentDetails.transfBancolombia.forEach((amount, i) => {
                            if (amount > 0) transfersToSave.push(createRecord(amount, 'bancolombia', i));
                        });
                    } else if (Number(formData.transfBancolombia) > 0) {
                        transfersToSave.push(createRecord(formData.transfBancolombia, 'bancolombia'));
                    }

                    if (transfersToSave.length > 0) {
                        console.log(`Guardando ${transfersToSave.length} registros de transferencia automáticos:`, transfersToSave);
                        await Promise.all(transfersToSave.map(t => FirestoreService.saveTransfer(t)));
                    } else {
                        console.log('No hay transferencias válidas (> 0) para guardar.');
                    }
                } catch (err) {
                    console.error('Error guardando transferencias automáticas:', err);
                    // No bloqueamos el éxito del arqueo si fallan las transferencias, pero logueamos
                }

                // Clear storage on success
                console.log('Limpiando localStorage y estados...');
                Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));

                // Reset estados locales para evitar persistencia visual de datos guardados
                setBaseCaja({
                    '50': 0, '100': 0, '200': 0, '500': 0, '1000': 0,
                    '2000': 0, '5000': 0, '10000': 0, '20000': 0, '50000': 0, '100000': 0
                });
                setCuadreVenta({
                    '50': 0, '100': 0, '200': 0, '500': 0, '1000': 0,
                    '2000': 0, '5000': 0, '10000': 0, '20000': 0, '50000': 0, '100000': 0
                });
                setConsumoPersonal(0);
                setFacturas(0);

                // User Request: Purga automática (mantenemos solo 2 días)
                await FirestoreService.autoPurgeOldData();

                setShowConfirmation(false);
            } else {
                // Si falló (retornó false), mantenemos el modal abierto o mostramos alerta (la alerta ya la muestra App)
                // Opcionalmente cerramos el modal de confirmación para que vea el error
                setShowConfirmation(false);
            }
        } catch (error) {
            console.error('Error en handleConfirmSave:', error);
            setShowConfirmation(false);
        } finally {
            setIsSaving(false);
        }
    };

    // Calculator totals
    const totalBaseCaja = calculateTotal(baseCaja);
    const totalCuadreVenta = calculateTotal(cuadreVenta);
    const totalFinalCuadre = totalCuadreVenta + consumoPersonal + facturas;

    const updateDenomination = (
        setter: React.Dispatch<React.SetStateAction<Record<string, number>>>,
        denomination: string,
        value: string
    ) => {
        const numValue = parseInt(value) || 0;
        setter(prev => ({ ...prev, [denomination]: numValue }));
    };

    // Batch import handler
    const handleBatchImport = (rows: ParsedRow[]) => {
        let imported = 0;
        for (const row of rows) {
            if (row.isValid) {
                const totalRecaudado = calculateTotalRecaudado(row.data);
                onSave(row.data, totalRecaudado);
                imported++;
            }
        }
        setShowImportModal(false);
        setShowImportModal(false);
        setAlertConfig({
            isOpen: true,
            title: 'Importación Exitosa',
            message: `✅ Se importaron ${imported} registros exitosamente.`,
            type: 'success'
        });
    };

    return (
        <div className={isDarkMode ? 'dark' : ''}>
            <div className="w-full max-w-full lg:max-w-[98%] mx-auto pb-16 sm:pb-20 px-2 sm:px-4 overflow-x-hidden min-h-screen transition-colors duration-300 dark:bg-slate-900">
                <PaymentDetailModal
                    isOpen={!!activeDetailField}
                    onClose={() => setActiveDetailField(null)}
                    title={modalTitle}
                    items={activeDetailField ? paymentDetails[activeDetailField] : []}
                    onAddItem={handleAddDetail}
                    onRemoveItem={handleRemoveDetail}
                    useMonoFont={useMonoFont}
                />

                <AlertModal
                    isOpen={alertConfig.isOpen}
                    onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type}
                    onConfirm={alertConfig.onConfirm}
                    confirmText={alertConfig.confirmText}
                    cancelText={alertConfig.cancelText}
                    showCancel={alertConfig.showCancel}
                />

                {/* Header Responsivo */}
                <header className="mb-4 sm:mb-6 pt-2">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors duration-300">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-primary/10 text-primary p-1.5 rounded-lg">
                                    <ClipboardDocumentListIcon className="h-5 w-5" />
                                </span>
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Arqueo de Caja</h2>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium ml-1">Control diario de efectivo y cierres.</p>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                                title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                            >
                                {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                            </button>

                            <button
                                onClick={handleFillMockData}
                                className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors flex items-center gap-2"
                                title="Llenar con datos de prueba"
                            >
                                <ArrowPathIcon className="h-5 w-5" />
                                <span className="hidden sm:inline font-bold text-xs uppercase tracking-wider">Simular Arqueo</span>
                            </button>

                            <button
                                onClick={() => {
                                    setAlertConfig({
                                        isOpen: true,
                                        type: 'warning',
                                        title: 'Cerrar Sesión',
                                        message: '¿Estás seguro que deseas cerrar sesión?',
                                        confirmText: 'Sí, Salir',
                                        showCancel: true,
                                        onConfirm: () => {
                                            setAlertConfig(prev => ({ ...prev, isOpen: false }));
                                            logoutLocal();
                                            window.location.href = '/';
                                        }
                                    });
                                }}
                                className="w-full sm:w-auto px-4 py-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 hover:text-primary transition-all font-semibold text-sm flex items-center justify-center gap-2 group active:scale-95"
                            >
                                <span>Cerrar Sesión</span>
                                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Tabs de Navegación Estilizadas */}
                    <div className="mt-4 flex p-1.5 bg-gray-100/80 dark:bg-slate-800/80 rounded-xl overflow-x-auto no-scrollbar gap-1 sm:gap-0">
                        <button
                            type="button"
                            onClick={() => setActiveTab('calculadora')}
                            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'calculadora'
                                ? 'bg-white dark:bg-slate-700 text-primary dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-slate-700/50 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            <BanknotesIcon className="h-5 w-5" /> Calculadora
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('arqueo')}
                            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'arqueo'
                                ? 'bg-white dark:bg-slate-700 text-primary dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-slate-700/50 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            <ClipboardDocumentListIcon className="h-5 w-5" /> Formulario
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('transferencias')}
                            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'transferencias'
                                ? 'bg-white dark:bg-slate-700 text-primary dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-slate-700/50 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            <ArrowsRightLeftIcon className="h-5 w-5" /> Transferencias
                        </button>
                        {userRole === 'admin' && (
                            <button
                                type="button"
                                onClick={() => setActiveTab('historial')}
                                className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'historial'
                                    ? 'bg-white dark:bg-slate-700 text-primary dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-slate-700/50 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                            >
                                <CalendarDaysIcon className="h-5 w-5" /> Historial
                            </button>
                        )}
                    </div>
                </header >

                {/* Tab Content: Transferencias */}
                {
                    activeTab === 'transferencias' && (
                        <div className="pb-24 sm:pb-0 animate-fadeIn">
                            <TransfersView />
                        </div>
                    )
                }

                {/* Tab Content: Calculadora */}
                {
                    activeTab === 'calculadora' && (
                        <div className="space-y-6 sm:space-y-6 pb-24 sm:pb-0">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">

                                {/* Base de Caja Component */}
                                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-secondary/50 dark:border-secondary/30 overflow-hidden">
                                    <div className="bg-secondary/20 dark:bg-secondary/10 border-b border-secondary/30 p-3 flex justify-between items-center px-4">
                                        <h3 className="font-bold text-dark-text dark:text-white flex items-center gap-2">
                                            <span className="w-2 h-6 bg-secondary rounded-full inline-block"></span>
                                            BASE DE CAJA
                                        </h3>
                                        <div className="text-right">
                                            <span className="text-[10px] uppercase text-dark-text/60 dark:text-gray-400 font-bold block">Total Base</span>
                                            <span className="text-lg font-black text-dark-text dark:text-white leading-none">{formatCurrency(totalBaseCaja)}</span>
                                        </div>
                                    </div>

                                    <div className="p-0">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-gray-400 text-xs uppercase">
                                                <tr>
                                                    <th className="py-2 px-3 text-left font-semibold">Denom.</th>
                                                    <th className="py-2 px-1 text-center font-semibold">Cant.</th>
                                                    <th className="py-2 px-3 text-right font-semibold">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                                                {Object.keys(baseCaja).map((denom, idx) => (
                                                    <tr key={denom} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/30 dark:bg-slate-900/30'}>
                                                        <td className={`py-2 px-3 ${useMonoFont ? 'font-mono' : ''} font-medium text-gray-600 dark:text-gray-300`}>{formatCurrency(parseInt(denom))}</td>
                                                        <td className="py-1 px-1 text-center">
                                                            <div className="relative inline-block w-full max-w-[80px]">
                                                                <input
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    min="0"
                                                                    value={baseCaja[denom] || ''}
                                                                    onChange={(e) => updateDenomination(setBaseCaja, denom, e.target.value)}
                                                                    className="w-full text-center py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary outline-none font-bold text-dark-text dark:text-white text-base shadow-sm transition-all placeholder:font-normal placeholder:text-gray-300"
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className={`py-2 px-3 text-right ${useMonoFont ? 'font-mono' : ''} font-bold text-gray-800 dark:text-white`}>
                                                            {formatCurrency(parseInt(denom) * (baseCaja[denom] || 0))}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Cuadre de Venta Component */}
                                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-light-text/30 dark:border-light-text/20 overflow-hidden">
                                    <div className="bg-light-text/10 dark:bg-light-text/5 border-b border-light-text/20 p-3 flex justify-between items-center px-4">
                                        <h3 className="font-bold text-light-text dark:text-light-text flex items-center gap-2">
                                            <span className="w-2 h-6 bg-light-text rounded-full inline-block"></span>
                                            CUADRE DE VENTA
                                        </h3>
                                        <div className="text-right">
                                            <span className="text-[10px] uppercase text-light-text dark:text-light-text/80 font-bold block">Total Recaudado</span>
                                            <span className="text-xl font-black text-light-text dark:text-white leading-none">{formatCurrency(totalFinalCuadre)}</span>
                                        </div>
                                    </div>

                                    <div className="p-0">
                                        <table className="w-full mb-2">
                                            <thead className="bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-gray-400 text-xs uppercase">
                                                <tr>
                                                    <th className="py-2 px-3 text-left font-semibold">Denom.</th>
                                                    <th className="py-2 px-1 text-center font-semibold">Cant.</th>
                                                    <th className="py-2 px-3 text-right font-semibold">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                                                {Object.keys(cuadreVenta).map((denom, idx) => (
                                                    <tr key={denom} className={idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/30 dark:bg-slate-900/30'}>
                                                        <td className={`py-2 px-3 ${useMonoFont ? 'font-mono' : ''} font-medium text-gray-600 dark:text-gray-300`}>{formatCurrency(parseInt(denom))}</td>
                                                        <td className="py-1 px-1 text-center">
                                                            <div className="relative inline-block w-full max-w-[80px]">
                                                                <input
                                                                    type="number"
                                                                    inputMode="numeric"
                                                                    min="0"
                                                                    value={cuadreVenta[denom] || ''}
                                                                    onChange={(e) => updateDenomination(setCuadreVenta, denom, e.target.value)}
                                                                    className="w-full text-center py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-light-text focus:border-light-text outline-none font-bold text-dark-text dark:text-white text-base shadow-sm transition-all placeholder:font-normal placeholder:text-gray-300"
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className={`py-2 px-3 text-right ${useMonoFont ? 'font-mono' : ''} font-bold text-gray-800 dark:text-white`}>
                                                            {formatCurrency(parseInt(denom) * (cuadreVenta[denom] || 0))}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Extras Section */}
                                        <div className="p-4 bg-gray-50/50 dark:bg-slate-900/50 space-y-3 border-t border-gray-100 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <label className="flex-1 text-sm font-medium text-gray-600 dark:text-gray-300">Consumo Personal</label>
                                                <div className="relative w-40">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                                    <input
                                                        type="number"
                                                        inputMode="numeric"
                                                        min="0"
                                                        value={consumoPersonal || ''}
                                                        onChange={(e) => setConsumoPersonal(parseInt(e.target.value) || 0)}
                                                        className="w-full text-right py-2 pl-6 pr-3 border border-red-200 dark:border-red-900 rounded-lg focus:ring-2 focus:ring-red-400 outline-none font-bold text-red-600 dark:text-red-400 bg-white dark:bg-slate-700"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <label className="flex-1 text-sm font-medium text-gray-600 dark:text-gray-300">Facturas / Gastos</label>
                                                <div className="relative w-40">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                                                    <input
                                                        type="number"
                                                        inputMode="numeric"
                                                        min="0"
                                                        value={facturas || ''}
                                                        onChange={(e) => setFacturas(parseInt(e.target.value) || 0)}
                                                        className="w-full text-right py-2 pl-6 pr-3 border border-blue-200 dark:border-blue-900 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-700"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Botón Flotante en Móvil */}
                            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] sm:static sm:bg-transparent sm:border-0 sm:shadow-none sm:p-0 z-40">
                                <button
                                    type="button"
                                    onClick={handleSendToArqueo}
                                    className="w-full sm:w-auto mx-auto px-6 py-4 bg-primary text-white text-lg font-bold rounded-xl shadow-lg hover:bg-primary/90 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                                >
                                    <span>Enviar a Arqueo</span>
                                    <div className="bg-white/20 px-3 py-1 rounded-lg text-sm font-mono tracking-wide">
                                        {formatCurrency(totalFinalCuadre)}
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </button>
                            </div>
                        </div>
                    )
                }



                {/* Tab Content: Historial */}
                {
                    activeTab === 'historial' && (
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-primary dark:text-blue-400">Historial de Arqueos</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowImportModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 text-primary dark:text-blue-400 font-bold rounded-lg border border-primary/20 dark:border-blue-400/20 hover:bg-primary/5 dark:hover:bg-blue-400/10 transition-colors shadow-sm"
                                    >
                                        <ArrowUpTrayIcon className="h-4 w-4" /> Importar Excel
                                    </button>

                                    <div className="relative">
                                        <button
                                            onClick={() => setShowExportOptions(!showExportOptions)}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                                        >
                                            <ArrowDownTrayIcon className="h-4 w-4" />
                                            Exportar
                                        </button>

                                        {showExportOptions && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase p-3 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">Formato de salida</div>
                                                <button
                                                    onClick={() => { tableRef.current?.exportToExcel(); setShowExportOptions(false); }}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 transition-colors flex items-center gap-2"
                                                >
                                                    <ChartBarIcon className="h-4 w-4" /> Excel (.xlsx)
                                                </button>
                                                <button
                                                    onClick={() => { tableRef.current?.exportToPDF(); setShowExportOptions(false); }}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-400 transition-colors flex items-center gap-2"
                                                >
                                                    <ClipboardDocumentListIcon className="h-4 w-4" /> Reporte PDF
                                                </button>
                                                <button
                                                    onClick={() => { tableRef.current?.exportToCSV(); setShowExportOptions(false); }}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
                                                >
                                                    <TagIcon className="h-4 w-4" /> Archivo CSV
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <ArqueosTable
                                ref={tableRef}
                                arqueos={arqueos}
                                onUpdate={onUpdateArqueo}
                                onDelete={onDeleteArqueo}
                                userRole={userRole}
                            />

                            {/* Modal de Importación */}
                            {showImportModal && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
                                        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                            <h3 className="text-xl font-bold text-dark-text dark:text-white flex items-center gap-2">
                                                <ArrowUpTrayIcon className="h-6 w-6 text-primary" /> Importar Arqueos desde Excel
                                            </h3>
                                            <button
                                                onClick={() => setShowImportModal(false)}
                                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="p-4 sm:p-6 overflow-y-auto">
                                            <ExcelImportTab onBatchImport={handleBatchImport} />
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 rounded-b-2xl flex justify-end">
                                            <button
                                                onClick={() => setShowImportModal(false)}
                                                className="px-6 py-2 text-gray-600 dark:text-gray-300 font-semibold hover:text-gray-800 dark:hover:text-white transition-colors"
                                            >
                                                Cerrar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }

                {/* Tab Content: Arqueo Form */}
                {
                    activeTab === 'arqueo' && (
                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                            {/* Info General */}
                            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                <h3 className="text-base sm:text-lg font-semibold text-primary dark:text-blue-400 mb-3 sm:mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Información General</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Fecha</label>
                                        <input
                                            type="date"
                                            name="fecha"
                                            value={formData.fecha}
                                            onChange={handleSimpleChange}
                                            className="w-full py-3 sm:py-2.5 px-3 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-gray-900 dark:text-white dark:bg-slate-700 shadow-sm transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Cajero</label>
                                        <input
                                            type="text"
                                            name="cajero"
                                            value={formData.cajero}
                                            onChange={handleSimpleChange}
                                            placeholder="Nombre del responsable"
                                            className="w-full py-3 sm:py-2.5 px-3 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-gray-900 dark:text-white dark:bg-slate-700 shadow-sm transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Total Visitas (Personas)</label>
                                        <input
                                            type="number"
                                            name="visitas"
                                            value={formData.visitas || ''}
                                            onChange={handleSimpleChange}
                                            className="w-full py-3 sm:py-2.5 px-3 text-base sm:text-sm rounded-xl border border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-gray-900 dark:text-white dark:bg-slate-700 shadow-sm transition-all"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>


                            {/* Ventas y Esperado */}
                            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-3 sm:mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">
                                    <h3 className="text-base sm:text-lg font-semibold text-primary dark:text-blue-400">Ventas del Sistema (Esperado)</h3>
                                    <div className="text-right">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold block">Total Esperado (Venta + Propina)</span>
                                        <span className="text-lg font-bold text-primary dark:text-blue-400">{formatCurrency(ventaTotalEsperada)}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <CurrencyInput
                                        label="Covers (Informativo)"
                                        name="ingresoCovers"
                                        value={formData.ingresoCovers}
                                        onChange={handleCurrencyChange}
                                        sublabel="No suma al Total Esperado"
                                        useMonoFont={useMonoFont}
                                    />
                                    <CurrencyInput
                                        label="Venta POS"
                                        name="ventaBruta"
                                        value={formData.ventaBruta}
                                        onChange={handleCurrencyChange}
                                        sublabel="Venta reportada por el sistema"
                                        useMonoFont={useMonoFont}
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                                    <CurrencyInput
                                        label="Propina"
                                        name="propina"
                                        value={formData.propina}
                                        onChange={handleCurrencyChange}
                                        useMonoFont={useMonoFont}
                                    />
                                </div>
                            </div>

                            {/* Medios de Pago */}
                            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
                                <h3 className="text-base sm:text-lg font-semibold text-light-text dark:text-blue-400 mb-3 sm:mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">Medios de Pago (Recaudado)</h3>
                                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                    <CurrencyInput
                                        label="Efectivo Total"
                                        name="efectivo"
                                        value={formData.efectivo}
                                        onChange={handleCurrencyChange}
                                        readOnly={true}
                                        onDetailClick={() => setActiveTab('calculadora')}
                                        sublabel={<><ArrowPathIcon className="h-4 w-4 inline-block mr-1 text-gray-400" /> Sincronizado desde Calculadora de Efectivo</>}
                                        useMonoFont={useMonoFont}
                                    />
                                </div>
                                <div className="mt-3 sm:mt-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <CurrencyInput
                                            label="Datáfono David"
                                            name="datafonoDavid"
                                            value={formData.datafonoDavid}
                                            onChange={handleCurrencyChange}
                                            useMonoFont={useMonoFont}
                                        />
                                        <CurrencyInput
                                            label="Datáfono Julián"
                                            name="datafonoJulian"
                                            value={formData.datafonoJulian}
                                            onChange={handleCurrencyChange}
                                            useMonoFont={useMonoFont}
                                        />
                                        <CurrencyInput
                                            label="Transf. Bancolombia"
                                            name="transfBancolombia"
                                            value={formData.transfBancolombia}
                                            onChange={handleCurrencyChange}
                                            onDetailClick={() => openDetailModal('transfBancolombia', 'Transf. Bancolombia')}
                                            readOnly={true}
                                            useMonoFont={useMonoFont}
                                        />
                                        <CurrencyInput
                                            label="Nequi"
                                            name="nequi"
                                            value={formData.nequi}
                                            onChange={handleCurrencyChange}
                                            onDetailClick={() => openDetailModal('nequi', 'Nequi')}
                                            readOnly={true}
                                            useMonoFont={useMonoFont}
                                        />
                                    </div>
                                    <CurrencyInput
                                        label="Rappi"
                                        name="rappi"
                                        value={formData.rappi}
                                        onChange={handleCurrencyChange}
                                        useMonoFont={useMonoFont}
                                    />
                                </div>
                                <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-light-text/10 dark:bg-light-text/5 rounded-lg flex justify-between items-center">
                                    <span className="text-xs sm:text-sm font-semibold text-light-text dark:text-blue-400">Total Recaudado</span>
                                    <span className="text-base sm:text-lg font-bold text-light-text dark:text-blue-400">{formatCurrency(totalRecaudado)}</span>
                                </div>
                            </div>

                            <div className="pt-2 sticky bottom-4 z-30">
                                <button
                                    type="submit"
                                    className="w-full py-4 sm:py-4 bg-gray-900 hover:bg-black text-white text-lg font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all transform active:scale-[0.98] focus:ring-4 focus:ring-gray-300 flex justify-center items-center gap-2"
                                >
                                    <span>Finalizar Arqueo</span>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </button>
                            </div>
                        </form>
                    )
                }

                {/* Modal de Confirmaci\u00f3n del Resultado Optimization */}
                {
                    showConfirmation && confirmationData && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                            <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border-t-8 ${confirmationData.descuadre === 0 ? 'border-primary' : confirmationData.descuadre > 0 ? 'border-secondary' : 'border-red-500'}`}>

                                <div className="p-6 sm:p-8">
                                    <h2 className="text-2xl sm:text-3xl font-black text-center text-gray-800 dark:text-white mb-6 tracking-tight">
                                        Resultado del Arqueo
                                    </h2>

                                    {/* Resumen de Totales */}
                                    <div className="space-y-3 mb-6">
                                        <div className="flex justify-between items-center p-4 bg-gray-50/80 dark:bg-slate-700/80 rounded-2xl border border-gray-100 dark:border-slate-600">
                                            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Esperado</span>
                                            <span className="text-lg font-bold text-gray-800 dark:text-white font-mono tracking-tight">{formatCurrency(confirmationData.ventaEsperada)}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-gray-50/80 dark:bg-slate-700/80 rounded-2xl border border-gray-100 dark:border-slate-600">
                                            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Recaudado</span>
                                            <span className="text-lg font-bold text-gray-800 dark:text-white font-mono tracking-tight">{formatCurrency(confirmationData.totalRecaudado)}</span>
                                        </div>
                                    </div>

                                    {/* Descuadre */}
                                    <div className={`py-8 px-6 rounded-2xl mb-8 flex flex-col items-center justify-center ${confirmationData.descuadre === 0 ? 'bg-primary/5 dark:bg-primary/10' : confirmationData.descuadre > 0 ? 'bg-secondary/10 dark:bg-secondary/5' : 'bg-red-50 dark:bg-red-900/10'}`}>
                                        <span className="text-xs font-bold text-gray-400 dark:text-gray-300 uppercase tracking-widest mb-2">Descuadre Final</span>
                                        <p className={`text-4xl sm:text-5xl font-black mb-3 tracking-tighter ${confirmationData.descuadre === 0 ? 'text-primary dark:text-blue-400' : confirmationData.descuadre > 0 ? 'text-dark-text dark:text-white' : 'text-red-500'}`}>
                                            {formatCurrency(confirmationData.descuadre)}
                                        </p>
                                        <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm flex items-center gap-1.5 ${confirmationData.descuadre === 0 ? 'bg-primary/10 text-primary dark:text-blue-400' : confirmationData.descuadre > 0 ? 'bg-secondary/30 text-dark-text dark:text-white' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                                            {confirmationData.descuadre === 0
                                                ? <><CheckCircleIcon className="h-5 w-5" /> Cuadre Perfecto</>
                                                : confirmationData.descuadre > 0
                                                    ? <><BanknotesIcon className="h-5 w-5" /> Sobrante</>
                                                    : <><ExclamationTriangleIcon className="h-5 w-5" /> Faltante</>
                                            }
                                        </div>
                                    </div>

                                    {/* Resumen Detallado */}
                                    <div className="bg-gray-50/50 dark:bg-slate-900/50 rounded-2xl p-4 mb-6 border border-gray-100 dark:border-slate-700">
                                        <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 text-center">Desglose de Medios de Pago</h4>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                            <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-1">
                                                <span className="text-gray-500">Efectivo:</span>
                                                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(confirmationData.summary.efectivo)}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-1">
                                                <span className="text-gray-500">Nequi:</span>
                                                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(confirmationData.summary.nequi)}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-1">
                                                <span className="text-gray-500">Bancol.:</span>
                                                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(confirmationData.summary.transfBancolombia)}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-1">
                                                <span className="text-gray-500">Rappi:</span>
                                                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(confirmationData.summary.rappi)}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-1">
                                                <span className="text-gray-500">Dataf. 1:</span>
                                                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(confirmationData.summary.datafonoDavid)}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 dark:border-slate-800 pb-1">
                                                <span className="text-gray-500">Dataf. 2:</span>
                                                <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(confirmationData.summary.datafonoJulian)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botón Exportar PDF */}
                                    <button
                                        onClick={handleExportPDF}
                                        className="w-full mb-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-all border border-red-100 dark:border-red-900/40"
                                    >
                                        <ArrowDownTrayIcon className="h-4 w-4" />
                                        Descargar Resumen PDF
                                    </button>

                                    {/* Botones de Acción */}
                                    <div className="flex flex-col-reverse sm:flex-row gap-3">
                                        <button
                                            onClick={() => setShowConfirmation(false)}
                                            className="w-full sm:flex-1 py-3.5 px-4 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 active:bg-gray-100 transition-colors"
                                        >
                                            Volver y Revisar
                                        </button>
                                        <button
                                            onClick={handleConfirmSave}
                                            disabled={isSaving}
                                            className={`w-full sm:flex-1 py-3.5 px-4 font-bold rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 transform active:scale-95 ${isSaving ? 'bg-gray-400 cursor-not-allowed text-gray-100' : 'bg-gray-900 text-white hover:bg-black'}`}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    <span>Guardando...</span>
                                                </>
                                            ) : (
                                                <><span>Confirmar Cierre</span> <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
};

export default ArqueoPreview;
