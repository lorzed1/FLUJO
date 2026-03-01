---
description: Protocolo seguro para refactorizar código existente sin romper funcionalidad
---

# Workflow: /refactor — Refactoring Seguro

Protocolo paso a paso para refactorizar código de forma segura y controlada.

## 1. Análisis del Objetivo
1. **Identificar qué refactorizar** y por qué (rendimiento, legibilidad, tamaño, etc.)
2. **Medir el estado actual:**
   - Usar `view_file_outline` para entender la estructura del archivo.
   - Contar líneas del archivo (verificar si supera límites: 250 componente, 400 servicio).
   - Identificar dependientes: `grep_search` para ver quién importa el archivo.
3. **Verificar Estándares de Diseño (OBLIGATORIO para UI):**
   - Si se refactoriza un componente visual, consultar `.agent/skills/Data_BI/design-system/SKILL.md`.
   - Verificar si el código actual ya cumple o si la refactorización debe alinearlo con el estándar.

## 2. Plan de Refactoring
1. **Listar cambios propuestos:**
   - Qué se divide (archivos grandes → sub-archivos).
   - Qué se mueve (cambio de ubicación).
   - Qué se renombra.
   - Qué se elimina.
2. **Mapa de impacto:**
   - Listar todos los archivos que importan del archivo a refactorizar.
   - Verificar que los nuevos nombres/rutas no generan conflictos.
3. **Presentar plan al usuario** y esperar aprobación.

## 3. Ejecución (Orden Estricto)
1. **Crear primero** los archivos nuevos (sub-componentes, hooks extraídos, etc.)
2. **Actualizar imports** en el archivo original para usar las nuevas piezas.
3. **Actualizar imports** en archivos dependientes si cambió alguna exportación.
4. **Verificar compilación** después de cada step de edición.

## 4. Verificación
// turbo
1. Verificar que el servidor dev no reporta errores.

2. Hacer `grep_search` del nombre del archivo original para confirmar que no hay imports rotos.
3. Confirmar que la funcionalidad sigue igual (pedir al usuario que pruebe si es visual).

## ⚠️ Reglas de Seguridad
- **NUNCA** borrar el archivo original antes de verificar que los nuevos funcionan.
- **NUNCA** hacer más de 3 archivos en un solo paso — hacer incrementalmente.
- Si algo se rompe, revertir el último cambio inmediatamente.
