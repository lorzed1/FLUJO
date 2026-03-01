---
name: advanced-debugging
description: Protocolo paso a paso para diagnosticar y resolver errores complejos de forma segura.
---

# Habilidad: Advanced Debugging Protocol

## Objetivo
Diagnosticar y solucionar errores complejos sin introducir nuevos fallos.

## Protocolo de Depuración
1.  **Analizar:** Lee el error completo (Stack Trace). No asumas nada.
2.  **Aislar:** Identifica exactamente qué línea o función está fallando.
3.  **Reproducir:** Antes de arreglar, explica por qué está fallando (causa raíz).
4.  **Solucionar:** Aplica la corrección mínima necesaria.
5.  **Verificar:** Sugiere cómo probar que el error ha desaparecido (ej. "Ejecuta el test X" o "Navega a la ruta Y").
