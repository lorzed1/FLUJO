import { useState, useEffect } from 'react';
import { getLocalDateISO } from '../../../utils/dateUtils';
import { type ParsedRow } from '../../../utils/excelParser';
import { calculateArqueoTotals, calculateTotalRecaudado } from '../../../utils/arqueoCalculations';

// ============================================
// Types
// ============================================

export interface ArqueoData {
    fecha: string;
    ventaPos: number;
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
    noTrabajadores: number;
    baseDetail?: Record<string, number>;
    cuadreDetail?: Record<string, number>;
}

export interface PaymentDetails {
    nequi: number[];
    transfBancolombia: number[];
}

export interface ConfirmationData {
    descuadre: number;
    ventaEsperada: number;
    totalRecaudado: number;
    summary: ArqueoData;
}

// ============================================
// Constants
// ============================================

const STORAGE_KEYS = {
    FORM_DATA: 'arqueo_formData',
    PAYMENT_DETAILS: 'arqueo_paymentDetails',
    BASE_CAJA: 'arqueo_baseCaja',
    CUADRE_VENTA: 'arqueo_cuadreVenta',
    CONSUMO: 'arqueo_consumoPersonal',
    FACTURAS: 'arqueo_facturas',
    ACTIVE_TAB: 'arqueo_activeTab',
    THEME: 'arqueo_theme'
} as const;

const INITIAL_DENOMINATIONS: Record<string, number> = {
    '50': 0, '100': 0, '200': 0, '500': 0, '1000': 0,
    '2000': 0, '5000': 0, '10000': 0, '20000': 0, '50000': 0, '100000': 0
};

const INITIAL_FORM_DATA = (today: string): ArqueoData => ({
    fecha: today,
    ventaPos: 0,
    propina: 0,
    efectivo: 0,
    datafonoDavid: 0,
    datafonoJulian: 0,
    transfBancolombia: 0,
    nequi: 0,
    rappi: 0,
    ingresoCovers: 0,
    cajero: '',
    visitas: 0,
    noTrabajadores: 0
});

// ============================================
// Helpers
// ============================================

function getInitialState<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.warn(`Error reading ${key} from localStorage`, e);
        return fallback;
    }
}

export function calculateDenominationTotal(denominations: Record<string, number>): number {
    return Object.entries(denominations).reduce((total, [denom, qty]) => {
        return total + (parseInt(denom) * qty);
    }, 0);
}

export function formatCurrencyValue(val: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
}

// ============================================
// Hook
// ============================================

