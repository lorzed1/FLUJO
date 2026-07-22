import React, { useState, useCallback } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { DocumentDuplicateIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon, XMarkIcon } from '../../../components/ui/Icons';
import { ReconciliationBankService } from '../../../services/reconciliationBankService';

interface BankRow {
    id: string;
    fecha: string;
    descripcion: string;
    referencia: string;
    valor: number;
}

const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) => {
    if (!d) return '—';
    const dt = new Date(d + 'T00:00:00');
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

function normText(val: any): string {
    if (val === null || val === undefined) return '';
    return String(val).trim().toLowerCase().replace(/\s+/g, ' ');
}

function normNum(val: any): string {
    const n = Number(val);
    return isNaN(n) ? '0' : String(Math.round(n));
}

interface DuplicateConfig {
    valor: boolean;
    fecha: boolean;
    referencia: boolean;
    descripcion: boolean;
}

const CRITERIA_LABELS: Record<keyof DuplicateConfig, string> = {
    valor: 'Valor',
    fecha: 'Fecha',
    referencia: 'Referencia',
    descripcion: 'Descripción'
};

export interface DuplicateGroup {
    fingerprint: string;
    rows: BankRow[];
}

function dynamicFingerprint(row: BankRow, config: DuplicateConfig): string {
    const parts: string[] = [];
    if (config.valor) parts.push(normNum(row.valor));
    if (config.fecha) parts.push(normText(row.fecha));
    if (config.referencia) parts.push(normText(row.referencia));
    if (config.descripcion) parts.push(normText(row.descripcion));
    return parts.join('|');
}

function detectExactDuplicates(rows: BankRow[], config: DuplicateConfig): DuplicateGroup[] {
    // Si no hay nada seleccionado, no hay duplicados
    if (!config.valor && !config.fecha && !config.referencia && !config.descripcion) {
        return [];
    }

    const buckets = new Map<string, BankRow[]>();
    rows.forEach(row => {
        // Ignorar filas en 0 si estamos buscando solo por valor
        if (config.valor && normNum(row.valor) === '0' && Object.values(config).filter(Boolean).length === 1) {
            return;
        }

        const fp = dynamicFingerprint(row, config);
        // Si el fingerprint está vacío o es irrelevante, nos lo podríamos saltar, 
        // pero validamos que no esté vacío.
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

    // Ordenar grupos, primero por los que tienen más duplicados
    return groups.sort((a, b) => b.rows.length - a.rows.length);
}

export const BankDuplicateDetector: React.FC<{ tableName: string; onDuplicatedDeleted: () => void; }> = ({ tableName, onDuplicatedDeleted }) => {
    const { setAlertModal } = useUI();
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    
    // Configuración actual de campos a cruzar
    const [config, setConfig] = useState<DuplicateConfig>({
        valor: true,
        fecha: true,
        referencia: false,
        descripcion: false
    });

    // Grupos y datos
    const [groups, setGroups] = useState<DuplicateGroup[]>([]);
    const [allRows, setAllRows] = useState<BankRow[]>([]);
    
    // UI state for modal
    const [expandedFingerprints, setExpandedFingerprints] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState(false);

    const toggleExpand = (fp: string) => {
        setExpandedFingerprints(prev => {
            const next = new Set(prev);
            if (next.has(fp)) next.delete(fp);
            else next.add(fp);
            return next;
        });
    };

    const toggleRow = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    /** Pre-seleccionar todos excepto el primero chronológicamente de cada grupo. 
     * SI hay uno conciliado, ese NO se selecciona (se deja como original).
     */
    const selectAllDuplicates = () => {
        const ids = new Set<string>();
        groups.forEach(g => {
            // Buscamos si hay alguno conciliado
            const conciliatedIdx = g.rows.findIndex(r => conciliatedIds.has(r.id));
            const baseIdx = conciliatedIdx !== -1 ? conciliatedIdx : 0;

            for (let i = 0; i < g.rows.length; i++) {
                if (i !== baseIdx) {
                    ids.add(g.rows[i].id);
                }
            }
        });
        setSelectedIds(ids);
    };

    // Estados de conciliación para visualización
    const [conciliatedIds, setConciliatedIds] = useState<Set<string>>(new Set());

    // Cargar IDs conciliados
    const loadConciliatedIds = useCallback(async () => {
        try {
            const { data: hist, error } = await supabase
                .from('reconciliation_history')
                .select('source_record_id')
                .eq('source_table', tableName)
                .eq('status', 'active');
            
            if (error) throw error;
            setConciliatedIds(new Set(hist?.map(h => h.source_record_id) || []));
        } catch (err) {
            console.error("Error al cargar conciliados para detector:", err);
        }
    }, [tableName]);

    // Recalcular duplicados si cambia la configuración
    React.useEffect(() => {
        if (isOpen && allRows.length > 0) {
            const detectedGroups = detectExactDuplicates(allRows, config);
            setGroups(detectedGroups);
            
            const initiallyExpanded = new Set<string>();
            detectedGroups.slice(0, 3).forEach(g => initiallyExpanded.add(g.fingerprint));
            setExpandedFingerprints(initiallyExpanded);
            setSelectedIds(new Set());
            loadConciliatedIds();
        }
    }, [config, allRows, isOpen, loadConciliatedIds]);

    const handleDetect = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from(tableName).select('*').order('fecha', { ascending: true });
            if (error) throw error;
            const rows = (data || []) as BankRow[];
            setAllRows(rows);
            // La detección auto-reacciona por el useEffect
            setIsOpen(true);
        } catch (err) {
            console.error(err);
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo analizar la tabla.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;

        // Validar si estamos intentando borrar algo conciliado
        const deletingConciliated = Array.from(selectedIds).some(id => conciliatedIds.has(id));

        setAlertModal({
            isOpen: true,
            type: 'error',
            title: deletingConciliated ? '⚠️ ADVERTENCIA: Borrado de conciliados' : 'Eliminar duplicados',
            message: deletingConciliated 
                ? `Estás a punto de eliminar ${selectedIds.size} registros, incluyendo algunos que ya están conciliados. Esto revertirá dichas conciliaciones automáticamente. ¿Estás seguro?`
                : `¿Estás seguro de eliminar permanentemente ${selectedIds.size} registro(s) duplicado(s)?`,
            showCancel: true,
            onConfirm: async () => {
                setAlertModal({ isOpen: false, message: '' });
                setDeleting(true);
                try {
                    const idsArr = Array.from(selectedIds);

                    // 1. Liberar el Asiento Contable (Revertir conciliaciones si el registro estaba conciliado)
                    await ReconciliationBankService.cleanOrphanedReconciliationsByRecords(idsArr);

                    // 2. Eliminar el registro de la tabla del banco
                    const { error } = await supabase.from(tableName).delete().in('id', idsArr);
                    if (error) throw error;
                    
                    setAlertModal({ isOpen: true, type: 'success', title: 'Eliminados', message: `Se eliminaron ${idsArr.length} registros y se limpió el historial.` });
                    setIsOpen(false);
                    onDuplicatedDeleted();
                } catch (err) {
                    console.error(err);
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Fallo al eliminar.' });
                } finally {
                    setDeleting(false);
                }
            }
        });
    };

    const rowMap = new Map<string, BankRow>();
    allRows.forEach(r => rowMap.set(r.id, r));

    return (
        <>
            <Button
                variant="secondary"
                size="sm"
                onClick={handleDetect}
                isLoading={isLoading}
                className="gap-1.5 border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                title="Analizar todos los campos para detectar registros duplicados"
            >
                <DocumentDuplicateIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Detectar duplicados</span>
            </Button>
            
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} maxWidth="max-w-5xl" hideCloseIcon={true}>
                <div className="flex flex-col" style={{ maxHeight: '88vh' }}>

                    {/* ─── Header ─── */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 shrink-0 rounded-t-xl">
                        <DocumentDuplicateIcon className="h-5 w-5 text-amber-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300 uppercase tracking-caps">
                                Detección de duplicados inteligente
                            </h2>
                            <p className="text-2xs text-amber-600 dark:text-amber-400 mt-0.5">
                                {groups.length === 0
                                    ? 'No se encontraron duplicados con los criterios de cruce actuales'
                                    : `${groups.length} grupo${groups.length !== 1 ? 's' : ''} detectado${groups.length !== 1 ? 's' : ''}`}
                            </p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="h-6 w-6 rounded flex items-center justify-center text-amber-500 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shrink-0"
                        >
                            <XMarkIcon className="h-4 w-4" />
                        </button>
                    </div>

                    {/* ─── Criterios de Selección ─── */}
                    <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Criterios de cruce:</span>
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
                            Marcar duplicados sugeridos (sin conciliación)
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
                                            <div onClick={() => toggleExpand(group.fingerprint)} className="flex items-center gap-3 px-5 py-2.5 bg-slate-50/80 dark:bg-slate-800/80 hover:bg-amber-50/60 dark:hover:bg-amber-900/10 transition-colors cursor-pointer">
                                                <span className="text-amber-400">{isExpanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronUpIcon className="h-3.5 w-3.5 rotate-180" />}</span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                    Grupo detectado
                                                </span>
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1 truncate">
                                                    Match en criterios seleccionados
                                                    <span className="ml-2 text-slate-400 font-normal text-2xs">— {group.rows.length} registros</span>
                                                </span>
                                            </div>
                                            {isExpanded && (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800">
                                                                <th className="w-8 px-4 py-1.5"></th>
                                                                <th className="text-left px-2 py-1.5 text-2xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                                                                <th className="text-left px-2 py-1.5 text-2xs font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
                                                                <th className="text-right px-2 py-1.5 text-2xs font-semibold text-slate-400 uppercase tracking-wider">Valor</th>
                                                                <th className="text-left px-2 py-1.5 text-2xs font-semibold text-slate-400 uppercase tracking-wider">Referencia</th>
                                                                <th className="text-left px-2 py-1.5 text-2xs font-semibold text-slate-400 uppercase tracking-wider">Descripción</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                                                            {group.rows.map((row) => {
                                                                const rowSelected = selectedIds.has(row.id);
                                                                const isConciliated = conciliatedIds.has(row.id);
                                                                return (
                                                                    <tr key={row.id} onClick={() => toggleRow(row.id)} className={`cursor-pointer transition-colors ${rowSelected ? 'bg-red-50 dark:bg-red-900/20' : (isConciliated ? 'bg-emerald-50/20 dark:bg-emerald-900/5' : 'hover:bg-amber-50/60 dark:hover:bg-amber-900/10')}`}>
                                                                        <td className="px-4 py-1.5"><CheckboxCell checked={rowSelected} onChange={() => toggleRow(row.id)} isRed={!isConciliated} /></td>
                                                                        <td className="px-2 py-1.5">
                                                                            {isConciliated ? (
                                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200">CONCILIADO</span>
                                                                            ) : (
                                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200">PENDIENTE</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(row.fecha)}</td>
                                                                        <td className="px-2 py-1.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{fmt(row.valor)}</td>
                                                                        <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400 truncate max-w-[150px] title={row.referencia}">{row.referencia || '—'}</td>
                                                                        <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400 truncate max-w-[200px] title={row.descripcion}">{row.descripcion || '—'}</td>
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
                            Los registros identificados como duplicados coinciden en los criterios seleccionados. 
                            <b> Recomendación:</b> Mantén marcado "Fecha" y "Valor", y desmarca "Descripción" para corregir truncamientos de extracto.
                        </p>
                        <Button variant="secondary" size="sm" onClick={() => setIsOpen(false)}>
                            Cerrar
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

// Checkbox helper for rows
const CheckboxCell: React.FC<{ checked: boolean; onChange: () => void; isRed?: boolean }> = ({ checked, onChange, isRed }) => (
    <input 
        type="checkbox" 
        checked={checked} 
        onChange={onChange} 
        onClick={e => e.stopPropagation()} 
        className={`h-3.5 w-3.5 rounded cursor-pointer ${isRed ? 'accent-red-500' : 'accent-emerald-500'}`} 
    />
);
