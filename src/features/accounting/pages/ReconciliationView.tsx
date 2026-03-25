import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Modal } from '../../../components/ui/Modal';
import { FormGroup } from '../../../components/ui/FormGroup';
import { SmartDataTable, type Column } from '../../../components/ui/SmartDataTable';
import {
    ArrowsRightLeftIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    ClockIcon,
    XCircleIcon,
    SparklesIcon,
    DocumentTextIcon,
    WalletIcon,
    CheckIcon,
    XMarkIcon,
    Cog6ToothIcon,
    FunnelIcon,
    LinkIcon,
    CalendarDaysIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    ExclamationTriangleIcon,
    ArrowDownTrayIcon,
    ChatBubbleLeftEllipsisIcon,
    PencilSquareIcon,
} from '../../../components/ui/Icons';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel } from '../../../components/ui/DropdownMenu';
import {
    ReconciliationBankService,
    RECONCILIATION_ACCOUNTS,
    ReconciliationRecord,
    ReconciliationMatchResult,
    ReconciliationHistoryRow,
    ReconciliationConfig,
    InternalTransfer,
} from '../../../services/reconciliationBankService';

// =============================================
// HELPERS
// =============================================

const fmtDate = (d: string) => {
    if (!d) return '—';
    // Si viene en formato YYYY-MM-DD, extraer directamente para no iteractuar con la zona horaria del motor JS
    const isoMatch = d.split('T')[0].split('-');
    if (isoMatch.length === 3) {
        return `${isoMatch[2]}/${isoMatch[1]}/${isoMatch[0]}`;
    }
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${date.getUTCFullYear()}`;
};

const fmt = (n: number) =>
    n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const daysDiff = (d1: string, d2: string): number => {
    const t1 = new Date(d1).getTime();
    const t2 = new Date(d2).getTime();
    if (isNaN(t1) || isNaN(t2)) return 999;
    return Math.round(Math.abs(t2 - t1) / 86400000);
};

const ScorePill: React.FC<{ score: number }> = ({ score }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold ${
        score >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
        : score >= 70 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
    }`}>
        {score}%
    </span>
);

// =============================================
// TIPOS
// =============================================

interface MatchSuggestion {
    record: ReconciliationRecord;
    score: number;
    amountDiff: number;
    dateDiff: number;
    ruleInfo: string;
}

const getLocalConfig = <T,>(key: string, def: T): T => {
    if (typeof window === 'undefined') return def;
    try {
        const val = localStorage.getItem(`conciliacion_${key}`);
        return val ? JSON.parse(val) : def;
    } catch {
        return def;
    }
};

const setLocalConfig = (key: string, val: any) => {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(`conciliacion_${key}`, JSON.stringify(val)); } catch {}
};

type ActiveTab = 'conciliar' | 'historial' | 'transferencias';

interface ReverseMatch {
    accountId: string;
    accountLabel: string;
    record: ReconciliationRecord;
    alreadyConciliated: boolean;
}

type SourceColumn = 'fecha' | 'valor' | 'sucursal' | 'referencia' | 'descripcion' | 'doc_banco' | 'notas';
type TargetColumn = 'fecha' | 'valor' | 'cuenta' | 'contacto' | 'identificacion' | 'centro_costo' | 'documento' | 'descripcion' | 'notas';
type MatchColumn = 'fecha' | 'valor' | 'descripcion' | 'score' | 'diff_valor' | 'diff_dias' | 'notas';

const MATCH_COLS_DEFS: { key: MatchColumn; label: string }[] = [
    { key: 'fecha',       label: 'Fecha' },
    { key: 'valor',       label: 'Valor' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'score',       label: 'Confianza' },
    { key: 'diff_valor',  label: 'Dif. Valor' },
    { key: 'diff_dias',   label: 'Dif. Días' },
];

const SOURCE_COLS_DEFS: { key: SourceColumn; label: string }[] = [
    { key: 'fecha', label: 'Fecha' },
    { key: 'valor', label: 'Valor' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'sucursal', label: 'Sucursal' },
    { key: 'referencia', label: 'Referencia' },
    { key: 'doc_banco', label: 'Doc. Banco' },
    { key: 'notas', label: 'Notas' },
];

const TARGET_COLS_DEFS: { key: TargetColumn; label: string }[] = [
    { key: 'fecha', label: 'Fecha' },
    { key: 'valor', label: 'Valor' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'cuenta', label: 'Cuenta' },
    { key: 'contacto', label: 'Contacto' },
    { key: 'identificacion', label: 'Identificación' },
    { key: 'centro_costo', label: 'Centro de Costo' },
    { key: 'documento', label: 'Documento' },
    { key: 'notas', label: 'Notas' },
];

// Helper: obtener config ligada a cuenta
const getAccountConfig = <T,>(accountId: string, key: string, def: T): T => {
    if (typeof window === 'undefined') return def;
    try {
        const val = localStorage.getItem(`conciliacion_${accountId}_${key}`);
        return val !== null ? JSON.parse(val) : def;
    } catch { return def; }
};
const setAccountConfig = (accountId: string, key: string, val: any) => {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(`conciliacion_${accountId}_${key}`, JSON.stringify(val)); } catch {}
};

// =============================================
// COMPONENTE PRINCIPAL
// =============================================

