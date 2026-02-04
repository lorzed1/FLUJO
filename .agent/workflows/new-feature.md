---
description: Protocolo estricto para implementar nuevas funcionalidades o features
---

# Workflow: Protocolo de Nueva Característica

Sigue estos pasos rigurosamente cada vez que el usuario solicite una nueva funcionalidad.

## 1. Fase de Análisis
1.  **Revisión de Reglas**:
    - Leer `.agent/rules/tech-stack.md` para asegurar compatibilidad tecnológica.
    - Leer `.agent/rules/directory-structure.md` para determinar la ubicación correcta de los archivos.
    - Leer `.agent/rules/coding-style.md` para refrescar convenciones.
2.  **Identificación de Impacto**:
    - Listar qué archivos existentes (`src/features/...`, `src/services/...`, etc.) se verán afectados.
    - Identificar si se requieren nuevas dependencias (librerías) y verificar si están permitidas.

## 2. Fase de Propuesta (Planificación)
1.  **Diseño de la Solución**:
    - Generar un plan detallado o pseudocódigo de la implementación.
    - NO escribir código final todavía.
2.  **Presentación al Usuario**:
    - Explicar el enfoque técnico.
    - Mencionar explícitamente qué archivos se crearán o modificarán.
3.  **Aprobación**:
    - Esperar la confirmación explícita del usuario antes de proceder a escribir código (Simulado: Asumir aprobación si el plan es sólido, pero presentar el plan primero).

## 3. Fase de Implementación
1.  **Desarrollo**:
    - Escribir el código siguiendo estrictamente `coding-style.md`.
    - Usar tipado fuerte (TypeScript) sin `any`.
    - Mantener la lógica de negocio separada de la UI (en `services/`).
2.  **Documentación In-Code**:
    - Si se modifica lógica compleja existente, añadir comentarios explicativos breves sobre el "por qué" del cambio.

## 4. Fase de Verificación
1.  **Integridad Estructural**:
    - Confirmar que los nuevos archivos están en la carpeta correcta dentro de `src/features/` o `src/components/ui/`.
2.  **Dependencias**:
    - Verificar que los imports sean correctos (rutas relativas tipo `../../types`).
    - Asegurar que no se rompen referencias circulares.
3.  **Compilación**:
    - (Opcional pero recomendado) Verificar que el servidor de desarrollo no reporta errores nuevos.
