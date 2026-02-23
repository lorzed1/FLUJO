import React, { useState, useEffect } from 'react';
import { ClipboardDocumentListIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, ChevronUpIcon, ChevronDownIcon, ArrowPathIcon, ArrowUpTrayIcon } from '../../components/ui/Icons';
import { extractHeadersAndLines, autoMapColumns, parseExcelRows, calculateTotalRecaudado, calculateDescuadre, SYSTEM_FIELDS, type ParsedRow } from '../../utils/excelParser';
import { detectHeaderRow, inferColumnType, type ColumnType } from '../../utils/importUtils';
import { formatCOP } from '../../components/ui/Input';
import { useUI } from '../../context/UIContext';
import * as XLSX from 'xlsx';

interface ExcelImportTabProps {
    onBatchImport: (rows: ParsedRow[]) => void;
}

const ExcelImportTab: React.FC<ExcelImportTabProps> = ({ onBatchImport }) => {
    const { setAlertModal } = useUI();
    const [importData, setImportData] = useState('');
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);

    // Mapping State
    const [step, setStep] = useState<'input' | 'mapping' | 'preview'>('input');
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawLines, setRawLines] = useState<string[]>([]);
    const [headerIndex, setHeaderIndex] = useState(0);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [columnConfigs, setColumnConfigs] = useState<Record<string, ColumnType>>({});

    const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setImportData(text);

        if (text.trim().length > 0) {
            const { headers, lines, headerIndex: hIdx } = extractHeadersAndLines(text);
            setHeaderIndex(hIdx);
            processImportData(headers, lines);
        } else {
            setStep('input');
            setParsedRows([]);
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

                // Convertir a matriz de arreglos (vía JSON con header: 1)
                const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

                if (rows.length > 0) {
                    // Detectar encabezados
                    const hIdx = detectHeaderRow(rows, SYSTEM_FIELDS);
                    setHeaderIndex(hIdx);

                    const headers = rows[hIdx].map(h => String(h || '').trim());

                    // Convertir filas de datos a formato TSV para reutilizar la lógica de parseExcelRows
                    // parseExcelRows espera un array de strings donde cada string es una línea TSV
                    const tsvLines = rows.map(row =>
                        row.map(cell => {
                            if (cell === null || cell === undefined) return '';
                            // Si es una fecha de Excel, XLSX ya la maneja si especificamos cellDates: true, 
                            // pero por defecto viene el número serial o string.
                            return String(cell).trim();
                        }).join('\t')
                    );

                    processImportData(headers, tsvLines);
                }
            } catch (error) {
                console.error("Error al leer el archivo:", error);
                setAlertModal({ isOpen: true, type: 'error', title: 'Error de Lectura', message: "Hubo un error al leer el archivo. Asegúrate de que es un formato válido de Excel o CSV." });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const processImportData = (headers: string[], lines: string[]) => {
        if (headers.length > 0) {
            setRawHeaders(headers);
            setRawLines(lines);

            const initialMapping = autoMapColumns(headers);
            setMapping(initialMapping);

            // Inferir tipos para cada columna
            const configs: Record<string, ColumnType> = {};
            headers.forEach((header, idx) => {
                const values = lines.slice(headerIndex + 1, headerIndex + 11).map(l => l.split('\t')[idx]);
                configs[header] = inferColumnType(values);
            });
            setColumnConfigs(configs);

            setStep('mapping');
        }
    };

    const handleMappingChange = (systemKey: string, headerValue: string) => {
        setMapping(prev => ({ ...prev, [systemKey]: headerValue }));
    };

    const handleProceedToPreview = () => {
        const result = parseExcelRows(rawLines, mapping, columnConfigs, headerIndex);
        setParsedRows(result.rows);
        setStep('preview');
    };

    const handleTypeChange = (header: string, type: ColumnType) => {
        setColumnConfigs(prev => ({ ...prev, [header]: type }));
    };

    const handleBackToMapping = () => {
        setStep('mapping');
    };

    const handleClear = () => {
        setImportData('');
        setParsedRows([]);
        setStep('input');
        setRawHeaders([]);
        setRawLines([]);
        setMapping({});
    };

    const handleConfirmImport = () => {
        const validRows = parsedRows.filter(row => row.isValid);
        if (validRows.length > 0) {
            onBatchImport(validRows);
            handleClear();
        }
    };

    const totalValid = parsedRows.filter(r => r.isValid).length;
    const totalErrors = parsedRows.length - totalValid;

    const validCount = parsedRows.filter(r => r.isValid).length;
    const errorCount = parsedRows.filter(r => !r.isValid).length;

    return (
        <div className="space-y-6">


            {/* Paso 1: Selección de método */}
            {step === 'input' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Opción 1: Archivo */}
                    <div className="flex flex-col">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Opción A: Subir archivo Excel o CSV
                        </label>
                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 hover:border-primary/50 transition-all cursor-pointer relative group">
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileImport}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <div className="text-center group-hover:scale-110 transition-transform">
                                <ArrowUpTrayIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3 group-hover:text-primary dark:group-hover:text-blue-400" />
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Seleccionar Archivo</p>
                                <p className="text-xs text-gray-400 mt-1">.xlsx, .xls o .csv</p>
                            </div>
                        </div>
                    </div>

                    {/* Opción 2: Pegar */}
                    <div className="flex flex-col">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Opción B: Pegar datos copiados
                        </label>
                        <textarea
                            value={importData}
                            onChange={handlePaste}
                            placeholder="Haz clic aquí y pega (Ctrl+V) los datos copiados de Excel..."
                            className="flex-1 w-full min-h-[160px] p-4 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono text-sm resize-none bg-white dark:bg-slate-800 dark:text-gray-200 dark:placeholder-gray-500"
                        />
                    </div>
                </div>
            )}

            {/* Paso 2: Mapeo y Definición de Tipos */}
            {step === 'mapping' && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md animate-in slide-in-from-right duration-300">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h3 className="font-bold text-xl text-gray-800 dark:text-white flex items-center gap-2">
                                <ArrowPathIcon className="h-6 w-6 text-primary" />
                                Configuración de Columnas
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Revisa los tipos de datos detectados y mapea los campos importantes.</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {SYSTEM_FIELDS.filter(f => f.required).map(field => {
                                const currentHeader = mapping[field.key];
                                const isMapped = currentHeader && rawHeaders.includes(currentHeader);

                                return (
                                    <span
                                        key={field.key}
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-all ${isMapped ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'}`}
                                    >
                                        {isMapped ? <CheckCircleIcon className="h-3 w-3" /> : <ExclamationTriangleIcon className="h-3 w-3" />}
                                        {field.label}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                                    <th className="px-5 py-4 font-bold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Columna</th>
                                    <th className="px-5 py-4 font-bold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Tipo de Dato</th>
                                    <th className="px-5 py-4 font-bold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wider">Mapear a</th>
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
                                                <div className="text-[10px] text-gray-400 font-mono">Índice {idx}</div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <select
                                                    value={currentType}
                                                    onChange={(e) => handleTypeChange(header, e.target.value as ColumnType)}
                                                    className="p-1 px-2 text-xs border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                                                >
                                                    <option value="text">Texto</option>
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
                                                    className={`w-full p-2 text-xs border rounded-lg bg-white dark:bg-slate-800 dark:text-white transition-all cursor-pointer ${sysKey ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' : 'border-gray-300 dark:border-slate-600'}`}
                                                >
                                                    <option value="">-- No mapear --</option>
                                                    {SYSTEM_FIELDS.map(f => (
                                                        <option key={f.key} value={f.key}>{f.label} {f.required ? '*' : ''}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900 p-2 rounded border border-gray-200 dark:border-slate-700 truncate max-w-[180px]">
                                                    {sampleValue || <span className="italic text-gray-400">Sin datos</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex gap-4 justify-end mt-8">
                        <button
                            onClick={handleClear}
                            className="px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleProceedToPreview}
                            className="px-8 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-primary/30 flex items-center gap-2"
                        >
                            Ver Preview de Datos
                            <ArrowPathIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Paso 3: Preview de datos */}
            {step === 'preview' && (
                <div className="space-y-4">
                    {/* Resumen */}
                    <div className="flex gap-4">
                        <div className="flex-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{validCount}</div>
                            <div className="text-sm text-green-600 dark:text-green-500">Registros válidos</div>
                        </div>
                        <div className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{errorCount}</div>
                            <div className="text-sm text-red-600 dark:text-red-500">Con errores</div>
                        </div>
                    </div>

                    {/* Tabla de preview */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 dark:bg-slate-900 sticky top-0 uppercase">
                                    <tr>
                                        <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">Estado</th>
                                        <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">Fecha</th>
                                        <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">Cajero</th>
                                        <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">Venta Bruta</th>
                                        <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">Total Recaudado</th>
                                        <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">Descuadre</th>
                                        <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">Errores</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                    {parsedRows.map((row, idx) => {
                                        const totalRecaudado = calculateTotalRecaudado(row.data);
                                        const descuadre = calculateDescuadre(row.data);

                                        return (
                                            <tr key={idx} className={`${row.isValid ? 'bg-white dark:bg-slate-800' : 'bg-red-50 dark:bg-red-900/10'}`}>
                                                <td className="px-3 py-2">
                                                    {row.isValid ? (
                                                        <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                    ) : (
                                                        <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{row.data.fecha || '-'}</td>
                                                <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{row.data.cajero || '-'}</td>
                                                <td className="px-3 py-2 text-right font-mono dark:text-gray-300">${formatCOP(row.data.ventaBruta || 0)}</td>
                                                <td className="px-3 py-2 text-right font-mono font-semibold dark:text-white">${formatCOP(totalRecaudado)}</td>
                                                <td className={`px-3 py-2 text-right font-mono font-bold ${descuadre === 0 ? 'text-green-600 dark:text-green-400' : descuadre > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    ${formatCOP(Math.abs(descuadre))}
                                                    {descuadre !== 0 && (descuadre > 0 ? <ChevronUpIcon className="h-3 w-3 inline" /> : <ChevronDownIcon className="h-3 w-3 inline" />)}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {row.errors.length > 0 && (
                                                        <div className="text-xs text-red-600 dark:text-red-400">
                                                            {row.errors.map((err, i) => (
                                                                <div key={i}>• {err}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={handleBackToMapping}
                            className="px-6 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            Atrás (Corregir Columnas)
                        </button>
                        <button
                            onClick={handleConfirmImport}
                            disabled={validCount === 0}
                            className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Importar {validCount} Registro{validCount !== 1 ? 's' : ''}
                        </button>
                    </div>

                    {errorCount > 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                                <strong><ExclamationTriangleIcon className="h-4 w-4 inline" /> Atención:</strong> Se importarán solo los {validCount} registros válidos.
                                Los {errorCount} registros con errores serán omitidos.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExcelImportTab;
