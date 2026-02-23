---
name: Sistema de Diseño Aliaddo (Design System)
description: Estandarización obligatoria visual de botones, tablas, layouts y colores para todo el proyecto.
---

# 🎨 Aliaddo Design System (Core)

**SIEMPRE** consulta este documento antes de hacer cambios visuales, CSS o crear nuevas pantallas. Ningún componente debe salirse de estas reglas, para asegurar que la aplicación mantenga un estándar corporativo "high-end".

---

## 1. Tipografía y Estructura Global
- **Fuente Principal**: Segoe UI (`font-sans` en Tailwind).
- **Densidad de Página**: Layout compacto. Reduce los paddings globales exagerados. Todo debe sentirse denso pero respirable.
- **Tablas (`SmartDataTable`)**: 
  - Texto base: `text-[12px] leading-[19.4px] text-[#363636] font-normal` (Oscuro: `dark:text-gray-300`).
  - Cebra (Zebra-striping): Filas impares blancas (`bg-white`); filas pares gris claro estructurado (`bg-slate-100 hover:bg-slate-200`). En modo oscuro alternar `bg-[#0f172a]` y `bg-slate-800/80`.
  - Columnas numéricas (dinero): Siempre acompañadas por la clase `tabular-nums`.

---

## 2. Paleta de Colores (Core Institucional)
- **Marca Principal (Primario)**: TONOS MORADOS.
  - Botones y Títulos dominantes: `bg-purple-600`
  - Hover de Acciones Primarias: `hover:bg-purple-700`
  - Sombras para el primario: `shadow-purple-500/20`
- **Peligro (Destructive)**: `bg-red-50 text-red-600 border border-red-200`.

---

## 3. Botones (Action Bar) y Bordes
Los bordes redondeados nunca deben exceder su proporción.
- **Botones regulares y Action Bars**: Usar `rounded-md` (radio pequeño y serio, ~6px). **NUNCA** usar `rounded-xl` o proporciones "gomosas/infantiles" en botones.
- **Contenedores de Tarjetas / Modales**: Pueden usar `rounded-xl` o `rounded-2xl`.

### Tipos de Botón Aprobados:
1. **Acción Primaria** (Máximo 1 por página, ej: "+ Nuevo Ingreso"):
   - `bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-md shadow-purple-500/20 font-bold text-[13px] transition-all active:scale-95 border border-transparent hover:border-purple-400/50`
2. **Secundario (Outline / Configuraciones / Exportar)**:
   - `border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md hover:bg-slate-50 hover:text-purple-600 text-[13px] font-semibold text-slate-600 transition-all shadow-sm active:scale-95`
3. **Fantasma (Ghost / Cancelar)**:
   - `text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md text-[13px] font-semibold transition-colors active:scale-95`

---

## 4. Anatomía del Layout (3 Zonas del Page Header)
Cuando crees una pantalla nueva, el `PageHeader` externo / superior debe dividirse **estrictamente** en 3 Zonas Horizontales (flex).

- **ZONA 1 (Izquierda) - Identidad**: Título de la página gigante + View Modes.
  - View Mode (Tabla vs Calendario): Debe ser un **Segmented Control Estricto**.
    - *Contenedor*: `flex bg-white border border-slate-200 rounded-md w-fit shadow-sm overflow-hidden h-9`.
    - *Botón Activo*: `bg-purple-50 text-purple-700 font-semibold border-r border-slate-200`.
    - *Botón Inactivo*: `bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-semibold`.

- **ZONA 2 (Centro) - Filtro de Tiempo**:
  - Encajonado y centrado. `h-10 border border-slate-200 rounded-md bg-white shadow-sm`. Botones de izquierda `[<]` y derecha `[>]`, con texto centrado: `text-[12px] font-bold text-slate-700 uppercase tracking-widest min-w-[120px]`.

- **ZONA 3 (Derecha) - Panel de Acciones**:
  - Ordenados visualmente del más tenue (Izquierda: Ej. Configurar / Exportar) al más pesado (Derecha: Botón Primario Morado). Todos alineados a la derecha (`justify-end gap-2 h-10`).
  - Agregar efectos micromotores (micro-animations) en hover con clases Group: ej. `group-hover:rotate-45` (tuerca de ajustes), `group-hover:-translate-y-0.5` (flecha exportar).

---

## 5. 🚨 Ley de Posicionamiento de Botones (Obligatoria)

Solo existen estas **ÚNICAS zonas** para botones interactivos:

- **ZONA A: PageHeader Actions** (derecha del título): Segmented Control, Filtro Temporal, Botones Acción. *ÚNICA zona para botones primarios globales.*
- **ZONA B: Toolbar de Tabla** (dentro de SmartDataTable): Búsqueda, filtros, exportar, selección. *Contextual a la tabla.*
- **ZONA C: Panel Lateral / Summary Card**: Botón contextual (ej: "Ejecutar Pagos"). *Solo si hay panel resumen.*
- **ZONA D: Footer de Modal**: Confirmar (der) + Cancelar (izq/der).

### Reglas Estrictas:

1. **NUNCA** colocar botones flotantes sueltos entre secciones de contenido.
2. **NUNCA** duplicar un control temporal (ej: navegador de semana) fuera de la Zona A del PageHeader; si la página tiene un `PageHeader`, el filtro temporal vive ahí.
3. **Segmented Controls / Tabs de sub-vista**: SIEMPRE en la Zona A (`PageHeader actions`), usando el patrón de Segmented Control estricto del §4.
4. **Botón Primario**: Máximo 1 por vista. Ubicación:
   - Si hay PageHeader → Zona A (extremo derecho del actions).
   - Si hay Panel Resumen → Zona C (dentro del panel, al final).
   - **Nunca** en ambos sitios a la vez.
5. **Filtros de período (meses, semanas)**: Siempre en Zona A, dentro del PageHeader, con el estilo del Filtro Temporal (chevrons + label central).
6. **Acciones de tabla (eliminar selección, exportar)**: Solo Zona B, manejadas por `SmartDataTable` internamente.

### Ejemplo de una Página Correcta:
```
PageHeader  [Título + Ícono]  |  [◄ Ene 2026 ►]  |  [Segmented: Pagos | Historial]  [+ Nuevo Gasto]
─────────────────────────────────────────────────────────────────────────────────────────────────
│  Contenido Principal (tabla, cards, gráficos)     │  Panel Resumen (opcional)                  │
│  Sin botones sueltos aquí                         │  Balance: $5.027.674                       │
│                                                   │  [Ejecutar Pagos ←── botón contextual Z-C] │
```

---

## 6. REGLA DE IMPLANTACIÓN
- Si alguna tabla de la aplicación, pestaña (tab), modal o botón difiere visualmente del estándar descrito en este archivo o en la página de prueba visual `src/pages/ButtonDesignPlayground.tsx`, tu deber como IA es purgar las clases erróneas y enmarcarlo al instante en las clases de diseño correctas.
- Si un botón o control se encuentra fuera de las Zonas A-D definidas en la §5, **moverlo** a la zona correcta.
