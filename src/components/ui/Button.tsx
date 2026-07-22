import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/* ══════════════════════════════════════════════════════════
   Button — Aliaddo Design System
   Usa CVA para definir variantes type-safe de botones.
   Referencia: ButtonDesignPlayground.tsx
   ══════════════════════════════════════════════════════════ */

const buttonVariants = cva(
    // Base styles (shared by ALL variants)
    'inline-flex items-center justify-center font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md active:scale-95',
    {
        variants: {
            variant: {
                primary:
                    'bg-purple-600 !text-white hover:bg-purple-700 shadow-sm shadow-purple-500/30 border border-transparent hover:shadow-md hover:border-purple-400/50 [&>svg]:!text-white',
                secondary:
                    'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-purple-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/80 shadow-sm',
                danger:
                    'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold shadow-sm',
                ghost:
                    'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white shadow-none',
                white:
                    'bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-purple-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300',
                icon:
                    'bg-transparent text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg shadow-none p-0',
                'icon-danger':
                    'bg-transparent text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg shadow-none p-0',
            },
            size: {
                xs: 'px-2 py-1 text-2xs h-7',
                sm: 'px-3 py-1.5 text-xs h-8',
                md: 'px-4 py-2 text-sm- h-10',
                lg: 'px-6 py-3 text-sm h-11',
                'icon-sm': 'p-1 h-6 w-6',
                'icon-md': 'p-1.5 h-8 w-8',
                'icon-lg': 'p-2 h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    className,
    children,
    variant,
    isLoading = false,
    disabled,
    size,
    ...props
}) => {
    return (
        <button
            className={cn(buttonVariants({ variant, size }), className)}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <span className="mr-2">
                    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </span>
            )}
            {children}
        </button>
    );
};

// Export variants for external composition (e.g. Link styled as Button)
export { buttonVariants };
