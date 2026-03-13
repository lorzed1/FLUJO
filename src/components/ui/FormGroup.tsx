import React from 'react';

export interface FormGroupProps {
    label?: React.ReactNode;
    htmlFor?: string;
    error?: string;
    description?: React.ReactNode;
    required?: boolean;
    className?: string;
    children: React.ReactNode;
    id?: string;
}

export const FormGroup: React.FC<FormGroupProps> = ({
    label,
    htmlFor,
    error,
    description,
    required = false,
    className = '',
    children,
    id
}) => {
    const generatedId = React.useId();
    const inputId = id || htmlFor || generatedId;

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-xs2 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-caps"
                >
                    {label}
                    {required && <span className="text-red-500 ml-1" title="Campo requerido">*</span>}
                </label>
            )}

            {React.isValidElement(children)
                ? React.cloneElement(children as React.ReactElement<any>, {
                    id: inputId,
                    ...(error ? { 'aria-invalid': true } : {}),
                })
                : children}

            {description && !error && (
                <p className="text-xs2 text-slate-400 dark:text-slate-500 mt-1">
                    {description}
                </p>
            )}

            {error && (
                <p
                    className="text-xs2 font-medium text-red-500 dark:text-red-400 mt-1 animate-in slide-in-from-top-1 fade-in duration-200 flex items-center gap-1"
                    role="alert"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
};
