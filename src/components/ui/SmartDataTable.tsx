import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    MagnifyingGlassIcon,
    EyeIcon,
    ArrowDownTrayIcon,
    FunnelIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    TrashIcon,
    InformationCircleIcon,
    ChevronUpDownIcon
} from './Icons';

// --- Interfaces Genéricas ---
export interface Column<T> {
    key: string; // Puede ser una propiedad de T o una clave virtual
    label: string;
    width?: string;
    align?: 'text-left' | 'text-center' | 'text-right';
    render?: (value: any, item: T) => React.ReactNode;
    sortable?: boolean;
    filterable?: boolean; // Habilita filtro tipo Excel con valores únicos
    getValue?: (item: T) => string | number; // Para ordenamiento y exportación si no es directa la prop
}

export interface SmartDataTableProps<T extends { id: string }> {
    data: T[];
    columns: Column<T>[];
    enableSearch?: boolean;
    enableSelection?: boolean;
    enableExport?: boolean;
    enableColumnConfig?: boolean;
    onBulkDelete?: (ids: Set<string>) => void;
    onRowClick?: (item: T) => void;
    containerClassName?: string;
    searchPlaceholder?: string;
    // Control externo del estado
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
    activeFilters?: Record<string, string[]>;
    onFilterChange?: (filters: Record<string, string[]>) => void;
    searchTerm?: string;
    onSearchChange?: (term: string) => void;
    sortConfig?: { key: string; direction: 'asc' | 'desc' };
    onSortChange?: (config: { key: string; direction: 'asc' | 'desc' }) => void;
    renderExtraFilters?: () => React.ReactNode;
    renderSelectionActions?: (selectedIds: Set<string>) => React.ReactNode;
}

