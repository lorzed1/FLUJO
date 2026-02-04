import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'success' | 'warning' | 'neutral' | 'danger' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ className = '', children, variant = 'neutral', ...props }) => {
    const variants = {
        success: "bg-green-100 text-green-800 border-green-200",
        warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
        neutral: "bg-gray-100 text-gray-800 border-gray-200",
        danger: "bg-red-100 text-red-800 border-red-200",
        info: "bg-blue-100 text-blue-800 border-blue-200"
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`} {...props}>
            {children}
        </span>
    );
};
