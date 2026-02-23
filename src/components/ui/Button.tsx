import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'white';
    isLoading?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
    className = '',
    children,
    variant = 'primary',
    isLoading = false,
    disabled,
    size = 'md',
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md active:scale-95";

    const variants = {
        primary: "bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-500/20 font-bold border border-transparent hover:border-purple-400/50",
        secondary: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-purple-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/80 shadow-sm",
        danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold shadow-sm",
        ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white shadow-none",
        white: "bg-white text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-purple-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-[12px] h-8",
        md: "px-4 py-2 text-[13px] h-10",
        lg: "px-6 py-3 text-[14px] h-11"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
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
