import React, { useState, useRef, useMemo } from 'react';
import { ArrowUpTrayIcon, DocumentTextIcon, CheckCircleIcon, CogIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
    existingIds?: Set<string>;
    generateId?: (row: Record<string, any>) => string;
    title?: string;
}

export const DataImportWizard: React.FC<DataImportWizardProps> = ({
    isOpen,
    onClose,
    onImport,
    existingIds = new Set<string>(),
    generateId,
    title = "Importar datos"
}) => {
    // --- WIZARD STATE ---
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [originalData, setOriginalData] = useState<any[][]>([]);
    const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
    const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>([]);
    const [finalData, setFinalData] = useState<ParsedRow[]>([]);
    const [importDuplicates, setImportDuplicates] = useState<Set<string>>(new Set());
    const [importSelection, setImportSelection] = useState<Set<string>>(new Set());

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Default UUID generator based on simple string hashing
    const defaultGenerateId = (row: Record<string, any>) => {
        const keyString = JSON.stringify(row);
        let hash = 5381;
        for (let i = 0; i < keyString.length; i++) {
            hash = ((hash << 5) + hash) ^ keyString.charCodeAt(i);
        }
        return `imported-${Math.abs(hash).toString(16)}`;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];

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

            const initialConfig: ColumnConfig[] = headers.map((header, colIndex) => {
                let hStr = String(header || `Columna ${colIndex + 1}`).trim();
                const isDuplicate = headers.findIndex((h, idx) => idx < colIndex && String(h || `Columna ${idx + 1}`).trim() === hStr) !== -1;
                if (isDuplicate) hStr = `${hStr}_${colIndex}`;

                let type: DataType = 'string';
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
                return { key: hStr, label: hStr, type };
            });

            setColumnsConfig(initialConfig);
            setStep(2);
        };
        reader.readAsBinaryString(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFormatChange = (index: number, newType: DataType) => {
        const newConfig = [...columnsConfig];
        newConfig[index].type = newType;
        setColumnsConfig(newConfig);
    };

    const processData = () => {
        const result: ParsedRow[] = [];
        const duplicates = new Set<string>();
        const selection = new Set<string>();

        const idGenerator = generateId || defaultGenerateId;

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
                        val = Number(val);
                        if (isNaN(val)) val = 0;
                    } else if (col.type === 'date') {
                        if (val instanceof Date) {
                            val = val.toISOString().split('T')[0];
                        } else {
                            const d = new Date(val);
                            if (!isNaN(d.getTime())) val = d.toISOString().split('T')[0];
                            else val = String(val);
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
                const uniqueId = idGenerator(cleanRowContent);

                const parsedRow: ParsedRow = {
                    id: uniqueId,
                    ...cleanRowContent
                };
                result.push(parsedRow);
                selection.add(uniqueId);

                if (existingIds.has(uniqueId)) {
                    duplicates.add(uniqueId);
                }
            }
        }
        setImportDuplicates(duplicates);
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
        setImportSelection(new Set());
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

        try {
            await onImport(rowsToImport);
            resetWizard();
            onClose();
        } catch (error: any) {
            console.error("Error al importar: ", error);
            alert(`Error durante la importación: ${error?.message || 'Desconocido'}`);
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
                if (col.type === 'boolean') return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${val ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{val ? 'Sí' : 'No'}</span>;
                if (col.type === 'date') return <span className="text-gray-600">{val}</span>;
                return String(val);
            }
        }));

        const statusCol: Column<ParsedRow> = {
            key: 'import_status',
            label: 'Estado',
            sortable: false,
            render: (_: any, item: ParsedRow) => importDuplicates.has(item.id)
                ? <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold text-[10px] uppercase whitespace-nowrap">Duplicado (Actualizará)</span>
                : <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold text-[10px] uppercase">Nuevo</span>
        };

        return [statusCol, ...configColumns];
    }, [columnsConfig, importDuplicates]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex bg-black/60 backdrop-blur-[2px] items-center justify-center p-4 md:p-8 overflow-hidden pointer-events-auto" onClick={handleClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 w-full xl:w-[85%] 2xl:w-[70%] h-full max-h-[90vh]"
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
                    <div className={`flex-1 py-5 text-center text-sm font-semibold border-b-2 transition-colors ${step >= 1 ? 'border-[#7511E5] text-[#7511E5]' : 'border-transparent text-gray-400'}`}>
                        1. Cargar Archivo
                    </div>
                    <div className={`flex-1 py-5 text-center text-sm font-semibold border-b-2 transition-colors ${step >= 2 ? 'border-[#7511E5] text-[#7511E5]' : 'border-transparent text-gray-400'}`}>
                        2. Configurar Columnas
                    </div>
                    <div className={`flex-1 py-5 text-center text-sm font-semibold border-b-2 transition-colors ${step >= 3 ? 'border-[#7511E5] text-[#7511E5]' : 'border-transparent text-gray-400'}`}>
                        3. Previsualizar
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* STEP 1 */}
                    <div className={`absolute inset-0 px-8 py-10 transition-transform duration-300 flex flex-col ${step === 1 ? 'translate-x-0 opacity-100 pointer-events-auto overflow-y-auto' : '-translate-x-full opacity-0 pointer-events-none'}`}>
                        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full text-center">
                            <div className="p-4 bg-[#7511E5]/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                                <ArrowUpTrayIcon className="w-10 h-10 text-[#7511E5]" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
                                {title}
                            </h2>
                            <p className="text-base text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                                Selecciona un archivo de Excel (.xlsx, .xls) o CSV. Detectaremos automáticamente los encabezados y organizaremos los datos para su revisión.
                            </p>

                            <input
                                type="file"
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />

                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-[#7511E5] hover:bg-[#5b0cb5] text-white px-10 py-5 h-auto text-lg rounded-full shadow-xl shadow-[#7511E5]/20 gap-3 font-semibold transition-transform active:scale-95"
                            >
                                <DocumentTextIcon className="w-6 h-6" />
                                Buscar Archivo
                            </Button>
                        </div>
                    </div>

                    {/* STEP 2 */}
                    <div className={`absolute inset-0 p-8 transition-transform duration-300 flex flex-col bg-gray-50/30 overflow-hidden ${step === 2 ? 'translate-x-0 opacity-100 pointer-events-auto' : step > 2 ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-full opacity-0 pointer-events-none'}`}>
                        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <CogIcon className="w-6 h-6 text-[#7511E5]" />
                                    Configuración de Columnas
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Hemos detectado {columnsConfig.length} columnas. Verifica y ajusta el tipo de dato si es necesario.
                                </p>
                            </div>
                            <Button
                                className="bg-[#7511E5] hover:bg-[#5b0cb5] text-white gap-2 shadow-lg shadow-[#7511E5]/20 h-10 px-6 rounded-lg text-sm font-semibold transition-all active:scale-95 sm:w-auto w-full"
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
                                        const rawVal = originalData[headerRowIndex + 1]?.[index];
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
                                                    <span className="bg-gray-100 group-hover:bg-purple-100 dark:bg-slate-700 dark:group-hover:bg-[#7511E5]/20 text-gray-600 group-hover:text-purple-700 dark:text-gray-300 dark:group-hover:text-[#7511E5] text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider transition-colors inline-block text-center w-full">
                                                        Col {index + 1}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-[14px] text-gray-800 dark:text-gray-200 font-semibold truncate max-w-sm" title={col.label}>
                                                    {col.label}
                                                </td>
                                                <td className="px-6 py-3 text-[13px] text-gray-500 dark:text-gray-400 italic truncate max-w-[200px]" title={String(rawVal)}>
                                                    {preview}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <select
                                                        className="w-full text-[13px] font-medium border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#7511E5]/20 focus:border-[#7511E5] dark:text-white cursor-pointer shadow-sm hover:border-gray-300 dark:hover:border-slate-500 transition-all disabled:opacity-50 h-[38px] px-3 outline-none"
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
                    <div className={`absolute inset-0 flex flex-col bg-white dark:bg-slate-800 transition-transform duration-300 ${step === 3 ? 'translate-x-0 opacity-100 pointer-events-auto' : 'translate-x-full opacity-0 pointer-events-none'}`}>
                        {/* Toolbar de visualización */}
                        <div className="px-6 md:px-8 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-white dark:bg-slate-800 z-10 shadow-sm">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                    <CheckCircleIcon className="w-6 h-6 text-emerald-500" />
                                    Resumen de Previsualización
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Se importarán <strong>{importSelection.size}</strong> registros de <strong>{finalData.length}</strong> encontrados.
                                </p>
                            </div>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-600/20 px-6 h-10 rounded-lg text-sm font-semibold transition-transform active:scale-95 sm:w-auto w-full"
                                onClick={handleFinalizeImport}
                            >
                                <ArrowUpTrayIcon className="w-4 h-4" />
                                Importar Datos Confirmados
                            </Button>
                        </div>

                        {/* SmartDataTable embebida */}
                        <div className="flex-1 overflow-hidden flex flex-col p-6 max-h-full">
                            {importDuplicates.size > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 shrink-0 shadow-sm rounded-r-lg mb-4">
                                    <div className="flex gap-4 items-start">
                                        <div className="flex-1">
                                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                                <strong>¡Atención!</strong> Hemos detectado <strong>{importDuplicates.size} registro(s)</strong> duplicados que ya existen en tu base de datos.
                                                Están marcados con una etiqueta naranja en la tabla. Si los dejas seleccionados, se <strong>sobreescribirán</strong> con la información de este archivo para actualizarlos.
                                            </p>
                                            <button
                                                onClick={() => {
                                                    const next = new Set(importSelection);
                                                    importDuplicates.forEach(id => next.delete(id));
                                                    setImportSelection(next);
                                                }}
                                                className="mt-2 text-[12px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 underline transition-colors focus:outline-none"
                                            >
                                                Desmarcar todos los duplicados e ignorarlos
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 w-full relative min-h-0 bg-white dark:bg-slate-800 border-x border-b border-gray-200 dark:border-slate-700 rounded-b-xl">
                                <SmartDataTable
                                    data={finalData}
                                    columns={wizardTableColumns}
                                    enableSelection={true}
                                    selectedIds={importSelection}
                                    onSelectionChange={setImportSelection}
                                    enableExport={false}
                                    enableSearch={true}
                                    searchPlaceholder="Buscar en los datos previstos para importar..."
                                    containerClassName="h-full border-0 shadow-none -mt-px rounded-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
