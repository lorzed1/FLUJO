import React from 'react';

// ============================================
// PageContainer — Wrapper estándar para contenido de página
// ============================================

interface PageContainerProps {
    children: React.ReactNode;
    className?: string;
    /** Sin padding (para páginas que manejan su propio spacing) */
    noPadding?: boolean;
}

/**
 * Contenedor estándar para todas las páginas.
 * Aplica padding responsive y spacing entre secciones.
 * 
 * @example
 * <PageContainer>
 *   <PageHeader title="Dashboard" breadcrumbs={[...]} />
 *   <SectionGrid cols={4}>
 *     <KPICard />
 *   </SectionGrid>
 * </PageContainer>
 */
export const PageContainer: React.FC<PageContainerProps> = ({
    children,
    className = '',
    noPadding = false,
}) => {
    return (
        <div className={`${noPadding ? '' : 'p-4 md:p-6 lg:p-8'} space-y-4 md:space-y-6 ${className}`}>
            {children}
        </div>
    );
};

// ============================================
// SectionGrid — Grid adaptativo para cards/KPIs
// ============================================

interface SectionGridProps {
    children: React.ReactNode;
    className?: string;
    /** Número de columnas en desktop (lg:). Default: 3. Mobile siempre es 1. */
    cols?: 1 | 2 | 3 | 4 | 6;
    /** Gap entre elementos */
    gap?: 'sm' | 'md' | 'lg';
}

const colsMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
};

const gapMap = {
    sm: 'gap-3',
    md: 'gap-4 md:gap-5',
    lg: 'gap-4 md:gap-6',
};

/**
 * Grid responsivo para distribuir cards, KPIs o secciones.
 * 
 * @example
 * <SectionGrid cols={4}>
 *   <KPICard title="Ventas" value="$1.2M" />
 *   <KPICard title="Visitas" value="3,450" />
 *   <KPICard title="Ticket" value="$45K" />
 *   <KPICard title="Propina" value="$120K" />
 * </SectionGrid>
 */
export const SectionGrid: React.FC<SectionGridProps> = ({
    children,
    className = '',
    cols = 3,
    gap = 'md',
}) => {
    return (
        <div className={`grid ${colsMap[cols]} ${gapMap[gap]} ${className}`}>
            {children}
        </div>
    );
};

// ============================================
// SplitLayout — Layout de 2 paneles (sidebar + contenido)
// ============================================

interface SplitLayoutProps {
    children: React.ReactNode;
    sidebar: React.ReactNode;
    className?: string;
    /** Ancho del sidebar en desktop. Default: 'md' (320px) */
    sidebarWidth?: 'sm' | 'md' | 'lg';
    /** Invertir (sidebar a la derecha) */
    reverse?: boolean;
}

const sidebarWidthMap = {
    sm: 'lg:w-64',   // 256px
    md: 'lg:w-80',   // 320px
    lg: 'lg:w-96',   // 384px
};

/**
 * Layout dividido en sidebar + contenido principal.
 * En mobile, el sidebar se apila encima del contenido.
 * 
 * @example
 * <SplitLayout sidebar={<FilterPanel />}>
 *   <DataTable />
 * </SplitLayout>
 */
export const SplitLayout: React.FC<SplitLayoutProps> = ({
    children,
    sidebar,
    className = '',
    sidebarWidth = 'md',
    reverse = false,
}) => {
    return (
        <div className={`flex flex-col lg:flex-row gap-4 md:gap-6 ${reverse ? 'lg:flex-row-reverse' : ''} ${className}`}>
            <aside className={`w-full ${sidebarWidthMap[sidebarWidth]} flex-shrink-0`}>
                {sidebar}
            </aside>
            <main className="flex-1 min-w-0">
                {children}
            </main>
        </div>
    );
};

// ============================================
// ResponsiveStack — Apila vertical en mobile, horizontal en desktop
// ============================================

interface ResponsiveStackProps {
    children: React.ReactNode;
    className?: string;
    /** Breakpoint para cambiar a horizontal. Default: 'md' */
    breakpoint?: 'sm' | 'md' | 'lg';
    /** Alineación vertical de items (flex align) */
    align?: 'start' | 'center' | 'end' | 'stretch';
    gap?: 'sm' | 'md' | 'lg';
}

const breakpointFlexMap = {
    sm: 'sm:flex-row',
    md: 'md:flex-row',
    lg: 'lg:flex-row',
};

const alignMap = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
};

/**
 * Stack que cambia de vertical a horizontal en un breakpoint dado.
 * 
 * @example
 * <ResponsiveStack breakpoint="md" align="center">
 *   <Input placeholder="Buscar..." />
 *   <Button>Filtrar</Button>
 *   <Button variant="ghost">Resetear</Button>
 * </ResponsiveStack>
 */
export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
    children,
    className = '',
    breakpoint = 'md',
    align = 'start',
    gap = 'md',
}) => {
    return (
        <div className={`flex flex-col ${breakpointFlexMap[breakpoint]} ${alignMap[align]} ${gapMap[gap]} ${className}`}>
            {children}
        </div>
    );
};

// ============================================
// EmptyState — Estado vacío reutilizable
// ============================================

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

/**
 * Componente de estado vacío para cuando no hay datos.
 * 
 * @example
 * <EmptyState
 *   icon={<InboxIcon className="w-12 h-12" />}
 *   title="Sin transacciones"
 *   description="Aún no tienes transacciones registradas."
 *   action={<Button>Agregar Primera</Button>}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    className = '',
}) => {
    return (
        <div className={`flex flex-col items-center justify-center py-12 md:py-16 text-center ${className}`}>
            {icon && (
                <div className="mb-4 text-gray-300 dark:text-slate-600">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-1">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm mb-4">
                    {description}
                </p>
            )}
            {action && <div>{action}</div>}
        </div>
    );
};
