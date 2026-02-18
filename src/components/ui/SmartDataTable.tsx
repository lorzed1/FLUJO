import React from 'react';
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
    ChevronLeftIcon,
    ChevronRightIcon
} from './Icons';
import { cn } from '@/lib/utils';

// Re-export types from hook for consumers
export type { Column, SmartDataTableProps } from '@/hooks/useSmartDataTable';
import { useSmartDataTable, type SmartDataTableProps } from '@/hooks/useSmartDataTable';

// --- Componente Maestro ---
export function SmartDataTable<T extends { id: string }>(props: SmartDataTableProps<T>) {
    const {
        columns: initialColumns,
        enableSearch = true,
        enableSelection = true,
        enableExport = true,
        enableColumnConfig = true,
        onBulkDelete,
        onRowClick,
        containerClassName = "",
        searchPlaceholder = "Buscar...",
        renderExtraFilters,
        renderSelectionActions,
    } = props;

    const table = useSmartDataTable(props);

    return (
        <div className={`space-y-4 flex flex-col ${containerClassName}`}>
            {/* --- TOOLBAR --- */}

            {/* Barra de Selección Masiva */}
            {table.selectedIds.size > 0 && enableSelection && (
                <div className="flex items-center justify-between bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 p-2.5 rounded-md shadow animate-in fade-in slide-in-from-top-1 text-sm">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold">{table.selectedIds.size} seleccionados</span>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => table.setSelectedIds(new Set())}
                            className="h-6 px-2 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
                        >
                            Desmarcar
                        </Button>
                    </div>
                    {renderSelectionActions ? renderSelectionActions(table.selectedIds) : (
                        onBulkDelete && (
                            <Button
                                size="sm"
                                onClick={table.handleBulkDeleteAction}
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
                    <div className="relative w-full max-w-sm">
                        <MagnifyingGlassIcon className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder={searchPlaceholder}
                            value={table.searchTerm}
                            onChange={(e) => table.setSearchTerm(e.target.value)}
                            className="pl-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-8 text-xs focus-visible:ring-indigo-500"
                        />
                    </div>
                )}

                <div className="flex items-center gap-3 ml-auto">
                    {renderExtraFilters?.()}

                    {/* Selector de Columnas */}
                    {enableColumnConfig && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="sm" className="h-8 gap-2 bg-white dark:bg-slate-800 text-xs font-medium border border-slate-200 dark:border-slate-700">
                                    <EyeIcon className="h-3.5 w-3.5" />
                                    Columnas
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                <DropdownMenuLabel>Columnas Visibles</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {initialColumns
                                    .filter(col => !col.defaultHidden && col.key !== 'actions')
                                    .map(col => (
                                        <DropdownMenuCheckboxItem
                                            key={col.key}
                                            checked={table.visibleColumns[col.key]}
                                            onCheckedChange={(checked) => table.setVisibleColumns({ ...table.visibleColumns, [col.key]: checked })}
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
                                <Button variant="secondary" size="sm" className="h-8 gap-2 bg-white dark:bg-slate-800 text-xs font-medium border border-slate-200 dark:border-slate-700">
                                    <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                                    Exportar
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Descargar como</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => table.initiateExport('excel')}>Excel (.xlsx)</DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => table.initiateExport('csv')}>CSV (.csv)</DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={false} onCheckedChange={() => table.initiateExport('pdf')}>PDF (.pdf)</DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {/* --- TABLA --- */}
            {/* --- TABLA --- */}
            <div className="rounded-none bg-transparent flex-1 overflow-auto min-h-0 relative">
                <Table className="w-full text-sm border-collapse">
                    <TableHeader className="bg-white dark:bg-slate-800 sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent border-none">
                            {enableSelection && (
                                <TableHead className="w-[40px] pl-4 py-3 bg-white dark:bg-slate-800">
                                    <Checkbox
                                        checked={table.selectedIds.size > 0 && table.selectedIds.size === table.processedData.length}
                                        onCheckedChange={table.toggleSelectAll}
                                        aria-label="Seleccionar todo"
                                        className="border-gray-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                    />
                                </TableHead>
                            )}
                            {initialColumns.filter(c => table.visibleColumns[c.key]).map((col) => {
                                const isFiltered = table.activeFilters[col.key]?.length > 0;
                                return (
                                    <TableHead
                                        key={col.key}
                                        className={cn(
                                            "text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700",
                                            col.align === 'text-right' ? 'text-right' : col.align === 'text-center' ? 'text-center' : 'text-left',
                                            col.width
                                        )}
                                        title={col.tooltip}
                                    >
                                        <div className={cn(
                                            "flex items-center gap-1",
                                            col.align === 'text-right' ? 'justify-end' : col.align === 'text-center' ? 'justify-center' : 'justify-start'
                                        )}>
                                            <span
                                                className={cn(
                                                    "whitespace-nowrap",
                                                    col.sortable !== false ? "cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors" : "",
                                                    col.tooltip ? "border-b border-dotted border-gray-400 cursor-help" : ""
                                                )}
                                                onClick={() => col.sortable !== false && table.toggleSort(col.key)}
                                            >
                                                {col.label}
                                            </span>

                                            <div className="flex items-center">
                                                {/* Sort Icon */}
                                                {table.sortConfig.key === col.key && (
                                                    <span className="ml-1">
                                                        {table.sortConfig.direction === 'asc'
                                                            ? <ChevronUpIcon className="h-3 w-3 text-indigo-600" />
                                                            : <ChevronDownIcon className="h-3 w-3 text-indigo-600" />
                                                        }
                                                    </span>
                                                )}

                                                {/* Filter Button */}
                                                {col.filterable !== false && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button
                                                                className={cn("ml-1 p-0.5 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors", isFiltered ? "text-indigo-600 bg-indigo-50" : "text-slate-300 hover:text-slate-500")}
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
                                                                        onClick={() => table.clearColumnFilter(col.key)}
                                                                        className="text-[10px] text-rose-500 cursor-pointer hover:underline font-bold"
                                                                    >
                                                                        BORRAR
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="max-h-[200px] overflow-y-auto p-1">
                                                                {table.getUniqueValues(col.key).map(val => (
                                                                    <DropdownMenuCheckboxItem
                                                                        key={val}
                                                                        checked={table.activeFilters[col.key]?.includes(val) ?? false}
                                                                        onCheckedChange={() => table.toggleFilter(col.key, val)}
                                                                    >
                                                                        {val}
                                                                    </DropdownMenuCheckboxItem>
                                                                ))}
                                                                {table.getUniqueValues(col.key).length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">Sin valores</div>}
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
                        {table.paginatedData.length > 0 ? (
                            table.paginatedData.map((item) => (
                                <TableRow
                                    key={item.id}
                                    data-state={table.selectedIds.has(item.id) ? "selected" : undefined}
                                    onClick={() => onRowClick && onRowClick(item)}
                                    className={cn(
                                        onRowClick && "cursor-pointer",
                                        "transition-colors border-b border-gray-50 dark:border-slate-800",
                                        // Plain white background with simple hover
                                        "bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700/50"
                                    )}
                                >
                                    {enableSelection && (
                                        <TableCell className="w-[40px] pl-4 py-1.5">
                                            <Checkbox
                                                checked={table.selectedIds.has(item.id)}
                                                onCheckedChange={() => table.toggleSelectRow(item.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-3.5 w-3.5"
                                            />
                                        </TableCell>
                                    )}
                                    {table.visibleColumns[initialColumns[0].key] && (
                                        initialColumns.filter(c => table.visibleColumns[c.key]).map(col => (
                                            <TableCell
                                                key={col.key}
                                                className={cn(
                                                    col.align === 'text-right' ? 'text-right' : col.align === 'text-center' ? 'text-center' : 'text-left',
                                                    "py-3.5 text-gray-600 dark:text-slate-300 text-[13px] align-middle font-normal",
                                                    col.className
                                                )}
                                            >
                                                {item ? (
                                                    col.render ? col.render((item as any)[col.key], item) : table.getRenderedStringValue(item, col)
                                                ) : null}
                                            </TableCell>
                                        ))
                                    )}
                                </TableRow>))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={initialColumns.length + (enableSelection ? 1 : 0)} className="h-32 text-center text-muted-foreground bg-white dark:bg-slate-800">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <MagnifyingGlassIcon className="h-8 w-8 text-slate-200" />
                                        <p>No se encontraron resultados.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* --- FOOTER DE PAGINACIÓN --- */}
            <div className="flex items-center justify-between px-2">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.processedData.length > 0 && (
                        <>
                            Mostrando {table.startIndex + 1}-{Math.min(table.startIndex + table.pageSize, table.totalItems)} de {table.totalItems}
                            {table.processedData.length !== props.data.length && " (filtrados)"}
                        </>
                    )}
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Filas por página</p>
                        <select
                            value={table.pageSize}
                            onChange={(e) => { table.setPageSize(Number(e.target.value)); table.setCurrentPage(1); }}
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
                            Pág. {table.currentPage} de {Math.max(1, table.totalPages)}
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => table.setCurrentPage((p: number) => Math.max(1, p - 1))}
                                disabled={table.currentPage === 1}
                            >
                                <span className="sr-only">Anterior</span>
                                <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => table.setCurrentPage((p: number) => Math.min(table.totalPages, p + 1))}
                                disabled={table.currentPage === table.totalPages || table.totalPages === 0}
                            >
                                <span className="sr-only">Siguiente</span>
                                <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- EXPORT DATE RANGE MODAL --- */}
            {table.showExportModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-slate-700 overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <ArrowDownTrayIcon className="h-5 w-5 text-indigo-500" />
                                Exportar Datos
                            </h3>
                            <button onClick={() => table.setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
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
                                        value={table.exportDateRange.start}
                                        onChange={(e) => table.setExportDateRange((prev: any) => ({ ...prev, start: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Hasta</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-lg border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2"
                                        value={table.exportDateRange.end}
                                        onChange={(e) => table.setExportDateRange((prev: any) => ({ ...prev, end: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-5 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 flex gap-3 justify-end">
                            <Button
                                variant="secondary"
                                onClick={() => table.handleConfirmExport(false)}
                                className="border border-gray-300 hover:bg-gray-100 dark:border-slate-600 dark:hover:bg-slate-700"
                            >
                                Exportar Todo
                            </Button>
                            <Button
                                onClick={() => table.handleConfirmExport(true)}
                                disabled={!table.exportDateRange.start || !table.exportDateRange.end}
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
