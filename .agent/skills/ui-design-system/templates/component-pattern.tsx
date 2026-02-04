import React from 'react';

// Patrón de Componente Base
interface BaseProps extends React.HTMLAttributes<HTMLElement> {
    variant?: 'primary' | 'secondary' | 'outline';
}

export const ComponentName: React.FC<BaseProps> = ({ className, children, ...props }) => {
    return <div className={`rounded-lg shadow-sm ${className}`} {...props}>{children}</div>;
};
