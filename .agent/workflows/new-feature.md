---
description: Protocolo estricto para implementar nuevas funcionalidades o features
---

# Workflow: /new-feature — Implementar Nueva Funcionalidad

Sigue estos pasos rigurosamente cada vez que el usuario solicite una nueva funcionalidad.

## 1. Fase de Contexto (OBLIGATORIA)
// turbo
1. Leer `.agent/docs/PRD.md` para entender el estado actual del proyecto.

2. **Verificar ubicación:**
   - Revisar `.agent/docs/TECH_SPEC.md` para entender la arquitectura técnica.
   - Ejecutar `list_dir` en las carpetas relevantes para ver qué ya existe.

3. **Verificar Estándares de Diseño (OBLIGATORIO para UI):**
   - Si la funcionalidad implica cambios en la interfaz o nuevos componentes, DEBES leer `.agent/skills/Data_BI/design-system-core/SKILL.md` antes de proponer nada.
   - Asegurar que la propuesta cumpla con los lineamientos de colores, espaciado y tipografía.

4. **Verificar tipos existentes:**
   - Revisar `src/types/` para no duplicar interfaces.
   - Revisar `src/utils/` para no duplicar utilidades.
   - Revisar `src/components/ui/` para no duplicar componentes genéricos.

5. **Verificar Anti-Duplicación (OBLIGATORIO):**
   - Si la página usa `SmartDataPage`, **NO** crear columnas `key: 'actions'` ni botones de Editar/Eliminar manuales (ya los provee el componente).
   - Verificar qué funcionalidad provee automáticamente el componente padre antes de implementar manualmente (PageHeader, CRUD, Import/Export).
   - Consultar las Reglas Anti-Duplicación en `design-system-core/SKILL.md` § 3.

## 2. Fase de Propuesta
1. **Plan de Implementación:**
   - Listar qué archivos se crearán o modificarán.
   - Listar dependencias nuevas si las hay (verificar que están permitidas).
   - Estimar impacto en otros módulos.

2. **Presentar al usuario:**
   - Explicar el enfoque técnico brevemente.
   - Esperar confirmación antes de escribir código.

## 3. Fase de Implementación
1. **Código:**
   - TypeScript estricto (sin `any`).
   - Usar alias `@/` para imports.
   - Usar utilidades de `@/utils/` para formateo y operaciones numéricas.
   - Usar constantes de `@/constants/` (no hardcodear valores).
   - Respetar límites: componentes ≤250 líneas, servicios ≤400 líneas.

2. **Responsive:**
   - Todo cambio visual debe funcionar en mobile (≥320px).
   - Mobile-first: clases base para mobile, luego `md:`, `lg:`.

3. **Consistencia Visual:**
   - Usar tokens del design system (variables CSS, no hex codes).
   - Verificar que el estilo encaja con el resto de la app.

## 4. Fase de Verificación
// turbo
1. **Compilación:** Verificar que el servidor dev no reporta errores nuevos.

2. **Imports:** Verificar que no hay imports rotos.

3. **Renderizado:** Si es un cambio visual, verificar que la página carga.

4. **Responsive:** Confirmar que funciona en viewport ≥320px.
