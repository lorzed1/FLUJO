import React from 'react';
import { cn } from '@/lib/utils';

/**
 * StatusBadge — Componente estandarizado para mostrar estados en tablas.
 * Reemplaza el patrón copy-paste de "pill con dot + texto" que se repetía
 * en BudgetRecurring, BudgetTable, BudgetCategories y EquilibriumDatabasePage.
 * 
 * Uso:
 *   <StatusBadge variant="success" label="Pagado" />
 *   <StatusBadge variant="warning" label="Pendiente" />
 *   <StatusBadge variant="danger" label="Vencido" />
 */

export type StatusVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

interface StatusBadgeProps {
    variant: StatusVariant;
    label: string;
    className?: string;
}

const variantStyles: Record<StatusVariant, { dot: string; container: string; text: string }> = {
    success: {
        dot: 'bg-emerald-500',
        container: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800',
        text: 'text-emerald-700 dark:text-emerald-400'
    },
    warning: {
        dot: 'bg-amber-500',
        container: 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800',
        text: 'text-amber-700 dark:text-amber-400'
    },
    danger: {
        dot: 'bg-rose-500',
        container: 'bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800',
        text: 'text-rose-700 dark:text-rose-400'
    },
    neutral: {
        dot: 'bg-slate-400',
        container: 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700',
        text: 'text-slate-600 dark:text-slate-400'
    },
    info: {
        dot: 'bg-blue-500',
        container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800',
        text: 'text-blue-700 dark:text-blue-400'
    }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ variant, label, className }) => {
    const style = variantStyles[variant];
    return (
        <div className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border shadow-sm w-fit mx-auto",
            style.container,
            className
        )}>
            <span className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
            <span className={cn("text-[10px] font-semibold uppercase tracking-widest", style.text)}>
                {label}
            </span>
        </div>
    );
};
