import React, { useState, useEffect } from 'react';
import {
    ClipboardDocumentListIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    ArrowUpTrayIcon,
    CalendarDaysIcon,
    TableCellsIcon,
    ExclamationTriangleIcon
} from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';
import { extractHeadersAndLines, autoMapColumns, parseIncomeRows, INCOME_SYSTEM_FIELDS, type ParsedIncomeRow } from '../utils/incomeParser';
import { detectHeaderRow, inferColumnType, type ColumnType } from '../../../utils/importUtils';
import { isFinancialMatrixFormat, parseFinancialMatrix } from '../utils/financialMatrixParser';
import { formatCOP } from '../../../components/ui/Input';
import { useUI } from '../../../context/UIContext';
import * as XLSX from 'xlsx';

interface IncomeStatementImportWizardProps {
    onBatchImport: (rows: ParsedIncomeRow[]) => void;
    onCancel: () => void;
}

export const IncomeStatementImportWizard: React.FC<IncomeStatementImportWizardProps> = ({ onBatchImport, onCancel }) => {
    const { setAlertModal } = useUI();
    const [importData, setImportData] = useState('');
    const [parsedRows, setParsedRows] = useState<ParsedIncomeRow[]>([]);

    // State
    const [step, setStep] = useState<'input' | 'config' | 'mapping' | 'preview'>('input');
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawLines, setRawLines] = useState<string[]>([]); // For flat list
    const [headerIndex, setHeaderIndex] = useState(0);
    const [rawMatrix, setRawMatrix] = useState<any[][]>([]); // For matrix
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [columnConfigs, setColumnConfigs] = useState<Record<string, ColumnType>>({});

    // Config State for Matrix
    const [isMatrixMode, setIsMatrixMode] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [matrixMapping, setMatrixMapping] = useState({
        accountCode: '',
        accountName: ''
    });

    const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setImportData(text);

        // Simple paste logic only supports flat list
        if (text.trim().length > 0) {
            const { headers, lines, headerIndex: hIdx } = extractHeadersAndLines(text);
            setRawHeaders(headers);
            setRawLines(lines);
            setHeaderIndex(hIdx);
            setMapping(autoMapColumns(headers));

            // Detectar tipos
            const configs: Record<string, ColumnType> = {};
            headers.forEach((header, idx) => {
                const values = lines.slice(hIdx + 1, hIdx + 11).map(l => l.split('\t')[idx]);
                configs[header] = inferColumnType(values);
            });
            setColumnConfigs(configs);

            setIsMatrixMode(false);
            setStep('mapping');
        } else {
            setStep('input');
            setParsedRows([]);
        }
    };

    // State for Config
    const [availableMonths, setAvailableMonths] = useState<string[]>([]);
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Try to guess year from filename
        const yearMatch = file.name.match(/20\d{2}/);
        if (yearMatch) {
            setSelectedYear(parseInt(yearMatch[0]));
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

                if (rows.length > 0) {
                    const headers = rows[0].map(h => String(h || '').trim());

                    if (isFinancialMatrixFormat(headers)) {
                        setRawMatrix(rows);
                        setRawHeaders(headers);

                        // Auto-detect matrix mapping
                        const codeCol = headers.find(h => h.toLowerCase().includes('cuenta') || h.toLowerCase().includes('condigo') || h.toLowerCase().includes('code')) || '';
                        const nameCol = headers.find(h => h.toLowerCase().includes('nombre') || h.toLowerCase().includes('descripcion')) || '';

                        // Detect months
                        const detectedMonths = headers.filter(h =>
                            ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
                                .includes(h.toLowerCase().trim())
                        );
                        setAvailableMonths(detectedMonths);
                        setSelectedMonths(detectedMonths);

                        setMatrixMapping({ accountCode: codeCol, accountName: nameCol });
                        setIsMatrixMode(true);
                        setStep('config');
                    } else {
                        // Regular list
                        const hIdx = detectHeaderRow(rows, INCOME_SYSTEM_FIELDS);
                        setHeaderIndex(hIdx);
                        const headers = rows[hIdx].map(h => String(h || '').trim());

                        const tsvLines = rows.map(row =>
                            row.map(cell => {
                                if (cell === null || cell === undefined) return '';
                                return String(cell).trim();
                            }).join('\t')
                        );
                        setRawHeaders(headers);
                        setRawLines(tsvLines);
                        setMapping(autoMapColumns(headers));

                        // Detectar tipos
                        const configs: Record<string, ColumnType> = {};
                        headers.forEach((header, idx) => {
                            const values = tsvLines.slice(hIdx + 1, hIdx + 11).map(l => l.split('\t')[idx]);
                            configs[header] = inferColumnType(values);
                        });
                        setColumnConfigs(configs);

                        setIsMatrixMode(false);
                        setStep('mapping');
                    }
                }
            } catch (error) {
                console.error("Error al leer el archivo:", error);
                setAlertModal({ isOpen: true, type: 'error', title: 'Error de Lectura', message: "Hubo un error al leer el archivo. Asegúrate de que es un formato válido de Excel o CSV." });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleMappingChange = (systemKey: string, headerValue: string) => {
        setMapping(prev => ({ ...prev, [systemKey]: headerValue }));
    };

    const handleMatrixConfigConfirm = () => {
        if (!matrixMapping.accountCode) {
            setAlertModal({ isOpen: true, type: 'warning', title: 'Falta Columna', message: "Debes seleccionar la columna que contiene el Código de Cuenta." });
            return;
        }

        if (selectedMonths.length === 0) {
            setAlertModal({ isOpen: true, type: 'warning', title: 'Meses Requeridos', message: "Debes seleccionar al menos un mes para importar." });
            return;
        }

        const result = parseFinancialMatrix(rawMatrix, {
            accountCode: matrixMapping.accountCode,
            accountName: matrixMapping.accountName,
            year: selectedYear,
            selectedMonths: selectedMonths
        });

        setParsedRows(result.rows);
        setStep('preview');
    };

    const handleProceedToPreview = () => {
        const result = parseIncomeRows(rawLines, mapping, columnConfigs, headerIndex);
        setParsedRows(result.rows);
        setStep('preview');
    };

    const handleTypeChange = (header: string, type: ColumnType) => {
        setColumnConfigs(prev => ({ ...prev, [header]: type }));
    };

    const handleBackToConfig = () => {
        setStep(isMatrixMode ? 'config' : 'mapping');
    };

    const handleClear = () => {
        setImportData('');
        setParsedRows([]);
        setStep('input');
        setRawHeaders([]);
        setRawLines([]);
        setMapping({});
        setRawMatrix([]);
    };

    const handleConfirmImport = () => {
        const validRows = parsedRows.filter(row => row.isValid);
        if (validRows.length > 0) {
            onBatchImport(validRows);
            handleClear();
        }
    };

    const validCount = parsedRows.filter(r => r.isValid).length;
    const errorCount = parsedRows.filter(r => !r.isValid).length;

    return (
        <div className="space-y-6">
            {step === 'input' && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
                        <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
                            <ClipboardDocumentListIcon className="h-5 w-5" />
                            Instrucciones de Importación:
                        </h3>
                        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1 ml-4">
                            <p>Soporta dos formatos:</p>
                            <ul className="list-disc ml-4 mb-2">
                                <li><strong>Lista Simple:</strong> Filas con fecha, concepto y valor.</li>
                                <li><strong>Matriz P&G:</strong> Cuentas en filas y meses en columnas (Enero, Febrero...).</li>
                            </ul>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Opción A: Subir archivo Excel
                            </label>
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 hover:border-primary/50 transition-all cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleFileImport}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                />
                                <div className="text-center group-hover:scale-110 transition-transform">
                                    <div className="flex justify-center gap-2 mb-3 text-gray-400 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-blue-400">
                                        <TableCellsIcon className="h-10 w-10" />
                                        <ArrowUpTrayIcon className="h-6 w-6 self-end" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Seleccionar Excel/CSV</p>
                                    <p className="text-[10px] text-gray-400 mt-1">Detecta formato P&G automáticamente</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Opción B: Pegar datos (Lista Simple)
                            </label>
                            <textarea
                                value={importData}
                                onChange={handlePaste}
                                placeholder="Pega aquí filas copiadas..."
                                className="flex-1 w-full min-h-[160px] p-4 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary font-mono text-xs resize-none bg-white dark:bg-slate-800 dark:text-gray-200 dark:placeholder-gray-500"
                            />
                        </div>
                    </div>
                </div>
            )}

            {step === 'config' && isMatrixMode && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm animate-in slide-in-from-right duration-300">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <CalendarDaysIcon className="h-5 w-5 text-purple-500" />
                        Configuración de Matriz P&G
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">
                                Año del Reporte
                            </label>
                            <input
                                type="number"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white font-bold"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Los meses en columnas (Enero, Febrero...) se asignarán a este año.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">
                                    Columna Código de Cuenta
                                </label>
                                <select
                                    value={matrixMapping.accountCode}
                                    onChange={(e) => setMatrixMapping(prev => ({ ...prev, accountCode: e.target.value }))}
                                    className="w-full p-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {rawHeaders.map((h, i) => <option key={i} value={h}>{h}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">
                                    Columna Nombre/Descripción
                                </label>
                                <select
                                    value={matrixMapping.accountName}
                                    onChange={(e) => setMatrixMapping(prev => ({ ...prev, accountName: e.target.value }))}
                                    className="w-full p-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white"
                                >
                                    <option value="">-- Opcional --</option>
                                    {rawHeaders.map((h, i) => <option key={i} value={h}>{h}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Month Selection */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 uppercase tracking-wide">
                            Seleccionar Meses a Importar ({selectedMonths.length})
                        </label>
                        <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-600 max-h-[150px] overflow-y-auto custom-scrollbar">
                            {availableMonths.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {availableMonths.map((month) => (
                                        <label key={month} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 p-1.5 rounded transition-colors group">
                                            <input
                                                type="checkbox"
                                                checked={selectedMonths.includes(month)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedMonths(prev => [...prev, month]);
                                                    else setSelectedMonths(prev => prev.filter(m => m !== month));
                                                }}
                                                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-primary capitalize">{month}</span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 italic">No se detectaron columnas de meses (Enero, Febrero...).</p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end mt-8">
                        <button onClick={handleClear} className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                        <Button onClick={handleMatrixConfigConfirm} variant="primary">Procesar Matriz</Button>
                    </div>
                </div>
            )}

            {step === 'mapping' && !isMatrixMode && (
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
                            {INCOME_SYSTEM_FIELDS.filter(f => f.required).map(field => {
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
                                                <div className="text-[10px] text-gray-400 font-mono italic">Col {idx + 1}</div>
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
                                                    {INCOME_SYSTEM_FIELDS.map(f => (
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
                        <button onClick={handleClear} className="px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                        <Button
                            onClick={handleProceedToPreview}
                            variant="primary"
                            className="px-8 py-2.5 flex items-center gap-2 shadow-lg"
                        >
                            Ver Preview de Datos
                            <ArrowPathIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {step === 'preview' && (
                <div className="space-y-4 animate-in slide-in-from-right duration-300">
                    <div className="flex gap-4">
                        <div className="flex-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-green-700 dark:text-green-400">{validCount}</div>
                            <div className="text-xs font-bold uppercase text-green-600 dark:text-green-500">Válidos</div>
                        </div>
                        <div className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-red-700 dark:text-red-400">{errorCount}</div>
                            <div className="text-xs font-bold uppercase text-red-600 dark:text-red-500">Errores</div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-slate-700">
                        <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-100 dark:bg-slate-900 sticky top-0 uppercase font-bold text-gray-500 tracking-wider">
                                    <tr>
                                        <th className="px-3 py-2 text-center w-10">Estado</th>
                                        <th className="px-3 py-2 text-left">Fecha</th>
                                        <th className="px-3 py-2 text-left">Código</th>
                                        <th className="px-3 py-2 text-left">Descripción</th>
                                        <th className="px-3 py-2 text-left">Tipo</th>
                                        <th className="px-3 py-2 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                    {parsedRows.map((row, idx) => (
                                        <tr key={idx} className={`${row.isValid ? 'bg-white dark:bg-slate-800' : 'bg-red-50 dark:bg-red-900/10'}`}>
                                            <td className="px-3 py-2 text-center">
                                                {row.isValid ? <CheckCircleIcon className="h-4 w-4 text-green-500" /> : <XCircleIcon className="h-4 w-4 text-red-500" />}
                                            </td>
                                            <td className="px-3 py-2 font-mono">{row.data.date || '-'}</td>
                                            <td className="px-3 py-2 font-mono text-gray-500">{row.data.code || '-'}</td>
                                            <td className="px-3 py-2 font-bold truncate max-w-[150px]">{row.data.description}</td>
                                            <td className="px-3 py-2 uppercase font-bold text-[10px]">{row.data.type === 'income' ? <span className="text-emerald-500">Ingreso</span> : <span className="text-rose-500">Egreso</span>}</td>
                                            <td className="px-3 py-2 text-right font-mono font-bold">
                                                {formatCOP(row.data.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-slate-700">
                        <button onClick={handleBackToConfig} className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">Atrás</button>
                        <Button
                            onClick={handleConfirmImport}
                            disabled={validCount === 0}
                            variant="primary"
                            className="shadow-lg"
                        >
                            Confirmar Importación
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
