---
name: Standard Data Table
description: Protocolo para implementar tablas de datos estandarizadas en toda la aplicación.
---

# 📊 Standard Data Table Protocol

Este protocolo se activa cada vez que necesitas crear una "tabla", "lista de administración", "vista de datos" o cualquier interfaz tipo grid.

Para garantizar una experiencia de usuario consistente, todas las tablas de datos en la aplicación deben seguir estrictamente este protocolo. El objetivo es que cada vista de lista (List View) se sienta familiar, funcional y profesional.

## 1. Patrón Visual (UI)

*   **Contenedor**:
    *   Fondo blanco (`bg-white dark:bg-slate-800`).
    *   Bordes sutiles (`border-gray-100 dark:border-slate-700`).
    *   Sombras suaves (`shadow-sm` o `shadow-md` en hover).
    *   Esquinas redondeadas (`rounded-xl` o `rounded-2xl`).

*   **Cabecera (Thead)**:
    *   Posición `sticky top-0` con `z-10`.
    *   Fondo translúcido para efecto premium (`bg-gray-50/95 backdrop-blur-sm`).
    *   Tipografía: `text-xs`, `uppercase`, `tracking-widest`, `font-black`.
    *   Color de texto: `text-gray-400 dark:text-gray-300`.

*   **Filas (Tbody Tr)**:
    *   Altura cómoda (`py-3` o `py-4`).
    *   Efecto Zebra-striping sutil:
        *   Impar: `bg-white dark:bg-slate-800`
        *   Par: `bg-gray-50/30 dark:bg-slate-900/50`
    *   Hover effect: `hover:bg-indigo-50/30 dark:hover:bg-blue-900/20`.
    *   Transición suave: `transition-all`.

## 2. Funcionalidades Obligatorias

Todas las tablas **DEBEN** implementar:

1.  **Ordenamiento (Sorting)**:
    *   Click en cabecera para ordenar ASC/DESC.
    *   Iconos indicadores (`ChevronUp`/`ChevronDown`) solo visibles en la columna activa.

2.  **Filtrado por Columna (Excel-style)**:
    *   Icono de embudo (`FunnelIcon`) en cada cabecera.
    *   Al hacer clic, mostrar un dropdown con casillas de verificación (Checkboxes) para los valores únicos de esa columna.
    *   Indicador visual si la columna está filtrada (cambio de color del icono).

3.  **Buscador Global**:
    *   Input de texto en la parte superior.
    *   Debe filtrar en tiempo real sobre todos los campos visibles.

4.  **Selección Múltiple (Bulk Actions)**:
    *   Checkbox en el `thead` para seleccionar todo.
    *   Checkboxes en cada fila.
    *   Barra de acción contextual que aparece **solo** cuando hay elementos seleccionados (para Eliminar, Exportar, Cambiar Estado).

5.  **Exportación**:
    *   Botón "Exportar" con opciones (Excel, PDF, CSV) usando `xlsx` y `jspdf`.

6.  **Drag & Drop de Columnas (Opcional pero recomendado)**:
    *   Permitir reordenar columnas arrastrándolas desde la cabecera.

## 3. Implementación (React Pattern)

No dupliques lógica innecesariamente. Usa el siguiente patrón de estado en tu componente:

```typescript
// Estados Esenciales
const [searchTerm, setSearchTerm] = useState('');
const [sortField, setSortField] = useState<keyof T>('date');
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({}); // Para filtros Excel-style

// useMemo para filtrado eficiente
const processedData = useMemo(() => {
    let result = rawData;
    // 1. Filtrar por buscador global
    // 2. Filtrar por filtros de columna (activeFilters)
    // 3. Filtrar por rango de fechas (si aplica)
    // 4. Ordenar (sortField + sortDirection)
    return result;
}, [rawData, searchTerm, activeFilters, sortField, sortDirection]);
```

## 4. Estructura del Componente

```tsx
return (
    <div className="flex flex-col h-full space-y-2">
        {/* 1. Toolbar Superior (Buscador + Acciones Globales + Filtros Fecha) */}
        <Toolbar />

        {/* 2. Barra de Selección Masiva (Flotante o Condicional) */}
        {selectedIds.size > 0 && <BulkActionsBar />}

        {/* 3. Contenedor de Tabla Scrollable */}
        <div className="flex-1 overflow-hidden border rounded-2xl...">
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table>
                    {/* Thead Sticky */}
                    {/* Tbody con data procesada */}
                </table>
            </div>
        </div>

        {/* 4. Footer (Contadores / Paginación) */}
        <Footer />
    </div>
)
```

## 5. Accesibilidad y Detalles

*   Usa `tabular-nums` para columnas numéricas para que alineen correctamente.
*   Alinea textos a la izquierda y números a la derecha.
*   Usa colores semánticos para estados (Verde=Ingreso, Rojo=Egreso/Error).
*   Siempre proporciona feedback de "No se encontraron resultados" cuando el array está vacío.

## 6. Configuración de Importación (Import Wizard)

Para los módulos que permiten la carga de datos masiva (CSV/Excel), se debe seguir este esquema de mapeo según el contexto:

### A. Lado A (Extractos Bancarios)
*   **Campos Requeridos**: Fecha, Descripción, Documento (Referencia), Valor (Amount).
*   **Regla de Negocio**: Es obligatorio que el usuario seleccione o cree un **Banco de Destino**. Cada transacción debe marcarse automáticamente con `metadata.banco_destino`.
*   **Detección de Tipo**: Se usa la lógica del `AccountNatureService` o el signo del monto para determinar Ingreso/Egreso.

### B. Lado B (Libro Oficial)
*   **Campos Requeridos**: 
    1.  **Cuenta / Nombre de Cuenta** (Cód. PUC y Denominación).
    2.  **Contacto / Identificación** (Nombre tercero y NIT).
    3.  **Documento** (Nro. de comprobante).
    4.  **Fecha**.
    5.  **Descripción / Descripción del Movimiento** (Deben combinarse si ambos existen).
    6.  **Débito / Crédito** (Columnas individuales).
*   **Lógica de Mapeo Estricta**: Para evitar confusiones contables en el libro auxiliar:
    *   **Crédito = Ingreso** (Entrada de recursos).
    *   **Débito = Egreso** (Salida de recursos).
*   **Previsualización**: Mostrar estado de duplicado basado en `Documento + Fecha + Monto`.
