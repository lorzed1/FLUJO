import React, { useState } from 'react';
import {
    ClipboardDocumentListIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    ArrowUpTrayIcon,
    TableCellsIcon
} from '../../../components/ui/Icons';
import {
    parsePurchaseRows,
    findHeaderRow,
    PURCHASE_SYSTEM_FIELDS,
    type PurchaseParsedRow
} from '../utils/purchaseParser';
import { inferColumnType, type ColumnType } from '../../../utils/importUtils';
import { formatCOP } from '../../../components/ui/Input';
import { useUI } from '../../../context/UIContext';
import { Button } from '../../../components/ui/Button';
import * as XLSX from 'xlsx';
import { Purchase } from '../../../types/budget';
import { SmartDataTable } from '../../../components/ui/SmartDataTable';
import { type Column } from '../../../hooks/useSmartDataTable';

interface PurchaseImportWizardProps {
    onBatchImport: (purchases: Purchase[]) => void;
    onCancel: () => void;
}

export const PurchaseImportWizard: React.FC<PurchaseImportWizardProps> = ({ onBatchImport, onCancel }) => {
    const { setAlertModal } = useUI();
    const [importData, setImportData] = useState('');
    const [parsedRows, setParsedRows] = useState<PurchaseParsedRow[]>([]);
    const [step, setStep] = useState<'input' | 'mapping' | 'preview'>('input');
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawLines, setRawLines] = useState<string[]>([]);
    const [headerIndex, setHeaderIndex] = useState(0);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [columnConfigs, setColumnConfigs] = useState<Record<string, ColumnType>>({});

    const performAutoMapping = (headers: string[], lines: string[], detectedIdx: number) => {
        const savedMappingStr = localStorage.getItem('last_purchase_mapping');
        const savedConfigsStr = localStorage.getItem('last_purchase_configs');

        const savedMapping = savedMappingStr ? JSON.parse(savedMappingStr) : {};
        const savedConfigs = savedConfigsStr ? JSON.parse(savedConfigsStr) : {};

        const newMapping: Record<string, string> = {};
        const newConfigs: Record<string, ColumnType> = {};

        headers.forEach((header, idx) => {
            // Detección automática de tipo
            const values = lines.slice(detectedIdx + 1, detectedIdx + 11).map(l => l.split('\t')[idx]);
            newConfigs[header] = savedConfigs[header] || inferColumnType(values);

            // Mapeo automático de campos del sistema
            PURCHASE_SYSTEM_FIELDS.forEach(sysField => {
                const headerLower = header.toLowerCase();
                // Prioridad 1: Mapeo guardado anteriormente para este nombre de columna exacto
                const wasMappedTo = Object.keys(savedMapping).find(k => savedMapping[k] === header);
                if (wasMappedTo === sysField.key) {
                    newMapping[sysField.key] = header;
                }
                // Prioridad 2: Coincidencia por alias
                else if (!newMapping[sysField.key] && sysField.aliases.some(alias => headerLower.includes(alias))) {
                    newMapping[sysField.key] = header;
                }
            });
        });

        return { newMapping, newConfigs };
    };

    const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setImportData(text);

        if (text.trim().length > 0) {
            const allLines = text.split('\n');
            if (allLines.length > 0) {
                const rows = allLines.map(l => l.split('\t'));
                const detectedIdx = findHeaderRow(rows);
                setHeaderIndex(detectedIdx);

                const headers = rows[detectedIdx].map(h => h.trim());
                setRawHeaders(headers);
                setRawLines(allLines);

                const { newMapping, newConfigs } = performAutoMapping(headers, allLines, detectedIdx);
                setMapping(newMapping);
                setColumnConfigs(newConfigs);

                // Ir directo a preview
                const result = parsePurchaseRows(allLines, newMapping, newConfigs, detectedIdx);
                setParsedRows(result.rows);
                setStep('preview');
            }
        }
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

                if (rows.length > 0) {
                    const detectedIdx = findHeaderRow(rows);
                    setHeaderIndex(detectedIdx);

                    const headers = rows[detectedIdx].map(h => String(h || '').trim());
                    setRawHeaders(headers);
                    const tsvLines = rows.map(row =>
                        row.map(cell => cell === null || cell === undefined ? '' : String(cell).trim()).join('\t')
                    );
                    setRawLines(tsvLines);

                    const { newMapping, newConfigs } = performAutoMapping(headers, tsvLines, detectedIdx);
                    setMapping(newMapping);
                    setColumnConfigs(newConfigs);

                    // Ir directo a preview
                    const result = parsePurchaseRows(tsvLines, newMapping, newConfigs, detectedIdx);
                    setParsedRows(result.rows);
                    setStep('preview');
                }
            } catch (error) {
                console.error("Error al leer archivo:", error);
                setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo leer el archivo Excel.' });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleProceedToPreview = () => {
        const result = parsePurchaseRows(rawLines, mapping, columnConfigs, headerIndex);
        setParsedRows(result.rows);
        setStep('preview');
    };

    const handleTypeChange = (header: string, type: ColumnType) => {
        setColumnConfigs(prev => ({ ...prev, [header]: type }));
    };

    const handleConfirmImport = () => {
        const validPurchases = parsedRows.filter(r => r.isValid).map(r => r.data);
        if (validPurchases.length > 0) {
            // Guardar configuración para la próxima vez
            localStorage.setItem('last_purchase_mapping', JSON.stringify(mapping));
            localStorage.setItem('last_purchase_configs', JSON.stringify(columnConfigs));

            onBatchImport(validPurchases);
        }
    };

    const handleDeleteRow = (item: any) => {
        setParsedRows(prev => prev.filter(r => r.data.id !== item.id));
    };

    // Generar columnas dinámicas para la SmartDataTable de preview
    const previewColumns: Column<any>[] = React.useMemo(() => {
        return rawHeaders.map((header, idx) => {
            const sysKeyMatched = Object.keys(mapping).find(k => mapping[k] === header);
            const isCurrency = sysKeyMatched === 'amount';
            const sysField = sysKeyMatched ? PURCHASE_SYSTEM_FIELDS.find(f => f.key === sysKeyMatched) : null;

            return {
                key: header,
                label: header,
                align: isCurrency ? 'text-right' : 'text-left',
                tooltip: sysField ? `Mapeado a: ${sysField.label}` : undefined,
                render: (val: any) => {
                    if (isCurrency) return <span className="font-bold tabular-nums text-purple-600">${formatCOP(val)}</span>;
                    return <span className="text-[12px]">{String(val ?? '')}</span>;
                },
                getValue: (item: any) => item[header]
            };
        });
    }, [rawHeaders, mapping]);

    // Preparar datos para la SmartDataTable
    const tableData = parsedRows.map(r => r.data);

    const validCount = parsedRows.filter(r => r.isValid).length;
    const errorCount = parsedRows.filter(r => !r.isValid).length;

    return (
        <div className="space-y-6">
            {step === 'input' && (
                <div className="animate-in fade-in duration-300 space-y-6">
                    <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 p-4 rounded-r-xl">
                        <h3 className="font-bold text-purple-900 dark:text-purple-200 mb-1 flex items-center gap-2">
                            <ClipboardDocumentListIcon className="h-5 w-5" />
                            Importador Inteligente
                        </h3>
                        <p className="text-xs text-purple-800 dark:text-purple-300">
                            Detectaremos automáticamente las fechas, montos y proveedores. Importamos todas las columnas de tu archivo sin excepciones.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Subir Archivo Excel</label>
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer relative group">
                                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileImport} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                <ArrowUpTrayIcon className="h-10 w-10 text-gray-400 group-hover:text-primary mb-2 transition-colors" />
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Seleccionar .xlsx o .csv</p>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Pegar desde Excel</label>
                            <textarea
                                value={importData}
                                onChange={handlePaste}
                                placeholder="Pega aquí las celdas copiadas..."
                                className="flex-1 min-h-[160px] p-4 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary/50 text-xs font-mono resize-none bg-white dark:bg-slate-800"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                    </div>
                </div>
            )}

            {step === 'mapping' && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md animate-in slide-in-from-right duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-bold text-xl text-gray-800 dark:text-white flex items-center gap-2">
                                <TableCellsIcon className="h-6 w-6 text-purple-600" />
                                Configuración de Columnas
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Ajusta cómo interpretamos la información. No te preocupes, importaremos todas las columnas.
                            </p>
                        </div>
                        <Button variant="primary" onClick={() => {
                            const result = parsePurchaseRows(rawLines, mapping, columnConfigs, headerIndex);
                            setParsedRows(result.rows);
                            setStep('preview');
                        }}>Guardar y Ver Preview</Button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                                    <th className="px-5 py-4 font-bold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Columna del Archivo</th>
                                    <th className="px-5 py-4 font-bold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Formato de celda</th>
                                    <th className="px-5 py-4 font-bold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Asignar a Campo Clave</th>
                                    <th className="px-5 py-4 font-bold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Muestra</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                {rawHeaders.map((header, idx) => {
                                    const sysKey = Object.keys(mapping).find(k => mapping[k] === header);
                                    const sampleValue = rawLines[headerIndex + 1]?.split('\t')[idx] || '';
                                    const currentType = columnConfigs[header] || 'text';

                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-gray-900 dark:text-white mb-0.5">{header}</div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <select
                                                    value={currentType}
                                                    onChange={(e) => handleTypeChange(header, e.target.value as ColumnType)}
                                                    className="p-1.5 px-2 text-xs border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-white"
                                                >
                                                    <option value="text">Texto / General</option>
                                                    <option value="number">Número</option>
                                                    <option value="currency">Moneda ($)</option>
                                                    <option value="date">Fecha</option>
                                                </select>
                                            </td>
                                            <td className="px-5 py-4">
                                                <select
                                                    value={sysKey || ''}
                                                    onChange={(e) => {
                                                        const newKey = e.target.value;
                                                        setMapping(prev => {
                                                            const n = { ...prev };
                                                            if (sysKey) n[sysKey] = '';
                                                            if (newKey) n[newKey] = header;
                                                            return n;
                                                        });
                                                    }}
                                                    className={`w-full p-2 text-xs border rounded-lg bg-white dark:bg-slate-800 dark:text-white font-medium ${sysKey ? 'border-purple-300 bg-purple-50 ring-1 ring-purple-100 dark:bg-purple-900/20' : 'border-gray-200'}`}
                                                >
                                                    <option value="">-- Columna Informativa --</option>
                                                    {PURCHASE_SYSTEM_FIELDS.map(f => (
                                                        <option key={f.key} value={f.key}>{f.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/50 p-2 rounded truncate max-w-[150px]">
                                                    {sampleValue || '-'}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {step === 'preview' && (
                <div className="animate-in slide-in-from-right duration-300 space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1 bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-primary">{parsedRows.length}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Registros Listos</div>
                        </div>
                        <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 text-center">
                            <div className="text-lg font-bold text-blue-700 dark:text-blue-400">Importador Universal</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600/70">Modo Sin Restricciones</div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm min-h-[400px]">
                        <SmartDataTable
                            data={tableData}
                            columns={previewColumns}
                            onDelete={handleDeleteRow}
                            enableSelection={false}
                            containerClassName="h-[500px]"
                            searchPlaceholder="Filtrar datos del archivo..."
                            renderExtraFilters={() => (
                                <Button variant="secondary" size="sm" onClick={() => setStep('mapping')} className="h-8 gap-2 text-xs">
                                    <TableCellsIcon className="h-3.5 w-3.5" />
                                    Ajustar Columnas
                                </Button>
                            )}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-4 py-4 border-t border-gray-100 dark:border-slate-800">
                        <Button variant="secondary" onClick={() => setStep('input')}>Volver a Empezar</Button>
                        <Button variant="primary" disabled={validCount === 0} onClick={handleConfirmImport}>
                            Importar {validCount} Compras Seleccionadas
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
