---
description: Protocolo de auditoría de consistencia para detectar duplicación de funcionalidades, patrones copy-paste y violaciones al design system
---

# Workflow: /audit — Auditoría de Consistencia y Estandarización

Ejecutar periódicamente o cuando se sospeche de inconsistencias visuales o funcionales.

## 1. Auditar Columnas de Acciones Duplicadas
// turbo
1. **Buscar doble columna `actions`:**
```
grep_search: key: 'actions' en src/features/ (solo .tsx)
```
2. **Para cada resultado encontrado:**
   - Verificar si esa página usa `SmartDataPage` (buscar el import).
   - Si usa `SmartDataPage` Y tiene `key: 'actions'` → **VIOLACIÓN**: hay doble columna de acciones.
   - Solución: Cambiar el `key` a un nombre descriptivo (ej: `'duplicate'`, `'quickPay'`) y eliminar botones de Editar/Eliminar manuales.

## 2. Auditar Patrones Copy-Paste Visuales
// turbo
1. **Buscar badges de categoría inline:**
```
grep_search: "inline-flex items-center px-2 py-0.5 rounded-md border" en src/features/
```
2. **Buscar badges de estado inline:**
```
grep_search: "rounded-full border shadow-sm" en src/features/
```
3. **Si aparecen en 3+ archivos**, reportar como candidato a componente reutilizable (`<StatusBadge>`, `<CategoryBadge>`).

## 3. Auditar Páginas sin SmartDataPage
// turbo
1. **Listar páginas que usan SmartDataTable directo vs SmartDataPage:**
```
grep_search: SmartDataTable en src/features/ (sin SmartDataPage)
grep_search: SmartDataPage en src/features/
```
2. **Para cada página con SmartDataTable directo:**
   - ¿Tiene PageHeader propio? ¿Tiene lógica CRUD (insert/delete)? ¿Tiene importar/exportar?
   - Si sí → Candidata a migrar a `SmartDataPage` para reducir código duplicado.

## 4. Auditar Imports No Usados
// turbo
1. Ejecutar:
```
npx tsc --noEmit 2>&1 | grep "is declared but"
```
2. Listar archivos con imports sin usar y proponer limpieza.

## 5. Reportar al Usuario
Presentar un resumen con:
- ✅ Áreas que cumplen el estándar
- ⚠️ Áreas con oportunidades de mejora (no urgentes)
- ❌ Violaciones que requieren corrección inmediata
- 📋 Lista de acciones sugeridas, priorizadas por impacto

## ⚠️ Reglas
- Este workflow es **solo diagnóstico**, no hace cambios automáticos.
- Siempre presentar hallazgos al usuario antes de actuar.
- Si hay muchos hallazgos, priorizarlos por severidad.
