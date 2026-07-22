import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Responsive, Layout } from 'react-grid-layout';
import './DashboardGrid.css';

// Custom Simple WidthProvider to avoid RGL HOC issues with React 19 / Vite
// This ensures we have full control over the width logic
const withWidth = (ComposedComponent: any) => {
    return (props: any) => {
        const [width, setWidth] = useState(1200);
        const mounted = useRef(false);
        const containerRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            mounted.current = true;
            const container = containerRef.current;

            if (container) {
                // Initial width
                setWidth(container.offsetWidth);

                const resizeObserver = new ResizeObserver((entries) => {
                    if (!mounted.current) return;
                    for (const entry of entries) {
                        setWidth(entry.contentRect.width);
                    }
                });

                resizeObserver.observe(container);
                return () => {
                    mounted.current = false;
                    resizeObserver.disconnect();
                };
            }
        }, []);

        return (
            <div ref={containerRef} style={{ width: '100%' }}>
                <ComposedComponent {...props} width={width} />
            </div>
        );
    };
};

const ResponsiveGridLayout = withWidth(Responsive);

interface DraggableDashboardGridProps {
    children: React.ReactNode[]; // Children must have keys
    items: { key: string; component: React.ReactNode }[];
    layoutId: string; // Para guardar en localStorage
    defaultLayouts: any; // Relaxed type to avoid RGL Layout vs Layout[] confusion
    isEditing: boolean;
    rowHeight?: number;
}

export const DraggableDashboardGrid: React.FC<Omit<DraggableDashboardGridProps, 'children'>> = ({
    items,
    layoutId,
    defaultLayouts,
    isEditing,
    rowHeight = 30
}) => {
    // Estado local para layouts (cargado de LS o Default)
    const [layouts, setLayouts] = useState<{ lg: Layout[]; md: Layout[]; sm: Layout[] }>(defaultLayouts);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem(`dashboard_layout_${layoutId}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setLayouts(parsed);
            } catch (e) {
                console.error("Error parsing layout", e);
            }
        }
    }, [layoutId]);

    // Guardar layout al cambiar
    const onLayoutChange = useCallback((currentLayout: Layout[], allLayouts: { lg: Layout[]; md: Layout[]; sm: Layout[] }) => {
        if (!mounted) return;
        // Evitar guardar loops infinitos si no hay cambios reales
        setLayouts(allLayouts);
        if (isEditing) {
            localStorage.setItem(`dashboard_layout_${layoutId}`, JSON.stringify(allLayouts));
        }
    }, [mounted, layoutId, isEditing]);

    return (
        <div className={`transition-colors duration-300 rounded-xl ${isEditing ? 'grid-edit-mode min-h-[600px] p-4 border-2 border-indigo-100 dark:border-indigo-900/30' : ''}`}>
            <ResponsiveGridLayout
                className="layout"
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 3, md: 3, sm: 1, xs: 1, xxs: 1 }}
                rowHeight={rowHeight} // Altura base de fila en px
                isDraggable={isEditing}
                isResizable={isEditing}
                onLayoutChange={onLayoutChange}
                draggableHandle={undefined} // En modo edición, todo el item es draggable salvo el contenido interactivo
                margin={[24, 24]} // Espacio generoso entre tarjetas
                containerPadding={[0, 0]}
                useCSSTransforms={mounted}
            >
                {items.map(item => (
                    <div
                        key={item.key}
                        className={`
                            relative bg-transparent h-full w-full rounded-xl overflow-hidden
                            ${isEditing ? 'ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-slate-900 z-50 cursor-grab active:cursor-grabbing shadow-xl' : ''}
                        `}
                    >
                        {/* Overlay invisible en modo edición para capturar eventos del mouse y permitir arrastrar sin interactuar con el gráfico */}
                        {isEditing && (
                            <div className="absolute inset-0 z-50 bg-white/10 backdrop-blur-[1px] flex items-center justify-center">
                                <div className="bg-indigo-600 text-white text-xs px-2 py-1 rounded shadow-sm opacity-80 font-bold pointer-events-none">
                                    Arrastrar
                                </div>
                            </div>
                        )}

                        {/* Contenedor del Componente Real */}
                        <div className="h-full w-full">
                            {item.component}
                        </div>
                    </div>
                ))}
            </ResponsiveGridLayout>
        </div>
    );
};
