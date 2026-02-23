import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ShoppingBagIcon, ArrowUpTrayIcon, DocumentTextIcon, CheckCircleIcon, CogIcon, PlusIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { SmartDataTable, Column } from '../../../components/ui/SmartDataTable';
import { Button } from '../../../components/ui/Button';
import { purchaseService } from '../../../services/budget/purchases';
import { Purchase } from '../../../types/budget';
import { PurchaseFormModal } from '../components/PurchaseFormModal';

type DataType = 'string' | 'number' | 'date' | 'boolean';

interface ColumnConfig {
    key: string;
    label: string;
    type: DataType;
}

interface ParsedRow {
    id: string;
    [key: string]: any;
}

export const BudgetPurchases: React.FC = () => {
    // --- MAIN VIEW STATE ---
    const [isImporting, setIsImporting] = useState(false);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // --- WIZARD STATE ---
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [originalData, setOriginalData] = useState<any[][]>([]);
    const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
    const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>([]);
    const [finalData, setFinalData] = useState<ParsedRow[]>([]);
    const [importDuplicates, setImportDuplicates] = useState<Set<string>>(new Set());
    const [importSelection, setImportSelection] = useState<Set<string>>(new Set());

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- LOAD MAIN DATA ---
    const loadData = useCallback(async () => {
        if (isImporting) return;
        setLoading(true);
        try {
            // Traer un rango amplio de datos
            const start = '2020-01-01';
            const end = '2030-12-31';
            const data = await purchaseService.getPurchases(start, end);

            // Ya que limpiamos la base de datos, mostramos todo directamente
            setPurchases(data);
        } catch (error) {
            console.error("Error loading purchases:", error);
        } finally {
            setLoading(false);
        }
    }, [isImporting]);

    const handleAddPurchase = async (data: any) => {
        try {
            await purchaseService.savePurchase(data);
            await loadData(); // Reload table
        } catch (error) {
            console.error(error);
            alert("Hubo un error al guardar la compra.");
        }
    };

    useEffect(() => {
        loadData();
    }, [loadData]);


    // --- WIZARD LOGIC ---
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];

            // Convert to array of arrays
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
            const sampleData = data.slice(likelyHeaderIdx + 1, likelyHeaderIdx + 11); // sample up to 10 rows of data

            const initialConfig: ColumnConfig[] = headers.map((header, colIndex) => {
                let hStr = String(header || `Columna ${colIndex + 1}`).trim();
                // Ensure unique keys
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
        // Reset input
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

        for (let i = headerRowIndex + 1; i < originalData.length; i++) {
            const row = originalData[i];
            if (!row || row.length === 0) continue;

            // Tratamos de generar un "id predecible" basado en los datos clave de la fila.
            // Esto ayudará con la actualización de datos (upsert) para no duplicar los registros importados.
            let hasData = false;

            // Objeto temporal que representa la fila limpia
            const cleanRowContent: Record<string, any> = {};

            columnsConfig.forEach((col, colIndex) => {
                let val = row[colIndex];

                if (val !== undefined && val !== null && val !== '') {
                    hasData = true;
                    if (col.type === 'number') {
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

            // Only add rows that aren't completely empty
            if (hasData) {
                // Buscamos columnas comunes para crear un hash/ID único (Firma de Invariabilidad)
                // En lugar de hacer hash de toda la fila (lo cual causaría fallos si una coma o un nombre de columna cambia),
                // Extraemos estrictamente los valores base que hacen única a una compra.
                const extractVal = (names: string[]) => {
                    for (const [key, value] of Object.entries(cleanRowContent)) {
                        const nk = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f\s_]/g, "");
                        if (names.some(n => nk.includes(n)) && value) return String(value).trim().toLowerCase();
                    }
                    return '0';
                };

                const coreFecha = extractVal(['fecha', 'date']);
                const coreDoc = extractVal(['documento', 'factura', 'invoice']);
                const coreProv = extractVal(['identificacion', 'nit', 'cedula', 'proveedor', 'contacto']);
                const coreCuenta = extractVal(['cuenta', 'rubro']);
                const coreMonto = extractVal(['base', 'debito', 'credito', 'total', 'valor', 'monto']);

                // La concatenación de estos 5 pilares asegura que si los mismos datos se vuelven a importar, la firma será idéntica.
                const keyString = `${coreFecha}-${coreDoc}-${coreProv}-${coreCuenta}-${coreMonto}`;

                // Función para crear un ID determinista con formato UUID válido (8-4-4-4-12 hex)
                let hash1 = 5381;
                let hash2 = 52711;
                for (let i = 0; i < keyString.length; i++) {
                    const char = keyString.charCodeAt(i);
                    hash1 = ((hash1 << 5) + hash1) ^ char;
                    hash2 = ((hash2 << 5) + hash2) ^ char;
                }

                // Formateamos los hashes para que parezcan un UUID válido v4
                const h1 = Math.abs(hash1).toString(16).padStart(8, '0');
                const h2 = Math.abs(hash2).toString(16).padStart(4, '0');
                const h3 = "4" + Math.abs(hash1 ^ hash2).toString(16).padStart(3, '0'); // v4
                const h4 = "a" + Math.abs(hash2).toString(16).padStart(3, '0'); // variante
                const h5 = Math.abs(hash1 * hash2).toString(16).padStart(12, '0');

                const deterministicId = `${h1}-${h2}-${h3}-${h4}-${h5}`.substring(0, 36);

                const parsedRow: ParsedRow = {
                    id: deterministicId,
                    ...cleanRowContent
                };
                result.push(parsedRow);
                selection.add(deterministicId);

                // Evaluar si ya es un duplicado en la base de datos
                if (purchases.some(p => p.id === deterministicId)) {
                    duplicates.add(deterministicId);
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

    const cancelImport = () => {
        resetWizard();
        setIsImporting(false);
    };

    const handleFinalizeImport = async () => {
        try {
            const rowsToImport = finalData.filter(row => importSelection.has(row.id));
            if (rowsToImport.length === 0) {
                alert("No hay registros seleccionados para importar.");
                return;
            }

            // Mapeamos los datos de la tabla dinámica a la interfaz Purchase esperada por el servicio
            const purchasesToImport = rowsToImport.map(row => {
                // Buscamos las columnas vitales sea como sea que el usuario las haya nombrado
                const getField = (possibleNames: string[]) => {
                    for (const key of Object.keys(row)) {
                        if (possibleNames.some(name => key.toLowerCase().includes(name))) return row[key];
                    }
                    return null;
                };

                const date = getField(['date', 'fecha', 'dia']) || new Date().toISOString().split('T')[0];
                const provider = getField(['provider', 'proveedor', 'tercero']) || 'Proveedor Desconocido';
                const description = getField(['description', 'descripción', 'detalle', 'concepto']) || 'Importación Múltiple';
                const amount = Number(getField(['amount', 'monto', 'total', 'valor', 'precio'])) || 0;
                const category = getField(['category', 'categoria', 'categoría', 'rubro']) || 'General';
                const invoiceNumber = getField(['invoice', 'factura', 'numero', 'ref']) || '';
                const statusStr = getField(['status', 'estado', 'pagado']);

                let isPaid = false;
                if (typeof statusStr === 'boolean') isPaid = statusStr;
                else if (typeof statusStr === 'string') isPaid = statusStr.toLowerCase().includes('pagado') || statusStr.toLowerCase() === 'sí';

                return {
                    id: row.id, // Using our deterministic ID to prevent duplicates if re-imported
                    date,
                    provider,
                    description,
                    amount,
                    category,
                    invoiceNumber,
                    status: isPaid ? 'paid' : 'pending',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    ...row, // Add all raw dynamic column data to metadata via the rest parameter
                } as any; // Cast to any for now, as Purchase type might not include all dynamic keys
            });

            // Llamamos al método batchImport del servicio original
            await purchaseService.batchImport(purchasesToImport);

            alert("¡Exito! Se han importado / actualizado los registros correctamente.");
            resetWizard();
            setIsImporting(false);
            loadData(); // Refrescar la tabla
        } catch (error: any) {
            console.error("Error al importar: ", error);
            alert(`Error durante la importación: ${error.message || 'Desconocido'}`);
        }
    };

    // --- WIZARD COLUMNS PREVIEW ---
    const wizardTableColumns: Column<ParsedRow>[] = useMemo(() => {
        const configColumns: Column<ParsedRow>[] = columnsConfig.map(col => ({
            key: col.key,
            label: col.label,
            sortable: true,
            filterable: true,
            align: col.type === 'number' ? 'text-right' : 'text-left',
            render: (val: any) => {
                if (val === undefined || val === null || val === '') return <span className="text-gray-300">-</span>;
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


    // --- BULK DELETE ---
    const handleBulkDelete = async (selectedIds: Set<string>) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar ${selectedIds.size} compras? Esta acción no se puede deshacer.`)) return;

        setLoading(true);
        try {
            const idsArray = Array.from(selectedIds);
            for (const id of idsArray) {
                await purchaseService.deletePurchase(id);
            }
            // Recargar datos para refrescar la tabla
            await loadData();
            alert("Registros eliminados exitosamente.");
        } catch (error) {
            console.error("Error al eliminar registros:", error);
            alert("Ocurrió un error al intentar eliminar algunos registros.");
        } finally {
            setLoading(false);
        }
    };

    // --- MAIN LIST COLUMNS ---
    const mainColumns: Column<Purchase>[] = useMemo(() => [
        {
            key: 'cuenta',
            label: 'Cuenta',
            sortable: true,
            filterable: true,
            render: (value: any, item: any) => <span className="text-[12px] font-medium text-gray-700">{item.cuenta || item.metadata?.cuenta || '-'}</span>
        },
        {
            key: 'nombre_cuenta',
            label: 'Nombre de Cuenta',
            sortable: true,
            filterable: true,
            className: 'min-w-[150px]',
            render: (value: any, item: any) => <span className="text-[12px] text-gray-800 font-semibold">{item.nombre_cuenta || item.metadata?.['nombre_cuenta'] || item.metadata?.['nombre de cuenta'] || '-'}</span>
        },
        {
            key: 'contacto',
            label: 'Contacto',
            sortable: true,
            filterable: true,
            render: (value: any, item: any) => <span className="text-[12px] text-gray-600">{item.contacto || item.metadata?.contacto || '-'}</span>
        },
        {
            key: 'identificacion',
            label: 'Identificación',
            sortable: true,
            render: (value: any, item: any) => <span className="text-[12px] font-mono text-gray-500">{item.identificacion || item.metadata?.identificacion || item.metadata?.identificación || '-'}</span>
        },
        {
            key: 'centro_costo',
            label: 'Centro de Costo',
            sortable: true,
            filterable: true,
            render: (value: any, item: any) => <span className="text-[12px] text-gray-600">{item.centro_costo || item.metadata?.['centro_costo'] || item.metadata?.['centro de costo'] || '-'}</span>
        },
        {
            key: 'documento',
            label: 'Documento',
            sortable: true,
            render: (value: any, item: any) => <span className="text-[12px] font-medium text-[#7511E5]">{item.documento || item.metadata?.documento || '-'}</span>
        },
        {
            key: 'fecha',
            label: 'Fecha',
            sortable: true,
            render: (value: any, item: any) => <span className="text-[12px] text-gray-600">{item.fecha || item.date || item.metadata?.fecha || '-'}</span>
        },
        {
            key: 'descripcion',
            label: 'Descripción',
            className: 'max-w-xs truncate',
            render: (value: any, item: any) => <span className="text-[12px] text-gray-600" title={item.descripcion || item.description || item.metadata?.descripcion || item.metadata?.descripción}>{item.descripcion || item.description || item.metadata?.descripcion || item.metadata?.descripción || '-'}</span>
        },
        {
            key: 'descripcion_movimiento',
            label: 'Descripción del movimiento',
            className: 'max-w-[200px] truncate',
            render: (value: any, item: any) => <span className="text-[12px] text-gray-500 text-xs italic" title={item.descripcion_movimiento || item.metadata?.['descripcion_movimiento'] || item.metadata?.['descripción del movimiento']}>{item.descripcion_movimiento || item.metadata?.['descripcion_movimiento'] || item.metadata?.['descripción del movimiento'] || '-'}</span>
        },
        {
            key: 'base',
            label: 'Base',
            sortable: true,
            align: 'text-right',
            render: (value: any, item: any) => <span className="text-[12px] font-medium tabular-nums">${Number(item.base || item.metadata?.base || 0).toLocaleString('es-CO')}</span>
        },
        {
            key: 'saldo_inicial',
            label: 'Saldo Inicial',
            sortable: true,
            align: 'text-right',
            render: (value: any, item: any) => <span className="text-[12px] font-medium tabular-nums text-gray-600">${Number(item.saldo_inicial || item.metadata?.['saldo_inicial'] || item.metadata?.['saldo inicial'] || 0).toLocaleString('es-CO')}</span>
        },
        {
            key: 'debito',
            label: 'Debito',
            sortable: true,
            align: 'text-right',
            render: (value: any, item: any) => <span className="text-[12px] font-medium tabular-nums text-emerald-600">${Number(item.debito || item.metadata?.debito || item.metadata?.débito || 0).toLocaleString('es-CO')}</span>
        },
        {
            key: 'credito',
            label: 'Credito',
            sortable: true,
            align: 'text-right',
            render: (value: any, item: any) => <span className="text-[12px] font-medium tabular-nums text-rose-600">${Number(item.credito || item.metadata?.credito || item.metadata?.crédito || 0).toLocaleString('es-CO')}</span>
        },
        {
            key: 'saldo_final',
            label: 'Saldo Final',
            sortable: true,
            align: 'text-right',
            render: (value: any, item: any) => <span className="text-[12px] font-bold tabular-nums text-[#363636] dark:text-gray-200">${Number(item.saldo_final || item.metadata?.['saldo_final'] || item.metadata?.['saldo final'] || 0).toLocaleString('es-CO')}</span>
        }
    ], []);

    // --- RENDER ---
    return (
        <div className="space-y-6">
            <PageHeader
                title="Compras"
                breadcrumbs={[
                    { label: 'Egresos', path: '/budget' },
                    { label: 'Compras' }
                ]}
                icon={<ShoppingBagIcon className="h-6 w-6" />}
                actions={
                    !isImporting ? (
                        <div className="flex gap-2">
                            <Button variant="primary" className="gap-2" onClick={() => setIsFormOpen(true)}>
                                <PlusIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Nueva Compra</span>
                            </Button>
                        </div>
                    ) : null
                }
            />

            {!isImporting ? (
                /* VISTA DE LISTADO PRINCIPAL - TABLA PERSONALIZADA */
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 min-h-[400px]">
                    <SmartDataTable
                        id="budget-purchases"
                        data={purchases}
                        columns={mainColumns}
                        loading={loading}
                        enableSelection={true}
                        onImport={() => setIsImporting(true)}
                        onBulkDelete={handleBulkDelete}
                        searchPlaceholder="Buscar por cuenta, contacto o documento..."
                    />
                </div>
            ) : (
                /* VISTA DEL WIZARD DE IMPORTACIÓN */
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 min-h-[500px] flex flex-col relative overflow-hidden animate-in fade-in duration-300">
                    {/* Stepper visual */}
                    <div className="flex border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 relative">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute left-2 top-2 z-10 text-gray-400 hover:text-gray-700"
                            onClick={cancelImport}
                        >
                            &larr; Volver
                        </Button>
                        <div className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition-colors ${step >= 1 ? 'border-[#7511E5] text-[#7511E5]' : 'border-transparent text-gray-400'}`}>
                            1. Cargar Archivo
                        </div>
                        <div className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition-colors ${step >= 2 ? 'border-[#7511E5] text-[#7511E5]' : 'border-transparent text-gray-400'}`}>
                            2. Configurar Columnas
                        </div>
                        <div className={`flex-1 py-4 text-center text-sm font-semibold border-b-2 transition-colors ${step >= 3 ? 'border-[#7511E5] text-[#7511E5]' : 'border-transparent text-gray-400'}`}>
                            3. Previsualizar
                        </div>
                    </div>

                    <div className="p-6 md:p-8 flex-1 flex flex-col">
                        {step === 1 && (
                            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full text-center py-12">
                                <div className="p-4 bg-[#7511E5]/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                                    <ArrowUpTrayIcon className="w-8 h-8 text-[#7511E5]" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                                    Importar datos
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                                    Selecciona un archivo de Excel (.xlsx, .xls) o CSV. Detectaremos automáticamente los encabezados y datos.
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
                                    className="bg-[#7511E5] hover:bg-[#5b0cb5] text-white px-8 py-3 h-auto text-base rounded-full shadow-lg shadow-[#7511E5]/20 gap-2 font-semibold"
                                >
                                    <DocumentTextIcon className="w-5 h-5" />
                                    Seleccionar Archivo
                                </Button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="flex-1 flex flex-col">
                                <div className="mb-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                            <CogIcon className="w-5 h-5 text-[#7511E5]" />
                                            Configuración de Columnas
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Hemos detectado {columnsConfig.length} columnas. Verifica y ajusta el tipo de dato si es necesario.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="secondary" onClick={resetWizard}>Borrar Archivo</Button>
                                        <Button
                                            className="bg-[#7511E5] hover:bg-[#5b0cb5] text-white gap-2"
                                            onClick={processData}
                                        >
                                            Continuar <CheckCircleIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {columnsConfig.map((col, index) => (
                                            <div key={col.key} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col gap-3 transition-all hover:border-[#7511E5]/30 hover:shadow-md">
                                                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 pb-2">
                                                    <span className="bg-gray-100 dark:bg-slate-700 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded">
                                                        Col {index + 1}
                                                    </span>
                                                    <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate" title={col.label}>
                                                        {col.label}
                                                    </h4>
                                                </div>

                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Formato</label>
                                                    <select
                                                        className="w-full text-sm border-gray-300 dark:border-slate-600 rounded-md bg-transparent focus:ring-[#7511E5] focus:border-[#7511E5] dark:text-white cursor-pointer"
                                                        value={col.type}
                                                        onChange={(e) => handleFormatChange(index, e.target.value as DataType)}
                                                    >
                                                        <option value="string">Texto / General</option>
                                                        <option value="number">Número / Moneda</option>
                                                        <option value="date">Fecha</option>
                                                        <option value="boolean">Verdadero / Falso</option>
                                                    </select>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="flex-1 flex flex-col min-h-0 -m-6 md:-m-8">
                                {/* Toolbar de visualización */}
                                <div className="px-6 md:px-8 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-white dark:bg-slate-800">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                            <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                            Previsualización de Datos
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Se importarán <strong>{finalData.length}</strong> registros con <strong>{columnsConfig.length}</strong> columnas.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="secondary" onClick={() => setStep(2)}>Atrás</Button>
                                        <Button
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-600/20"
                                            onClick={handleFinalizeImport}
                                        >
                                            <ArrowUpTrayIcon className="w-4 h-4" />
                                            Finalizar Importación
                                        </Button>
                                    </div>
                                </div>

                                {/* SmartDataTable embebida */}
                                <div className="flex-1 min-h-0 relative flex flex-col p-6 pt-0">
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
                                                        className="mt-2 text-[12px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 underline transition-colors"
                                                    >
                                                        Desmarcar todos los duplicados e ignorarlos
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <SmartDataTable
                                        data={finalData}
                                        columns={wizardTableColumns}
                                        enableSelection={true}
                                        selectedIds={importSelection}
                                        onSelectionChange={setImportSelection}
                                        enableExport={false}
                                        enableSearch={true}
                                        searchPlaceholder="Buscar en los datos importados..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <PurchaseFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleAddPurchase}
            />
        </div>
    );
};
