import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';

import {
    MagnifyingGlassIcon,
    EyeIcon,
    ArrowDownTrayIcon,
    FunnelIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    TrashIcon,
    ChevronUpDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from './Icons';
import { cn } from '@/lib/utils';

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
    defaultHidden?: boolean; // Nueva Prop: Ocultar por defecto
    tooltip?: string; // Descripción del cálculo o significado de la columna
}

export interface SmartDataTableProps<T extends { id: string }> {
    id?: string; // ID único para persistencia
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
    exportDateField?: string; // Campo de fecha para filtro de exportación
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
    containerClassName = "",
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
    renderSelectionActions,
    exportDateField,
    id: tableId // Alias para evitar conflicto
}: SmartDataTableProps<T>) {

    // --- Export Modal State ---
    const [showExportModal, setShowExportModal] = useState(false);
    const [pendingExportFormat, setPendingExportFormat] = useState<'excel' | 'csv' | 'pdf' | null>(null);
    const [exportDateRange, setExportDateRange] = useState({ start: '', end: '' });

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

    // Configuración de visualización de columnas con Persistencia
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        if (tableId) {
            const saved = localStorage.getItem(`dt_cols_${tableId}`);
            if (saved) return JSON.parse(saved);
        }
        return initialColumns.reduce((acc, col) => ({
            ...acc,
            [col.key]: col.defaultHidden ? false : true
        }), {});
    });

    // Guardar persistencia cuando cambie
    React.useEffect(() => {
        if (tableId) {
            localStorage.setItem(`dt_cols_${tableId}`, JSON.stringify(visibleColumns));
        }
    }, [visibleColumns, tableId]);

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

    // 6. Exportación Lógica Unificada
    const performExport = (dataToExport: T[], format: 'excel' | 'csv' | 'pdf') => {
        const rows = dataToExport.map(item => {
            const row: Record<string, any> = {};
            initialColumns.filter(c => visibleColumns[c.key]).forEach(col => {
                row[col.label] = getRenderedStringValue(item, col);
            });
            return row;
        });

        const dateStr = new Date().toISOString().split('T')[0];

        if (format === 'excel') {
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Datos");
            XLSX.writeFile(wb, `export_${dateStr}.xlsx`);
        } else if (format === 'csv') {
            if (rows.length === 0) return;
            const headers = Object.keys(rows[0]);
            const csvContent = [headers.join(','), ...rows.map(row => headers.map(h => `"${row[h]}"`).join(','))].join('\n'); // Added quotes for safety
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `export_${dateStr}.csv`;
            link.click();
        } else if (format === 'pdf') {
            if (rows.length === 0) return;
            const doc = new jsPDF();
            const headers = Object.keys(rows[0]);
            const body = rows.map(row => Object.values(row));
            autoTable(doc, {
                head: [headers],
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] }
            });
            doc.save(`export_${dateStr}.pdf`);
        }
    };

    const initiateExport = (format: 'excel' | 'csv' | 'pdf') => {
        // 1. Si hay selección manual, exportar eso directo
        if (selectedIds.size > 0) {
            const dataToExport = processedData.filter(item => selectedIds.has(item.id));
            performExport(dataToExport, format);
            return;
        }

        // 2. Si no hay selección pero hay campo de fecha configurado, mostrar modal
        if (exportDateField) {
            setPendingExportFormat(format);
            setShowExportModal(true);
            return;
        }

        // 3. Default: Exportar todo lo visible (processedData)
        performExport(processedData, format);
    };

    const handleConfirmExport = (filterByDate: boolean) => {
        if (!pendingExportFormat) return;

        let dataToExport = [...processedData];

        if (filterByDate && exportDateField && exportDateRange.start && exportDateRange.end) {
            const start = new Date(exportDateRange.start).getTime();
            const end = new Date(exportDateRange.end).getTime();
            // Ajustar end al final del día
            const endAdjusted = end + (24 * 60 * 60 * 1000) - 1;

            dataToExport = dataToExport.filter(item => {
                const val = (item as any)[exportDateField];
                if (!val) return false;
                const itemTime = new Date(val).getTime();
                return itemTime >= start && itemTime <= endAdjusted;
            });
        }

        performExport(dataToExport, pendingExportFormat);
        setShowExportModal(false);
        setPendingExportFormat(null);
    };

    return (
        <div className={`space-y-4 flex flex-col ${containerClassName}`}>
            {/* --- TOOLBAR --- */}

            {/* Barra de Selección Masiva */}
            {selectedIds.size > 0 && enableSelection && (
                <div className="flex items-center justify-between bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 p-2.5 rounded-md shadow animate-in fade-in slide-in-from-top-1 text-sm">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold">{selectedIds.size} seleccionados</span>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setSelectedIds(new Set())}
                            className="h-6 px-2 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
                        >
                            Desmarcar
                        </Button>
                    </div>
                    {renderSelectionActions ? renderSelectionActions(selectedIds) : (
                        onBulkDelete && (
                            <Button
                                size="sm"
                                onClick={handleBulkDeleteAction}
                                className="h-7 gap-1.5 bg-red-600 hover:bg-red-700 text-white border-none"
                            >
                                <TrashIcon className="h-3 w-3" /> Eliminar
                            </Button>
                        )
                    )}
                </div>
            )}

            {/* Barra Principal */}
            <div className="flex flex-wrap gap-2 items-center justify-between">
                {enableSearch && (
                    <div className="relative flex-1 max-w-sm">
                        <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>
                )}

                {renderExtraFilters?.()}

                <div className="flex items-center gap-2 ml-auto">
                    {/* Selector de Columnas */}
                    {enableColumnConfig && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="sm" className="h-9 gap-2">
                                    <EyeIcon className="h-4 w-4" />
                                    Columnas
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Configurar Columnas</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {initialColumns.map(col => (
                                    <DropdownMenuCheckboxItem
                                        key={col.key}
                                        checked={visibleColumns[col.key]}
                                        onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, [col.key]: !!checked }))}
                                    >
                                        {col.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Exportación */}
                    {enableExport && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="sm" className="h-9 gap-2">
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                    Exportar
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Descargar como</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => initiateExport('excel')}>Excel (.xlsx)</DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => initiateExport('csv')}>CSV (.csv)</DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => initiateExport('pdf')}>PDF (.pdf)</DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {/* --- TABLA --- */}
            <div className="rounded-md border bg-card text-card-foreground shadow-sm flex-1 overflow-auto min-h-0 relative">
                <Table className="w-full text-sm">
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            {enableSelection && (
                                <TableHead className="w-[40px] pl-4">
                                    <Checkbox
                                        checked={selectedIds.size > 0 && selectedIds.size === processedData.length}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Seleccionar todo"
                                    />
                                </TableHead>
                            )}
                            {initialColumns.filter(c => visibleColumns[c.key]).map((col) => {
                                const isFiltered = activeFilters[col.key]?.length > 0;
                                return (
                                    <TableHead
                                        key={col.key}
                                        className={cn("text-center", col.width)}
                                        title={col.tooltip}
                                    >
                                        <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full gap-1">
                                            <div />
                                            <span
                                                className={cn(
                                                    "font-medium uppercase whitespace-nowrap",
                                                    col.sortable !== false ? "cursor-pointer hover:text-foreground" : "",
                                                    col.tooltip ? "border-b border-dotted border-gray-400 cursor-help" : ""
                                                )}
                                                onClick={() => col.sortable !== false && toggleSort(col.key)}
                                            >
                                                {col.label}
                                            </span>

                                            <div className="flex items-center gap-1 justify-start">
                                                {/* Sort Icon */}
                                                {sortConfig.key === col.key && (
                                                    sortConfig.direction === 'asc'
                                                        ? <ChevronUpIcon className="h-3 w-3 text-primary" />
                                                        : <ChevronDownIcon className="h-3 w-3 text-primary" />
                                                )}

                                                {/* Filter Button */}
                                                {col.filterable !== false && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button
                                                                className={cn("p-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors", isFiltered ? "text-primary bg-primary/10" : "text-gray-400")}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <FunnelIcon className="h-3 w-3" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="start" className="w-56 p-0">
                                                            <div className="p-2 border-b bg-muted/50 flex items-center justify-between">
                                                                <span className="text-xs font-semibold uppercase">Filtros</span>
                                                                {isFiltered && (
                                                                    <button
                                                                        onClick={() => clearColumnFilter(col.key)}
                                                                        className="text-[10px] text-destructive cursor-pointer hover:underline font-bold"
                                                                    >
                                                                        BORRAR
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="max-h-[200px] overflow-y-auto p-1">
                                                                {getUniqueValues(col.key).map(val => (
                                                                    <DropdownMenuCheckboxItem
                                                                        key={val}
                                                                        checked={activeFilters[col.key]?.includes(val) ?? false}
                                                                        onCheckedChange={() => toggleFilter(col.key, val)}
                                                                    >
                                                                        {val}
                                                                    </DropdownMenuCheckboxItem>
                                                                ))}
                                                                {getUniqueValues(col.key).length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">Sin valores</div>}
                                                            </div>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        </div>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={initialColumns.length + (enableSelection ? 1 : 0)} className="h-24 text-center text-muted-foreground">
                                    No se encontraron resultados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedData.map((item) => (
                                <TableRow
                                    key={item.id}
                                    data-state={selectedIds.has(item.id) ? "selected" : undefined}
                                    onClick={() => onRowClick && onRowClick(item)}
                                    className={cn(onRowClick && "cursor-pointer")}
                                >
                                    {enableSelection && (
                                        <TableCell className="pl-4">
                                            <Checkbox
                                                checked={selectedIds.has(item.id)}
                                                onCheckedChange={() => toggleSelectRow(item.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </TableCell>
                                    )}
                                    {initialColumns.filter(c => visibleColumns[c.key]).map(col => (
                                        <TableCell key={col.key} className={cn(col.align === 'text-right' ? 'text-right' : col.align === 'text-center' ? 'text-center' : '', "py-3")}>
                                            {item ? (
                                                col.render ? col.render((item as any)[col.key], item) : getRenderedStringValue(item, col)
                                            ) : null}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* --- FOOTER DE PAGINACIÓN --- */}
            <div className="flex items-center justify-between px-2">
                <div className="flex-1 text-sm text-muted-foreground">
                    {processedData.length > 0 && (
                        <>
                            Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, totalItems)} de {totalItems}
                            {processedData.length !== data.length && " (filtrados)"}
                        </>
                    )}
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Filas por página</p>
                        <select
                            value={pageSize}
                            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                            className="h-8 w-[70px] rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value={10}>10</option>
                            <option value={15}>15</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm font-medium">
                            Pág. {currentPage} de {Math.max(1, totalPages)}
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <span className="sr-only">Anterior</span>
                                <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || totalPages === 0}
                            >
                                <span className="sr-only">Siguiente</span>
                                <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- EXPORT DATE RANGE MODAL --- */}
            {showExportModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-slate-700 overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <ArrowDownTrayIcon className="h-5 w-5 text-indigo-500" />
                                Exportar Datos
                            </h3>
                            <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <span className="sr-only">Cerrar</span>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-lg">
                                <p>¿Deseas exportar todo el listado o filtrar por un rango de fechas específico?</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Desde</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2"
                                        value={exportDateRange.start}
                                        onChange={(e) => setExportDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Hasta</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2"
                                        value={exportDateRange.end}
                                        onChange={(e) => setExportDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-5 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 flex gap-3 justify-end">
                            <Button
                                variant="secondary"
                                onClick={() => handleConfirmExport(false)}
                                className="border border-gray-300 hover:bg-gray-100 dark:border-slate-600 dark:hover:bg-slate-700"
                            >
                                Exportar Todo
                            </Button>
                            <Button
                                onClick={() => handleConfirmExport(true)}
                                disabled={!exportDateRange.start || !exportDateRange.end}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Exportar Rango
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
