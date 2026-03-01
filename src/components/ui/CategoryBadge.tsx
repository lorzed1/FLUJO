import React from 'react';

/**
 * CategoryBadge — Componente estandarizado para mostrar etiquetas de categoría en tablas.
 * Reemplaza el patrón inline repetido de badge con borde gris, texto uppercase
 * que existía en BudgetRecurring, BudgetTable y TransfersView.
 * 
 * Uso:
 *   <CategoryBadge>{value}</CategoryBadge>
 */

interface CategoryBadgeProps {
    children: React.ReactNode;
    className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ children, className = '' }) => {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-600 uppercase tracking-widest dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400 ${className}`}>
            {children}
        </span>
    );
};
