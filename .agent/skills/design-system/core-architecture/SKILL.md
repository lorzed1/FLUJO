---
name: core-architecture
description: Reglas para componentes React, hooks, estructura de archivos y calidad de código.
version: 1.1.0
---

# 🧱 Habilidad de Arquitectura Core

Esta habilidad rige la estructura de la base de código y los estándares de calidad técnica.

## 📚 Documentación Obligatoria
**DEBES LEER ESTOS ARCHIVOS ANTES DE CREAR O REFACTORIZAR CÓDIGO:**
1. 📄 **`.antigravity/docs/CODING_STANDARDS.md`** (Estándares de codificación).
2. 📄 **`.antigravity/docs/TECH_SPEC.md`** (Especificaciones técnicas y stack).

## ⚡ Reglas de Oro (Checklist Mental)
1.  **Separación de Responsabilidades:** Los componentes de UI (`.tsx`) **NO** deben contener lógica de negocio compleja ni llamadas directas a APIs. Mueve esa lógica a Hooks personalizados (`useAlgo.ts`).
2.  **Prohibido el `any`:** TypeScript es estricto aquí. Define interfaces en `src/types` o localmente si son privadas.
3.  **Límite de Archivos:** Si un componente supera las 150 líneas, pregúntate: "¿Puedo extraer un sub-componente?".
4.  **Seguridad:** Envuelve siempre las llamadas asíncronas en `try/catch` y proporciona feedback al usuario (loaders, notificaciones).
5.  **Código Limpio:** Elimina los `console.log` antes de terminar. El código debe verse profesional y ordenado.
