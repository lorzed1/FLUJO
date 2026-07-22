import React from 'react';
import { cn } from '@/lib/utils';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'primary' | 'white';
}

export function Spinner({ size = 'md', variant = 'primary', className, ...props }: SpinnerProps) {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-[3px]',
        lg: 'w-12 h-12 border-4',
        xl: 'w-16 h-16 border-4',
    };

    const variantClasses = {
        primary: 'border-purple-200 border-t-purple-600 dark:border-purple-900 dark:border-t-purple-500',
        white: 'border-white/30 border-t-white dark:border-white/20 dark:border-t-white/80',
    };

    return (
        <div
            className={cn(
                'rounded-full animate-spin',
                sizeClasses[size],
                variantClasses[variant],
                className
            )}
            {...props}
        />
    );
}
