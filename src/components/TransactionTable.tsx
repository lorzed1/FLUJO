'use client'
import { useState } from "react"
import { TableTransaction as Transaction, TransactionFilters } from "@/types"
import { formatMoney } from "@/utils/formatters"
import { DateRangeFilter, NumberRangeFilter, TextFilter } from "@/components/TableFilters"
import { MultiSelectFilter } from "@/components/ui/MultiSelectFilter"
import { Button } from "@/components/ui/Button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table"
import { MoreHorizontal, Edit2, Trash2 } from "lucide-react"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/DropdownMenu"
import { cn } from "@/lib/utils"

// Mapas de configuración visual
const sourceIcons: any = { libro: '📖', banco: '🏦', datafono: '💳', efectivo: '💵' }
const statusColorMap: any = {
    pendiente: 'text-amber-600 bg-amber-50 border-amber-200',
    conciliado: 'text-green-600 bg-green-50 border-green-200',
    duda: 'text-red-600 bg-red-50 border-red-200',
}

interface TransactionTableProps {
    transactions: Transaction[]
    filters: TransactionFilters
    onFiltersChange: (newFilters: TransactionFilters) => void
    onEdit?: (t: Transaction) => void
    onDelete?: (t: Transaction) => void
}

export function TransactionTable({ transactions, filters, onFiltersChange, onEdit, onDelete }: TransactionTableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Helper para actualizar filtros
    const update = (updates: Partial<TransactionFilters>) => onFiltersChange({ ...filters, ...updates, page: 1 })

    // Selección masiva
    const toggleAll = () => selectedIds.size === transactions.length
        ? setSelectedIds(new Set())
        : setSelectedIds(new Set(transactions.map(t => t.id)))

    const toggleRow = (id: string) => {
        const newSet = new Set(selectedIds)
        newSet.has(id) ? newSet.delete(id) : newSet.add(id)
        setSelectedIds(newSet)
    }

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40px] pl-4">
                            <input type="checkbox" onChange={toggleAll} checked={transactions.length > 0 && selectedIds.size === transactions.length} className="accent-primary" />
                        </TableHead>
                        <TableHead className="w-[140px]">
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full gap-2">
                                <div />
                                <span className="uppercase">Fecha</span>
                                <div className="flex justify-start">
                                    <DateRangeFilter
                                        dateFrom={filters.dateFrom}
                                        dateTo={filters.dateTo}
                                        onChange={(from, to) => update({ dateFrom: from, dateTo: to })}
                                    />
                                </div>
                            </div>
                        </TableHead>
                        <TableHead className="w-[140px]">
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full gap-2">
                                <div />
                                <span className="uppercase">Fuente</span>
                                <div className="flex justify-start">
                                    <MultiSelectFilter
                                        title=""
                                        options={[
                                            { label: 'Banco', value: 'banco', icon: '🏦' },
                                            { label: 'Libro', value: 'libro', icon: '📖' },
                                            { label: 'Datáfono', value: 'datafono', icon: '💳' },
                                            { label: 'Efectivo', value: 'efectivo', icon: '💵' }
                                        ]}
                                        selectedValues={filters.source || []}
                                        onChange={(val) => update({ source: val as any })}
                                    />
                                </div>
                            </div>
                        </TableHead>
                        <TableHead>
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full gap-2">
                                <div />
                                <span className="uppercase text-center">Descripción</span>
                                <div className="flex justify-start">
                                    <TextFilter value={filters.search} onChange={(val) => update({ search: val || undefined })} />
                                </div>
                            </div>
                        </TableHead>
                        <TableHead className="w-[160px]">
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full gap-2">
                                <div />
                                <span className="uppercase text-center">Monto</span>
                                <div className="flex justify-start">
                                    <NumberRangeFilter min={filters.minAmount} max={filters.maxAmount} onChange={(min, max) => update({ minAmount: min, maxAmount: max })} />
                                </div>
                            </div>
                        </TableHead>
                        <TableHead className="w-[140px]">
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full gap-2">
                                <div />
                                <span className="uppercase text-center">Estado</span>
                                <div className="flex justify-start">
                                    <MultiSelectFilter
                                        title=""
                                        options={[{ label: 'Pendiente', value: 'pendiente' }, { label: 'Conciliado', value: 'conciliado' }]}
                                        selectedValues={filters.status || []}
                                        onChange={(val) => update({ status: val as any })}
                                    />
                                </div>
                            </div>
                        </TableHead>
                        <TableHead className="w-[50px]" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((tx) => (
                        <TableRow key={tx.id} data-state={selectedIds.has(tx.id) ? "selected" : undefined} className={cn(selectedIds.has(tx.id) && "bg-muted/50 border-l-4 border-l-primary")}>
                            <TableCell className="pl-4">
                                <input type="checkbox" checked={selectedIds.has(tx.id)} onChange={() => toggleRow(tx.id)} className="accent-primary" />
                            </TableCell>
                            <TableCell className="font-mono text-sm">{tx.date}</TableCell>
                            <TableCell>
                                <span className="mr-2">{sourceIcons[tx.source]}</span>
                                <span className="capitalize text-sm">{tx.source}</span>
                            </TableCell>
                            <TableCell>
                                <div className="font-medium truncate max-w-[300px]" title={tx.description || ''}>{tx.description || <span className="text-muted-foreground italic">Sin descripción</span>}</div>
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                                <span className={tx.amount < 0 ? 'text-red-600' : 'text-green-600'}>{formatMoney(tx.amount)}</span>
                            </TableCell>
                            <TableCell>
                                <span className={cn("inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border", statusColorMap[tx.status])}>
                                    {tx.status}
                                </span>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEdit?.(tx)}><Edit2 className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onDelete?.(tx)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
