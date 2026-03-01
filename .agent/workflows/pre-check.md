---
description: Protocolo de verificación rápida antes de iniciar cualquier cambio
---

# Workflow: /pre-check — Verificación Contextual Rápida

Ejecutar al inicio de cada sesión o antes de un cambio importante.

## Pasos
// turbo-all

1. **Leer BLUEPRINT:**
```
Leer `.agent/docs/PRD.md` (si no se ha leído en esta sesión).
```

2. **Verificar estado del servidor:**
```
Revisar si `npm run dev` está corriendo y si hay errores visibles.
```

3. **Verificar estructura actual:**
```
Ejecutar `list_dir` en `src/features/` para confirmar los módulos existentes.
```

4. **Reportar al usuario:**
   - Estado del servidor (corriendo/detenido/con errores)
   - Módulos activos detectados
   - Cualquier advertencia relevante
