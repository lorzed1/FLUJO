import React from 'react';
import { cn } from '@/lib/utils';
import { MagnifyingGlassIcon } from './Icons';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
    ...props
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300',
                className
            )}
            {...props}
        >
            <div className="mb-4 text-gray-300 dark:text-slate-600 flex items-center justify-center">
                {icon || <MagnifyingGlassIcon className="h-12 w-12" />}
            </div>
            <h3 className="text-sm md:text-base font-medium text-gray-500 dark:text-gray-400 mb-1">
                {title}
            </h3>
            {description && (
                <p className="text-xs md:text-sm text-gray-400 dark:text-slate-500 max-w-sm mx-auto mb-4">
                    {description}
                </p>
            )}
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}
