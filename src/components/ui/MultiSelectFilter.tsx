'use client'
import * as React from "react"
import { Button } from "@/components/ui/Button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu"
import { Filter } from "lucide-react"
import { Badge } from "@/components/ui/Badge"

interface MultiSelectFilterProps {
    title: string
    options: { label: string; value: string; icon?: string }[]
    selectedValues: string[]
    onChange: (values: string[]) => void
}

export function MultiSelectFilter({ title, options, selectedValues = [], onChange }: MultiSelectFilterProps) {
    const selectedSet = new Set(selectedValues)

    const toggleOption = (value: string) => {
        const newSelected = new Set(selectedSet)
        if (newSelected.has(value)) newSelected.delete(value)
        else newSelected.add(value)
        onChange(Array.from(newSelected))
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="h-8 border-dashed">
                    <Filter className="mr-2 h-4 w-4" />
                    {title}
                    {selectedValues.length > 0 && (
                        <>
                            <div className="mx-2 h-4 w-[1px] bg-accent" />
                            <Badge variant="neutral" className="rounded-sm px-1 font-normal">
                                {selectedValues.length}
                            </Badge>
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuLabel>{title}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {options.map((option) => (
                    <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={selectedSet.has(option.value)}
                        onCheckedChange={() => toggleOption(option.value)}
                    >
                        {option.icon && <span className="mr-2">{option.icon}</span>}
                        {option.label}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
