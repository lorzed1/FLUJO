'use client'
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/DropdownMenu"
import { DatePicker } from "@/components/ui/DatePicker"
import { CalendarIcon, Hash, Search } from "lucide-react"

// FILTRO DE TEXTO
export function TextFilter({ value, onChange }: { value?: string, onChange: (val: string) => void }) {
    const [localValue, setLocalValue] = useState(value || '')
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${value ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Search className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-4">
                <Input placeholder="Buscar..." value={localValue} onChange={(e) => setLocalValue(e.target.value)} />
                <div className="flex justify-end pt-2 gap-2">
                    <Button size="sm" onClick={() => onChange(localValue)}>Aplicar</Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// FILTRO DE FECHAS
export function DateRangeFilter({ dateFrom, dateTo, onChange }: { dateFrom?: string, dateTo?: string, onChange: (f?: string, t?: string) => void }) {
    const [from, setFrom] = useState(dateFrom || '')
    const [to, setTo] = useState(dateTo || '')
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${dateFrom || dateTo ? 'text-primary' : 'text-muted-foreground'}`}>
                    <CalendarIcon className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-4">
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Desde</label>
                    <DatePicker value={from} onChange={(val) => setFrom(val)} />
                    <label className="text-sm font-medium">Hasta</label>
                    <DatePicker value={to} onChange={(val) => setTo(val)} />
                </div>
                <div className="flex justify-end pt-2">
                    <Button size="sm" onClick={() => onChange(from || undefined, to || undefined)}>Aplicar</Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

// FILTRO NUMÉRICO
export function NumberRangeFilter({ min, max, onChange }: { min?: number, max?: number, onChange: (min?: number, max?: number) => void }) {
    const [lMin, setLMin] = useState(min ? (min / 100).toString() : '')
    const [lMax, setLMax] = useState(max ? (max / 100).toString() : '')

    const apply = () => {
        const vMin = lMin ? Math.round(parseFloat(lMin) * 100) : undefined // Convierte a centavos
        const vMax = lMax ? Math.round(parseFloat(lMax) * 100) : undefined
        onChange(vMin, vMax)
    }
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${min || max ? 'text-primary' : 'text-muted-foreground'}`}>
                    <Hash className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-4" align="end">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-sm font-medium">Mín</label>
                        <Input type="number" value={lMin} onChange={(e) => setLMin(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Máx</label>
                        <Input type="number" value={lMax} onChange={(e) => setLMax(e.target.value)} />
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    <Button size="sm" onClick={apply}>Aplicar</Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
