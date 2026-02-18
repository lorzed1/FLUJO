import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================
// Types
// ============================================

export interface Column<T> {
    key: string;
    label: string;
    width?: string;
    align?: 'text-left' | 'text-center' | 'text-right';
    render?: (value: any, item: T) => React.ReactNode;
    sortable?: boolean;
    filterable?: boolean;
    getValue?: (item: T) => string | number;
    defaultHidden?: boolean;
    tooltip?: string;
    className?: string;
}

export interface SmartDataTableProps<T extends { id: string }> {
    id?: string;
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
    exportDateField?: string;
}

// ============================================
// Helpers
// ============================================

export function getCellValue<T>(item: T, col: Column<T>): string | number {
    if (col.getValue) return col.getValue(item);
    const value = (item as any)[col.key];
    return value !== undefined && value !== null ? value : '';
}

export function getRenderedStringValue<T>(item: T, col: Column<T>): string {
    const val = getCellValue(item, col);
    return String(val);
}

// ============================================
// Hook
// ============================================

export function useSmartDataTable<T extends { id: string }>({
    data,
    columns: initialColumns,
    enableSearch = true,
    selectedIds: externalSelectedIds,
    onSelectionChange: externalOnSelectionChange,
    activeFilters: externalActiveFilters,
    onFilterChange: externalOnFilterChange,
    searchTerm: externalSearchTerm,
    onSearchChange: externalOnSearchChange,
    sortConfig: externalSortConfig,
    onSortChange: externalOnSortChange,
    onBulkDelete,
    exportDateField,
    id: tableId,
}: SmartDataTableProps<T>) {

    // --- Export Modal State ---
    const [showExportModal, setShowExportModal] = useState(false);
    const [pendingExportFormat, setPendingExportFormat] = useState<'excel' | 'csv' | 'pdf' | null>(null);
    const [exportDateRange, setExportDateRange] = useState({ start: '', end: '' });

    // --- Internal State ---
    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const [internalSortConfig, setInternalSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });
    const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
    const [internalActiveFilters, setInternalActiveFilters] = useState<Record<string, string[]>>({});

    // --- Pagination ---
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);

    // --- Unified State ---
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

    // --- Column Visibility (Persistent) ---
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

    useEffect(() => {
        if (tableId) {
            localStorage.setItem(`dt_cols_${tableId}`, JSON.stringify(visibleColumns));
        }
    }, [visibleColumns, tableId]);

    // --- Unique Values (for Excel-style filters) ---
    const getUniqueValues = (colKey: string) => {
        const col = initialColumns.find(c => c.key === colKey);
        if (!col) return [];
        const values = new Set<string>();
        data.forEach(item => values.add(getRenderedStringValue(item, col)));
        return Array.from(values).sort();
    };

    // --- Core Processing ---
    const processedData = useMemo(() => {
        let result = [...data];

        // Search
        if (enableSearch && searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(item =>
                initialColumns.some(col =>
                    getRenderedStringValue(item, col).toLowerCase().includes(lowerTerm)
                )
            );
        }

        // Column Filters
        Object.entries(activeFilters).forEach(([colKey, allowedValues]) => {
            const values = allowedValues as string[];
            if (values && values.length > 0) {
                const col = initialColumns.find(c => c.key === colKey);
                if (col) {
                    result = result.filter(item => values.includes(getRenderedStringValue(item, col)));
                }
            }
        });

        // Sort
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
                    return sortConfig.direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
                });
            }
        }

        return result;
    }, [data, searchTerm, activeFilters, sortConfig, initialColumns, enableSearch]);

    // Reset page on filter change
    useMemo(() => {
        setCurrentPage(1);
    }, [internalSearchTerm, externalSearchTerm, internalActiveFilters, externalActiveFilters]);

    // --- Pagination ---
    const totalItems = processedData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedData = processedData.slice(startIndex, endIndex);

    // --- Handlers ---
    const toggleSort = (key: string) => {
        setSortConfig((prev: any) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleFilter = (colKey: string, value: string) => {
        setActiveFilters((prev: any) => {
            const current = prev[colKey] || [];
            const newValues = current.includes(value)
                ? current.filter((v: string) => v !== value)
                : [...current, value];
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
        }
    };

    // --- Export Logic ---
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
            const csvContent = [headers.join(','), ...rows.map(row => headers.map(h => `"${row[h]}"`).join(','))].join('\n');
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
        if (selectedIds.size > 0) {
            const dataToExport = processedData.filter(item => selectedIds.has(item.id));
            performExport(dataToExport, format);
            return;
        }
        if (exportDateField) {
            setPendingExportFormat(format);
            setShowExportModal(true);
            return;
        }
        performExport(processedData, format);
    };

    const handleConfirmExport = (filterByDate: boolean) => {
        if (!pendingExportFormat) return;
        let dataToExport = [...processedData];
        if (filterByDate && exportDateField && exportDateRange.start && exportDateRange.end) {
            const start = new Date(exportDateRange.start).getTime();
            const end = new Date(exportDateRange.end).getTime();
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

    return {
        // State
        searchTerm,
        setSearchTerm,
        sortConfig,
        selectedIds,
        setSelectedIds,
        activeFilters,
        visibleColumns,
        setVisibleColumns,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        showExportModal,
        setShowExportModal,
        exportDateRange,
        setExportDateRange,

        // Data
        processedData,
        paginatedData,
        totalItems,
        totalPages,
        startIndex,
        endIndex,

        // Handlers
        toggleSort,
        toggleFilter,
        clearColumnFilter,
        toggleSelectAll,
        toggleSelectRow,
        handleBulkDeleteAction,
        initiateExport,
        handleConfirmExport,
        getUniqueValues,
        getRenderedStringValue: (item: T, col: Column<T>) => getRenderedStringValue(item, col),
    };
}
