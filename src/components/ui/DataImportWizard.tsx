import React, { useState, useRef, useMemo } from 'react';
import { ArrowUpTrayIcon, DocumentTextIcon, CheckCircleIcon, CogIcon, XMarkIcon, ArrowPathIcon } from '@/components/ui/Icons';
import * as XLSX from 'xlsx';
import { SmartDataTable, Column } from './SmartDataTable';
import { Button } from './Button';

type DataType = 'string' | 'number' | 'currency' | 'date' | 'boolean';

export interface ColumnConfig {
    key: string;
    label: string;
    type: DataType;
}

export interface ParsedRow {
    id: string;
    [key: string]: any;
}

export interface DataImportWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: ParsedRow[]) => Promise<void>;
    onCheckDuplicate?: (row: Record<string, any>) => { isDuplicate: boolean; existingId?: string; existingRecord?: any; mappedRecord?: any; hash?: string };
    title?: string;
}

export const DataImportWizard: React.FC<DataImportWizardProps> = ({
    isOpen,
    onClose,
    onImport,
    onCheckDuplicate,
    title = "Importar datos"
}) => {
    // --- WIZARD STATE ---
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [originalData, setOriginalData] = useState<any[][]>([]);
    const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
    const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>([]);
    const [finalData, setFinalData] = useState<ParsedRow[]>([]);
    const [importDuplicates, setImportDuplicates] = useState<Set<string>>(new Set());
    const [importUpdates, setImportUpdates] = useState<Set<string>>(new Set());
    const [importSelection, setImportSelection] = useState<Set<string>>(new Set());
    const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'updates' | 'identical'>('all');
    // UX States
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- LOCAL STORAGE CACHE LOGIC ---
    const getStorageKey = () => `data_wizard_formats_${title?.replace(/\s+/g, '_').toLowerCase() || 'default'}`;

    const loadSavedFormats = (): Record<string, DataType> => {
        try {
            const saved = localStorage.getItem(getStorageKey());
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    };

    const saveFormats = (formats: Record<string, DataType>) => {
        try {
            localStorage.setItem(getStorageKey(), JSON.stringify(formats));
        } catch { }
    };

    // Default UUID generator based on simple string hashing
    const defaultGenerateId = (row: Record<string, any>) => {
        const keyString = JSON.stringify(row);
        let hash = 5381;
        for (let i = 0; i < keyString.length; i++) {
            hash = ((hash << 5) + hash) ^ keyString.charCodeAt(i);
        }
        return `imported-${Math.abs(hash).toString(16)}`;
    };

    const processFile = (file: File) => {
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const dataBuffer = new Uint8Array(evt.target?.result as ArrayBuffer);
                const wb = XLSX.read(dataBuffer, { type: 'array', cellDates: true });
                console.log('📚 HOJAS EN EL EXCEL:', wb.SheetNames);
                const wsname = wb.SheetNames[0];
                console.log('📖 LEYENDO HOJA:', wsname);
                const ws = wb.Sheets[wsname];

                // Reparación del rango !ref por fallos en archivos exportados de ERP's
                let maxRow = 0;
                let maxCol = 0;
                for (const key in ws) {
                    if (key[0] === '!') continue;
                    const cellRef = XLSX.utils.decode_cell(key);
                    if (cellRef.r > maxRow) maxRow = cellRef.r;
                    if (cellRef.c > maxCol) maxCol = cellRef.c;
                }
                const oldRange = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { s: { c: 0, r: 0 }, e: { c: maxCol, r: maxRow } };
                if (oldRange.e.r < maxRow || oldRange.e.c < maxCol) {
                    const newRange = { s: oldRange.s, e: { c: Math.max(oldRange.e.c, maxCol), r: Math.max(oldRange.e.r, maxRow) } };
                    ws['!ref'] = XLSX.utils.encode_range(newRange);
                }

                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                // Detect header row (within first 10 rows limit)
                let maxCols = 0;
                let likelyHeaderIdx = 0;
                const maxSearchDepth = Math.min(10, data.length);
                for (let i = 0; i < maxSearchDepth; i++) {
                    const row = data[i] || [];
                    const nonNullCount = row.filter(cell => cell !== undefined && cell !== null && cell !== '').length;
                    if (nonNullCount > maxCols) {
                        maxCols = nonNullCount;
                        likelyHeaderIdx = i;
                    }
                }

                setHeaderRowIndex(likelyHeaderIdx);
                setOriginalData(data);

                const headers = data[likelyHeaderIdx] || [];
                const sampleData = data.slice(likelyHeaderIdx + 1, likelyHeaderIdx + 11);

                const savedFormats = loadSavedFormats();

                const initialConfig: ColumnConfig[] = headers.map((header, colIndex) => {
                    let hStr = String(header || `Columna ${colIndex + 1}`).trim();
                    const isDuplicate = headers.findIndex((h, idx) => idx < colIndex && String(h || `Columna ${idx + 1}`).trim() === hStr) !== -1;
                    if (isDuplicate) hStr = `${hStr}_${colIndex}`;

                    let type: DataType = 'string';

                    // 1. Usar memoria caché de localStorage si esta columna ya ha sido formateada antes para este tipo de importador
                    if (savedFormats[hStr]) {
                        type = savedFormats[hStr];
                    } else {
                        // 2. Fallback de detección heurística rápida
                        for (let row of sampleData) {
                            const val = row[colIndex];
                            if (val !== undefined && val !== null && val !== '') {
                                if (val instanceof Date) type = 'date';
                                else if (typeof val === 'number') type = 'number';
                                else if (typeof val === 'boolean') type = 'boolean';
                                else if (!isNaN(Number(val))) type = 'number';
                                else if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) type = 'date';
                                break;
                            }
                        }
                    }
                    return { key: hStr, label: hStr, type };
                });

                setColumnsConfig(initialConfig);
                setStep(2);
            } catch (error) {
                console.error("Error leyendo archivo:", error);
                alert("Hubo un error al leer el archivo. Asegúrate de que no esté dañado.");
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsArrayBuffer(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            // Validate extension mildly
            const name = file.name.toLowerCase();
            if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
                processFile(file);
            } else {
                alert("Formato no válido. Sube un archivo de Excel (.xlsx, .xls) o CSV.");
            }
        }
    };

    const handleFormatChange = (index: number, newType: DataType) => {
        const newConfig = [...columnsConfig];
        newConfig[index].type = newType;
        setColumnsConfig(newConfig);

        // Guardar sutilmente la configuración en LocalStorage asociando nombreColumna -> Formato
        const savedFormats = loadSavedFormats();
        savedFormats[newConfig[index].key] = newType;
        saveFormats(savedFormats);
    };

    const processData = () => {
        // DEBUG DE EMERGENCIA: Ver qué hay en el archivo realmente
        console.group('📄 DATOS CRUDOS DEL EXCEL');
        console.log('Primeras 5 filas del archivo (JSON):', JSON.stringify(originalData.slice(0, 5), null, 2));
        console.log('Índice de cabecera detectado:', headerRowIndex);
        if (headerRowIndex !== -1) {
            console.log('Columnas encontradas en cabecera:', JSON.stringify(originalData[headerRowIndex]));
        }
        console.groupEnd();
        
        // Helper to check if row has changes compared to database
        const normalizeForCompare = (val: any) => {
            if (val === null || val === undefined || val === '') return '';
            
            if (typeof val === 'number') {
                // Si es un número entero o muy cercano, evitamos decimales.
                // Importante: No aplicamos toFixed(2) si el número es entero para coincidir con IDs o códigos.
                if (Math.abs(val - Math.round(val)) < 0.0001) return String(Math.round(val));
                return val.toFixed(2);
            }

            if (val instanceof Date) {
                // Forzar formato YYYY-MM-DD sin importar la zona horaria del sistema.
                if (!isNaN(val.getTime())) {
                    const year = val.getFullYear();
                    const month = String(val.getMonth() + 1).padStart(2, '0');
                    const day = String(val.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
                return '';
            }

            // Normalización de texto: eliminar acentos, espacios extra y pasar a minúsculas
            let str = String(val).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ');
            
            // Si el string parece ser una fecha ISO YYYY-MM-DDTHH:mm:ss.sssZ, extraer solo la fecha
            if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
                return str.split('t')[0].split(' ')[0];
            }

            // Identificadores y Documentos: Si el string es puramente numérico, 
            // quitamos ceros a la izquierda para que '00123' sea igual a '123'
            if (/^\d+$/.test(str)) {
                str = str.replace(/^0+/, '') || '0';
            }
            return str;
        };

        const isRowChanged = (mappedImport: Record<string, any>, existing: Record<string, any>) => {
            console.groupCollapsed(`🔍 Comparando registro ID: ${existing.id || 'N/A'}`);
            let changed = false;

            // Comparar usando las llaves del registro mapeado (las reales de la DB)
            Object.keys(mappedImport).forEach(dbKey => {
                if (dbKey === 'id' || dbKey === 'created_at' || dbKey === 'updated_at') return;

                const importedVal = mappedImport[dbKey];
                const existingVal = existing[dbKey];

                const normImported = normalizeForCompare(importedVal);
                const normExisting = normalizeForCompare(existingVal);

                if (normImported !== normExisting) {
                    console.log(`❌ CAMBIO en [${dbKey}]: Excel_Mapeado("${normImported}") vs DB("${normExisting}")`);
                    changed = true;
                }
            });

            if (!changed) console.log('✅ Registros idénticos');
            console.groupEnd();
            return changed;
        };

        const result: ParsedRow[] = [];
        const duplicates = new Set<string>();
        const updates = new Set<string>();
        const selection = new Set<string>();
        const seenHashes = new Set<string>();
        const seenExistingIds = new Set<string>();

        for (let i = headerRowIndex + 1; i < originalData.length; i++) {
            const row = originalData[i];
            if (!row || row.length === 0) continue;

            let hasData = false;
            const cleanRowContent: Record<string, any> = {};

            columnsConfig.forEach((col, colIndex) => {
                let val = row[colIndex];

                if (val !== undefined && val !== null && val !== '') {
                    hasData = true;
                    if (col.type === 'number' || col.type === 'currency') {
                        if (typeof val === 'string') {
                            const originalVal = val;
                            let numStr = val.trim();
                            if (numStr.includes(',') && numStr.includes('.')) {
                                numStr = numStr.replace(/,/g, '');
                            } else if (numStr.includes(',')) {
                                const parts = numStr.split(',');
                                if (parts[parts.length - 1].length === 3) numStr = numStr.replace(/,/g, '');
                                else numStr = numStr.replace(',', '.');
                            }
                            const n = Number(numStr.replace(/[^0-9.\-]/g, ''));
                            val = isNaN(n) ? originalVal : n; // Keep original if parsing completely fails!
                        } else {
                            const n = Number(val);
                            val = isNaN(n) ? val : n;
                        }
                    } else if (col.type === 'date') {
                        if (typeof val === 'number') {
                            // Convert Excel serial date to JS Date
                            val = new Date(Math.round((val - 25569) * 86400 * 1000));
                        }
                        if (val instanceof Date) {
                            const year = val.getFullYear();
                            const month = String(val.getMonth() + 1).padStart(2, '0');
                            const day = String(val.getDate()).padStart(2, '0');
                            val = `${year}-${month}-${day}`;
                        } else if (typeof val === 'string' && val.trim()) {
                            const str = val.trim();
                            // Intentar parsear DD/MM/YYYY o DD-MM-YYYY
                            const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
                            if (dmyMatch) {
                                const [_, d, m, y] = dmyMatch;
                                val = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                            } else {
                                // Fallback al parseo nativo si no es el formato esperado
                                const d = new Date(val);
                                if (!isNaN(d.getTime())) val = d.toISOString().split('T')[0];
                                else val = str;
                            }
                        }
                    } else if (col.type === 'boolean') {
                        if (typeof val === 'string') {
                            const lower = val.toLowerCase().trim();
                            val = lower === 'true' || lower === 'si' || lower === 'sí' || lower === '1';
                        } else {
                            val = Boolean(val);
                        }
                    } else {
                        val = String(val);
                    }
                }
                cleanRowContent[col.key] = val;
            });

            if (hasData) {
                // Generar ID por defecto
                let uniqueId = defaultGenerateId({ ...cleanRowContent, _rowIdx: i });
                let isDup = false;
                let isIntraFileDuplicate = false;

                let dupInfo = null;
                if (onCheckDuplicate) {
                    dupInfo = onCheckDuplicate(cleanRowContent);
                    const currentHash = dupInfo?.hash;

                    // 1. Detectar duplicados IDENTICOS dentro del mismo archivo Excel (por hash)
                    if (currentHash) {
                        if (seenHashes.has(currentHash)) {
                            isIntraFileDuplicate = true;
                        } else {
                            seenHashes.add(currentHash);
                        }
                    }

                    if (isIntraFileDuplicate) continue;

                    // 2. Detectar si es un duplicado contra la base de datos (Update o Identical)
                    if (dupInfo?.isDuplicate) {
                        isDup = true;
                        
                        // 3. Importante: Prevenir colisiones de ON CONFLICT si dos registros distintos del Excel 
                        // apuntan al MISMO ID de la base de datos (por ejemplo, en un match de N-1 campos)
                        if (dupInfo.existingId) {
                            if (seenExistingIds.has(dupInfo.existingId)) {
                                console.warn(`⚠️ Conflicto detected: Múltiples registros del Excel apuntan al mismo ID DB (${dupInfo.existingId}). Se ignorará la repetición para evitar error de base de datos.`);
                                continue; 
                            }
                            seenExistingIds.add(dupInfo.existingId);
                            uniqueId = dupInfo.existingId;
                        }
                    }
                }

                const parsedRow: ParsedRow = {
                    ...cleanRowContent,
                    id: uniqueId
                };
                result.push(parsedRow);
                selection.add(uniqueId);

                if (isDup) {
                    duplicates.add(uniqueId);

                    // DEEP COMPARE: verificar si hubo cambios
                    if (dupInfo?.existingRecord && dupInfo?.mappedRecord) {
                        if (isRowChanged(dupInfo.mappedRecord, dupInfo.existingRecord)) {
                            updates.add(uniqueId);
                        }
                    }
                }
            }
        }


        setImportDuplicates(duplicates);
        setImportUpdates(updates);
        setImportSelection(selection);
        setFinalData(result);
        setStep(3);
    };

    const resetWizard = () => {
        setStep(1);
        setOriginalData([]);
        setColumnsConfig([]);
        setFinalData([]);
        setImportDuplicates(new Set());
        setImportUpdates(new Set());
        setImportSelection(new Set());
        setActiveFilter('all');
    };

    const handleClose = () => {
        resetWizard();
        onClose();
    };

    const handleFinalizeImport = async () => {
        const rowsToImport = finalData.filter(row => importSelection.has(row.id));
        if (rowsToImport.length === 0) {
            alert("No hay registros seleccionados para importar.");
            return;
        }

        setIsProcessing(true);
        try {
            await onImport(rowsToImport);
            resetWizard();
            onClose();
        } catch (error: any) {
            console.error("Error al importar: ", error);
            alert(`Error durante la importación: ${error?.message || 'Desconocido'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const wizardTableColumns: Column<ParsedRow>[] = useMemo(() => {
        const configColumns: Column<ParsedRow>[] = columnsConfig.map(col => ({
            key: col.key,
            label: col.label,
            sortable: true,
            filterable: true,
            align: (col.type === 'number' || col.type === 'currency') ? 'text-right' : 'text-left',
            render: (val: any) => {
                if (val === undefined || val === null || val === '') return <span className="text-gray-300">-</span>;
                if (col.type === 'currency') return <span className="font-medium tabular-nums">${Number(val).toLocaleString('es-CO')}</span>;
                if (col.type === 'number') return <span className="font-medium tabular-nums">{Number(val).toLocaleString('es-CO')}</span>;
                if (col.type === 'boolean') return <span className={`px-2 py-0.5 rounded-full text-xs2 font-bold uppercase ${val ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{val ? 'Sí' : 'No'}</span>;
                if (col.type === 'date') return <span className="text-gray-600">{val}</span>;
                return String(val);
            }
        }));

        const statusCol: Column<ParsedRow> = {
            key: 'import_status',
            label: 'Estado',
            sortable: false,
            render: (_: any, item: ParsedRow) => {
                if (importUpdates.has(item.id)) {
                    return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold text-xs2 uppercase whitespace-nowrap">Con Cambios (Actualizará)</span>;
                }
                if (importDuplicates.has(item.id)) {
                    return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold text-xs2 uppercase whitespace-nowrap">Duplicado Idéntico</span>;
                }
                return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold text-xs2 uppercase">Nuevo</span>;
            }
        };

        return [statusCol, ...configColumns];
    }, [columnsConfig, importDuplicates, importUpdates]);

    const stats = useMemo(() => {
        const _stats = { 
            new: { total: 0, selected: 0 }, 
            updates: { total: 0, selected: 0 }, 
            identical: { total: 0, selected: 0 } 
        };
        finalData.forEach(row => {
            const selected = importSelection.has(row.id);
            if (importUpdates.has(row.id)) {
                _stats.updates.total++;
                if (selected) _stats.updates.selected++;
            } else if (importDuplicates.has(row.id)) {
                _stats.identical.total++;
                if (selected) _stats.identical.selected++;
            } else {
                _stats.new.total++;
                if (selected) _stats.new.selected++;
            }
        });
        return _stats;
    }, [finalData, importSelection, importDuplicates, importUpdates]);

    const displayedData = useMemo(() => {
        if (activeFilter === 'all') return finalData;
        return finalData.filter(row => {
            if (activeFilter === 'updates') return importUpdates.has(row.id);
            if (activeFilter === 'identical') return importDuplicates.has(row.id);
            if (activeFilter === 'new') return !importUpdates.has(row.id) && !importDuplicates.has(row.id);
            return true;
        });
    }, [finalData, activeFilter, importUpdates, importDuplicates]);

    const handleToggleCategory = (category: 'new' | 'updates' | 'identical') => {
        setImportSelection(prev => {
            const next = new Set(prev);
            const isFullySelected = stats[category].selected === stats[category].total && stats[category].total > 0;
            const targetState = !isFullySelected; // Si todos están seleccionados, deseleccionamos. Si no, seleccionamos todos.

            finalData.forEach(row => {
                let rowCategory: 'new' | 'updates' | 'identical' = 'new';
                if (importUpdates.has(row.id)) rowCategory = 'updates';
                else if (importDuplicates.has(row.id)) rowCategory = 'identical';

                if (rowCategory === category) {
                    if (targetState) next.add(row.id);
                    else next.delete(row.id);
                }
            });
            return next;
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex bg-black/60 backdrop-blur-[2px] items-center justify-center p-4 md:p-6 overflow-hidden pointer-events-auto" onClick={handleClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 w-full max-w-6xl h-full max-h-[85vh] min-h-[500px]"
                onClick={e => e.stopPropagation()}
            >
                {/* Stepper Header */}
                <div className="flex border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 relative shrink-0">
                    <button
                        className="absolute right-4 top-4 z-10 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-md transition-colors"
                        onClick={handleClose}
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                    {step > 1 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute left-4 top-4 z-10 text-gray-400 hover:text-gray-700"
                            onClick={() => setStep(step === 3 ? 2 : 1)}
                        >
                            &larr; Volver
                        </Button>
                    )}
                    <div className="flex-1 relative flex items-center">
                        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gray-200 dark:bg-slate-700"></div>
                        <div
                            className="absolute bottom-0 left-0 h-[3px] bg-purple-600 transition-all duration-500 ease-in-out"
                            style={{ width: `${(step / 3) * 100}%` }}
                        ></div>
                        <div className={`flex-1 py-5 text-center text-sm font-semibold transition-colors z-10 ${step >= 1 ? 'text-purple-600' : 'text-gray-400'}`}>
                            1. Cargar Archivo
                        </div>
                        <div className={`flex-1 py-5 text-center text-sm font-semibold transition-colors z-10 ${step >= 2 ? 'text-purple-600' : 'text-gray-400'}`}>
                            2. Configurar Columnas
                        </div>
                        <div className={`flex-1 py-5 text-center text-sm font-semibold transition-colors z-10 ${step >= 3 ? 'text-purple-600' : 'text-gray-400'}`}>
                            3. Previsualizar
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
                    {/* STEP 1 */}
                    <div
                        className={`absolute inset-0 p-8 transition-transform duration-300 flex flex-col ${step === 1 ? 'translate-x-0 opacity-100 pointer-events-auto overflow-y-auto' : '-translate-x-full opacity-0 pointer-events-none'}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className={`flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full text-center border-2 border-dashed rounded-3xl transition-all duration-300 ${isDragging ? 'border-purple-600 bg-purple-600/5 scale-[1.02]' : 'border-gray-200 dark:border-slate-700 bg-transparent'}`}>
                            <div className="p-4 bg-purple-600/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                                <ArrowUpTrayIcon className="w-10 h-10 text-purple-600" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
                                {title}
                            </h2>
                            <p className="text-base text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                                Arrastra y suelta tu archivo Excel (.xlsx, .xls) o CSV aquí, o haz clic en el botón inferior para explorar.
                            </p>

                            <input
                                type="file"
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                disabled={isProcessing}
                            />

                            <Button
                                variant="primary"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessing}
                                className="px-10 py-5 h-auto text-lg rounded-full shadow-xl shadow-purple-500/20 gap-3 font-semibold transition-transform active:scale-95 z-10"
                            >
                                {isProcessing ? (
                                    <>
                                        <ArrowPathIcon className="w-6 h-6 animate-spin" />
                                        <span>Procesando archivo...</span>
                                    </>
                                ) : (
                                    <>
                                        <DocumentTextIcon className="w-6 h-6" />
                                        <span>Buscar Archivo</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* STEP 2 */}
                    <div className={`absolute inset-0 p-8 transition-transform duration-300 flex flex-col bg-gray-50/30 overflow-hidden ${step === 2 ? 'translate-x-0 opacity-100 pointer-events-auto' : step > 2 ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-full opacity-0 pointer-events-none'}`}>
                        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <CogIcon className="w-6 h-6 text-purple-600" />
                                    Configuración de Columnas
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Hemos detectado {columnsConfig.length} columnas. Verifica y ajusta el tipo de dato si es necesario.
                                </p>
                            </div>
                            <Button
                                variant="primary"
                                className="gap-2 shadow-lg shadow-purple-500/20 h-10 px-6 rounded-lg text-sm font-semibold transition-all active:scale-95 sm:w-auto w-full"
                                onClick={processData}
                            >
                                Continuar <CheckCircleIcon className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm relative min-h-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 dark:bg-slate-900/50 sticky top-0 z-10 shadow-sm border-b border-gray-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Posición</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre de Columna Detectado</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Muestra (Ejemplo)</th>
                                        <th className="px-6 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-64">Formato de Datos</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                    {columnsConfig.map((col, index) => {
                                        // Buscar la primera fila con datos para mostrar una previsualización real
                                        let rawVal = originalData[headerRowIndex + 1]?.[index];
                                        if ((rawVal === undefined || rawVal === null || rawVal === '') && originalData.length > headerRowIndex + 2) {
                                            for (let i = headerRowIndex + 2; i < Math.min(originalData.length, headerRowIndex + 10); i++) {
                                                if (originalData[i]?.[index] !== undefined && originalData[i]?.[index] !== '') {
                                                    rawVal = originalData[i][index];
                                                    break;
                                                }
                                            }
                                        }

                                        let preview = '-';

                                        if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
                                            if (col.type === 'number') {
                                                const n = Number(rawVal);
                                                preview = !isNaN(n) ? n.toLocaleString('es-CO') : String(rawVal);
                                            } else if (col.type === 'currency') {
                                                const n = Number(rawVal);
                                                preview = !isNaN(n) ? `$${n.toLocaleString('es-CO')}` : String(rawVal);
                                            } else if (col.type === 'date') {
                                                if (rawVal instanceof Date) {
                                                    preview = rawVal.toISOString().split('T')[0];
                                                } else {
                                                    const d = new Date(rawVal);
                                                    preview = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : String(rawVal);
                                                }
                                            } else if (col.type === 'boolean') {
                                                if (typeof rawVal === 'boolean') {
                                                    preview = rawVal ? 'Sí' : 'No';
                                                } else {
                                                    const b = String(rawVal).toLowerCase().trim();
                                                    preview = (b === 'true' || b === 'si' || b === 'sí' || b === '1') ? 'Sí' : 'No';
                                                }
                                            } else {
                                                preview = String(rawVal);
                                            }
                                        }

                                        return (
                                            <tr key={col.key} className="hover:bg-purple-50/50 dark:hover:bg-slate-800 transition-colors group">
                                                <td className="px-6 py-3">
                                                    <span className="bg-gray-100 group-hover:bg-purple-100 dark:bg-slate-700 dark:group-hover:bg-purple-600/20 text-gray-600 group-hover:text-purple-700 dark:text-gray-300 dark:group-hover:text-purple-600 text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider transition-colors inline-block text-center w-full">
                                                        Col {index + 1}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-800 dark:text-gray-200 font-semibold truncate max-w-sm" title={col.label}>
                                                    {col.label}
                                                </td>
                                                <td className="px-6 py-3 text-sm- text-gray-500 dark:text-gray-400 italic truncate max-w-[200px]" title={String(rawVal)}>
                                                    {preview}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <select
                                                        className="w-full text-sm- font-medium border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 dark:text-white cursor-pointer shadow-sm hover:border-gray-300 dark:hover:border-slate-500 transition-all disabled:opacity-50 h-[38px] px-3 outline-none"
                                                        value={col.type}
                                                        onChange={(e) => handleFormatChange(index, e.target.value as DataType)}
                                                    >
                                                        <option value="string">Texto General</option>
                                                        <option value="number">Número</option>
                                                        <option value="currency">Moneda ($)</option>
                                                        <option value="date">Fecha</option>
                                                        <option value="boolean">Verdadero / Falso</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* STEP 3 */}
                    <div className={`absolute inset-0 flex flex-col bg-slate-50 dark:bg-slate-900/50 transition-transform duration-300 ${step === 3 ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none'}`}>
                        {/* Toolbar de visualización */}
                        <div className="px-6 py-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between shrink-0 bg-white dark:bg-slate-800 z-10 shadow-sm">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                    Confirmación Final
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Importarás <strong className="text-emerald-600 dark:text-emerald-400">{importSelection.size}</strong> registros de {finalData.length} leídos.
                                </p>
                            </div>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm px-5 h-9 rounded-md text-sm font-semibold transition-transform active:scale-95"
                                onClick={handleFinalizeImport}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <ArrowUpTrayIcon className="w-4 h-4" />
                                        Importar Datos
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col p-4 w-full">
                            
                            {/* Panel de control de selección COMPACTO */}
                            <div className="flex flex-wrap items-center gap-3 shrink-0 mb-4 p-2 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm">
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 mr-2 uppercase tracking-wider">Acciones en Lote:</span>
                                
                                {/* Nuevos */}
                                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-md py-1.5 px-3">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 whitespace-nowrap">Nuevos ({stats.new.total})</span>
                                    <div className="h-4 w-px bg-emerald-200 dark:bg-emerald-800/50 mx-1"></div>
                                    <button 
                                        onClick={() => handleToggleCategory('new')} 
                                        disabled={stats.new.total === 0} 
                                        className="text-[10px] uppercase font-bold text-emerald-700 hover:text-emerald-900 disabled:opacity-50 transition-colors"
                                    >
                                        {stats.new.selected > 0 ? 'Deseleccionar' : 'Seleccionar'}
                                    </button>
                                    <div className="h-4 w-px bg-emerald-200 dark:bg-emerald-800/50 mx-1"></div>
                                    <button 
                                        onClick={() => setActiveFilter(activeFilter === 'new' ? 'all' : 'new')} 
                                        disabled={stats.new.total === 0} 
                                        className={`text-[10px] uppercase font-bold transition-colors ${activeFilter === 'new' ? 'text-purple-600' : 'text-gray-500 hover:text-gray-800'}`}
                                    >
                                        {activeFilter === 'new' ? 'VER TODOS' : '👀 VER'}
                                    </button>
                                </div>

                                {/* Con Cambios */}
                                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-md py-1.5 px-3">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    <span className="text-xs font-semibold text-blue-800 dark:text-blue-400 whitespace-nowrap">Cambios ({stats.updates.total})</span>
                                    <div className="h-4 w-px bg-blue-200 dark:bg-blue-800/50 mx-1"></div>
                                    <button 
                                        onClick={() => handleToggleCategory('updates')} 
                                        disabled={stats.updates.total === 0} 
                                        className="text-[10px] uppercase font-bold text-blue-700 hover:text-blue-900 disabled:opacity-50 transition-colors"
                                    >
                                        {stats.updates.selected > 0 ? 'Deseleccionar' : 'Seleccionar'}
                                    </button>
                                    <div className="h-4 w-px bg-blue-200 dark:bg-blue-800/50 mx-1"></div>
                                    <button 
                                        onClick={() => setActiveFilter(activeFilter === 'updates' ? 'all' : 'updates')} 
                                        disabled={stats.updates.total === 0} 
                                        className={`text-[10px] uppercase font-bold transition-colors ${activeFilter === 'updates' ? 'text-purple-600' : 'text-gray-500 hover:text-gray-800'}`}
                                    >
                                        {activeFilter === 'updates' ? 'VER TODOS' : '👀 VER'}
                                    </button>
                                </div>

                                {/* Idénticos */}
                                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-md py-1.5 px-3">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-400 whitespace-nowrap">Idénticos ({stats.identical.total})</span>
                                    <div className="h-4 w-px bg-amber-200 dark:bg-amber-800/50 mx-1"></div>
                                    <button 
                                        onClick={() => handleToggleCategory('identical')} 
                                        disabled={stats.identical.total === 0} 
                                        className="text-[10px] uppercase font-bold text-amber-700 hover:text-amber-900 disabled:opacity-50 transition-colors"
                                    >
                                        {stats.identical.selected > 0 ? 'Deseleccionar' : 'Seleccionar'}
                                    </button>
                                    <div className="h-4 w-px bg-amber-200 dark:bg-amber-800/50 mx-1"></div>
                                    <button 
                                        onClick={() => setActiveFilter(activeFilter === 'identical' ? 'all' : 'identical')} 
                                        disabled={stats.identical.total === 0} 
                                        className={`text-[10px] uppercase font-bold transition-colors ${activeFilter === 'identical' ? 'text-purple-600' : 'text-gray-500 hover:text-gray-800'}`}
                                    >
                                        {activeFilter === 'identical' ? 'VER TODOS' : '👀 VER'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 w-full min-h-0 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl flex flex-col overflow-hidden shadow-sm">
                                {activeFilter !== 'all' && (
                                    <div className="bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800 px-4 py-2 flex items-center justify-between shrink-0">
                                        <span className="text-xs font-semibold text-purple-800 dark:text-purple-300">
                                            Viendo registros filtrados: <strong className="uppercase">{activeFilter === 'new' ? 'Nuevos' : activeFilter === 'updates' ? 'Con Cambios' : 'Idénticos'}</strong> ({displayedData.length})
                                        </span>
                                        <button 
                                            onClick={() => setActiveFilter('all')}
                                            className="text-xs text-purple-700 font-bold hover:text-purple-900 underline transition-colors focus:outline-none"
                                        >
                                            Quitar filtro (Ver {finalData.length})
                                        </button>
                                    </div>
                                )}
                                <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative w-full h-full">
                                    <SmartDataTable
                                        data={displayedData}
                                        columns={wizardTableColumns}
                                        enableSelection={true}
                                        selectedIds={importSelection}
                                        onSelectionChange={setImportSelection}
                                        enableExport={false}
                                        enableSearch={true}
                                        searchPlaceholder={`Buscar en ${activeFilter === 'all' ? 'todos los' : 'estos'} datos...`}
                                        containerClassName="flex-1 min-h-0 overflow-hidden border-0 shadow-none rounded-none w-full"
                                        scrollContainerClassName="flex-1 overflow-auto bg-white min-h-0 custom-scrollbar relative px-0 md:px-0 lg:px-0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
