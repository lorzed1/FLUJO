---
name: ui-design-system
description: Sistema de Diseño UI/UX completo, estándares de frontend y reglas de visualización.
version: 2.0.0
---

# 🎨 UI Design System & Frontend Standards

Este skill consolida todas las reglas visuales, de componentes y de comportamiento del frontend.

## 1. Filosofía de Diseño
Busca una interfaz **"Clean, Modern & Professional"**.
*   **Espaciado:** Generoso (`gap-4`, `p-6`). Evita saturación.
*   **Jerarquía:** Títulos claros, texto secundario gris suave.
*   **Contenedores:** Estilo "Card-Based". Fondo gris claro (`bg-slate-50`), tarjetas blancas (`bg-white`) con sombras suaves (`shadow-sm`) y bordes sutiles (`border-gray-100`).

## 2. Paleta de Colores (Tailwind)
Usa clases semánticas, NO hex codes arbitrarios.
*   **Primary:** `bg-blue-600` (Hover `bg-blue-700`), `text-blue-600`.
*   **Surface:** `bg-slate-50` (App), `bg-white` (Cards).
*   **Bordes:** `border-gray-200` (Estructural).
*   **Texto:** `text-slate-900` (Principal), `text-slate-500` (Secundario).
*   **Feedback:** `text-green-600` / `bg-green-50` (Éxito), `text-red-600` / `bg-red-50` (Error).

## 3. Tipografía
Fuente Sans-serif moderna (Inter/System).
*   **H1 (Page):** `text-2xl font-bold tracking-tight text-slate-900`.
*   **H2 (Section):** `text-lg font-semibold text-slate-800`.
*   **Body:** `text-sm text-slate-600`.
*   **Label:** `text-xs font-bold uppercase tracking-wide text-slate-500`.

## 4. Componentes Core

### Botones (`Button.tsx`)
*   **Primary:** `bg-blue-600 text-white hover:bg-blue-700 shadow-sm rounded-lg`.
*   **Secondary:** `bg-white text-slate-700 border border-gray-300 hover:bg-gray-50`.
*   **Ghost:** `text-slate-600 hover:bg-slate-100`.

### Inputs
*   **Estilo:** `h-10 w-full rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`.
*   **Label:** Siempre visible encima del input.

### Tarjetas
*   `bg-white border border-gray-100 shadow-sm rounded-xl p-6`.

## 5. Reglas de Layout e Integridad
**INVIOLABLES (Anti-Regresiones):**

1.  **Scroll Interno:**
    *   Si un hijo tiene scroll (ej. tabla), el padre Flex DEBE tener `min-h-0` (vertical) o `min-w-0` (horizontal).
    *   El contenedor con scroll debe tener `overflow-auto`.
    *   Evita `h-screen` en componentes internos. Usa `h-full` relativo.

2.  **Responsive:**
    *   **Mobile-First:** Escribe clases base para móvil, luego `md:`, `lg:`.
    *   Ejemplo: `flex-col md:flex-row`.

## 6. Formato de Datos (Strict)

### Moneda (COP)
*   **Visualización:** `$ 120.000` (Signo $, Puntos miles, SIN decimales).
*   **Input:** Permite escritura natural.
*   **Código:** Usar `formatCOP(valor)`. NO usar `.toFixed(2)` para visualización final.
*   **Parseo:** Al leer CSV/Input, detectar separadores inteligentemente.
    *   Latino: `1.000,00` -> `1000.00`
    *   Americano: `1,000.00` -> `1000.00`

### Fechas
*   **Visualización:** `DD/MM/YYYY` (ej. `28/01/2026`).
*   **Input:** Browser default (normalmente `YYYY-MM-DD` value).
*   **Storage:** ISO 8601 o Timestamp.

## 7. Accesibilidad & UX
*   **Estados:** Todo interactivo debe tener `:hover` y `:active` (`:focus-visible` para a11y).
*   **Feedback:** Mostrar loaders en acciones async (`disabled={loading}`).
*   **Persistencia:** Filtros críticos deben persistir en sesión si es posible.