// --- Componente Maestro ---
export function SmartDataTable<T extends { id: string }>({
    data,
    columns: initialColumns,
    enableSearch = true,
    enableSelection = true,
    enableExport = true,
    enableColumnConfig = true,
    onBulkDelete,
    onRowClick,
    containerClassName = "h-full",
    searchPlaceholder = "Buscar...",
    selectedIds: externalSelectedIds,
    onSelectionChange: externalOnSelectionChange,
    activeFilters: externalActiveFilters,
    onFilterChange: externalOnFilterChange,
    searchTerm: externalSearchTerm,
    onSearchChange: externalOnSearchChange,
    sortConfig: externalSortConfig,
    onSortChange: externalOnSortChange,
    renderExtraFilters,
    renderSelectionActions
}: SmartDataTableProps<T>) {

    // 1. Estados de Configuración de Tabla (Internos)
    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const [internalSortConfig, setInternalSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });
    const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
    const [internalActiveFilters, setInternalActiveFilters] = useState<Record<string, string[]>>({});

    // --- Paginación Estado ---
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15); // Default 15 filas

    // Unificación de Estado (Externo vs Interno)
    const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
    const setSearchTerm = (updater: any) => {
        const next = typeof updater === 'function' ? updater(searchTerm) : updater;
        if (externalOnSearchChange) externalOnSearchChange(next);
        else setInternalSearchTerm(next);
    };

    const sortConfig = externalSortConfig !== undefined ? externalSortConfig : internalSortConfig;
    const setSortConfig = (updater: any) => {
        const next = typeof updater === 'function' ? updater(sortConfig) : updater;
        if (externalOnSortChange) externalOnSortChange(next);
        else setInternalSortConfig(next);
    };

    const selectedIds = externalSelectedIds !== undefined ? externalSelectedIds : internalSelectedIds;
    const setSelectedIds = (updater: any) => {
        const next = typeof updater === 'function' ? updater(selectedIds) : updater;
        if (externalOnSelectionChange) externalOnSelectionChange(next);
        else setInternalSelectedIds(next);
    };

    const activeFilters = externalActiveFilters !== undefined ? externalActiveFilters : internalActiveFilters;
    const setActiveFilters = (updater: any) => {
        const next = typeof updater === 'function' ? updater(activeFilters) : updater;
        if (externalOnFilterChange) externalOnFilterChange(next);
        else setInternalActiveFilters(next);
    };
    const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);

    // Configuración de visualización de columnas
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
        initialColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
    );
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [showExportOptions, setShowExportOptions] = useState(false);

    // 2. Helpers de Valor
    const getCellValue = (item: T, col: Column<T>): string | number => {
        if (col.getValue) return col.getValue(item);
        const value = (item as any)[col.key];
        return value !== undefined && value !== null ? value : '';
    };

    const getRenderedStringValue = (item: T, col: Column<T>): string => {
        const val = getCellValue(item, col);
        return String(val);
    };

    // 3. Obtener valores únicos para filtros tipo Excel
    const getUniqueValues = (colKey: string) => {
        const col = initialColumns.find(c => c.key === colKey);
        if (!col) return [];
        const values = new Set<string>();
        data.forEach(item => values.add(getRenderedStringValue(item, col)));
        return Array.from(values).sort();
    };

    // 4. Lógica de Filtrado y Ordenamiento (Core "Smart")
    const processedData = useMemo(() => {
        let result = [...data];

        // A. Buscador Global
        if (enableSearch && searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(item => {
                // Buscar en todas las columnas visibles
                return initialColumns.some(col => {
                    const val = getRenderedStringValue(item, col).toLowerCase();
                    return val.includes(lowerTerm);
                });
            });
        }

        // B. Filtros por Columna (Excel Style)
        Object.entries(activeFilters).forEach(([colKey, allowedValues]) => {
            const values = allowedValues as string[];
            if (values && values.length > 0) {
                const col = initialColumns.find(c => c.key === colKey);
                if (col) {
                    result = result.filter(item => {
                        const val = getRenderedStringValue(item, col);
                        return values.includes(val);
                    });
                }
            }
        });

        // C. Ordenamiento
        if (sortConfig.key) {
            const col = initialColumns.find(c => c.key === sortConfig.key);
            if (col) {
                result.sort((a, b) => {
                    const valA = getCellValue(a, col);
                    const valB = getCellValue(b, col);

                    if (typeof valA === 'number' && typeof valB === 'number') {
                        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
                    }

                    const strA = String(valA).toLowerCase();
                    const strB = String(valB).toLowerCase();
                    return sortConfig.direction === 'asc'
                        ? strA.localeCompare(strB)
                        : strB.localeCompare(strA);
                });
            }
        }

        return result;
    }, [data, searchTerm, activeFilters, sortConfig, initialColumns, enableSearch]);

    // Resetear página al filtrar
    useMemo(() => {
        setCurrentPage(1);
    }, [internalSearchTerm, externalSearchTerm, internalActiveFilters, externalActiveFilters]);

    // Calcular datos paginados
    const totalItems = processedData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    const paginatedData = processedData.slice(startIndex, endIndex);

    // 5. Handlers
    const toggleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleFilter = (colKey: string, value: string) => {
        setActiveFilters(prev => {
            const current = prev[colKey] || [];
            const newValues = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];

            // Si queda vacío, eliminamos la key para performance
            if (newValues.length === 0) {
                const next = { ...prev };
                delete next[colKey];
                return next;
            }

            return { ...prev, [colKey]: newValues };
        });
    };

    const clearColumnFilter = (colKey: string) => {
        const next = { ...activeFilters };
        delete next[colKey];
        setActiveFilters(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === processedData.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(processedData.map(d => d.id)));
    };

    const toggleSelectRow = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleBulkDeleteAction = () => {
        if (onBulkDelete && selectedIds.size > 0) {
            onBulkDelete(selectedIds);
            // Confirmation and selection clearing is now handled by the parent component
            // to support custom confirmation modals and async flows.
        }
    };

    // 6. Exportación
    const getExportData = () => {
        const dataToExport = selectedIds.size > 0
            ? processedData.filter(item => selectedIds.has(item.id))
            : processedData;

        return dataToExport.map(item => {
            const row: Record<string, any> = {};
            initialColumns.filter(c => visibleColumns[c.key]).forEach(col => {
                row[col.label] = getRenderedStringValue(item, col);
            });
            return row;
        });
    };

    const exportToExcel = () => {
        const data = getExportData();
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Datos");
        XLSX.writeFile(wb, `export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToCSV = () => {
        const data = getExportData();
        if (data.length === 0) return;
        const headers = Object.keys(data[0]);
        const csvContent = [headers.join(','), ...data.map(row => headers.map(h => row[h]).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        const data = getExportData();
        if (data.length === 0) return;
        const headers = Object.keys(data[0]);
        const rows = data.map(row => Object.values(row));

        autoTable(doc, {
            head: [headers],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }
        });
        doc.save(`export_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className={`space-y-2 flex flex-col ${containerClassName}`}>
            {/* --- TOOLBAR --- */}

            {/* Barra de Selección Masiva */}
            {selectedIds.size > 0 && enableSelection && (
                <div className="flex items-center justify-between bg-indigo-600 text-white p-2 rounded-xl shadow-md animate-in fade-in slide-in-from-top-1 border border-indigo-500 text-xs">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold">{selectedIds.size} seleccionados</span>
                        <button onClick={() => setSelectedIds(new Set())} className="text-[10px] font-semibold bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded uppercase transition-all">Desmarcar</button>
                    </div>
                    {renderSelectionActions ? renderSelectionActions(selectedIds) : (
                        onBulkDelete && (
                            <button onClick={handleBulkDeleteAction} className="flex items-center gap-1 bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg font-semibold transition-all shadow-sm">
                                <TrashIcon className="h-3 w-3" /> Eliminar
                            </button>
                        )
                    )}
                </div>
            )}

            {/* Barra Principal */}
            <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-wrap gap-2 items-center justify-between relative z-30">
                {enableSearch && (
                    <div className="relative flex-1 min-w-[200px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        </div>
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-1.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary/20 dark:text-white focus:outline-none transition-all"
                        />
                    </div>
                )}

                {renderExtraFilters?.()}

                <div className="flex items-center gap-1 ml-auto">
                    {/* Selector de Columnas */}
                    {enableColumnConfig && (
                        <div className="relative">
                            <button onClick={() => setShowColumnSelector(!showColumnSelector)} className={`p-1.5 rounded-lg border transition-all ${showColumnSelector ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600'}`} title="Configurar Columnas">
                                <EyeIcon className="h-4 w-4" />
                            </button>
                            {showColumnSelector && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl z-[1000] p-2 animate-in fade-in zoom-in-95">
                                    <div className="text-[10px] font-semibold text-gray-300 dark:text-gray-500 uppercase p-2 border-b border-gray-100 dark:border-slate-700 mb-1 text-center">Columnas</div>
                                    {initialColumns.map(col => (
                                        <label key={col.key} className="flex items-center gap-2 p-2 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-all">
                                            <input
                                                type="checkbox"
                                                checked={visibleColumns[col.key]}
                                                onChange={() => setVisibleColumns(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
                                                className="rounded text-primary focus:ring-primary h-3 w-3"
                                            />
                                            <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-200 uppercase">{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Exportación */}
                    {enableExport && (
                        <div className="relative">
                            <button onClick={() => setShowExportOptions(!showExportOptions)} className="p-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all font-semibold text-[10px] uppercase flex items-center gap-1">
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Exp</span>
                            </button>
                            {showExportOptions && (
                                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95">
                                    <button onClick={() => { exportToExcel(); setShowExportOptions(false); }} className="w-full text-left px-4 py-2 text-[10px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Excel</button>
                                    <button onClick={() => { exportToPDF(); setShowExportOptions(false); }} className="w-full text-left px-4 py-2 text-[10px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">PDF</button>
                                    <button onClick={() => { exportToCSV(); setShowExportOptions(false); }} className="w-full text-left px-4 py-2 text-[10px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">CSV</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* --- TABLA --- */}
            <div className="flex-1 min-h-0 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col relative">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="min-w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm text-slate-500 dark:text-slate-400 font-semibold border-b border-gray-100 dark:border-slate-700 shadow-sm">
                            <tr>
                                {enableSelection && (
                                    <th className="px-4 py-2 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size > 0 && selectedIds.size === processedData.length}
                                            onChange={toggleSelectAll}
                                            className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                                        />
                                    </th>
                                )}
                                {initialColumns.filter(c => visibleColumns[c.key]).map((col, idx, arr) => {
                                    const isFiltered = activeFilters[col.key]?.length > 0;
                                    return (
                                        <th key={col.key} className={`px-4 py-2 text-[12px] transition-all relative group ${col.align || ''}`}>
                                            <div className={`flex items-center gap-1 ${col.align === 'text-right' ? 'justify-end' : col.align === 'text-center' ? 'justify-center' : ''}`}>
                                                <span
                                                    className={`cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors ${col.sortable !== false ? '' : 'cursor-default'}`}
                                                    onClick={() => col.sortable !== false && toggleSort(col.key)}
                                                >
                                                    {col.label}
                                                </span>
                                                {/* Rest of the header content... */}


                                                {/* Filtro Excel */}
                                                {(col.filterable !== false) && (
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setOpenFilterColumn(openFilterColumn === col.key ? null : col.key); }}
                                                            className={`p-1.5 rounded-md transition-all ${isFiltered
                                                                ? 'text-white bg-indigo-600 shadow-sm'
                                                                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'
                                                                }`}
                                                        >
                                                            <FunnelIcon className="h-3.5 w-3.5" />
                                                        </button>
                                                        {openFilterColumn === col.key && (
                                                            <div className={`absolute top-full ${idx === arr.length - 1 ? 'right-0' : 'left-0'} mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 z-[1000] animate-in fade-in zoom-in-95 overflow-hidden`}>
                                                                <div className="p-2 border-b border-gray-50 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                                                                    <span className="text-[10px] font-semibold text-gray-400">FILTRAR POR {col.label.toUpperCase()}</span>
                                                                    {isFiltered && <button onClick={() => clearColumnFilter(col.key)} className="text-[9px] text-red-500 hover:underline font-bold">BORRAR</button>}
                                                                </div>
                                                                <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                                                                    {getUniqueValues(col.key).map(val => (
                                                                        <label key={val} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={activeFilters[col.key]?.includes(val) ?? false}
                                                                                onChange={() => toggleFilter(col.key, val)}
                                                                                className="rounded text-primary focus:ring-primary w-3.5 h-3.5 border-gray-300"
                                                                            />
                                                                            <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate font-medium">{val}</span>
                                                                        </label>
                                                                    ))}
                                                                    {getUniqueValues(col.key).length === 0 && <p className="text-[10px] text-gray-400 p-2 text-center italic">Sin valores</p>}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Sort Icon */}
                                                {sortConfig.key === col.key && (
                                                    sortConfig.direction === 'asc'
                                                        ? <ChevronUpIcon className="h-3 w-3 text-primary" />
                                                        : <ChevronDownIcon className="h-3 w-3 text-primary" />
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={initialColumns.length + (enableSelection ? 1 : 0)} className="py-20 text-center text-slate-300 dark:text-slate-500 font-semibold uppercase">
                                        No se encontraron datos.
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((item, idx) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => onRowClick && onRowClick(item)}
                                        className={`
                                            transition-all group 
                                            ${onRowClick ? 'cursor-pointer' : ''}
                                            ${selectedIds.has(item.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/30' : (idx % 2 !== 0 ? 'bg-gray-50/80 dark:bg-slate-700/30' : 'bg-white dark:bg-slate-800')}
                                            hover:bg-indigo-50/30 dark:hover:bg-blue-900/20
                                        `}
                                    >
                                        {enableSelection && (
                                            <td className="px-4 py-2 w-10" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={() => toggleSelectRow(item.id)}
                                                    className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                                                />
                                            </td>
                                        )}
                                        {initialColumns.filter(c => visibleColumns[c.key]).map(col => (
                                            <td key={col.key} className={`px-4 py-2 text-[13px] text-slate-600 dark:text-slate-300 ${col.align || ''}`}>
                                                {item ? (
                                                    col.render ? col.render((item as any)[col.key], item) : getRenderedStringValue(item, col)
                                                ) : null}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- FOOTER DE PAGINACIÓN --- */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <span>Resultados por página:</span>
                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                    >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                    <span className="hidden sm:inline text-gray-400 mx-2">|</span>
                    <span className="hidden sm:inline">
                        Mostrando {paginatedData.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + pageSize, totalItems)} de {totalItems} registros
                        {processedData.length !== data.length && <span className="text-gray-400 ml-1">(filtrados de {data.length})</span>}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-600 dark:text-gray-300 border border-transparent hover:border-gray-200 dark:hover:border-slate-600"
                        title="Página Anterior"
                    >
                        <ChevronDownIcon className="h-4 w-4 rotate-90" />
                    </button>

                    <span className="text-xs font-semibold px-3 text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg py-1">
                        {currentPage} <span className="text-gray-400 font-normal">/ {totalPages || 1}</span>
                    </span>

                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-gray-600 dark:text-gray-300 border border-transparent hover:border-gray-200 dark:hover:border-slate-600"
                        title="Página Siguiente"
                    >
                        <ChevronDownIcon className="h-4 w-4 -rotate-90" />
                    </button>
                </div>
            </div>
        </div>
    );
}
