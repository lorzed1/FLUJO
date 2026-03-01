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
    ChevronRightIcon,
    ArrowUpTrayIcon,
    PencilIcon,
    QuestionMarkCircleIcon,
    InformationCircleIcon
} from './Icons';
import { cn } from '@/lib/utils';

// Re-export types from hook for consumers
export type { Column, SmartDataTableProps } from '@/hooks/useSmartDataTable';
import { useSmartDataTable, type SmartDataTableProps } from '@/hooks/useSmartDataTable';
import { useUI } from '@/context/UIContext';

// --- Componente Maestro ---
export function SmartDataTable<T extends Record<string, any>>(props: SmartDataTableProps<T>) {
    const {
        columns: initialColumns,
        enableSearch = true,
        enableSelection = true,
        enableExport = true,
        enableColumnConfig = true,
        onImport,
        onImportFile,
        onBulkDelete,
        onRowClick,
        containerClassName = "",
        searchPlaceholder = "Buscar...",
        renderExtraFilters,
        renderSelectionActions,
        loading = false,
        onInfoClick,
    } = props;

    const table = useSmartDataTable(props);
    const { setAlertModal } = useUI();

    const handleInfoClick = () => {
        if (onInfoClick) {
            onInfoClick();
        } else {
            setAlertModal({
                isOpen: true,
                title: 'Información del Sistema',
                message: 'La documentación detallada de estas columnas y cálculos estará disponible próximamente. Estamos trabajando para brindarte mayor transparencia en tus datos.',
                type: 'info'
            });
        }
    };

    return (
        <div className={`flex flex-col min-h-0 ${containerClassName} relative`}>
            {loading && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-[1px] animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Cargando datos...</span>
                    </div>
                </div>
            )}


            {/* ─── ZONA FIJA: barra selección + toolbar (no scrollea) ─── */}

            {/* Barra de Selección Masiva */}
            {table.selectedIds.size > 0 && enableSelection && (
                <div className="flex flex-wrap gap-4 items-center justify-between px-6 py-2.5 bg-purple-50 border border-purple-100 dark:bg-purple-900/20 dark:border-purple-800/50 text-purple-900 dark:text-purple-100 shadow-sm animate-in fade-in slide-in-from-top-1 text-sm shrink-0 mb-0 mx-8 mt-6 rounded-lg">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold text-purple-700 dark:text-purple-300">{table.selectedIds.size} seleccionados</span>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => table.setSelectedIds(new Set())}
                            className="h-6 px-2.5 text-[11px] font-bold uppercase tracking-wider bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 dark:bg-transparent dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-800/50 rounded-md"
                        >
                            Desmarcar
                        </Button>
                    </div>
                    {renderSelectionActions ? renderSelectionActions(table.selectedIds) : (
                        onBulkDelete && (
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={table.handleBulkDeleteAction}
                                className="h-7 px-3 gap-1.5 text-xs font-bold rounded-md"
                            >
                                <TrashIcon className="h-3.5 w-3.5" /> Eliminar
                            </Button>
                        )
                    )}
                </div>
            )}

            {/* Barra Principal: Buscar + Columnas + Exportar — FIJA, no scrollea */}
            <div className="flex flex-wrap gap-4 items-center justify-between px-8 py-3 shrink-0">
                {enableSearch && (
                    <div className="relative w-full max-w-sm group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 group-focus-within:text-purple-600 transition-colors" />
                        </div>
                        <Input
                            placeholder={searchPlaceholder}
                            value={table.searchTerm}
                            onChange={(e) => table.setSearchTerm(e.target.value)}
                            className="pl-9 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 h-8 text-xs focus:ring-1 focus:ring-purple-600 focus:border-purple-600 rounded-lg shadow-sm"
                        />
                    </div>
                )}

                <div className="flex items-center gap-2 ml-auto">

                    {/* 1. Botones extra de cada página (siempre al inicio de la toolbar, a la izquierda) */}
                    {renderExtraFilters?.()}

                    {/* 2. Botón de Importar */}
                    {(onImport || onImportFile) && (
                        <>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm text-xs font-medium rounded-lg"
                                onClick={() => {
                                    if (onImportFile && table.fileInputRef?.current) {
                                        table.fileInputRef.current.click();
                                    } else if (onImport) {
                                        onImport();
                                    }
                                }}
                            >
                                <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                                Importar
                            </Button>
                            {onImportFile && (
                                <input
                                    type="file"
                                    ref={table.fileInputRef}
                                    className="hidden"
                                    accept=".xlsx,.xls,.csv,.json"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            onImportFile(file);
                                        }
                                        if (e.target) e.target.value = '';
                                    }}
                                />
                            )}
                        </>
                    )}

                    {/* 3. Botón de Exportación */}
                    {enableExport && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="sm" className="h-8 gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm text-xs font-medium rounded-lg">
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

                    {/* 4. Botón de Columnas */}
                    {enableColumnConfig && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="sm" className="h-8 gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm text-xs font-medium rounded-lg">
                                    <EyeIcon className="h-3.5 w-3.5" />
                                    Columnas
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-56 p-0 overflow-hidden"
                                align="end"
                                avoidCollisions={true}
                                collisionPadding={16}
                            >
                                {/* Header fijo — no scrollea */}
                                <div className="px-2 py-2 border-b border-gray-100 bg-gray-50 sticky top-0">
                                    <DropdownMenuLabel className="px-0 py-0 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                                        Columnas Visibles
                                    </DropdownMenuLabel>
                                </div>
                                {/* Lista con scroll interno */}
                                <div className="max-h-[280px] overflow-y-auto py-1">
                                    {initialColumns
                                        .filter(col => col.key !== 'actions')
                                        .map(col => (
                                            <DropdownMenuCheckboxItem
                                                key={col.key}
                                                checked={table.visibleColumns[col.key]}
                                                onCheckedChange={(checked) => table.setVisibleColumns({ ...table.visibleColumns, [col.key]: checked })}
                                                onSelect={(e) => e.preventDefault()}
                                            >
                                                {col.label}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* 5. Botón de Información (Siempre Visible - Al final a la derecha) */}
                    <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-500 hover:text-purple-600 border border-gray-200 shadow-sm rounded-lg transition-all active:scale-95"
                        onClick={handleInfoClick}
                        title="Información de datos y cálculos"
                    >
                        <InformationCircleIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* ─── ZONA SCROLL: contenedor con máscara visual estática (límites naranjas de ref) ─── */}
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-8">
                <div className={cn("flex-1 overflow-auto min-h-0 custom-scrollbar border-y border-gray-100 dark:border-slate-700", props.scrollContainerClassName)}>
                    <div className="min-w-max w-full pb-4 pt-1">
                        {/* --- TABLA --- */}
                        <div className="rounded-none bg-transparent relative">
                            <Table className="w-full border-collapse relative">
                                <TableHeader className="bg-white dark:bg-slate-800 sticky top-0 z-20 shadow-sm">
                                    <TableRow className="hover:bg-transparent border-none">
                                        {enableSelection && (
                                            <TableHead className="w-[40px] pl-0 pr-4 py-2 bg-transparent text-left custom-header-cell sticky top-0 z-20 shadow-none border-b border-gray-100 dark:border-slate-700">
                                                <Checkbox
                                                    checked={table.selectedIds.size > 0 && table.selectedIds.size === table.processedData.length}
                                                    onCheckedChange={table.toggleSelectAll}
                                                    aria-label="Seleccionar todo"
                                                    className="h-3.5 w-3.5 border-gray-300 text-purple-600 focus:ring-purple-600 rounded"
                                                />
                                            </TableHead>
                                        )}
                                        {initialColumns.filter(c => table.visibleColumns[c.key]).map((col, idx, arr) => {
                                            const isFiltered = table.activeFilters[col.key]?.length > 0;
                                            // Alineación automática por tipo de dato si no se especifica
                                            const autoAlign = col.align || (
                                                (col.type === 'currency' || col.type === 'number' || col.key === 'actions')
                                                    ? 'text-right'
                                                    : 'text-left'
                                            );

                                            return (
                                                <TableHead
                                                    key={col.key}
                                                    className={cn(
                                                        "text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 py-2 bg-transparent border-b border-gray-100 dark:border-slate-700 h-auto sticky top-0 z-20 shadow-none",
                                                        autoAlign === 'text-right' ? 'text-right' : autoAlign === 'text-center' ? 'text-center' : 'text-left',
                                                        idx === 0 && !enableSelection ? "pl-0 pr-4" : "px-4",
                                                        idx === arr.length - 1 ? "pr-0 pl-4" : "",
                                                        col.width
                                                    )}
                                                    title={col.tooltip}
                                                >
                                                    <div className={cn(
                                                        "flex items-center gap-1.5",
                                                        autoAlign === 'text-right' ? 'justify-end' : autoAlign === 'text-center' ? 'justify-center' : 'justify-start'
                                                    )}>
                                                        <span
                                                            className={cn(
                                                                "whitespace-nowrap select-none",
                                                                col.sortable !== false ? "cursor-pointer hover:text-purple-600 transition-colors" : "",
                                                                col.tooltip ? "border-b border-dotted border-gray-400 cursor-help" : ""
                                                            )}
                                                            onClick={() => col.sortable !== false && table.toggleSort(col.key)}
                                                        >
                                                            {(col.key === 'actions' && (!col.label || col.label === '')) ? 'Acciones' : col.label}
                                                        </span>

                                                        <div className="flex items-center">
                                                            {/* Sort Icon */}
                                                            {table.sortConfig.key === col.key && (
                                                                <span className="ml-0.5">
                                                                    {table.sortConfig.direction === 'asc'
                                                                        ? <ChevronUpIcon className="h-3 w-3 text-purple-600" />
                                                                        : <ChevronDownIcon className="h-3 w-3 text-purple-600" />
                                                                    }
                                                                </span>
                                                            )}

                                                            {/* Filter Button */}
                                                            {col.filterable !== false && (
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <button
                                                                            className={cn("ml-1 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors", isFiltered ? "text-purple-600 bg-purple-50" : "text-gray-300 hover:text-gray-500")}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <FunnelIcon className="h-3 w-3" />
                                                                        </button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="start" className="w-56 p-0">
                                                                        <div className="p-2 border-b bg-gray-50 flex items-center justify-between">
                                                                            <span className="text-xs font-semibold uppercase text-gray-600">Filtros</span>
                                                                            {isFiltered && (
                                                                                <button
                                                                                    onClick={() => table.clearColumnFilter(col.key)}
                                                                                    className="text-[10px] text-rose-600 cursor-pointer hover:underline font-bold"
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
                                        {(props.onDelete || props.onEdit || props.onView) && (
                                            <TableHead className="w-[100px] text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400 py-2 bg-transparent border-b border-gray-100 dark:border-slate-700 h-auto sticky top-0 z-20 shadow-none">
                                                Acciones
                                            </TableHead>
                                        )}
                                        {/* Columna espaciadora (Filler) para evitar que pocas columnas se estiren demasiado */}
                                        <TableHead className="w-full min-w-0 bg-transparent border-b border-gray-100 dark:border-slate-700 sticky top-0 z-20 shadow-none" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {table.paginatedData.length > 0 ? (
                                        table.paginatedData.map((item, index) => (
                                            <TableRow
                                                key={item.id}
                                                data-state={table.selectedIds.has(item.id) ? "selected" : undefined}
                                                onClick={() => onRowClick && onRowClick(item)}
                                                className={cn(
                                                    onRowClick && "cursor-pointer",
                                                    "group transition-colors border-b border-gray-100 dark:border-slate-800",
                                                    table.selectedIds.has(item.id)
                                                        ? "bg-purple-50 dark:bg-purple-900/40"
                                                        : index % 2 === 0
                                                            ? "bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60"
                                                            : "bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80"
                                                )}
                                            >
                                                {enableSelection && (
                                                    <TableCell className="w-[40px] pl-0 pr-4 py-2.5 text-left">
                                                        <Checkbox
                                                            checked={table.selectedIds.has(item.id)}
                                                            onCheckedChange={() => table.toggleSelectRow(item.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="h-3.5 w-3.5 border-gray-300 text-purple-600 focus:ring-purple-600 rounded"
                                                        />
                                                    </TableCell>
                                                )}
                                                {/* Celdas de Datos */}
                                                {true && (
                                                    initialColumns.filter(c => table.visibleColumns[c.key]).map((col, idx, arr) => {
                                                        const autoAlign = col.align || (
                                                            (col.type === 'currency' || col.type === 'number' || col.key === 'actions')
                                                                ? 'text-right'
                                                                : 'text-left'
                                                        );
                                                        return (
                                                            <TableCell
                                                                key={col.key}
                                                                className={cn(
                                                                    autoAlign === 'text-right' ? 'text-right' : autoAlign === 'text-center' ? 'text-center' : 'text-left',
                                                                    "py-2.5 text-[12px] leading-[19.4px] text-[#363636] dark:text-gray-300 font-sans font-normal align-middle whitespace-nowrap",
                                                                    idx === 0 && !enableSelection ? "pl-0 pr-4" : idx === arr.length - 1 && !props.onDelete && !props.onEdit && !props.onView ? "pl-4 pr-0" : "px-4",
                                                                    col.key !== 'actions' && "[&>div]:!flex [&>div]:!flex-row [&>div]:!items-center [&>div]:!gap-2 [&_.block]:!inline [&_div.mt-0\\.5]:!mt-0",
                                                                    col.className?.includes('font-result') ? "font-bold text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-900/10" : "",
                                                                    col.className
                                                                )}
                                                            >
                                                                {item ? (
                                                                    col.render ? col.render((item as any)[col.key], item) : (
                                                                        (col.type && String(col.type).startsWith('currency')) ? (
                                                                            <span className="tabular-nums">
                                                                                {table.getRenderedStringValue(item, col)}
                                                                            </span>
                                                                        ) : table.getRenderedStringValue(item, col)
                                                                    )
                                                                ) : null}
                                                            </TableCell>
                                                        );
                                                    })
                                                )}
                                                {(props.onDelete || props.onEdit || props.onView) && (
                                                    <TableCell className="w-[80px] py-1.5 px-4 text-center align-middle">
                                                        <div className="flex items-center justify-center gap-1 transition-opacity">
                                                            {props.onView && (
                                                                <button onClick={(e) => { e.stopPropagation(); props.onView?.(item); }} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all" title="Ver">
                                                                    <EyeIcon className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                            {props.onEdit && (
                                                                <button onClick={(e) => { e.stopPropagation(); props.onEdit?.(item); }} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all" title="Editar">
                                                                    <PencilIcon className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                            {props.onDelete && (
                                                                <button onClick={(e) => { e.stopPropagation(); props.onDelete?.(item); }} className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Eliminar">
                                                                    <TrashIcon className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                )}
                                                {/* Celda espaciadora (Filler) */}
                                                <TableCell className="w-full min-w-0" />
                                            </TableRow>))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={initialColumns.length + (enableSelection ? 1 : 0) + (props.onDelete || props.onEdit || props.onView ? 1 : 0) + 1} className="h-32 text-center text-muted-foreground bg-white dark:bg-slate-800">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <MagnifyingGlassIcon className="h-8 w-8 text-gray-300 dark:text-slate-600" />
                                                    <p className="text-sm font-medium text-gray-500">No se encontraron resultados.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                {/* --- FOOTER DE PAGINACIÓN (Fijo al contenedor, sin scroll horizontal) --- */}
                <div className="flex items-center justify-between px-8 py-2.5 bg-white dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 z-10 shrink-0 mx-0 mt-0">
                    <div className="flex-1 text-xs text-gray-500 font-medium">
                        {table.processedData.length > 0 && (
                            <>
                                Mostrando <span className="font-bold text-gray-700 dark:text-gray-300">{table.startIndex + 1}-{Math.min(table.startIndex + table.pageSize, table.totalItems)}</span> de <span className="font-bold text-gray-700 dark:text-gray-300">{table.totalItems}</span>
                                {table.processedData.length !== props.data.length && " (filtrados)"}
                            </>
                        )}
                    </div>
                    {props.footerMessage && (
                        <div className="hidden md:block flex-1 text-center text-[11px] text-gray-400 font-normal truncate px-4">
                            {props.footerMessage}
                        </div>
                    )}
                    <div className="flex-1 flex items-center gap-6 lg:gap-8 justify-end">
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-gray-500">Filas:</p>
                            <select
                                value={table.pageSize}
                                onChange={(e) => { table.setPageSize(Number(e.target.value)); table.setCurrentPage(1); }}
                                className="h-7 w-[60px] rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs focus:ring-purple-600 focus:border-purple-600 py-0 pl-2 cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={15}>15</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                                Pág. {table.currentPage} de {Math.max(1, table.totalPages)}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    className="flex items-center justify-center h-8 w-8 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700 shadow-sm transition-colors"
                                    onClick={() => table.setCurrentPage((p: number) => Math.max(1, p - 1))}
                                    disabled={table.currentPage === 1}
                                    title="Página Anterior"
                                >
                                    <span className="sr-only">Anterior</span>
                                    <ChevronLeftIcon className="h-4 w-4" />
                                </button>
                                <button
                                    className="flex items-center justify-center h-8 w-8 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700 shadow-sm transition-colors"
                                    onClick={() => table.setCurrentPage((p: number) => Math.min(table.totalPages, p + 1))}
                                    disabled={table.currentPage === table.totalPages || table.totalPages === 0}
                                    title="Página Siguiente"
                                >
                                    <span className="sr-only">Siguiente</span>
                                    <ChevronRightIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- EXPORT DATE RANGE MODAL --- fuera del scroll container --- */}
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
