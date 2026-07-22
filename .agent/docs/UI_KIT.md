# 🎨 UI Design System & Frontend Standards (Aliaddo Style)

Este documento es la **Fuente Única de Verdad** para el diseño de la aplicación. Todo cambio visual debe respetar estos estándares para garantizar la consistencia.

## 1. Filosofía de Diseño
Buscamos una interfaz **"Clean, Modern & Professional"** con alta densidad de información.
*   **Espaciado:** Compacto pero legible. Margen global de página: `p-4 sm:p-5` (16px a 20px).
*   **Jerarquía:** Títulos en azul/slate oscuro, texto secundario en gris suave.
*   **Regla de Contenedor Cero (CRÍTICO):** Las páginas individuales **NO** deben agregar padding extra (`p-*`) ni fondos. El `MainLayout` ya provee el fondo (`bg-gray-50/50`) y el padding. Agregar más crea "doble margen" y desordena la app.
*   **Tarjetas (Cards):** Estilo "Card-Based". Fondo blanco (`bg-white`), bordes `border-gray-200`, sombra `shadow-sm`, y esquinas `rounded-xl`.

## 2. Paleta de Colores
Usa clases semánticas de Tailwind. Evita hex codes hardcodeados salvo en el Sidebar.
*   **Brand Primary (Botones/Acciones):** `purple-600` (Violeta/Púrpura). Hover: `purple-700`.
*   **Sidebar (Tema Oscuro):**
    *   Fondo Cuerpo: `#2e323b` (Slate Grey).
    *   Cabecera/Footer: `#18191e` (Almost Black).
    *   Texto Activo: `text-white` (con `bg-white/5` sutil).
    *   Texto Inactivo: `text-slate-400`.
*   **Superficie:** `bg-gray-50/50` (App), `bg-white` (Tarjetas).
*   **Bordes:** `border-gray-200` o `border-slate-100`.
*   **Feedback:** 
    *   Éxito: `text-emerald-600` / `bg-emerald-50`.
    *   Error: `text-rose-600` / `bg-rose-50`.
    *   Aviso: `text-amber-600` / `bg-amber-50`.

## 3. Tipografía & Textos
*   **Fuente:** `Segoe UI` (default), `Roboto` o `Sans-serif` moderna.
*   **H1 (Títulos de Página):** `text-2xl font-bold tracking-tight text-slate-800`.
*   **H2 (Títulos de Card):** `text-sm font-bold uppercase tracking-wide text-gray-800`.
*   **Labels (Formularios):** `text-[13px] font-semibold text-gray-700 mb-1`.
*   **Tablas/Inputs:** `text-[13px]` para máxima densidad.

## 4. Componentes Core
### Botones
*   **Primario:** `h-8 py-1.5 px-4 bg-purple-600 text-white rounded-lg shadow-sm font-medium text-xs hover:bg-purple-700`.
*   **Secundario (Toolbar):** `h-8 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm text-xs`.

### Inputs (Alta Densidad)
*   **Altura:** `h-8` (32px) o `h-9` (36px).
*   **Borde:** `border-gray-300`, `rounded` (estándar).
*   **Foco:** `ring-1 ring-purple-600 border-purple-600`.

## 5. Estandar de Tablas (SmartDataTable)
Todas las tablas deben usar `SmartDataTable`. **PROHIBIDO** tablas HTML manuales.
*   **Layout de Scroll:** El toolbar (Buscar, Columnas, Exportar) debe quedar **fijo**. Solo el `tbody` y la paginación deben hacer scroll.
*   **Contenedor Padre:** El Card que envuelve la tabla **NO** debe tener padding.
    ```tsx
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <SmartDataTable ... containerClassName="border-none shadow-none" />
    </div>
    ```
*   **Dropdown de Columnas:** Debe tener scroll interno (`max-h-[280px] overflow-y-auto`) para que el scroll del documento no cierre el menú al buscar opciones.

## 6. Modales (Centro de Control)
Los modales deben ser densos, pareciendo un "Panel de Control".
*   **Cabecera:** Fondo `bg-gray-50`, borde inferior, padding `px-5 py-3`.
*   **Pie:** Fondo `bg-gray-50`, borde superior, botones alineados a la derecha.

## 7. Responsive Design (Mobile-First)
1.  Escribe las clases para mobile primero (ej: `w-full`).
2.  Usa `md:` o `lg:` para escritorio (ej: `md:w-1/2`).
3.  **Grids:** Mínimo 1 columna en mobile, 3-4 columnas en desktop.
4.  **Tablas:** Ocultar columnas secundarias en mobile usando `hidden md:table-cell`.

## 8. Formato de Datos
*   **Moneda (COP):** Siempre con prefijo `$`, separador de miles `.` y sin decimales.
*   **Fechas:** Formato visible `DD/MM/YYYY`. ISO para lógica interna.

