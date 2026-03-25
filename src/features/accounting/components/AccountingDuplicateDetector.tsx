import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { DocumentDuplicateIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon, XMarkIcon } from '../../../components/ui/Icons';
import { ReconciliationBankService } from '../../../services/reconciliationBankService';

export interface TabularRow {
    id: string;
    cuenta: string;
    contacto: string;
    identificacion: string;
    centro_costo: string;
    documento: string;
    fecha: string;
    descripcion: string;
    descripcion_movimiento: string;
    base: number;
    saldo_inicial: number;
    debito: number;
    credito: number;
    saldo_final: number;
}

// ─── Utilidades de formato ────────────────────────────────────────────────────
const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) => {
    if (!d) return '—';
    const dt = new Date(d + 'T00:00:00');
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Motor de detección inteligente de duplicados ─────────────────────────────
function normText(val: any): string {
    if (val === null || val === undefined) return '';
    return String(val).trim().toLowerCase().replace(/\s+/g, ' ');
}

function normNum(val: any): string {
    const n = Number(val);
    return isNaN(n) ? '0' : String(Math.round(n));
}

interface DuplicateConfig {
    documento: boolean;
    debito: boolean;
    credito: boolean;
    cuenta: boolean;
    fecha: boolean;
    contacto: boolean;
    descripcion: boolean;
}

const CRITERIA_LABELS: Record<keyof DuplicateConfig, string> = {
    documento: 'Documento',
    debito: 'Débito',
    credito: 'Crédito',
    cuenta: 'Cuenta',
    fecha: 'Fecha',
    contacto: 'Contacto',
    descripcion: 'Descripción'
};

export interface DuplicateGroup {
    fingerprint: string;
    rows: TabularRow[];
}

function dynamicFingerprint(row: TabularRow, config: DuplicateConfig): string {
    const parts: string[] = [];
    if (config.documento) parts.push(normText(row.documento));
    if (config.debito) parts.push(normNum(row.debito));
    if (config.credito) parts.push(normNum(row.credito));
    if (config.cuenta) parts.push(normText(row.cuenta));
    if (config.fecha) parts.push(normText(row.fecha));
    if (config.contacto) parts.push(normText(row.contacto));
    if (config.descripcion) parts.push(normText(row.descripcion_movimiento || row.descripcion));
    return parts.join('|');
}

function detectExactDuplicates(rows: TabularRow[], config: DuplicateConfig): DuplicateGroup[] {
    const activeCriteria = (Object.values(config) as boolean[]).filter(Boolean).length;
    if (activeCriteria === 0) return [];

    const buckets = new Map<string, TabularRow[]>();
    rows.forEach(row => {
        // Ignorar si solo se busca por montos y son 0
        const isOnlyAmounts = (config.debito || config.credito) && activeCriteria <= (Number(config.debito) + Number(config.credito));
        if (isOnlyAmounts && normNum(row.debito) === '0' && normNum(row.credito) === '0') return;

        const fp = dynamicFingerprint(row, config);
        if (!fp || fp.replace(/\|/g, '') === '') return;

        if (!buckets.has(fp)) buckets.set(fp, []);
        buckets.get(fp)!.push(row);
    });

    const groups: DuplicateGroup[] = [];
    buckets.forEach((groupRows, fp) => {
        if (groupRows.length >= 2) {
            groups.push({ fingerprint: fp, rows: groupRows });
        }
    });

    return groups.sort((a, b) => b.rows.length - a.rows.length);
}

// ─── Modal de duplicados ──────────────────────────────────────────────────────
interface DuplicateModalProps {
    isOpen: boolean;
    onClose: () => void;
    allRows: TabularRow[];
    onDeleteIds: (ids: string[]) => Promise<void>;
}

const DuplicateModal: React.FC<DuplicateModalProps> = ({ isOpen, onClose, allRows, onDeleteIds }) => {
    const [config, setConfig] = useState<DuplicateConfig>({
        documento: true,
        debito: true,
        credito: true,
        cuenta: false,
        fecha: true,
        contacto: false,
        descripcion: false
    });

    const [groups, setGroups] = useState<DuplicateGroup[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [expandedFingerprints, setExpandedFingerprints] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);

    // Detección automática al cambiar config o filas
    useEffect(() => {
        if (isOpen && allRows.length > 0) {
            const detectedGroups = detectExactDuplicates(allRows, config);
            setGroups(detectedGroups);
            
            // Auto expandir los primeros 3 grupos
            const initialExpanded = new Set<string>();
            detectedGroups.slice(0, 3).forEach(g => initialExpanded.add(g.fingerprint));
            setExpandedFingerprints(initialExpanded);
            setSelectedIds(new Set());
        }
    }, [config, allRows, isOpen]);

    const toggleRow = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleExpand = (fp: string) => {
        setExpandedFingerprints(prev => {
            const next = new Set(prev);
            next.has(fp) ? next.delete(fp) : next.add(fp);
            return next;
        });
    };

    const selectAllDuplicates = () => {
        const ids = new Set<string>();
        groups.forEach(g => {
            for (let i = 1; i < g.rows.length; i++) {
                ids.add(g.rows[i].id);
            }
        });
        setSelectedIds(ids);
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;
        setDeleting(true);
        try {
            await onDeleteIds(Array.from(selectedIds));
            setSelectedIds(new Set());
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-5xl" hideCloseIcon={true}>
            <div className="flex flex-col" style={{ maxHeight: '88vh' }}>

                <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 shrink-0 rounded-t-xl">
                    <DocumentDuplicateIcon className="h-5 w-5 text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300 uppercase tracking-caps">
                            Detección de duplicados exactos
                        </h2>
                        <p className="text-2xs text-amber-600 dark:text-amber-400 mt-0.5">
                            {groups.length === 0
                                ? 'No se encontraron duplicados con los criterios de cruce actuales'
                                : `${groups.length} grupo${groups.length !== 1 ? 's' : ''} detectado${groups.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-6 w-6 rounded flex items-center justify-center text-amber-500 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shrink-0"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                </div>

                {/* ─── Criterios de Selección ─── */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Criterios de cruce:</span>
                    {(Object.keys(CRITERIA_LABELS) as Array<keyof DuplicateConfig>).map(key => (
                        <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config[key]}
                                onChange={(e) => setConfig(prev => ({ ...prev, [key]: e.target.checked }))}
                                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                            />
                            <span className="text-xs text-slate-600 dark:text-slate-400 select-none">{CRITERIA_LABELS[key]}</span>
                        </label>
                    ))}
                </div>

                {/* ─── Barra de acciones ─── */}
                <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                    <button
                        onClick={selectAllDuplicates}
                        className="text-2xs font-semibold text-amber-600 hover:text-amber-800 hover:underline transition-colors"
                    >
                        Marcar duplicados sugeridos
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-2xs font-semibold text-slate-400 hover:text-slate-600 hover:underline transition-colors"
                    >
                        Limpiar selección
                    </button>
                    <span className="flex-1" />
                    {selectedIds.size > 0 && (
                        <span className="text-2xs text-slate-500 dark:text-slate-400">
                            {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
                        </span>
                    )}
                    <Button
                        variant="danger"
                        size="xs"
                        onClick={handleDelete}
                        isLoading={deleting}
                        disabled={selectedIds.size === 0}
                        className="gap-1"
                    >
                        <TrashIcon className="h-3 w-3" />
                        Eliminar seleccionados ({selectedIds.size})
                    </Button>
                </div>

                {/* ─── Contenido ─── */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {groups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <DocumentDuplicateIcon className="h-12 w-12 text-emerald-400 opacity-60" />
                            <p className="text-sm font-semibold text-emerald-600">¡Sin duplicados detectados!</p>
                            <p className="text-xs text-slate-400 text-center max-w-sm">
                                El análisis multi-campo no encontró registros con similaridad suficiente para ser considerados duplicados.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {groups.map(group => {
                                const isExpanded = expandedFingerprints.has(group.fingerprint);

                                return (
                                    <div key={group.fingerprint}>
                                        {/* Cabecera del grupo */}
                                        <div onClick={() => toggleExpand(group.fingerprint)} className="flex items-center gap-3 px-5 py-2.5 bg-slate-50/80 dark:bg-slate-800/80 hover:bg-amber-50/60 dark:hover:bg-amber-900/10 transition-colors cursor-pointer">
                                            <span className="text-amber-400">{isExpanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronUpIcon className="h-3.5 w-3.5 rotate-180" />}</span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                Grupo exacto
                                            </span>
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1 truncate">
                                                Match en criterios seleccionados
                                                <span className="ml-2 text-slate-400 font-normal text-2xs">— {group.rows.length} registros</span>
                                            </span>
                                        </div>

                                        {/* Pares de duplicados */}
                                        {isExpanded && (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800 text-left">
                                                            <th className="w-10 px-4 py-1.5"></th>
                                                            <th className="px-2 py-1.5 text-2xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                                                            <th className="px-2 py-1.5 text-2xs font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
                                                            <th className="px-2 py-1.5 text-2xs font-semibold text-slate-400 uppercase tracking-wider">Cuenta</th>
                                                            <th className="px-2 py-1.5 text-2xs font-semibold text-slate-400 uppercase tracking-wider">Contacto</th>
                                                            <th className="px-2 py-1.5 text-2xs font-semibold text-slate-400 uppercase tracking-wider">Documento</th>
                                                            <th className="px-2 py-1.5 text-right text-2xs font-semibold text-slate-400 uppercase tracking-wider">Débito</th>
                                                            <th className="px-2 py-1.5 text-right text-2xs font-semibold text-slate-400 uppercase tracking-wider">Crédito</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                                                        {group.rows.map((row, idx) => {
                                                            const rowSelected = selectedIds.has(row.id);
                                                            const isOriginal = idx === 0;

                                                            return (
                                                                <tr key={row.id} onClick={() => toggleRow(row.id)} className={`cursor-pointer transition-colors ${rowSelected ? 'bg-red-50 dark:bg-red-900/20' : (isOriginal ? 'bg-emerald-50/20 dark:bg-emerald-900/5' : 'hover:bg-amber-50/60 dark:hover:bg-amber-900/10')}`}>
                                                                    <td className="px-4 py-1.5">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={rowSelected}
                                                                            onChange={() => toggleRow(row.id)}
                                                                            onClick={e => e.stopPropagation()}
                                                                            className="h-3.5 w-3.5 rounded accent-red-500 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    <td className="px-2 py-1.5">{isOriginal ? <span className="text-2xs text-emerald-600 font-bold">Original</span> : <span className="text-2xs text-slate-400">Duplicado</span>}</td>
                                                                    <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(row.fecha)}</td>
                                                                    <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300 truncate max-w-[100px]">{row.cuenta || '—'}</td>
                                                                    <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400 truncate max-w-[110px]">{row.contacto || '—'}</td>
                                                                    <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400 truncate max-w-[90px]">{row.documento || '—'}</td>
                                                                    <td className="px-2 py-1.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(row.debito)}</td>
                                                                    <td className="px-2 py-1.5 text-right font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">{fmt(row.credito)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ─── Footer ─── */}
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 rounded-b-xl">
                    <p className="text-2xs text-slate-400 italic">
                        Los registros identificados como duplicados coinciden exactamente en los campos seleccionados.
                        El "Original" es el primero cronológicamente encontrado.
                    </p>
                    <Button variant="secondary" size="sm" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export const AccountingDuplicateDetector: React.FC<{ 
    tableName: string; 
    onDuplicatedDeleted: () => void; 
}> = ({ tableName, onDuplicatedDeleted }) => {
    const { setAlertModal } = useUI();

    const [dupModalOpen, setDupModalOpen] = useState(false);
    const [allRows, setAllRows] = useState<TabularRow[]>([]);
    const [dupLoading, setDupLoading] = useState(false);

    const handleDetectDuplicates = useCallback(async () => {
        setDupLoading(true);
        try {
            let allData: any[] = [];
            let from = 0;
            const step = 1000;
            let fetchMore = true;

            while (fetchMore) {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .order('fecha', { ascending: true })
                    .range(from, from + step - 1);

                if (error) throw error;
                
                if (data && data.length > 0) {
                    allData = [...allData, ...data];
                    if (data.length < step) fetchMore = false;
                    else from += step;
                } else {
                    fetchMore = false;
                }
            }

            const rows = allData as TabularRow[];
            setAllRows(rows);
            setDupModalOpen(true);
        } catch (err) {
            console.error('Error detectando duplicados:', err);
            setAlertModal({
                isOpen: true, type: 'error', title: 'Error',
                message: 'No se pudo analizar la tabla en busca de duplicados.',
            });
        } finally {
            setDupLoading(false);
        }
    }, [tableName, setAlertModal]);

    const handleDeleteDuplicateIds = useCallback(async (ids: string[]) => {
        // 1. Limpiar conciliaciones asociadas si las hay
        if (ids && ids.length > 0) {
            await ReconciliationBankService.cleanOrphanedReconciliationsByRecords(ids);
        }

        // 2. Eliminar de la tabla principal
        const { error } = await supabase
            .from(tableName)
            .delete()
            .in('id', ids);

        if (error) throw error;

        setAlertModal({
            isOpen: true, type: 'success', title: 'Eliminados',
            message: `Se eliminaron ${ids.length} registro${ids.length !== 1 ? 's' : ''} duplicados.`,
        });
        
        setDupModalOpen(false);
        onDuplicatedDeleted();
    }, [tableName, setAlertModal, onDuplicatedDeleted]);

    return (
        <>
            <Button
                variant="secondary"
                size="sm"
                onClick={handleDetectDuplicates}
                isLoading={dupLoading}
                className="gap-1.5 border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                title="Analizar todos los campos para detectar registros duplicados"
            >
                <DocumentDuplicateIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Detectar duplicados</span>
            </Button>

            <DuplicateModal
                isOpen={dupModalOpen}
                onClose={() => setDupModalOpen(false)}
                allRows={allRows}
                onDeleteIds={handleDeleteDuplicateIds}
            />
        </>
    );
};
