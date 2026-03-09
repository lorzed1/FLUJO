# Auditoría de UX Engineering: Micro-interacciones y UI

**Fecha:** 03 de Marzo de 2026
**Objetivo:** Auditar la consistencia de las micro-interacciones, el sistema de espaciado, la iconografía y el manejo de estados en el proyecto actual.

---

## 1. Escaneo de "Números Mágicos" y Espaciado
**Nivel de Severidad:** 🟡 Medio (Inconsistencia visual y deuda técnica)

Se realizó un escaneo buscando valores de espaciado, márgenes y anchos por fuera del sistema de diseño estándar de Tailwind CSS. 

**Hallazgos:**
1. **Clases Arbitrarias de Tailwind:** Existen más de 50 componentes y vistas utilizando corchetes para inyectar valores fijos (ej. `w-[...]`, `h-[...]`, `p-[...]`, `max-h-[280px]`). Esto rompe totalmente la escala rítmica de Tailwind en favor de ajustes dependientes del contexto.
2. **Estilos en línea (Inline Styles):** Se detectó el uso del atributo `style={{ ... }}` en más de 20 archivos a lo largo de `/src`. Esto suele indicar un parche rápido para layout en contraposición al uso de clases utilitarias estructuradas.
3. **Inconsistencia de Layout:** Al no existir un set estricto de variables de contención en algunas vistas, se nota que los elementos principales varían de comportamiento en distintas resoluciones.

**Recomendación:** Centralizar las medidas no estándar en `tailwind.config.ts` o abstenerse a usar la escala de espaciado predefinida (rem) de la herramienta para mantener el UI cohesivo.

---

## 2. Auditoría de Iconografía y Recursos
**Nivel de Severidad:** 🟢 Bajo (Optimización de dependencias)

Se analizaron las importaciones y la configuración el proyecto para determinar la homogeneidad iconográfica orientada.

**Hallazgos:**
1. **Librerías Múltiples:** 
   * Se encontró `@heroicons/react` en uso predominante a través de múltiples componentes.
   * Se encontró `lucide-react` instalado en `package.json`, mas no se detectaron importaciones activas en los directorios de código fuente principales. Esto genera ruido en las dependencias.
2. **SVGs Hardcodeados:** Al menos 15 archivos en `/src` tienen etiquetas `<svg>` escritas directamente en la estructura, conteniendo código vector extenso.

**Recomendación:**  
* **Decisión de Librería:** Quedarnos exclusivamente con `@heroicons/react` (versión instalada 2.2.0) dado que ya es la librería principal en el código. Eliminar `lucide-react` del package para reducir tamaño y confusión.
* **Refactorización:** Migrar todos los SVGs crudos y agruparlos dentro de un componente `<Icon />` reutilizable.

---

## 3. Auditoría de Estados de UI (UI States)
**Nivel de Severidad:** 🔴 Alto (Rompe la estandarización y la escalabilidad del UX)

Se buscaron patrones globales del manejo de retroalimentación asíncrona (Loading/Error/Empty) en las tablas y componentes base.

**Hallazgos:**
1. **Estados de Carga (Loading):** 
   * Existen variables regulares de estado como `isLoading` o `isFetching` en unas 35 vistas.
   * **Ausencia de Componentes Universales:** No se detectó un `<Spinner />` ni `<Skeleton />` estandarizado como componente independiente. En lugar de eso, la carga visual suele resolverse reescribiendo y quemando el código del spinner en cada componente (ej. en `SmartDataTable.tsx` hay un `<div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>` hardcodeado).
2. **Estados Vacíos (Empty States):**
   * Se hallaron unas 20 comprobaciones manuales de `.length === 0`.
   * **Resolución Localizada:** Cada tabla o grilla (ej. `SmartDataTable`) diseña su propio UI cuando no hay datos (dibujando localmente un icono de lupa con textos). No hay un componente `<EmptyState />` estandarizado para homologar imágenes o mensajes en arreglos vacíos.
3. **Estados Interactivos (Hover, Focus, Disabled):**
   * Se emplean adecuadamente a través de pseudoclases en Tailwind (ej. `hover:bg-purple-50`, `focus:ring-purple-600`, `disabled:opacity-50`). 
   * Al aplicarse en línea en elementos grandes como botones o celdas interactivas, resulta verboso y propenso a errores al repetir el grupo de clases. Al estar `class-variance-authority` (cva) previamente instalado como dependencia, esto debería idealmente construirse detrás de variantes reutilizables.

**Recomendación:**  
Construir y estandarizar componentes UX de estado global (`<LoadingSpinner />`, `<SkeletonLoader />`, `<EmptyState graphic="..." />`) para sustituir más de decenas de implementaciones ad-hoc esparcidas y homogeneizar visualmente el producto Aliaddo.
