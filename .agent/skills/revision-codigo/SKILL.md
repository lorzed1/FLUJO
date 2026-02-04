---
name: code-review
description: Auditar calidad de código, seguridad y estilo.
version: 2.0.0
---

# 🕵️ Code Review & Audit Standards

**Objetivo**: Asegurar la calidad técnica y consistencia antes de cerrar una tarea.

## 1. Criterios de Arquitectura (SoC)
*   **Separación de Responsabilidades**: La UI (Componentes) NO habla directo con DB/API.
    *   ❌ Mal: `db.collection('users').get()` dentro de `Profile.tsx`.
    *   ✅ Bien: `UserService.getProfile()` llamado desde un hook.
*   **Modularidad**:
    *   Componentes > 150 líneas → **Refactorizar**.
    *   Funciones > 30 líneas → **Dividir**.

## 2. Calidad de Código (TypeScript)
*   **Tipado Estricto**:
    *   Prohibido `any`. Usa Interfaces o Generics.
    *   Evita `as unknown as Type` (Casting forzado) a menos que sea estrictamente necesario.
*   **No Null Assertions**: Evita `object!.property`. Usa Optional Chaining `object?.property`.

## 3. Seguridad y Resiliencia
*   **Manejo de Errores**:
    *   Bloques `try/catch` en TODA función async.
    *   Feedback visual al usuario (Toast/Alert), no solo `console.error`.
*   **Limpieza**: No dejar `console.log` de debug en PR final.

## 4. Checklist de Ejecución
1.  **Escaneo Estático**: Revisa imports rotos y variables no usadas.
2.  **Compliance Estilo**: Verifica `pascalCase` en componentes, `camelCase` en funciones.
3.  **Performance**: Busca loops anidados o re-renders obvios.
4.  **Dry Run**: Simula la ejecución mentalmente antes de aprobar.