export function useArqueoForm() {
    // --- Form State ---
    const [formData, setFormData] = useState<ArqueoData>(() => {
        const today = getLocalDateISO();
        const fallback = INITIAL_FORM_DATA(today);
        const saved = getInitialState(STORAGE_KEYS.FORM_DATA, null);
        if (saved) {
            const merged = { ...fallback, ...saved, fecha: today };
            const numericFields = [
                'ventaPos', 'propina', 'efectivo', 'datafonoDavid', 'datafonoJulian',
                'transfBancolombia', 'nequi', 'rappi', 'ingresoCovers', 'visitas', 'noTrabajadores'
            ];
            numericFields.forEach(key => {
                if (typeof (merged as any)[key] !== 'number' || isNaN((merged as any)[key])) {
                    (merged as any)[key] = 0;
                }
            });
            return merged;
        }
        return fallback;
    });

    // --- Detail Modal State ---
    const [activeDetailField, setActiveDetailField] = useState<keyof PaymentDetails | null>(null);
    const [modalTitle, setModalTitle] = useState('');
    const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>(() =>
        getInitialState(STORAGE_KEYS.PAYMENT_DETAILS, { nequi: [], transfBancolombia: [] })
    );

    // --- Confirmation State ---
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // --- Calculator State ---
    const [isCalculatorExpanded, setIsCalculatorExpanded] = useState(false);
    const [baseCaja, setBaseCaja] = useState<Record<string, number>>(() =>
        getInitialState(STORAGE_KEYS.BASE_CAJA, { ...INITIAL_DENOMINATIONS })
    );
    const [cuadreVenta, setCuadreVenta] = useState<Record<string, number>>(() =>
        getInitialState(STORAGE_KEYS.CUADRE_VENTA, { ...INITIAL_DENOMINATIONS })
    );
    const [consumoPersonal, setConsumoPersonal] = useState(() => getInitialState(STORAGE_KEYS.CONSUMO, 0));
    const [facturas, setFacturas] = useState(() => getInitialState(STORAGE_KEYS.FACTURAS, 0));

    // --- Modals State ---
    const [showImportModal, setShowImportModal] = useState(false);
    const [showAccountingWizard, setShowAccountingWizard] = useState(false);

    // --- Alert State ---
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

    // --- Dark Mode ---
    const [isDarkMode, setIsDarkMode] = useState(() => getInitialState(STORAGE_KEYS.THEME, false));

    // --- Calculated Values ---
    const [ventaTotalEsperada, setVentaTotalEsperada] = useState(0);
    const [totalRecaudado, setTotalRecaudado] = useState(0);
    const [descuadre, setDescuadre] = useState(0);

    // Calculator totals
    const totalBaseCaja = calculateDenominationTotal(baseCaja);
    const totalCuadreVenta = calculateDenominationTotal(cuadreVenta);
    const totalFinalCuadre = totalCuadreVenta + consumoPersonal + facturas;

    // ============================================
    // Persistence Effects
    // ============================================
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.FORM_DATA, JSON.stringify(formData)); }, [formData]);
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.PAYMENT_DETAILS, JSON.stringify(paymentDetails)); }, [paymentDetails]);
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.BASE_CAJA, JSON.stringify(baseCaja)); }, [baseCaja]);
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.CUADRE_VENTA, JSON.stringify(cuadreVenta)); }, [cuadreVenta]);
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.CONSUMO, JSON.stringify(consumoPersonal)); }, [consumoPersonal]);
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.FACTURAS, JSON.stringify(facturas)); }, [facturas]);
    useEffect(() => { localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(isDarkMode)); }, [isDarkMode]);

    // Apply dark mode class to the root HTML element so it affects the entire page
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    // Sync payment detail sums into formData
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            nequi: paymentDetails.nequi.reduce((a, b) => a + b, 0),
            transfBancolombia: paymentDetails.transfBancolombia.reduce((a, b) => a + b, 0),
        }));
    }, [paymentDetails]);

    // Calculate overall totals
    useEffect(() => {
        const { ventaTotalEsperada: expected, totalRecaudado: collected, descuadre: diff } = calculateArqueoTotals(formData);

        setVentaTotalEsperada(expected);
        setTotalRecaudado(collected);
        setDescuadre(diff);
    }, [formData]);

    // ============================================
    // Handlers
    // ============================================

    const handleCurrencyChange = (name: string, value: number) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'visitas' || name === 'noTrabajadores') {
            setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const openDetailModal = (field: keyof PaymentDetails, title: string) => {
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

    const handleSendToArqueo = () => {
        const calculatedTotal = calculateDenominationTotal(cuadreVenta) + consumoPersonal + facturas;
        setFormData(prev => ({ ...prev, efectivo: calculatedTotal }));
        setIsCalculatorExpanded(false);
    };

    const updateDenomination = (
        setter: React.Dispatch<React.SetStateAction<Record<string, number>>>,
        denomination: string,
        value: string
    ) => {
        const numValue = parseInt(value) || 0;
        setter(prev => ({ ...prev, [denomination]: numValue }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setConfirmationData({
            descuadre,
            ventaEsperada: ventaTotalEsperada,
            totalRecaudado,
            summary: { ...formData }
        });
        setShowConfirmation(true);
    };

    const handleFillMockData = () => {
        const mockDate = getLocalDateISO();
        setFormData({
            fecha: mockDate, ventaPos: 1500000, propina: 120000,
            efectivo: 850000, datafonoDavid: 300000, datafonoJulian: 200000,
            transfBancolombia: 150000, nequi: 100000, rappi: 20000,
            ingresoCovers: 50000, cajero: 'Simulador Test', visitas: 45, noTrabajadores: 4
        });
        setPaymentDetails({ nequi: [60000, 40000], transfBancolombia: [150000] });
        setBaseCaja({ '50': 0, '100': 0, '200': 0, '500': 0, '1000': 0, '2000': 0, '5000': 0, '10000': 10, '20000': 10, '50000': 6, '100000': 2 });
        setCuadreVenta({ '50': 0, '100': 0, '200': 0, '500': 0, '1000': 0, '2000': 0, '5000': 10, '10000': 20, '20000': 20, '50000': 4, '100000': 0 });
        setConsumoPersonal(15000);
        setFacturas(35000);
        setAlertConfig({ isOpen: true, title: 'Simulación Activada', message: 'Se han cargado datos de prueba en todos los campos. ¡Ya puedes intentar guardar!', type: 'success' });
    };

    const resetForm = () => {
        const today = getLocalDateISO();
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        setBaseCaja({ ...INITIAL_DENOMINATIONS });
        setCuadreVenta({ ...INITIAL_DENOMINATIONS });
        setConsumoPersonal(0);
        setFacturas(0);
        setFormData(INITIAL_FORM_DATA(today));
        setPaymentDetails({ nequi: [], transfBancolombia: [] });
    };

    const handleBatchImport = (rows: ParsedRow[], onSave: (data: ArqueoData, total: number) => Promise<boolean | string> | void) => {
        let imported = 0;
        for (const row of rows) {
            if (row.isValid) {
                const total = calculateTotalRecaudado(row.data);
                onSave(row.data, total);
                imported++;
            }
        }
        setShowImportModal(false);
        setAlertConfig({
            isOpen: true,
            title: 'Importación Exitosa',
            message: `✅ Se importaron ${imported} registros exitosamente.`,
            type: 'success'
        });
    };

    return {
        // State
        formData,
        paymentDetails,
        activeDetailField,
        modalTitle,
        showConfirmation,
        confirmationData,
        isSaving,
        isCalculatorExpanded,
        baseCaja,
        cuadreVenta,
        consumoPersonal,
        facturas,
        showImportModal,
        showAccountingWizard,
        alertConfig,
        isDarkMode,

        // Calculated
        ventaTotalEsperada,
        totalRecaudado,
        descuadre,
        totalBaseCaja,
        totalCuadreVenta,
        totalFinalCuadre,

        // Setters (direct exposure for UI)
        setFormData,
        setShowConfirmation,
        setIsSaving,
        setIsCalculatorExpanded,
        setConsumoPersonal,
        setFacturas,
        setShowImportModal,
        setShowAccountingWizard,
        setAlertConfig,
        setIsDarkMode,
        setActiveDetailField,
        setBaseCaja,
        setCuadreVenta,

        // Handlers
        handleCurrencyChange,
        handleSimpleChange,
        openDetailModal,
        handleAddDetail,
        handleRemoveDetail,
        handleSendToArqueo,
        updateDenomination,
        handleSubmit,
        handleFillMockData,
        handleBatchImport,
        resetForm,

        // Constants
        STORAGE_KEYS,
    };
}