export const ReconciliationView: React.FC = () => {
    // --- Cuenta ---
    const [selectedAccountId, setSelectedAccountId] = useState(() =>
        getLocalConfig('accountId', RECONCILIATION_ACCOUNTS[0]?.id || '')
    );
    const selectedAccount = useMemo(
        () => RECONCILIATION_ACCOUNTS.find(a => a.id === selectedAccountId),
        [selectedAccountId]
    );

    // --- Datos ---
    const [sourceRecords, setSourceRecords] = useState<ReconciliationRecord[]>([]);
    const [targetRecords, setTargetRecords] = useState<ReconciliationRecord[]>([]);
    const [conciliatedIds, setConciliatedIds] = useState<Set<string>>(new Set());
    const [history, setHistory] = useState<ReconciliationHistoryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // --- Notas ---
    const [editingNoteRecord, setEditingNoteRecord] = useState<{ record: ReconciliationRecord; type: 'source' | 'target' } | null>(null);
    const [noteText, setNoteText] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    
    // --- Transferencias Internas ---
    const [internalTransfers, setInternalTransfers] = useState<InternalTransfer[]>([]);
    const [loadingTransfers, setLoadingTransfers] = useState(false);
    const [registeredTransferIds, setRegisteredTransferIds] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('conciliacion_registered_transfers');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    useEffect(() => {
        localStorage.setItem('conciliacion_registered_transfers', JSON.stringify(Array.from(registeredTransferIds)));
    }, [registeredTransferIds]);

    const toggleTransferRegistered = useCallback((id: string) => {
        setRegisteredTransferIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);
    // --- Historial UI ---
    const [historySearch, setHistorySearch] = useState('');
    const [historyDetailRow, setHistoryDetailRow] = useState<ReconciliationHistoryRow | null>(null);

    // --- Modo Invertido: búsqueda desde asientos contables hacia cuentas bancarias ---
    const [reverseMode, setReverseMode] = useState(false);
    // Registros target seleccionados en modo invertido (para búsqueda por suma)
    const [selectedReverseTargetIds, setSelectedReverseTargetIds] = useState<Set<string>>(new Set());
    // Registros de TODAS las cuentas bancarias: map cuenta_id -> registros
    const [allBankRecords, setAllBankRecords] = useState<Record<string, ReconciliationRecord[]>>({});
    const [loadingAllBanks, setLoadingAllBanks] = useState(false);

    // --- UI ---
    const [activeTab, setActiveTab] = useState<'conciliar' | 'historial' | 'transferencias'>('conciliar');
    const [settingsOpen, setSettingsOpen] = useState(false);

    // --- Filtro de fechas (por cuenta) ---
    const [dateFilterOpen, setDateFilterOpen] = useState(false);
    const [dateFrom, setDateFrom] = useState(() => getAccountConfig(selectedAccountId, 'dateFrom', ''));
    const [dateTo, setDateTo] = useState(() => getAccountConfig(selectedAccountId, 'dateTo', ''));

    // --- Filtro de flujo (por cuenta) ---
    const [flowFilter, setFlowFilter] = useState<'all' | 'income' | 'expense'>(
        () => getAccountConfig(selectedAccountId, 'flowFilter', 'all')
    );

    // --- Columnas (por cuenta) ---
    const [visibleSourceCols, setVisibleSourceCols] = useState<Record<SourceColumn, boolean>>(
        () => getAccountConfig(selectedAccountId, 'visibleSourceCols', {
            fecha: true, valor: true, descripcion: true, sucursal: false, referencia: false, doc_banco: false, notas: true
        })
    );
    const [visibleTargetCols, setVisibleTargetCols] = useState<Record<TargetColumn, boolean>>(
        () => getAccountConfig(selectedAccountId, 'visibleTargetCols', {
            fecha: true, valor: true, descripcion: true, cuenta: false, contacto: false, identificacion: false, centro_costo: false, documento: false, notas: true
        })
    );
    const [visibleMatchCols, setVisibleMatchCols] = useState<Record<MatchColumn, boolean>>(
        () => getAccountConfig(selectedAccountId, 'visibleMatchCols', {
            fecha: true, valor: true, descripcion: true, score: true, diff_valor: false, diff_dias: false, notas: false
        })
    );

    // --- Búsqueda (por cuenta) ---
    const [sourceSearch, setSourceSearch] = useState(() => getAccountConfig(selectedAccountId, 'sourceSearch', ''));
    const [targetSearch, setTargetSearch] = useState(() => getAccountConfig(selectedAccountId, 'targetSearch', ''));
    const [targetExcludeAccounts, setTargetExcludeAccounts] = useState(() => getAccountConfig(selectedAccountId, 'targetExcludeAccounts', ''));

    const uniqueAccounts = useMemo(() => {
        const set = new Set<string>();
        targetRecords.forEach(r => {
            if (r.raw?.cuenta) {
                set.add(r.raw.cuenta.toString().trim());
            }
        });
        return Array.from(set).sort();
    }, [targetRecords]);

    const excludedAccountsSet = useMemo(() => new Set(
        targetExcludeAccounts.split(',').map(s => s.trim()).filter(Boolean)
    ), [targetExcludeAccounts]);

    const toggleExcludedAccount = useCallback((account: string, checked: boolean) => {
        const newSet = new Set(excludedAccountsSet);
        if (checked) {
            newSet.add(account);
        } else {
            newSet.delete(account);
        }
        setTargetExcludeAccounts(Array.from(newSet).join(','));
    }, [excludedAccountsSet]);

    // --- Sospechosos / Registrados (por cuenta) ---
    const [showOnlySuspected, setShowOnlySuspected] = useState(false);
    const [showOnlyRegistered, setShowOnlyRegistered] = useState(false);
    const [suspectedIds, setSuspectedIds] = useState<Set<string>>(() => {
        try {
            const val = localStorage.getItem(`conciliacion_suspected_${selectedAccountId}`);
            return val ? new Set(JSON.parse(val) as string[]) : new Set();
        } catch { return new Set(); }
    });
    const [registeredIds, setRegisteredIds] = useState<Set<string>>(() => {
        try {
            const val = localStorage.getItem(`conciliacion_registered_${selectedAccountId}`);
            return val ? new Set(JSON.parse(val) as string[]) : new Set();
        } catch { return new Set(); }
    });

    // --- Persistir la cuenta seleccionada ---
    useEffect(() => setLocalConfig('accountId', selectedAccountId), [selectedAccountId]);

    // --- Al cambiar de cuenta: recargar TODOS los filtros y estados propios de esa cuenta ---
    // Usamos una ref para detectar cambio real (no el render inicial)
    const prevAccountRef = useRef(selectedAccountId);
    useEffect(() => {
        if (prevAccountRef.current === selectedAccountId) return;
        prevAccountRef.current = selectedAccountId;

        // Recargar filtros y configuraciones propias de la nueva cuenta
        setDateFrom(getAccountConfig(selectedAccountId, 'dateFrom', ''));
        setDateTo(getAccountConfig(selectedAccountId, 'dateTo', ''));
        setFlowFilter(getAccountConfig(selectedAccountId, 'flowFilter', 'all'));
        setVisibleSourceCols(getAccountConfig(selectedAccountId, 'visibleSourceCols', {
            fecha: true, valor: true, descripcion: true, sucursal: false, referencia: false, doc_banco: false, notas: true
        }));
        setVisibleTargetCols(getAccountConfig(selectedAccountId, 'visibleTargetCols', {
            fecha: true, valor: true, descripcion: true, cuenta: false, contacto: false, identificacion: false, centro_costo: false, documento: false, notas: true
        }));
        setVisibleMatchCols(getAccountConfig(selectedAccountId, 'visibleMatchCols', {
            fecha: true, valor: true, descripcion: true, score: true, diff_valor: false, diff_dias: false, notas: false
        }));
        setSourceSearch(getAccountConfig(selectedAccountId, 'sourceSearch', ''));
        setTargetSearch(getAccountConfig(selectedAccountId, 'targetSearch', ''));
        setTargetExcludeAccounts(getAccountConfig(selectedAccountId, 'targetExcludeAccounts', ''));

        // Limpiar estados de marcas
        try {
            const sVal = localStorage.getItem(`conciliacion_suspected_${selectedAccountId}`);
            setSuspectedIds(sVal ? new Set(JSON.parse(sVal) as string[]) : new Set());
            const rVal = localStorage.getItem(`conciliacion_registered_${selectedAccountId}`);
            setRegisteredIds(rVal ? new Set(JSON.parse(rVal) as string[]) : new Set());
        } catch {
            setSuspectedIds(new Set());
            setRegisteredIds(new Set());
        }

        // Resetear selecciones y filtros UI
        setShowOnlySuspected(false);
        setShowOnlyRegistered(false);
        setDateFilterOpen(false);
    }, [selectedAccountId]);

    // --- Persistir filtros por cuenta al cambiar ---
    useEffect(() => { setAccountConfig(selectedAccountId, 'dateFrom', dateFrom); }, [selectedAccountId, dateFrom]);
    useEffect(() => { setAccountConfig(selectedAccountId, 'dateTo', dateTo); }, [selectedAccountId, dateTo]);
    useEffect(() => { setAccountConfig(selectedAccountId, 'flowFilter', flowFilter); }, [selectedAccountId, flowFilter]);
    useEffect(() => { setAccountConfig(selectedAccountId, 'visibleSourceCols', visibleSourceCols); }, [selectedAccountId, visibleSourceCols]);
    useEffect(() => { setAccountConfig(selectedAccountId, 'visibleTargetCols', visibleTargetCols); }, [selectedAccountId, visibleTargetCols]);
    useEffect(() => { setAccountConfig(selectedAccountId, 'visibleMatchCols', visibleMatchCols); }, [selectedAccountId, visibleMatchCols]);
    useEffect(() => { setAccountConfig(selectedAccountId, 'sourceSearch', sourceSearch); }, [selectedAccountId, sourceSearch]);
    useEffect(() => { setAccountConfig(selectedAccountId, 'targetSearch', targetSearch); }, [selectedAccountId, targetSearch]);
    useEffect(() => { setAccountConfig(selectedAccountId, 'targetExcludeAccounts', targetExcludeAccounts); }, [selectedAccountId, targetExcludeAccounts]);

    // Persistir sospechosos/registrados por cuenta
    useEffect(() => {
        try { localStorage.setItem(`conciliacion_suspected_${selectedAccountId}`, JSON.stringify([...suspectedIds])); } catch {}
    }, [suspectedIds, selectedAccountId]);
    useEffect(() => {
        try { localStorage.setItem(`conciliacion_registered_${selectedAccountId}`, JSON.stringify([...registeredIds])); } catch {}
    }, [registeredIds, selectedAccountId]);



    // --- Resultados auto ---
    const [autoMatches, setAutoMatches] = useState<ReconciliationMatchResult[]>([]);
    const [rejectedMatchIndices, setRejectedMatchIndices] = useState<Set<number>>(new Set());

    // --- Vinculación manual: source seleccionado ---
    // --- Vinculación múltiple: registros source seleccionados ---
    const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());

    // --- Vinculación manual: target seleccionado (para confirmar par) ---
    const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

    // --- Hover cross-highlighting ---
    const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null);
    const [highlightedTargetIds, setHighlightedTargetIds] = useState<Set<string>>(new Set());

    // --- Config ---
    const [amountTolerance, setAmountTolerance] = useState(2000);
    const [dateMarginDays, setDateMarginDays] = useState(2);
    const config: ReconciliationConfig = useMemo(
        () => ({ amountTolerance, dateMarginDays }),
        [amountTolerance, dateMarginDays]
    );

    // --- Reversal ---
    const [reversingId, setReversingId] = useState<string | null>(null);
    const [reversalReason, setReversalReason] = useState('');

    // --- Modo Invertido: conciliación ---
    const [savingReverseMatchId, setSavingReverseMatchId] = useState<string | null>(null);

    // --- Refs ---
    const sourceScrollRef = useRef<HTMLDivElement>(null);
    const targetScrollRef = useRef<HTMLDivElement>(null);
    const sourceRowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
    const targetRowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
    /**
     * Alinea el target match a la misma posición Y en pantalla que el source.
     * SOLO mueve el scroll interno del panel target. NUNCA mueve la página.
     */
    const alignSourceAndTarget = (sourceId: string, targetId: string) => {
        const sourceRow = sourceRowRefs.current.get(sourceId);
        const targetRow = targetRowRefs.current.get(targetId);
        const targetContainer = targetScrollRef.current;

        if (!sourceRow || !targetRow || !targetContainer) return;

        // Posición actual del source en pantalla (el usuario acaba de hacer click aquí, está visible)
        const sourceScreenY = sourceRow.getBoundingClientRect().top;

        // Posición del target dentro de su contenedor de scroll
        const tcRect = targetContainer.getBoundingClientRect();
        const tRect = targetRow.getBoundingClientRect();
        const targetOffsetInScroll = tRect.top - tcRect.top + targetContainer.scrollTop;

        // Calcular scrollTop para que el targetRow quede en sourceScreenY
        // targetRow.screenY = targetOffsetInScroll - scrollTop + tcRect.top
        // queremos: sourceScreenY = targetOffsetInScroll - scrollTop + tcRect.top
        // => scrollTop = targetOffsetInScroll - (sourceScreenY - tcRect.top)
        const desiredScroll = targetOffsetInScroll - (sourceScreenY - tcRect.top);
        targetContainer.scrollTop = Math.max(0, desiredScroll);
    };

    // =============================================
    // CARGA
    // =============================================

    /** Cargar registros de TODAS las cuentas bancarias (solo para modo invertido) */
    const loadAllBankRecords = useCallback(async () => {
        if (loadingAllBanks) return;
        setLoadingAllBanks(true);
        try {
            const results = await Promise.all(
                RECONCILIATION_ACCOUNTS.map(acc =>
                    ReconciliationBankService.loadSourceRecords(acc).then(records => ({ id: acc.id, records }))
                )
            );
            const map: Record<string, ReconciliationRecord[]> = {};
            results.forEach(({ id, records }) => { map[id] = records; });
            setAllBankRecords(map);
        } catch (err) {
            console.error('Error cargando cuentas bancarias:', err);
        } finally {
            setLoadingAllBanks(false);
        }
    }, [loadingAllBanks]);

    const loadData = useCallback(async () => {
        if (!selectedAccount) return;
        setLoading(true);
        try {
            // Siempre cargamos todo para el historial consolidado y match cruzado
            if (Object.keys(allBankRecords).length === 0) {
                loadAllBankRecords();
            }

            const [source, target, ids, hist] = await Promise.all([
                ReconciliationBankService.loadSourceRecords(selectedAccount),
                ReconciliationBankService.loadAsientosContables(),
                ReconciliationBankService.getConciliatedIds(selectedAccount.table),
                ReconciliationBankService.getAllActiveHistory(),
            ]);
            setSourceRecords(source);
            setTargetRecords(target);
            setConciliatedIds(ids);
            setHistory(hist);
            setAutoMatches([]);
            setRejectedMatchIndices(new Set());
            setSelectedSourceIds(new Set());
            setSelectedTargetId(null);
        } catch (err) {
            console.error('Error cargando datos:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedAccount, allBankRecords, loadAllBankRecords]);

    /** Activar / desactivar modo invertido */
    const toggleReverseMode = useCallback(() => {
        setReverseMode(prev => {
            const next = !prev;
            if (next && Object.keys(allBankRecords).length === 0) {
                // Cargar todas las cuentas la primera vez que se activa
                loadAllBankRecords();
            }
            if (!next) {
                // Al desactivar, limpiar selección
                setSelectedReverseTargetIds(new Set());
            }
            return next;
        });
    }, [allBankRecords, loadAllBankRecords]);

    useEffect(() => { loadData(); }, [loadData]);
    
    // --- Handlers para Notas ---
    const openNoteModal = useCallback((record: ReconciliationRecord, type: 'source' | 'target') => {
        setEditingNoteRecord({ record, type });
        setNoteText(record.notes || '');
    }, []);

    const handleSaveNote = async () => {
        if (!editingNoteRecord) return;
        setSavingNote(true);
        try {
            const { record, type } = editingNoteRecord;
            let tableName = '';
            
            if (type === 'source') {
                tableName = selectedAccount?.table || '';
            } else {
                tableName = 'accounting_asientos_contables';
            }

            if (!tableName) return;

            await ReconciliationBankService.updateNote(tableName, record.id, noteText);
            
            // Actualizar localmente para feedback inmediato
            if (type === 'source') {
                setSourceRecords(prev => prev.map(r => r.id === record.id ? { ...r, notes: noteText } : r));
            } else {
                setTargetRecords(prev => prev.map(r => r.id === record.id ? { ...r, notes: noteText } : r));
            }
            
            setEditingNoteRecord(null);
        } catch (err) {
            console.error('Error al guardar nota:', err);
        } finally {
            setSavingNote(false);
        }
    };

    const loadTransfers = useCallback(async () => {
        setLoadingTransfers(true);
        try {
            const data = await ReconciliationBankService.findInternalTransfers();
            setInternalTransfers(data);
        } catch (err) {
            console.error('Error cargando transferencias:', err);
        } finally {
            setLoadingTransfers(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'transferencias') {
            loadTransfers();
        }
    }, [activeTab, loadTransfers]);

    const filteredTransfers = useMemo(() => {
        let result = internalTransfers;
        if (dateFrom && dateTo) {
            result = result.filter(t => t.date >= dateFrom && t.date <= dateTo);
        }
        return result;
    }, [internalTransfers, dateFrom, dateTo]);

    const transferColumns: Column<InternalTransfer>[] = useMemo(() => [
        {
            key: 'date',
            label: 'Fecha',
            type: 'date',
            render: (val: string) => (
                <div className="flex items-center gap-2">
                    <CalendarDaysIcon className="h-4 w-4 text-slate-400" />
                    <span>{fmtDate(val)}</span>
                </div>
            )
        },
        {
            key: 'sourceAccount',
            label: 'Origen (Salida)',
            render: (_, r) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{r.sourceAccount.label}</span>
                    <span className="text-2xs text-slate-500 truncate max-w-[200px]" title={r.sourceDesc}>{r.sourceDesc}</span>
                    {r.sourceRecordId !== 'caja-virtual' && (r as any).sourceRef && (
                        <span className="text-2xs font-mono text-slate-400">{(r as any).sourceRef}</span>
                    )}
                </div>
            )
        },
        {
            key: 'targetAccount',
            label: 'Destino (Entrada)',
            render: (_, r) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{r.targetAccount.label}</span>
                    <span className="text-2xs text-slate-500 truncate max-w-[200px]" title={r.targetDesc}>{r.targetDesc}</span>
                    {r.targetRecordId !== 'caja-virtual' && (r as any).targetRef && (
                        <span className="text-2xs font-mono text-slate-400">{(r as any).targetRef}</span>
                    )}
                </div>
            )
        },
        {
            key: 'amount',
            label: 'Valor',
            type: 'currency',
            align: 'text-right',
            render: (val: number) => (
                <strong className="text-slate-900 dark:text-white">
                    {fmt(val)}
                </strong>
            )
        },
        {
            key: 'isConciliated',
            label: 'Conciliación',
            width: 'w-[100px]',
            align: 'text-center',
            render: (_, item) => (
                <div className="flex justify-center">
                    {item.isConciliated ? (
                        <StatusBadge variant="success" label="Conciliado" />
                    ) : (
                        <StatusBadge variant="warning" label="Pendiente" />
                    )}
                </div>
            )
        },
        {
            key: 'is_registered',
            label: 'Estado',
            width: 'w-[80px]',
            align: 'text-center',
            render: (_, item) => (
                <button
                    onClick={(e) => { e.stopPropagation(); toggleTransferRegistered(item.id); }}
                    className={`h-7 w-7 rounded-full mx-auto flex items-center justify-center transition-all ${
                        registeredTransferIds.has(item.id)
                            ? 'bg-emerald-500 text-white shadow-sm dark:bg-emerald-600'
                            : 'bg-slate-100 text-slate-400 hover:text-slate-600 dark:bg-slate-800 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title={registeredTransferIds.has(item.id) ? 'Marcado como registrado' : 'Marcar como registrado'}
                >
                    <CheckCircleIcon className="h-5 w-5" />
                </button>
            )
        }
    ], [registeredTransferIds, toggleTransferRegistered]);

    const exportTransfersToCSV = useCallback((selectedIds: Set<string>) => {
        const transfersToExport = internalTransfers.filter(t => selectedIds.has(t.id));
        if (transfersToExport.length === 0) return;

        const header = "Tipo de documento;Consecutivo;Fecha de elaboración;Fecha de vencimiento;Código de cuenta;Id contacto;Centro de costos;Débito;Crédito;Base;Descripción;Descripción movimiento";
        const rows: string[] = [];
        let consecutivo = 1;

        transfersToExport.forEach(t => {
            const dateParts = t.date.split('T')[0].split('-');
            const dateStr = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : t.date;
            
            // Fila 1: Origen (Crédito / Salida)
            rows.push([
                'RC',
                consecutivo,
                dateStr,
                dateStr,
                t.sourceAccount.pucCode || '',
                '', 
                '', 
                '', 
                t.amount.toString().replace('.', ','),
                '', 
                `Transferencia de ${t.sourceAccount.label} a ${t.targetAccount.label}`,
                t.sourceDesc
            ].join(';'));

            // Fila 2: Destino (Débito / Entrada)
            rows.push([
                'RC',
                consecutivo,
                dateStr,
                dateStr,
                t.targetAccount.pucCode || '',
                '', 
                '', 
                t.amount.toString().replace('.', ','),
                '',
                '', 
                `Transferencia de ${t.sourceAccount.label} a ${t.targetAccount.label}`,
                t.targetDesc
            ].join(';'));
            
            consecutivo++;
        });

        const csvContent = '\uFEFF' + [header, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `asientos_transferencias_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }, [internalTransfers]);

    // Limpiar sugerencias y auto-matches si cambia el filtro de flujo
    useEffect(() => {
        setAutoMatches([]);
        setRejectedMatchIndices(new Set());
        setSelectedSourceIds(new Set());
        setSelectedTargetId(null);
    }, [flowFilter]);

    // =============================================
    // REGISTROS PENDIENTES
    // =============================================

    const pendingSource = useMemo(
        () => sourceRecords
            .filter(r => !conciliatedIds.has(`source:${r.id}`))
            .filter(r => {
                if (flowFilter === 'income') return r.amount > 0;
                if (flowFilter === 'expense') return r.amount < 0;
                return true;
            })
            .filter(r => {
                if (showOnlySuspected) return suspectedIds.has(r.id);
                if (showOnlyRegistered) return registeredIds.has(r.id);
                return true;
            })
            .filter(r => {
                if (!sourceSearch) return true;
                const searchLower = sourceSearch.toLowerCase();
                return (
                    (r.description || '').toLowerCase().includes(searchLower) ||
                    fmt(r.amount).toLowerCase().includes(searchLower) ||
                    fmtDate(r.date).toLowerCase().includes(searchLower) ||
                    (r.raw?.sucursal || '').toLowerCase().includes(searchLower) ||
                    (r.raw?.referencia || '').toLowerCase().includes(searchLower) ||
                    (r.raw?.doc_banco || '').toLowerCase().includes(searchLower)
                );
            }),
        [sourceRecords, conciliatedIds, flowFilter, sourceSearch, showOnlySuspected, suspectedIds, showOnlyRegistered, registeredIds]
    );

    /** Toggle marcado sospechoso (si marca sospechoso, quita registrado) */
    const toggleSuspected = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSuspectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } 
            else { 
                next.add(id);
                setRegisteredIds(old => { const n = new Set(old); n.delete(id); return n; });
            }
            return next;
        });
    }, []);

    /** Toggle marcado como ya registrado en contabilidad (si marca registrado, quita sospechoso) */
    const toggleRegistered = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setRegisteredIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); } 
            else { 
                next.add(id);
                setSuspectedIds(old => { const n = new Set(old); n.delete(id); return n; });
            }
            return next;
        });
    }, []);

    /** Conteo de sospechosos aún pendientes (sin conciliar) */
    const suspectedPendingCount = useMemo(
        () => sourceRecords.filter(r => suspectedIds.has(r.id) && !conciliatedIds.has(`source:${r.id}`)).length,
        [sourceRecords, suspectedIds, conciliatedIds]
    );

    /** Conteo de registrados aún pendientes (sin conciliar) */
    const registeredPendingCount = useMemo(
        () => sourceRecords.filter(r => registeredIds.has(r.id) && !conciliatedIds.has(`source:${r.id}`)).length,
        [sourceRecords, registeredIds, conciliatedIds]
    );
    const pendingTarget = useMemo(
        () => targetRecords
            .filter(r => !conciliatedIds.has(`target:${r.id}`))
            .filter(r => {
                if (flowFilter === 'income') return r.amount > 0;
                if (flowFilter === 'expense') return r.amount < 0;
                return true;
            })
            .filter(r => {
                if (excludedAccountsSet.size === 0) return true;
                const account = (r.raw?.cuenta || '').toString().trim();
                return !excludedAccountsSet.has(account);
            })
            .filter(r => {
                if (!targetSearch) return true;
                const searchLower = targetSearch.toLowerCase();
                return (
                    (r.description || '').toLowerCase().includes(searchLower) ||
                    fmt(r.amount).toLowerCase().includes(searchLower) ||
                    fmtDate(r.date).toLowerCase().includes(searchLower) ||
                    (r.raw?.cuenta || '').toLowerCase().includes(searchLower) ||
                    (r.raw?.contacto || '').toLowerCase().includes(searchLower) ||
                    (r.raw?.identificacion || '').toLowerCase().includes(searchLower) ||
                    (r.raw?.centro_costo || '').toLowerCase().includes(searchLower) ||
                    (r.raw?.documento || '').toLowerCase().includes(searchLower)
                );
            }),
        [targetRecords, conciliatedIds, flowFilter, targetSearch, targetExcludeAccounts]
    );

    const activeHistory = useMemo(() => history.filter(h => h.status === 'active'), [history]);

    // --- Registro source enfocado ---
    // --- Registros source enfocados ---
    const selectedSourceRecords = useMemo(
        () => pendingSource.filter(r => selectedSourceIds.has(r.id)),
        [selectedSourceIds, pendingSource]
    );

    const selectedSourceSum = useMemo(
        () => selectedSourceRecords.reduce((sum, r) => sum + r.amount, 0),
        [selectedSourceRecords]
    );

    // Mantenemos focusedSourceId para sugerencias (el último seleccionado o el primero del set)
    const focusedSourceId = useMemo(
        () => [...selectedSourceIds].pop() || null,
        [selectedSourceIds]
    );

    const focusedSourceRecord = useMemo(
        () => focusedSourceId ? pendingSource.find(r => r.id === focusedSourceId) : null,
        [focusedSourceId, pendingSource]
    );

    // --- Registro target seleccionado ---
    const selectedTargetRecord = useMemo(
        () => selectedTargetId ? pendingTarget.find(r => r.id === selectedTargetId) : null,
        [selectedTargetId, pendingTarget]
    );

    // --- Columnas Historial (Consolidado) ---
    const historyColumns: Column<ReconciliationHistoryRow>[] = useMemo(() => [
        {
            key: 'status',
            label: 'Estado',
            width: '100px',
            render: (val) => (
                <StatusBadge 
                    variant={val === 'active' ? 'success' : 'danger'} 
                    label={val === 'active' ? 'Conciliado' : 'Revertido'} 
                />
            )
        },
        {
            key: 'cuenta_banco',
            label: 'Cuenta Banco',
            getValue: (item) => RECONCILIATION_ACCOUNTS.find(a => a.table === item.source_table)?.label || '—',
            render: (_, item) => {
                const acc = RECONCILIATION_ACCOUNTS.find(a => a.table === item.source_table);
                return <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">{acc?.label || '—'}</span>;
            }
        },
        {
            key: 'fecha_banco',
            label: 'Fecha Banco',
            type: 'date',
            getValue: (item) => {
                const acc = RECONCILIATION_ACCOUNTS.find(a => a.table === item.source_table);
                const records = acc ? allBankRecords[acc.id] : [];
                const source = records?.find(r => r.id === item.source_record_id);
                return source ? source.date : '';
            },
            render: (_, item) => {
                const acc = RECONCILIATION_ACCOUNTS.find(a => a.table === item.source_table);
                const records = acc ? allBankRecords[acc.id] : [];
                const source = records?.find(r => r.id === item.source_record_id);
                return <span className="text-slate-600 dark:text-slate-400 text-xs">{source ? fmtDate(source.date) : '—'}</span>;
            }
        },
        {
            key: 'valor_banco',
            label: 'Valor Banco',
            align: 'text-right',
            type: 'currency',
            getValue: (item) => {
                const acc = RECONCILIATION_ACCOUNTS.find(a => a.table === item.source_table);
                const records = acc ? allBankRecords[acc.id] : [];
                const source = records?.find(r => r.id === item.source_record_id);
                return source ? source.amount : '';
            },
            render: (_, item) => {
                const acc = RECONCILIATION_ACCOUNTS.find(a => a.table === item.source_table);
                const records = acc ? allBankRecords[acc.id] : [];
                const source = records?.find(r => r.id === item.source_record_id);
                return <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{source ? fmt(source.amount) : '—'}</span>;
            }
        },
        {
            key: 'desc_banco',
            label: 'Desc. Banco',
            getValue: (item) => {
                const acc = RECONCILIATION_ACCOUNTS.find(a => a.table === item.source_table);
                const records = acc ? allBankRecords[acc.id] : [];
                const source = records?.find(r => r.id === item.source_record_id);
                return source?.description || '—';
            },
            render: (_, item) => {
                const acc = RECONCILIATION_ACCOUNTS.find(a => a.table === item.source_table);
                const records = acc ? allBankRecords[acc.id] : [];
                const source = records?.find(r => r.id === item.source_record_id);
                return <span className="text-slate-500 dark:text-slate-400 text-xs truncate max-w-[200px]" title={source?.description}>{source?.description || '—'}</span>;
            }
        },
        {
            key: 'target_doc',
            label: 'Asiento/Doc',
            getValue: (item) => {
                const target = targetRecords.find(r => r.id === item.target_record_id);
                return target?.raw?.documento || '—';
            },
            render: (_, item) => {
                const target = targetRecords.find(r => r.id === item.target_record_id);
                return (
                    <div className="flex flex-col">
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                            {target?.raw?.documento || '—'}
                        </span>
                        <span className="text-2xs text-slate-500 truncate max-w-[140px]" title={target?.raw?.contacto}>
                            {target?.raw?.contacto || '—'}
                        </span>
                    </div>
                );
            }
        },
        {
            key: 'target_value',
            label: 'Valor Contable',
            align: 'text-right',
            type: 'currency',
            getValue: (item) => {
                const target = targetRecords.find(r => r.id === item.target_record_id);
                return target ? target.amount : '';
            },
            render: (_, item) => {
                const target = targetRecords.find(r => r.id === item.target_record_id);
                if (!target) return <span className="text-slate-400">—</span>;
                return (
                    <div className="flex flex-col items-end">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{fmt(target.amount)}</span>
                        {item.amount_diff !== 0 && (
                            <span className="text-3xs text-rose-500 font-medium">Dif: {fmt(item.amount_diff)}</span>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'fecha_conciliacion',
            label: 'F. Conciliación',
            render: (_, item) => (
                <div className="flex flex-col">
                    <span className="text-slate-600 dark:text-slate-400 text-xs">{fmtDate(item.created_at)}</span>
                    <span className="text-2xs text-slate-400">{item.match_type === 'auto' ? 'Automático' : 'Manual'}</span>
                </div>
            )
        },
        {
            key: 'score',
            label: 'Confianza',
            render: (_, item) => (
                <div className="flex items-center gap-1.5">
                    {item.score != null ? <ScorePill score={item.score} /> : <span className="text-slate-400">—</span>}
                </div>
            )
        },
        {
            key: 'actions',
            label: 'Acciones',
            width: '100px',
            align: 'text-center',
            render: (_, item) => (
                <div className="flex items-center justify-center gap-1.5">
                    <Button 
                        variant="icon" 
                        size="icon-sm" 
                        title="Ver Detalle Contable Asignado"
                        onClick={() => setHistoryDetailRow(item)}
                    >
                        <DocumentTextIcon className="h-4 w-4" />
                    </Button>
                    {item.status === 'active' && (
                        <Button 
                            variant="icon-danger" 
                            size="icon-sm" 
                            title="Revertir Conciliación"
                            onClick={(e) => { 
                                e?.stopPropagation?.();
                                setReversingId(item.id); 
                                setReversalReason(''); 
                            }}
                        >
                            <ArrowPathIcon className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )
        }
    ], [allBankRecords, targetRecords]);

    // =============================================
    // HOVER: Cross-highlighting
    // =============================================

    const handleSourceHover = useCallback((record: ReconciliationRecord | null) => {
        if (!record) {
            setHoveredSourceId(null);
            setHighlightedTargetIds(new Set());
            return;
        }
        setHoveredSourceId(record.id);
        const highlighted = new Set<string>();
        for (const t of pendingTarget) {
            // Mismo signo + diferencia de magnitud dentro de tolerancia
            const sameSign = (record.amount >= 0) === (t.amount >= 0);
            const aDiff = Math.abs(Math.abs(record.amount) - Math.abs(t.amount));
            const dDiff = daysDiff(record.date, t.date);
            if (sameSign && aDiff <= amountTolerance && dDiff <= dateMarginDays) highlighted.add(t.id);
        }
        setHighlightedTargetIds(highlighted);
    }, [pendingTarget, amountTolerance, dateMarginDays]);

    // =============================================
    // Computar sugerencias para un source
    // =============================================

    const getSuggestionsForAmount = useCallback((amount: number, baseDate: string): MatchSuggestion[] => {
        const sugs: MatchSuggestion[] = [];
        const srcAbs = Math.abs(amount);
        for (const t of pendingTarget) {
            // Solo sugerir registros del mismo signo (+ con +, - con -)
            const sameSign = (amount >= 0) === (t.amount >= 0);
            if (!sameSign) continue;

            const tgtAbs = Math.abs(t.amount);
            const aDiff = Math.abs(srcAbs - tgtAbs);
            const dDiff = daysDiff(baseDate, t.date);
            let score = 0;
            let ruleInfo = '';
            if (aDiff === 0 && dDiff === 0) {
                score = 100; ruleInfo = 'Exacto';
            } else if (aDiff === 0 && dDiff <= dateMarginDays) {
                score = 99 - dDiff * 2; ruleInfo = `Valor exacto, \u00b1${dDiff}d`;
            } else if (aDiff <= amountTolerance && dDiff <= dateMarginDays) {
                const ap = (aDiff / amountTolerance) * 5;
                score = Math.round(98 - ap - dDiff * 1.5);
                ruleInfo = `\u0394$${aDiff.toLocaleString()}, \u00b1${dDiff}d`;
            } else if (aDiff <= amountTolerance * 2) {
                score = Math.max(20, Math.round(50 - (aDiff / amountTolerance) * 25));
                ruleInfo = `\u0394$${aDiff.toLocaleString()}, \u00b1${dDiff}d`;
            }
            if (score >= 20) sugs.push({ record: t, score, amountDiff: aDiff, dateDiff: dDiff, ruleInfo });
        }
        return sugs.sort((a, b) => b.score - a.score).slice(0, 5);
    }, [pendingTarget, amountTolerance, dateMarginDays]);

    const suggestions = useMemo(() => {
        if (selectedSourceIds.size === 0 || !focusedSourceRecord) return [];
        // Si hay un solo registro, usamos su fecha. Si hay varios, usamos la fecha del último seleccionado para los días de diferencia.
        return getSuggestionsForAmount(selectedSourceSum, focusedSourceRecord.date);
    }, [getSuggestionsForAmount, selectedSourceSum, focusedSourceRecord, selectedSourceIds.size]);

    // =============================================
    // CLICK SOURCE: enfocar + sugerencias + scroll alineado
    // =============================================

    const handleSourceClick = useCallback((record: ReconciliationRecord) => {
        setSelectedSourceIds(prev => {
            const next = new Set(prev);
            if (next.has(record.id)) {
                next.delete(record.id);
            } else {
                next.add(record.id);
            }
            return next;
        });
        
        setSelectedTargetId(null);
        
        // Alineación opcional con el primer match (usando el memoizado ahora)
        setTimeout(() => {
            if (suggestions.length > 0) {
                alignSourceAndTarget(record.id, suggestions[0].record.id);
            }
        }, 200);
    }, [suggestions]);

    // =============================================
    // CLICK TARGET: seleccionar para vincular
    // =============================================

    const handleTargetClick = useCallback((record: ReconciliationRecord) => {
        if (selectedSourceIds.size === 0) return; // Solo funciona cuando hay al menos un source seleccionado
        setSelectedTargetId(record.id);
    }, [selectedSourceIds]);

    // =============================================
    // CANCELAR selección manual
    // =============================================

    const cancelManualSelection = () => {
        setSelectedSourceIds(new Set());
        setSelectedTargetId(null);
    };

    // =============================================
    // ACCIONES
    // =============================================

    /** Conciliar automáticamente (con filtro de fechas opcional) */
    const handleAutoReconcile = () => {
        let currentSource = pendingSource;
        let currentTarget = pendingTarget;

        // Aplicar filtro de fechas si está configurado
        if (dateFrom && dateTo) {
            const from = new Date(dateFrom);
            const to = new Date(dateTo);
            if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
                currentSource = currentSource.filter(r => {
                    const d = new Date(r.date);
                    return d >= from && d <= to;
                });
            }
        }

        const matches = ReconciliationBankService.reconcileAuto(
            currentSource, currentTarget, conciliatedIds, config
        );
        setAutoMatches(matches);
        setRejectedMatchIndices(new Set());
        cancelManualSelection();
    };

    /** Confirmar todos los matches aceptados */
    const handleConfirmAll = async () => {
        if (!selectedAccount) return;
        const toSave = autoMatches.filter((_, i) => !rejectedMatchIndices.has(i));
        if (toSave.length === 0) return;

        setSaving(true);
        try {
            await ReconciliationBankService.saveMatchesBatch(selectedAccount.table, toSave);
            
            // Actualización optimista
            const newIds = new Set(conciliatedIds);
            toSave.forEach(m => {
                newIds.add(`source:${m.sourceRecord.id}`);
                newIds.add(`target:${m.targetRecord.id}`);
            });
            setConciliatedIds(newIds);
            
            // Recargar solo el historial
            const hist = await ReconciliationBankService.getHistory(selectedAccount.table);
            setHistory(hist);
            
            setAutoMatches([]);
            setRejectedMatchIndices(new Set());
            cancelManualSelection();
        } catch (err) {
            console.error('Error confirmando matches:', err);
        } finally {
            setSaving(false);
        }
    };

    /** Vincular manualmente: desde sugerencia (1 click) */
    const handleQuickLink = async (suggestion: MatchSuggestion) => {
        if (!selectedAccount || selectedSourceIds.size === 0) return;
        setSaving(true);
        const sourceIds = [...selectedSourceIds];
        const targetId = suggestion.record.id;
        
        try {
            // Guardar uno por cada source
            for (const sId of sourceIds) {
                // Para simplificar, usamos el score y diff de la sugerencia original si aplica
                // pero lo ideal es recalcular si hay múltiples. Por ahora, vinculación múltiple
                // es una acción manual explícita.
                await ReconciliationBankService.saveMatch(
                    selectedAccount.table, sId, targetId,
                    'manual', suggestion.score, suggestion.ruleInfo, suggestion.amountDiff, suggestion.dateDiff,
                );
            }
            
            // Actualización optimista
            setConciliatedIds(prev => {
                const next = new Set(prev);
                sourceIds.forEach(id => next.add(`source:${id}`));
                next.add(`target:${targetId}`);
                return next;
            });
            
            // Recargar solo historial
            const hist = await ReconciliationBankService.getHistory(selectedAccount.table);
            setHistory(hist);
            
            cancelManualSelection();
        } catch (err) {
            console.error('Error vinculando:', err);
        } finally {
            setSaving(false);
        }
    };

    /** Vincular manualmente: confirmar par source+target seleccionados */
    const handleConfirmManualPair = async () => {
        if (!selectedAccount || selectedSourceIds.size === 0 || !selectedTargetRecord) return;
        setSaving(true);
        const sourceIds = Array.from(selectedSourceIds);
        const targetId = selectedTargetRecord.id;
        
        try {
            // Vincular cada registro de origen con el destino seleccionado en lote
            // para que compartan el mismo created_at y sea fácil agruparlos
            const matchesToSave: ReconciliationMatchResult[] = sourceIds.map(sourceId => {
                const sourceRecord = sourceRecords.find(r => r.id === sourceId);
                return {
                    sourceRecord: sourceRecord || { id: sourceId, amount: 0, date: '', description: '', raw: {} },
                    targetRecord: selectedTargetRecord,
                    score: 0, // Manual no tiene score por defecto, el servicio pondrá null
                    ruleInfo: 'Vinculación Manual',
                    amountDiff: sourceRecord ? Math.abs(sourceRecord.amount - selectedTargetRecord.amount) : 0,
                    dateDiff: sourceRecord ? daysDiff(sourceRecord.date, selectedTargetRecord.date) : 0,
                };
            });

            await ReconciliationBankService.saveMatchesBatch(
                selectedAccount.table,
                matchesToSave,
                'manual'
            );
            
            // Actualización optimista: todos los registros de origen y el destino se marcan como conciliados
            setConciliatedIds(prev => {
                const next = new Set(prev);
                sourceIds.forEach(id => next.add(`source:${id}`));
                next.add(`target:${targetId}`);
                return next;
            });
            
            // Recargar solo historial para reflejar los nuevos vínculos
            const hist = await ReconciliationBankService.getHistory(selectedAccount.table);
            setHistory(hist);
            
            cancelManualSelection();
        } catch (err) {
            console.error('Error vinculando:', err);
        } finally {
            setSaving(false);
        }
    };

    /** Reasignar: sacar un match auto y dejar al usuario elegir otro target */
    const handleReassignMatch = (index: number) => {
        const match = autoMatches[index];
        // Rechazar el auto-match
        setRejectedMatchIndices(prev => new Set([...prev, index]));
        // Enfocar el registro source para que el usuario elija manualmente
        handleSourceClick(match.sourceRecord);
    };

    const handleReverse = async () => {
        if (!reversingId || !selectedAccount) return;
        setSaving(true);
        try {
            await ReconciliationBankService.reverseMatch(reversingId);
            
            // Actualización puramente optimista en memoria local
            const recordToReverse = history.find(h => h.id === reversingId);
            if (recordToReverse) {
                // Liberar IDs para que vuelvan a aparecer en tablas
                const newIds = new Set(conciliatedIds);
                newIds.delete(`source:${recordToReverse.source_record_id}`);
                newIds.delete(`target:${recordToReverse.target_record_id}`);
                setConciliatedIds(newIds);
                
                // Actualizar historial localmente (eliminar)
                setHistory(prev => prev.filter(h => h.id !== reversingId));
            } else {
                // Fallback por si acaso
                const hist = await ReconciliationBankService.getHistory(selectedAccount.table);
                setHistory(hist);
            }
            
            setReversingId(null);
            setReversalReason('');
        } catch (err) {
            console.error('Error revirtiendo:', err);
        } finally {
            setSaving(false);
        }
    };

    /** Reversión masiva de Historial */
    const handleReverseBulk = async (ids: Set<string>) => {
        if (!selectedAccount) return;
        const confirmMsg = ids.size === 1 
            ? '¿Estás seguro de que quieres revertir la conciliación seleccionada?'
            : `¿Estás seguro de que quieres revertir las ${ids.size} conciliaciones seleccionadas?`;
            
        if (!confirm(confirmMsg)) return;
        
        setSaving(true);
        try {
            const idArray = Array.from(ids);
            await ReconciliationBankService.reverseMatchesBatch(idArray);
            
            // Actualizar localmente para liberar los registros
            const newIds = new Set(conciliatedIds);
            
            // Por cada ID revertido, limpiar sus source/target del set local de forma reactiva
            const itemsToReverse = history.filter(h => ids.has(h.id));
            itemsToReverse.forEach(item => {
                newIds.delete(`source:${item.source_record_id}`);
                newIds.delete(`target:${item.target_record_id}`);
            });
            
            setConciliatedIds(newIds);
            setHistory(prev => prev.filter(h => !ids.has(h.id)));
        } catch (err) {
            console.error('Error en reversión masiva:', err);
            alert('Error revirtiendo registros en lote.');
        } finally {
            setSaving(false);
        }
    };

    const acceptedCount = autoMatches.length - rejectedMatchIndices.size;
    const hasDateFilter = !!(dateFrom && dateTo);
    const isManualMode = !!focusedSourceId;

    // =============================================
    // MODO INVERTIDO: coincidencias de valor exacto
    // =============================================

    /** Registros target seleccionados para búsqueda inversa */
    const selectedReverseTargetRecords = useMemo(
        () => pendingTarget.filter(r => selectedReverseTargetIds.has(r.id)),
        [selectedReverseTargetIds, pendingTarget]
    );

    const selectedReverseTargetSum = useMemo(
        () => selectedReverseTargetRecords.reduce((sum, r) => sum + r.amount, 0),
        [selectedReverseTargetRecords]
    );

    /** Concilia un match del modo invertido (bankRecord + múltiples targetRecords) */
    const handleReverseConciliar = async (match: ReverseMatch) => {
        if (selectedReverseTargetIds.size === 0 || savingReverseMatchId) return;

        // Obtener la cuenta bancaria correcta para este match
        const account = RECONCILIATION_ACCOUNTS.find(a => a.id === match.accountId);
        if (!account) return;

        const matchKey = `${match.accountId}:${match.record.id}`;
        setSavingReverseMatchId(matchKey);
        try {
            const targetIds = Array.from(selectedReverseTargetIds);
            
            // Vincular cada asiento contable seleccionado con el registro bancario
            const matchesToSave: ReconciliationMatchResult[] = selectedReverseTargetRecords.map(targetRecord => {
                return {
                    sourceRecord: match.record,
                    targetRecord: targetRecord,
                    score: 0,
                    ruleInfo: 'Conciliación Inversa',
                    amountDiff: Math.abs(Math.abs(match.record.amount) - Math.abs(selectedReverseTargetSum)),
                    dateDiff: daysDiff(match.record.date, targetRecord.date),
                };
            });

            await ReconciliationBankService.saveMatchesBatch(
                account.table,
                matchesToSave,
                'manual'
            );

            // Actualización optimista de IDs conciliados
            setConciliatedIds(prev => {
                const next = new Set(prev);
                next.add(`source:${match.record.id}`);
                targetIds.forEach(id => next.add(`target:${id}`));
                return next;
            });

            // Recargar historial global
            const hist = await ReconciliationBankService.getAllActiveHistory();
            setHistory(hist);

            // Cerrar el panel inverso y limpiar selección (los asientos ya quedaron conciliados)
            setSelectedReverseTargetIds(new Set());
        } catch (err) {
            console.error('Error en conciliación inversa:', err);
            alert('Error al conciliar. Por favor intente de nuevo.');
        } finally {
            setSavingReverseMatchId(null);
        }
    };

    /** Buscar coincidencias de valor exacto en TODAS las cuentas bancarias */
    const reverseMatches = useMemo((): ReverseMatch[] => {
        if (!reverseMode || selectedReverseTargetIds.size === 0) return [];
        const targetAmount = selectedReverseTargetSum;
        const results: ReverseMatch[] = [];

        RECONCILIATION_ACCOUNTS.forEach(acc => {
            const records = allBankRecords[acc.id] || [];
            records.forEach(r => {
                // Debe coincidir en valor absoluto Y en signo (+ con +, - con -)
                const sameAbsValue = Math.abs(r.amount) === Math.abs(targetAmount);
                const sameSign = (r.amount >= 0) === (targetAmount >= 0);
                if (sameAbsValue && sameSign) {
                    results.push({
                        accountId: acc.id,
                        accountLabel: acc.label,
                        record: r,
                        alreadyConciliated: conciliatedIds.has(`source:${r.id}`),
                    });
                }
            });
        });

        // Ordenar: primero los no conciliados, luego por cuenta
        return results.sort((a, b) => {
            if (a.alreadyConciliated !== b.alreadyConciliated) return a.alreadyConciliated ? 1 : -1;
            return a.accountLabel.localeCompare(b.accountLabel);
        });
    }, [reverseMode, selectedReverseTargetIds, selectedReverseTargetSum, allBankRecords, conciliatedIds]);

    // =============================================
    // RENDER
    // =============================================

    // Ya no desmontamos todo para el loading — usamos overlay suave

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* ═══ HEADER ═══ */}
            <div className="px-6 pt-4 pb-3 shrink-0 space-y-3">
                {/* Título + cuenta */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <ArrowsRightLeftIcon className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Conciliación Bancaria</h1>
                            <p className="text-2xs text-slate-400">{selectedAccount?.label} vs Asientos Contables</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            className="h-8 px-3 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-purple-500"
                        >
                            {RECONCILIATION_ACCOUNTS.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => setSettingsOpen(!settingsOpen)}
                            className={`h-8 w-8 rounded-md border flex items-center justify-center transition-colors ${
                                settingsOpen ? 'bg-purple-50 border-purple-300 text-purple-600' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
                            }`}
                            title="Configuración"
                        >
                            <Cog6ToothIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Config (collapsed) */}
                {settingsOpen && (
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <label className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Tolerancia Valor</label>
                            <input type="number" value={amountTolerance} onChange={(e) => setAmountTolerance(Number(e.target.value))}
                                className="h-7 w-24 px-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Margen Días</label>
                            <input type="number" value={dateMarginDays} onChange={(e) => setDateMarginDays(Number(e.target.value))}
                                className="h-7 w-16 px-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300" />
                        </div>
                    </div>
                )}

                {/* KPIs + Tabs + Acciones */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-bold text-emerald-600">{activeHistory.length}</span>
                            <span className="text-slate-400">conciliados</span>
                        </div>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-bold text-amber-600">{pendingSource.length}</span>
                            <span className="text-slate-400">pendientes</span>
                        </div>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                        <div className="flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <button onClick={() => setActiveTab('conciliar')}
                                className={`px-3 py-1 text-2xs font-semibold transition-colors ${activeTab === 'conciliar' ? 'bg-slate-800 text-white dark:bg-slate-600' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50'}`}>
                                Conciliar
                            </button>
                            <button onClick={() => setActiveTab('historial')}
                                className={`px-3 py-1 text-2xs font-semibold transition-colors ${activeTab === 'historial' ? 'bg-slate-800 text-white dark:bg-slate-600' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50'}`}>
                                Historial ({history.length})
                            </button>
                            <button onClick={() => setActiveTab('transferencias')}
                                className={`px-3 py-1 text-2xs font-semibold transition-colors ${activeTab === 'transferencias' ? 'bg-slate-800 text-white dark:bg-slate-600' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50'}`}>
                                Transferencias Int.
                            </button>
                        </div>
                    </div>

                    {/* Acciones principales */}
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={async () => {
                                if (confirm("¿Estás seguro de que deseas limpiar los registros huérfanos del historial? Esto verificará y eliminará conciliaciones donde el registro bancario o contable original haya sido borrado.")) {
                                    setLoading(true);
                                    try {
                                        const count = await ReconciliationBankService.cleanOrphanedRecords();
                                        alert(`Limpieza completada. Se eliminaron ${count} registros huérfanos.`);
                                        await loadData(); // Recargar datos para refrescar la UI
                                    } catch (e) {
                                        console.error(e);
                                        alert("Error al limpiar registros huérfanos.");
                                    } finally {
                                        setLoading(false);
                                    }
                                }
                            }}
                            className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
                        >
                            <SparklesIcon className="h-4 w-4 mr-1.5" />
                            Limpiar Huérfanos
                        </Button>
                        {/* Selector Ingreso / Egreso */}
                        <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                            <button
                                onClick={() => setFlowFilter('all')}
                                className={`px-2.5 py-1 text-2xs font-bold rounded-md transition-all ${
                                    flowFilter === 'all'
                                        ? 'bg-white dark:bg-slate-600 text-purple-700 dark:text-purple-300 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFlowFilter('income')}
                                className={`px-2.5 py-1 text-2xs font-bold rounded-md transition-all flex items-center gap-1 ${
                                    flowFilter === 'income'
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shadow-sm'
                                        : 'text-slate-500 hover:text-emerald-600'
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${flowFilter === 'income' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                Ingresos
                            </button>
                            <button
                                onClick={() => setFlowFilter('expense')}
                                className={`px-2.5 py-1 text-2xs font-bold rounded-md transition-all flex items-center gap-1 ${
                                    flowFilter === 'expense'
                                        ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 shadow-sm'
                                        : 'text-slate-500 hover:text-orange-600'
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${flowFilter === 'expense' ? 'bg-orange-500 animate-pulse' : 'bg-slate-300'}`} />
                                Egresos
                            </button>
                        </div>

                        {activeTab === 'conciliar' && (
                            <div className="flex items-center gap-2">
                            {/* Filtro de rango de fechas */}
                            <button
                                onClick={() => setDateFilterOpen(!dateFilterOpen)}
                                className={`h-8 flex items-center gap-1.5 px-2.5 rounded-md border text-xs font-semibold transition-colors ${
                                    dateFilterOpen || hasDateFilter
                                        ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-900/30 dark:border-blue-700'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                                }`}
                            >
                                <CalendarDaysIcon className="h-3.5 w-3.5" />
                                {hasDateFilter ? `${fmtDate(dateFrom)} – ${fmtDate(dateTo)}` : 'Rango'}
                            </button>

                            {autoMatches.length === 0 ? (
                                <Button variant="primary" size="sm" onClick={handleAutoReconcile} isLoading={loading} className="gap-1.5">
                                    <SparklesIcon className="h-4 w-4" />
                                    Conciliar{hasDateFilter ? ' Rango' : ''}
                                </Button>
                            ) : (
                                <>
                                    <span className="text-xs text-slate-500">{acceptedCount}/{autoMatches.length}</span>
                                    <Button variant="primary" size="sm" onClick={handleConfirmAll} isLoading={saving} disabled={acceptedCount === 0} className="gap-1.5">
                                        <CheckIcon className="h-4 w-4" />
                                        Confirmar ({acceptedCount})
                                    </Button>
                                    <Button variant="ghost" size="xs" onClick={() => { setAutoMatches([]); setRejectedMatchIndices(new Set()); }}>
                                        Descartar
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Filtro de fechas expandido */}
                {dateFilterOpen && activeTab === 'conciliar' && (
                    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                        <CalendarDaysIcon className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="text-2xs text-blue-600 font-semibold uppercase tracking-wider shrink-0">Rango</span>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                            className="h-7 px-2 text-xs rounded-md border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300" />
                        <span className="text-2xs text-slate-400">a</span>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                            className="h-7 px-2 text-xs rounded-md border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300" />
                        {hasDateFilter && (
                            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                                className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                                Limpiar
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ CONTENIDO ═══ */}
            <div className="flex-1 px-4 pb-4 overflow-hidden relative">
                {/* Overlay suave de carga — no desmonta nada, solo atenúa */}
                {loading && (
                    <div className="absolute inset-0 z-30 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl transition-opacity duration-200 animate-in fade-in">
                        <Spinner size="lg" />
                    </div>
                )}
                {activeTab === 'conciliar' ? (
                    <div className="flex flex-col h-full gap-3">

                        {/* ─── PANEL MODO VINCULACIÓN MANUAL ─── */}
                        {selectedSourceIds.size > 0 && (
                            <div className="shrink-0 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                {/* Header */}
                                <div className="flex items-center gap-2 px-4 py-2 border-b border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
                                    <SparklesIcon className="h-4 w-4 text-purple-600" />
                                    <div className="text-xs font-bold text-purple-700 dark:text-purple-400 tracking-caps flex-1 flex items-center gap-3">
                                        <span className="uppercase">Modo vinculación</span>
                                        <span className="font-normal text-purple-600 dark:text-purple-300 border-l border-purple-300 dark:border-purple-700 pl-3 flex items-center gap-3">
                                            {selectedSourceRecords.length > 1 ? (
                                                <>{selectedSourceRecords.length} registros selecionados — Total: <strong className="text-purple-900 dark:text-purple-100 text-sm tracking-normal bg-purple-200 dark:bg-purple-700/50 px-2 py-0.5 rounded-md">{fmt(selectedSourceSum)}</strong></>
                                            ) : selectedSourceRecords.length === 1 ? (
                                                <>
                                                    <span className="opacity-80 tracking-normal">{fmtDate(selectedSourceRecords[0].date)}</span>
                                                    <span className="truncate max-w-[250px] tracking-normal opacity-90" title={selectedSourceRecords[0].description}>
                                                        {selectedSourceRecords[0].description}
                                                    </span>
                                                    <strong className="text-purple-900 dark:text-purple-100 text-sm tracking-normal bg-purple-200 dark:bg-purple-700/50 px-2.5 py-0.5 rounded-md ml-1 shadow-sm border border-purple-300/50 dark:border-purple-500/50">
                                                        {fmt(selectedSourceRecords[0].amount)}
                                                    </strong>
                                                </>
                                            ) : null}
                                        </span>
                                    </div>

                                    {/* Estado de la selección */}
                                    {selectedTargetRecord ? (
                                        <span className="text-2xs text-purple-600 font-semibold">
                                            Asiento seleccionado — listo para vincular
                                        </span>
                                    ) : suggestions.length > 0 ? (
                                        <span className="text-2xs text-purple-500 font-semibold">
                                            {suggestions.length} sugerencia{suggestions.length !== 1 ? 's' : ''}
                                        </span>
                                    ) : (
                                        <span className="text-2xs text-slate-400 italic">Haz click en un asiento para vincular</span>
                                    )}

                                    <button
                                        onClick={cancelManualSelection}
                                        className="h-5 w-5 rounded flex items-center justify-center text-purple-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                                    >
                                        <XMarkIcon className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {/* Tabla de sugerencias o confirmación del par */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-purple-100 dark:border-purple-900/40">
                                                <th className="text-left pl-4 pr-2 py-1.5 text-2xs font-semibold text-purple-500 uppercase tracking-wider">Confianza</th>
                                                <th className="text-left px-2 py-1.5 text-2xs font-semibold text-purple-500 uppercase tracking-wider">Fecha</th>
                                                <th className="text-right px-2 py-1.5 text-2xs font-semibold text-purple-500 uppercase tracking-wider">Valor</th>
                                                <th className="text-left px-2 py-1.5 text-2xs font-semibold text-purple-500 uppercase tracking-wider">Descripción</th>
                                                <th className="text-left px-2 py-1.5 text-2xs font-semibold text-purple-500 uppercase tracking-wider">Contacto</th>
                                                <th className="text-right px-2 py-1.5 text-2xs font-semibold text-purple-500 uppercase tracking-wider">Dif. Valor</th>
                                                <th className="text-right px-2 py-1.5 text-2xs font-semibold text-purple-500 uppercase tracking-wider">Dif. Días</th>
                                                <th className="text-center px-2 py-1.5 text-2xs font-semibold text-purple-500 uppercase tracking-wider">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-purple-100 dark:divide-purple-900/30">
                                            {selectedTargetRecord ? (
                                                /* Fila de confirmación del par ya seleccionado */
                                                <tr className="bg-purple-100/60 dark:bg-purple-900/20">
                                                    <td className="pl-4 pr-2 py-2">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-purple-200 text-purple-800 dark:bg-purple-800/60 dark:text-purple-200">
                                                            <LinkIcon className="h-3 w-3" />
                                                            Manual
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(selectedTargetRecord.date)}</td>
                                                    <td className="px-2 py-2 text-right font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{fmt(selectedTargetRecord.amount)}</td>
                                                    <td className="px-2 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[220px]" title={selectedTargetRecord.description || ''}>{selectedTargetRecord.description || '—'}</td>
                                                    <td className="px-2 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[180px]" title={selectedTargetRecord.raw?.contacto || ''}>{selectedTargetRecord.raw?.contacto || '—'}</td>
                                                    <td className="px-2 py-2 text-right font-semibold whitespace-nowrap">
                                                        <span className={Math.abs(selectedSourceSum - selectedTargetRecord.amount) < 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}>
                                                            {Math.abs(selectedSourceSum - selectedTargetRecord.amount) < 1 ? 'Exacto' : fmt(selectedSourceSum - selectedTargetRecord.amount)}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-slate-500 whitespace-nowrap">
                                                        {focusedSourceRecord ? `${daysDiff(focusedSourceRecord.date, selectedTargetRecord.date)}d` : '—'}
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <Button
                                                                variant="primary"
                                                                size="xs"
                                                                onClick={handleConfirmManualPair}
                                                                isLoading={saving}
                                                                className="gap-1"
                                                            >
                                                                <LinkIcon className="h-3 w-3" />
                                                                Vincular
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                onClick={() => setSelectedTargetId(null)}
                                                                title="Cambiar selección"
                                                            >
                                                                <XMarkIcon className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : suggestions.length > 0 ? (
                                                /* Filas de sugerencias automáticas */
                                                suggestions.map((s, idx) => (
                                                    <tr
                                                        key={idx}
                                                        className="hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group cursor-pointer"
                                                        onClick={() => !saving && handleQuickLink(s)}
                                                    >
                                                        <td className="pl-4 pr-2 py-2">
                                                            <ScorePill score={s.score} />
                                                        </td>
                                                        <td className="px-2 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(s.record.date)}</td>
                                                        <td className="px-2 py-2 text-right font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{fmt(s.record.amount)}</td>
                                                        <td className="px-2 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[220px]" title={s.record.description || ''}>{s.record.description || '—'}</td>
                                                        <td className="px-2 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[180px]" title={s.record.raw?.contacto || ''}>{s.record.raw?.contacto || '—'}</td>
                                                        <td className="px-2 py-2 text-right text-2xs font-semibold whitespace-nowrap">
                                                            <span className={s.amountDiff === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                                                {s.amountDiff === 0 ? 'Exacto' : fmt(s.amountDiff)}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-2 text-right text-slate-500 whitespace-nowrap">{s.dateDiff}d</td>
                                                        <td className="px-2 py-2">
                                                            <div className="flex justify-center">
                                                                <Button
                                                                    variant="primary"
                                                                    size="xs"
                                                                    onClick={(e) => { e?.stopPropagation?.(); handleQuickLink(s); }}
                                                                    disabled={saving}
                                                                    className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <LinkIcon className="h-3 w-3" />
                                                                    Vincular
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                /* Sin sugerencias — esperando selección manual */
                                                <tr>
                                                    <td colSpan={8} className="py-4 text-center text-xs text-slate-400 italic">
                                                        Haz click en cualquier asiento contable de la tabla de la derecha para vincularlo
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ─── RESULTADOS AUTO-MATCH ─── */}
                        {autoMatches.length > 0 && (
                            <div className="shrink-0 max-h-[35%] overflow-y-auto rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
                                {/* Header fijo con selector de columnas */}
                                <div className="flex items-center gap-2 px-4 py-2 border-b border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 sticky top-0 z-10">
                                    <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-caps flex-1">
                                        Coincidencias encontradas
                                        <span className="ml-2 font-normal text-purple-400">({autoMatches.length - rejectedMatchIndices.size} activas)</span>
                                    </span>
                                    {/* Botón filtro rápido Solo 100% */}
                                    {autoMatches.some(m => m.score < 100) && (
                                        <button
                                            onClick={() => {
                                                // Si ya están todos los <100 rechazados, restaurarlos; si no, rechazarlos
                                                const below100Indices = autoMatches
                                                    .map((m, i) => m.score < 100 ? i : -1)
                                                    .filter(i => i !== -1);
                                                const allRejected = below100Indices.every(i => rejectedMatchIndices.has(i));
                                                if (allRejected) {
                                                    // Restaurar los <100
                                                    setRejectedMatchIndices(prev => {
                                                        const n = new Set(prev);
                                                        below100Indices.forEach(i => n.delete(i));
                                                        return n;
                                                    });
                                                } else {
                                                    // Rechazar todos los <100
                                                    setRejectedMatchIndices(prev => new Set([...prev, ...below100Indices]));
                                                }
                                            }}
                                            className={`h-6 px-2.5 rounded text-2xs font-bold border transition-colors whitespace-nowrap ${
                                                autoMatches
                                                    .map((m, i) => m.score < 100 ? i : -1)
                                                    .filter(i => i !== -1)
                                                    .every(i => rejectedMatchIndices.has(i))
                                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400'
                                                    : 'border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30'
                                            }`}
                                            title="Rechazar / restaurar todos los matches con confianza menor al 100%"
                                        >
                                            Solo 100%
                                        </button>
                                    )}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className="h-6 w-6 rounded flex items-center justify-center border border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                                                title="Configurar columnas visibles"
                                            >
                                                <EyeIcon className="h-3.5 w-3.5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-slate-800 z-50">
                                            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-slate-500">Columnas Visibles</DropdownMenuLabel>
                                            {MATCH_COLS_DEFS.map(c => (
                                                <DropdownMenuCheckboxItem
                                                    key={c.key}
                                                    checked={visibleMatchCols[c.key]}
                                                    onCheckedChange={v => setVisibleMatchCols(prev => ({ ...prev, [c.key]: v }))}
                                                    onSelect={e => e.preventDefault()}
                                                >
                                                    {c.label}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                {/* Tabla de coincidencias */}
                                <table className="w-full text-xs">
                                    <thead className="sticky top-[37px] bg-purple-50/90 dark:bg-purple-900/30 z-[9]">
                                        <tr className="border-b border-purple-100 dark:border-purple-900/40">
                                            <th className="text-left pl-4 pr-2 py-1.5 text-2xs font-semibold text-purple-500 uppercase tracking-wider w-6">#</th>
                                            {/* Source cols */}
                                            {visibleMatchCols.fecha       && <th className="text-left px-2 py-1.5 text-2xs font-semibold text-purple-500 uppercase tracking-wider">Fecha Banco</th>}
                                            {visibleMatchCols.valor       && <th className="text-right px-2 py-1.5 text-2xs font-semibold text-purple-500 uppercase tracking-wider">Valor Banco</th>}
                                            {visibleMatchCols.descripcion && <th className="text-left px-2 py-1.5 text-2xs font-semibold text-purple-500 uppercase tracking-wider">Desc. Banco</th>}
                                            {/* Middle */}
                                            {visibleMatchCols.score       && <th className="text-center px-2 py-1.5 text-2xs font-semibold text-purple-500 uppercase tracking-wider">Confianza</th>}
                                            {visibleMatchCols.diff_valor  && <th className="text-right px-2 py-1.5 text-2xs font-semibold text-purple-500 uppercase tracking-wider">Dif.$</th>}
                                            {visibleMatchCols.diff_dias   && <th className="text-right px-2 py-1.5 text-2xs font-semibold text-purple-500 uppercase tracking-wider">Dif.Días</th>}
                                            {/* Target cols */}
                                            {visibleMatchCols.fecha       && <th className="text-left px-2 py-1.5 text-2xs font-semibold text-blue-500 uppercase tracking-wider">Fecha Asiento</th>}
                                            {visibleMatchCols.valor       && <th className="text-right px-2 py-1.5 text-2xs font-semibold text-blue-500 uppercase tracking-wider">Valor Asiento</th>}
                                            {visibleMatchCols.descripcion && <th className="text-left px-2 py-1.5 text-2xs font-semibold text-blue-500 uppercase tracking-wider">Desc. Asiento</th>}
                                            <th className="text-right pr-4 py-1.5 text-2xs font-semibold text-slate-400 uppercase tracking-wider">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-purple-100 dark:divide-purple-900/30">
                                        {autoMatches.map((m, i) => {
                                            const rejected = rejectedMatchIndices.has(i);
                                            const isLowConfidence = m.score < 100;
                                            return (
                                                <tr
                                                    key={i}
                                                    className={`transition-opacity hover:bg-purple-50/70 dark:hover:bg-purple-900/20 ${
                                                        rejected ? 'opacity-30' : ''
                                                    }`}
                                                >
                                                    <td className="pl-4 pr-2 py-2 text-2xs text-purple-300 font-mono">{i + 1}</td>
                                                    {/* Source */}
                                                    {visibleMatchCols.fecha       && <td className="px-2 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(m.sourceRecord.date)}</td>}
                                                    {visibleMatchCols.valor       && <td className="px-2 py-2 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{fmt(m.sourceRecord.amount)}</td>}
                                                    {visibleMatchCols.descripcion && <td className="px-2 py-2 text-slate-500 truncate max-w-[160px]">{m.sourceRecord.description || '—'}</td>}
                                                    {/* Score / diff cols */}
                                                    {visibleMatchCols.score       && <td className="px-2 py-2 text-center"><ScorePill score={m.score} /></td>}
                                                    {visibleMatchCols.diff_valor  && <td className="px-2 py-2 text-right text-2xs font-medium text-amber-600">{m.amountDiff !== undefined ? fmt(m.amountDiff) : '—'}</td>}
                                                    {visibleMatchCols.diff_dias   && <td className="px-2 py-2 text-right text-2xs font-medium text-amber-600">{m.dateDiff !== undefined ? `${m.dateDiff}d` : '—'}</td>}
                                                    {/* Target */}
                                                    {visibleMatchCols.fecha       && <td className="px-2 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(m.targetRecord.date)}</td>}
                                                    {visibleMatchCols.valor       && <td className="px-2 py-2 text-right font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">{fmt(m.targetRecord.amount)}</td>}
                                                    {visibleMatchCols.descripcion && <td className="px-2 py-2 text-slate-500 truncate max-w-[160px]">{m.targetRecord.description || '—'}</td>}
                                                    {/* Acciones */}
                                                    <td className="pr-4 py-2">
                                                        <div className="flex items-center justify-end gap-1 shrink-0">
                                                            {!rejected ? (
                                                                <>
                                                                    {isLowConfidence && (
                                                                        <button
                                                                            onClick={() => handleReassignMatch(i)}
                                                                            className="px-2 py-0.5 rounded text-2xs font-semibold text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                                                                            title="Rechazar este match y elegir otro asiento manualmente"
                                                                        >
                                                                            Reasignar
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => setRejectedMatchIndices(prev => new Set([...prev, i]))}
                                                                        className="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                                                        title="Rechazar"
                                                                    >
                                                                        <XMarkIcon className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setRejectedMatchIndices(prev => { const n = new Set(prev); n.delete(i); return n; })}
                                                                    className="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 transition-colors"
                                                                    title="Restaurar"
                                                                >
                                                                    <ArrowPathIcon className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* ─── PANEL MODO INVERTIDO: resultados de búsqueda ─── */}
                        {reverseMode && selectedReverseTargetIds.size > 0 && (
                            <div className="shrink-0 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                {/* Header */}
                                <div className="flex items-center gap-2 px-4 py-2 border-b border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
                                    <ArrowsRightLeftIcon className="h-4 w-4 text-orange-600" />
                                    <span className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-caps flex-1">
                                        Búsqueda inversa
                                        <span className="ml-2 font-normal text-orange-500">
                                            ({selectedReverseTargetIds.size} {selectedReverseTargetIds.size === 1 ? 'asiento' : 'asientos'}) 
                                            suma: {fmt(selectedReverseTargetSum)}
                                        </span>
                                    </span>
                                    {loadingAllBanks ? (
                                        <span className="text-2xs text-orange-500 italic">Cargando cuentas…</span>
                                    ) : (
                                        <span className="text-2xs text-orange-600 font-semibold">
                                            {reverseMatches.length === 0 ? 'Sin coincidencias' : `${reverseMatches.length} coincidencia${reverseMatches.length !== 1 ? 's' : ''}`}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => setSelectedReverseTargetIds(new Set())}
                                        className="h-5 w-5 rounded flex items-center justify-center text-orange-400 hover:text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                                    >
                                        <XMarkIcon className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {/* Resultados */}
                                {reverseMatches.length === 0 && !loadingAllBanks ? (
                                    <div className="flex items-center justify-center gap-2 py-4 text-xs text-orange-400">
                                        <XCircleIcon className="h-4 w-4" />
                                        No se encontró ningún movimiento bancario con el valor {fmt(selectedReverseTargetSum)} en ninguna cuenta.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-orange-100 dark:border-orange-900/40">
                                                    <th className="text-left pl-4 pr-2 py-1.5 text-2xs font-semibold text-orange-500 uppercase tracking-wider">Cuenta Bancaria</th>
                                                    <th className="text-left px-2 py-1.5 text-2xs font-semibold text-orange-500 uppercase tracking-wider">Fecha</th>
                                                    <th className="text-right px-2 py-1.5 text-2xs font-semibold text-orange-500 uppercase tracking-wider">Valor</th>
                                                    <th className="text-left px-2 py-1.5 text-2xs font-semibold text-orange-500 uppercase tracking-wider">Descripción</th>
                                                    <th className="text-center px-2 py-1.5 text-2xs font-semibold text-orange-500 uppercase tracking-wider">Estado</th>
                                                    <th className="text-center px-2 py-1.5 text-2xs font-semibold text-orange-500 uppercase tracking-wider">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-orange-100 dark:divide-orange-900/30">
                                                {reverseMatches.map((m, idx) => {
                                                    const matchKey = `${m.accountId}:${m.record.id}`;
                                                    const isSavingThis = savingReverseMatchId === matchKey;
                                                    return (
                                                    <tr
                                                        key={`${m.accountId}-${m.record.id}-${idx}`}
                                                        className={`transition-colors ${
                                                            m.alreadyConciliated
                                                                ? 'bg-emerald-50/60 dark:bg-emerald-900/10'
                                                                : 'hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                                        }`}
                                                    >
                                                        <td className="pl-4 pr-2 py-2">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold ${
                                                                m.accountId === selectedAccountId
                                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                                            }`}>
                                                                {m.accountId === selectedAccountId && '★ '}{m.accountLabel}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(m.record.date)}</td>
                                                        <td className="px-2 py-2 text-right font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{fmt(m.record.amount)}</td>
                                                        <td className="px-2 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[220px]">{m.record.description || '—'}</td>
                                                        <td className="px-2 py-2 text-center">
                                                            {m.alreadyConciliated ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                                                    <CheckCircleIcon className="h-3 w-3" />
                                                                    Conciliado
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                                                    <ClockIcon className="h-3 w-3" />
                                                                    Pendiente
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-2 text-center">
                                                            {!m.alreadyConciliated ? (
                                                                <button
                                                                    onClick={() => handleReverseConciliar(m)}
                                                                    disabled={!!savingReverseMatchId}
                                                                    title="Conciliar este par"
                                                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-bold transition-all ${
                                                                        isSavingThis
                                                                            ? 'bg-purple-100 text-purple-400 cursor-wait'
                                                                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:hover:bg-purple-900/60 cursor-pointer'
                                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                >
                                                                    {isSavingThis ? (
                                                                        <>
                                                                            <ArrowPathIcon className="h-3 w-3 animate-spin" />
                                                                            Guardando…
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <LinkIcon className="h-3 w-3" />
                                                                            Conciliar
                                                                        </>
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <span className="text-2xs text-slate-400">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── SPLIT PANEL ─── */}
                        <div className="grid grid-cols-2 gap-3" style={{ height: 'calc(100vh - 280px)' }}>
                            {/* PANEL SOURCE */}
                            <div className="flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
                                    <WalletIcon className="h-4 w-4 text-purple-600" />
                                    <span className="text-xs font-bold uppercase tracking-caps text-purple-700 dark:text-purple-400 whitespace-nowrap">
                                        {selectedAccount?.label}
                                    </span>

                                    <div className="flex-1 ml-2 relative">
                                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                            <MagnifyingGlassIcon className="h-3.5 w-3.5 text-purple-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Buscar en extracto..."
                                            value={sourceSearch}
                                            onChange={e => setSourceSearch(e.target.value)}
                                            className="block w-full pl-7 pr-2 py-1 text-xs border border-purple-200 dark:border-purple-800 rounded bg-white dark:bg-purple-900/20 text-slate-800 dark:text-slate-200 placeholder-purple-400 dark:placeholder-purple-600 outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400 transition-all"
                                        />
                                    </div>

                                    {/* Contadores Sospechosos / Registrados */}
                                    <div className="flex items-center gap-1.5 ml-1">
                                        {suspectedPendingCount > 0 && (
                                            <button
                                                onClick={() => { setShowOnlySuspected(v => !v); setShowOnlyRegistered(false); }}
                                                title={showOnlySuspected ? 'Ver todos' : 'Ver solo sospechosos'}
                                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-2xs font-bold border transition-colors ${
                                                    showOnlySuspected
                                                        ? 'bg-amber-500 text-white border-amber-600'
                                                        : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                                }`}
                                            >
                                                <ExclamationTriangleIcon className="h-3 w-3" />
                                                {suspectedPendingCount}
                                            </button>
                                        )}

                                        {registeredPendingCount > 0 && (
                                            <button
                                                onClick={() => { setShowOnlyRegistered(v => !v); setShowOnlySuspected(false); }}
                                                title={showOnlyRegistered ? 'Ver todos' : 'Ver solo registrados'}
                                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-2xs font-bold border transition-colors ${
                                                    showOnlyRegistered
                                                        ? 'bg-emerald-500 text-white border-emerald-600'
                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                                }`}
                                            >
                                                <CheckCircleIcon className="h-3 w-3" />
                                                {registeredPendingCount}
                                            </button>
                                        )}
                                    </div>

                                    <span className="text-2xs text-slate-400">{pendingSource.length}</span>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="h-6 w-6 rounded flex items-center justify-center border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors" title="Configurar columnas">
                                                <EyeIcon className="h-3.5 w-3.5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-800 z-50">
                                            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-slate-500">Columnas Visibles</DropdownMenuLabel>
                                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                                {SOURCE_COLS_DEFS.map(c => (
                                                    <DropdownMenuCheckboxItem
                                                        key={c.key}
                                                        checked={visibleSourceCols[c.key]}
                                                        onCheckedChange={v => setVisibleSourceCols(prev => ({ ...prev, [c.key]: v }))}
                                                        onSelect={e => e.preventDefault()}
                                                    >
                                                        {c.label}
                                                    </DropdownMenuCheckboxItem>
                                                ))}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>



                                <div ref={sourceScrollRef} className="flex-1 overflow-y-auto min-h-0 scroller-hide">
                                    {pendingSource.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-32 gap-2">
                                            {showOnlySuspected ? (
                                                <>
                                                    <ExclamationTriangleIcon className="h-6 w-6 text-amber-300" />
                                                    <span className="text-xs text-slate-400">No hay registros sospechosos marcados</span>
                                                    <button onClick={() => setShowOnlySuspected(false)} className="text-2xs text-purple-500 hover:underline">Ver todos</button>
                                                </>
                                            ) : showOnlyRegistered ? (
                                                <>
                                                    <CheckCircleIcon className="h-6 w-6 text-emerald-300" />
                                                    <span className="text-xs text-slate-400">No hay registros marcados como ya contabilizados</span>
                                                    <button onClick={() => setShowOnlyRegistered(false)} className="text-2xs text-purple-500 hover:underline">Ver todos</button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-slate-400">✓ Todo conciliado</span>
                                            )}
                                        </div>
                                    ) : (
                                        <table className="w-full text-xs">
                                            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                                                <tr>
                                                    {visibleSourceCols.fecha && <th className="text-left px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>}
                                                    {visibleSourceCols.valor && <th className="text-right px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>}
                                                    {visibleSourceCols.sucursal && <th className="text-left px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider">Sucursal</th>}
                                                    {visibleSourceCols.referencia && <th className="text-left px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider">Referencia</th>}
                                                    {visibleSourceCols.doc_banco && <th className="text-left px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider">Doc. Banco</th>}
                                                    {visibleSourceCols.descripcion && <th className="text-left px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider">Descripción</th>}
                                                    {visibleSourceCols.notas && <th className="text-left px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider w-32">Notas</th>}
                                                    <th className="w-14 px-1 py-2 pr-4 text-right text-2xs font-semibold text-slate-500 uppercase tracking-wider">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pendingSource.map(r => {
                                                    const isSuspected = suspectedIds.has(r.id);
                                                    return (
                                                    <tr key={r.id}
                                                        ref={el => { if (el) sourceRowRefs.current.set(r.id, el); }}
                                                        onClick={() => handleSourceClick(r)}
                                                        onMouseEnter={() => handleSourceHover(r)}
                                                        onMouseLeave={() => handleSourceHover(null)}
                                                        title={isSuspected ? 'Marcado como sospechoso — sin match posible' : undefined}
                                                        className={`border-b cursor-pointer transition-all duration-200 group ${
                                                            selectedSourceIds.has(r.id)
                                                                ? 'bg-purple-100 dark:bg-purple-900/30 ring-1 ring-inset ring-purple-300 border-purple-100 dark:border-purple-800'
                                                                : registeredIds.has(r.id)
                                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                                                : isSuspected
                                                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/40 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                                                                : hoveredSourceId === r.id
                                                                ? 'bg-purple-50/60 dark:bg-purple-900/10 border-slate-50 dark:border-slate-700/50'
                                                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/30 border-slate-50 dark:border-slate-700/50'
                                                        }`}
                                                    >
                                                        {visibleSourceCols.fecha && (
                                                            <td className={`px-3 py-2 whitespace-nowrap ${
                                                                registeredIds.has(r.id) ? 'text-emerald-700 dark:text-emerald-400' :
                                                                selectedSourceIds.has(r.id) ? 'text-purple-700 dark:text-purple-400 font-bold' :
                                                                isSuspected ? 'text-amber-700 dark:text-amber-400' : 
                                                                'text-slate-600 dark:text-slate-400'
                                                            }`}>{fmtDate(r.date)}</td>
                                                        )}
                                                        {visibleSourceCols.valor && (
                                                            <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${
                                                                registeredIds.has(r.id) ? 'text-emerald-800 dark:text-emerald-300' :
                                                                selectedSourceIds.has(r.id) ? 'text-purple-800 dark:text-purple-300' :
                                                                isSuspected ? 'text-amber-800 dark:text-amber-300' : 
                                                                'text-slate-800 dark:text-slate-200'
                                                            }`}>{fmt(r.amount)}</td>
                                                        )}
                                                        {visibleSourceCols.sucursal && <td className="px-3 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{r.raw?.sucursal || '—'}</td>}
                                                        {visibleSourceCols.referencia && <td className="px-3 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{r.raw?.referencia || '—'}</td>}
                                                        {visibleSourceCols.doc_banco && <td className="px-3 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{r.raw?.doc_banco || '—'}</td>}
                                                        {visibleSourceCols.descripcion && (
                                                            <td className="px-3 py-2 truncate max-w-[250px]">
                                                                <span className={
                                                                    registeredIds.has(r.id) ? 'text-emerald-700 dark:text-emerald-400' :
                                                                    isSuspected ? 'text-amber-700 dark:text-amber-400' : 
                                                                    'text-slate-500 dark:text-slate-400'
                                                                }>
                                                                    {r.description || '—'}
                                                                </span>
                                                            </td>
                                                        )}
                                                        {visibleSourceCols.notas && (
                                                            <td className="px-3 py-2">
                                                                <div className="flex items-center gap-1.5 group/note">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); openNoteModal(r, 'source'); }}
                                                                        className={`flex-shrink-0 h-6 w-6 rounded flex items-center justify-center transition-all ${
                                                                            r.notes 
                                                                                ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/40' 
                                                                                : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-purple-500 hover:bg-purple-50'
                                                                        }`}
                                                                        title={r.notes ? 'Editar nota' : 'Añadir nota'}
                                                                    >
                                                                        {r.notes ? <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5" /> : <PencilSquareIcon className="h-3.5 w-3.5" />}
                                                                    </button>
                                                                    {r.notes && (
                                                                        <span className="text-2xs text-slate-500 dark:text-slate-400 truncate max-w-[100px] italic" title={r.notes}>
                                                                            {r.notes}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        )}
                                                        {/* Botones de acción (sospechoso / registrado) */}
                                                        <td className="w-14 px-1 py-2 pr-4">
                                                            <div className="flex items-center justify-end gap-0.5">
                                                                <button
                                                                    onClick={e => toggleSuspected(r.id, e)}
                                                                    title={isSuspected ? 'Quitar marca de sospechoso' : 'Marcar como sospechoso (sin match)'}
                                                                    className={`h-5 w-5 rounded flex items-center justify-center transition-all ${
                                                                        isSuspected
                                                                            ? 'text-amber-500 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200'
                                                                            : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-amber-400 hover:bg-amber-50'
                                                                    }`}
                                                                >
                                                                    <ExclamationTriangleIcon className="h-3 w-3" />
                                                                </button>
                                                                <button
                                                                    onClick={e => toggleRegistered(r.id, e)}
                                                                    title={registeredIds.has(r.id) ? 'Quitar marca de registrado' : 'Marcar como ya registrado en contabilidad'}
                                                                    className={`h-5 w-5 rounded flex items-center justify-center transition-all ${
                                                                        registeredIds.has(r.id)
                                                                            ? 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200'
                                                                            : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-emerald-400 hover:bg-emerald-50'
                                                                    }`}
                                                                >
                                                                    <CheckCircleIcon className="h-3 w-3" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                            {/* PANEL TARGET */}
                            <div className={`flex flex-col bg-white dark:bg-slate-800 rounded-xl border overflow-hidden transition-colors ${
                                reverseMode
                                    ? 'border-orange-300 dark:border-orange-700 ring-1 ring-orange-200 dark:ring-orange-900'
                                    : isManualMode
                                    ? 'border-blue-300 dark:border-blue-700 ring-1 ring-blue-200 dark:ring-blue-800'
                                    : 'border-slate-200 dark:border-slate-700'
                            }`}>
                                <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${
                                    reverseMode
                                        ? 'bg-orange-50 dark:bg-orange-900/15 border-orange-200 dark:border-orange-800'
                                        : isManualMode
                                        ? 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                        : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                                }`}>
                                    <DocumentTextIcon className={`h-4 w-4 ${reverseMode ? 'text-orange-600' : 'text-blue-600'}`} />
                                    <span className={`text-xs font-bold uppercase tracking-caps whitespace-nowrap ${
                                        reverseMode ? 'text-orange-700 dark:text-orange-400' : 'text-blue-700 dark:text-blue-400'
                                    }`}>
                                        Asientos Contables
                                    </span>
                                    
                                    <div className="flex-1 ml-2 relative">
                                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                            <MagnifyingGlassIcon className="h-3.5 w-3.5 text-blue-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Buscar en asientos..."
                                            value={targetSearch}
                                            onChange={e => setTargetSearch(e.target.value)}
                                            className="block w-full pl-7 pr-2 py-1 text-xs border border-blue-200 dark:border-blue-800 rounded bg-white dark:bg-blue-900/20 text-slate-800 dark:text-slate-200 placeholder-blue-400 dark:placeholder-blue-600 outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-all"
                                        />
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                title="Excluir Cuentas"
                                                className={`h-7 px-2.5 ml-2 rounded text-xs flex items-center gap-1.5 transition-colors border ${
                                                    excludedAccountsSet.size > 0
                                                        ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-400 font-semibold'
                                                        : 'bg-white border-blue-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-blue-800 dark:text-slate-400 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                <FunnelIcon className="h-3.5 w-3.5" />
                                                <span className="hidden sm:inline">Excluir</span>
                                                {excludedAccountsSet.size > 0 && (
                                                    <span className="bg-rose-500 text-white text-[10px] rounded-full px-1.5 leading-tight">{excludedAccountsSet.size}</span>
                                                )}
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-64 bg-white dark:bg-slate-800 z-50">
                                            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-slate-500 flex justify-between items-center pr-2">
                                                <span>Cuentas a Excluir</span>
                                                {excludedAccountsSet.size > 0 && (
                                                    <button 
                                                        onClick={(e) => { e.preventDefault(); setTargetExcludeAccounts(''); }}
                                                        className="text-rose-500 hover:text-rose-600 font-semibold normal-case"
                                                    >
                                                        Limpiar
                                                    </button>
                                                )}
                                            </DropdownMenuLabel>
                                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                {uniqueAccounts.length === 0 ? (
                                                    <div className="px-2 py-4 text-center text-xs text-slate-400">Sin cuentas</div>
                                                ) : (
                                                    uniqueAccounts.map(account => (
                                                        <DropdownMenuCheckboxItem
                                                            key={account}
                                                            checked={excludedAccountsSet.has(account)}
                                                            onCheckedChange={v => toggleExcludedAccount(account, v)}
                                                            onSelect={e => e.preventDefault()}
                                                        >
                                                            {account || '(Sin cuenta)'}
                                                        </DropdownMenuCheckboxItem>
                                                    ))
                                                )}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Toggle Modo Invertido */}
                                    <button
                                        onClick={toggleReverseMode}
                                        title={reverseMode ? 'Desactivar modo invertido' : 'Activar modo invertido: buscar asiento en cuentas bancarias'}
                                        className={`ml-2 h-7 px-2.5 flex items-center gap-1.5 rounded-md border text-2xs font-bold transition-all ${
                                            reverseMode
                                                ? 'bg-orange-100 border-orange-400 text-orange-700 dark:bg-orange-900/40 dark:border-orange-600 dark:text-orange-400 shadow-sm'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50'
                                        }`}
                                    >
                                        <ArrowsRightLeftIcon className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">{reverseMode ? 'Invertido' : 'Invertir'}</span>
                                        {reverseMode && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                        )}
                                    </button>

                                    {!reverseMode && isManualMode && (
                                        <span className="text-2xs text-blue-500 font-medium ml-2 whitespace-nowrap">— click para vincular</span>
                                    )}
                                    {reverseMode && (
                                        <span className="text-2xs text-orange-500 font-medium ml-1 whitespace-nowrap">
                                            {loadingAllBanks ? 'Cargando cuentas…' : '— click en asiento para buscar'}
                                        </span>
                                    )}
                                    <span className="text-2xs text-slate-400 ml-2">{pendingTarget.length}</span>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="h-6 w-6 rounded flex items-center justify-center border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors" title="Configurar columnas">
                                                <EyeIcon className="h-3.5 w-3.5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-800 z-50">
                                            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-slate-500">Columnas Visibles</DropdownMenuLabel>
                                            <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                                                {TARGET_COLS_DEFS.map(c => (
                                                    <DropdownMenuCheckboxItem
                                                        key={c.key}
                                                        checked={visibleTargetCols[c.key]}
                                                        onCheckedChange={v => setVisibleTargetCols(prev => ({ ...prev, [c.key]: v }))}
                                                        onSelect={e => e.preventDefault()}
                                                    >
                                                        {c.label}
                                                    </DropdownMenuCheckboxItem>
                                                ))}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div ref={targetScrollRef} className="flex-1 overflow-y-auto min-h-0 scroller-hide">
                                    {pendingTarget.length === 0 ? (
                                        <div className="flex items-center justify-center h-32 text-xs text-slate-400">✓ Todo conciliado</div>
                                    ) : (
                                        <table className="w-full text-xs">
                                            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                                                <tr>
                                                    {visibleTargetCols.fecha && <th className="text-left px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>}
                                                    {visibleTargetCols.valor && <th className="text-right px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider">Valor</th>}
                                                    {visibleTargetCols.cuenta && <th className="text-left px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider">Cuenta</th>}
                                                    {visibleTargetCols.contacto && <th className="text-left px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider">Contacto</th>}
                                                    {visibleTargetCols.identificacion && <th className="text-left px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider">Identific.</th>}
                                                    {visibleTargetCols.centro_costo && <th className="text-left px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider">Centro C.</th>}
                                                    {visibleTargetCols.documento && <th className="text-left px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider">Documento</th>}
                                                    {visibleTargetCols.descripcion && <th className="text-left px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider">Descripción</th>}
                                                    {visibleTargetCols.notas && <th className="text-left px-3 py-2 text-2xs font-semibold text-slate-500 uppercase tracking-wider w-32">Notas</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pendingTarget.map(r => {
                                                    const isHighlighted = highlightedTargetIds.has(r.id);
                                                    const isSuggested = suggestions.some(s => s.record.id === r.id);
                                                    const isTargetSelected = selectedTargetId === r.id;
                                                    const isReverseSelected = reverseMode && selectedReverseTargetIds.has(r.id);

                                                    return (
                                                        <tr key={r.id}
                                                            ref={el => { if (el) targetRowRefs.current.set(r.id, el); }}
                                                            onClick={() => {
                                                                if (reverseMode) {
                                                                    setSelectedReverseTargetIds(prev => {
                                                                        const next = new Set(prev);
                                                                        if (next.has(r.id)) next.delete(r.id);
                                                                        else next.add(r.id);
                                                                        return next;
                                                                    });
                                                                } else if (isManualMode) {
                                                                    handleTargetClick(r);
                                                                }
                                                            }}
                                                            className={`border-b border-slate-50 dark:border-slate-700/50 transition-all duration-300 ${
                                                                reverseMode ? 'cursor-pointer' : isManualMode ? 'cursor-pointer' : ''
                                                            } ${
                                                                isReverseSelected
                                                                    ? 'bg-orange-100 dark:bg-orange-900/30 ring-1 ring-inset ring-orange-400'
                                                                    : isTargetSelected
                                                                    ? 'bg-blue-100 dark:bg-blue-900/30 ring-1 ring-inset ring-blue-400'
                                                                    : isSuggested
                                                                    ? 'bg-purple-50 dark:bg-purple-900/20 border-l-2 border-l-purple-400'
                                                                    : isHighlighted
                                                                    ? 'bg-blue-50/80 dark:bg-blue-900/15'
                                                                    : reverseMode
                                                                    ? 'hover:bg-orange-50/60 dark:hover:bg-orange-900/10'
                                                                    : isManualMode
                                                                    ? 'hover:bg-blue-50 dark:hover:bg-blue-900/10'
                                                                    : ''
                                                            }`}
                                                        >
                                                            {visibleTargetCols.fecha && <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{fmtDate(r.date)}</td>}
                                                            {visibleTargetCols.valor && <td className="px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{fmt(r.amount)}</td>}
                                                            {visibleTargetCols.cuenta && <td className="px-3 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{r.raw?.cuenta || '—'}</td>}
                                                            {visibleTargetCols.contacto && <td className="px-3 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{r.raw?.contacto || '—'}</td>}
                                                            {visibleTargetCols.identificacion && <td className="px-3 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{r.raw?.identificacion || '—'}</td>}
                                                            {visibleTargetCols.centro_costo && <td className="px-3 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{r.raw?.centro_costo || '—'}</td>}
                                                            {visibleTargetCols.documento && <td className="px-3 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{r.raw?.documento || '—'}</td>}
                                                            {visibleTargetCols.descripcion && <td className="px-3 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[250px]">{r.description || '—'}</td>}
                                                            {visibleTargetCols.notas && (
                                                                <td className="px-3 py-2">
                                                                    <div className="flex items-center gap-1.5 group/note">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); openNoteModal(r, 'target'); }}
                                                                            className={`flex-shrink-0 h-6 w-6 rounded flex items-center justify-center transition-all ${
                                                                                r.notes 
                                                                                    ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/40' 
                                                                                    : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-purple-500 hover:bg-purple-50'
                                                                            }`}
                                                                            title={r.notes ? 'Editar nota' : 'Añadir nota'}
                                                                        >
                                                                            {r.notes ? <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5" /> : <PencilSquareIcon className="h-3.5 w-3.5" />}
                                                                        </button>
                                                                        {r.notes && (
                                                                            <span className="text-2xs text-slate-500 dark:text-slate-400 truncate max-w-[100px] italic" title={r.notes}>
                                                                                {r.notes}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                ) : activeTab === 'historial' ? (
                    /* ═══ TAB HISTORIAL ═══ */
                    <div className="h-full flex flex-col min-h-0 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <SmartDataTable
                            id="reconciliation_history"
                            data={history}
                            columns={historyColumns}
                            enableSearch={true}
                            enableSelection={true}
                            enableExport={true}
                            enableColumnConfig={true}
                            searchPlaceholder="Buscar en historial consolidado..."
                            containerClassName="h-full"
                            scrollContainerClassName="max-h-full"
                            renderSelectionActions={(selectedIds) => (
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleReverseBulk(selectedIds)}
                                    className="h-8 px-3 gap-1.5 text-xs font-bold rounded-md"
                                >
                                    <ArrowPathIcon className="h-4 w-4" /> Revertir {selectedIds.size} Conciliaciones
                                </Button>
                            )}
                        />
                    </div>
                ) : (
                    /* ═══ TAB TRANSFERENCIAS ═══ */
                    <div className="h-full flex flex-col min-h-0 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                        {loadingTransfers && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        )}
                        <SmartDataTable
                            id="internal_transfers"
                            data={filteredTransfers}
                            columns={transferColumns}
                            enableSearch={true}
                            enableSelection={true}
                            enableExport={true}
                            enableColumnConfig={true}
                            searchPlaceholder="Buscar en transferencias..."
                            containerClassName="h-full"
                            scrollContainerClassName="max-h-full"
                            getRowClassName={(item) => 
                                registeredTransferIds.has(item.id) 
                                    ? '!bg-emerald-100/80 dark:!bg-emerald-900/40 hover:!bg-emerald-200/60 dark:hover:!bg-emerald-800/60' 
                                    : undefined
                            }
                            renderSelectionActions={(selectedIds) => (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        className="h-8 px-3 gap-1.5 text-xs font-bold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-md border-transparent"
                                        onClick={() => exportTransfersToCSV(selectedIds)}
                                    >
                                        <ArrowDownTrayIcon className="h-4 w-4" /> Exportar a CSV ({selectedIds.size})
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="h-8 px-3 gap-1.5 text-xs font-bold rounded-md"
                                        onClick={() => {
                                            setRegisteredTransferIds(prev => {
                                                const next = new Set(prev);
                                                selectedIds.forEach(id => next.add(id));
                                                return next;
                                            });
                                        }}
                                    >
                                        <CheckCircleIcon className="h-4 w-4" /> Marcar Registrados
                                    </Button>
                                </div>
                            )}
                        />
                    </div>
                )}
            </div>

            {/* ═══ MODAL REVERSIÓN ═══ */}
            {reversingId && (
                <div className="fixed inset-0 bg-black/40 z-[90] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="h-12 w-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center shrink-0">
                                <ArrowPathIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">¿Revertir Conciliación?</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Los registros se desvincularán y el asiento volverá a estar pendiente de forma automática.</p>
                            </div>
                        </div>
                        <div className="flex justify-center gap-3 mt-6">
                            <Button variant="secondary" size="md" onClick={() => setReversingId(null)}>Cancelar</Button>
                            <Button variant="danger" size="md" onClick={handleReverse} isLoading={saving}>Sí, revertir</Button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* ═══ MODAL DETALLE HISTORIAL ═══ */}
            {historyDetailRow && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 relative">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <DocumentTextIcon className="h-5 w-5 text-purple-500" />
                                Detalle de Asiento Contable
                            </h3>
                            <button onClick={() => setHistoryDetailRow(null)} className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        {(() => {
                            const target = targetRecords.find(r => r.id === historyDetailRow.target_record_id);
                            if (!target) return <p className="text-xs text-slate-500 italic py-4">No se pudo encontrar el detalle del registro contable.</p>;
                            
                            return (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <span className="block text-2xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Fecha Contabilizada</span>
                                            <span className="text-slate-700 dark:text-slate-200 font-medium">{fmtDate(target.date)}</span>
                                        </div>
                                        <div>
                                            <span className="block text-2xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Valor Neto</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-100">{fmt(target.amount)}</span>
                                        </div>
                                        <div>
                                            <span className="block text-2xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Cuenta Asignada</span>
                                            <span className="text-slate-700 dark:text-slate-200 truncate" title={target.raw?.cuenta}>{target.raw?.cuenta || '—'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-2xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Contacto / Tercero</span>
                                            <span className="text-slate-700 dark:text-slate-200 truncate" title={target.raw?.contacto}>{target.raw?.contacto || '—'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-2xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Documento</span>
                                        <span className="text-slate-700 dark:text-slate-200 font-mono text-xs">{target.raw?.documento || '—'}</span>
                                    </div>
                                    <div className="pt-2">
                                        <span className="block text-2xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Descripción del Asiento</span>
                                        <p className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-lg text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                                            {target.description || '—'}
                                        </p>
                                    </div>
                                    <div className="mt-6 flex justify-end border-t border-slate-100 dark:border-slate-700/50 pt-4">
                                        <Button variant="secondary" size="md" onClick={() => setHistoryDetailRow(null)}>Cerrar</Button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
            {/* ═══ MODAL NOTAS ═══ */}
            {editingNoteRecord && (
                <Modal
                    isOpen={!!editingNoteRecord}
                    onClose={() => setEditingNoteRecord(null)}
                    title={editingNoteRecord.record.notes ? 'Editar Nota' : 'Añadir Nota'}
                >
                    <div className="space-y-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800/50">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-2xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                    {editingNoteRecord.type === 'source' ? 'Registro Bancario' : 'Asiento Contable'}
                                </span>
                                <span className="text-2xs font-mono text-slate-500">{editingNoteRecord.record.id.slice(0, 8)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[180px]">
                                    {editingNoteRecord.record.description || 'Sin descripción'}
                                </span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {fmt(editingNoteRecord.record.amount)}
                                </span>
                            </div>
                        </div>

                        <FormGroup label="Comentario o Nota" description="Este comentario será visible en la tabla de conciliación.">
                            <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                className="w-full min-h-[100px] p-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                                placeholder="Escribe aquí una observación importante..."
                                autoFocus
                            />
                        </FormGroup>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="secondary" onClick={() => setEditingNoteRecord(null)}>
                                Cancelar
                            </Button>
                            <Button 
                                variant="primary" 
                                onClick={handleSaveNote} 
                                isLoading={savingNote}
                                disabled={savingNote}
                            >
                                Guardar Nota
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
