---
name: Historial y Solución de Errores
description: Protocolo para documentar, categorizar y consultar problemas resueltos previamente en el proyecto para evitar repetir errores y agilizar diagnósticos.
version: 1.0.0
---

# 📚 Contexto
Esta habilidad existe para crear "memoria a largo plazo" de los problemas persistentes, errores graves de arquitectura o base de datos que ya han sido solucionados en el desarrollo de "Data BI".
El objetivo es que ni el usuario ni el agente pierdan tiempo tropezando con la misma piedra o intentando soluciones que ya probaron ser ineficaces en el pasado.

Cuando el usuario diga explícitamente **"documenta este error"**, **"agrega este error al historial"**, o notas que estás estancado en un error repetitivo, debes activar esta habilidad.

# ⚡ Reglas de Oro
1. **No saturar con ruido:** Documentar únicamente problemas arquitectónicos, configuraciones engañosas (ej. Soft Delete en Supabase RLS) o conflictos difíciles. No documentar typos ni errores de sintaxis básicos.
2. **Fuente Única de Verdad (SSOT):** Todos los errores deben documentarse única y exclusivamente en el archivo `docs/HISTORIAL_ERRORES.md`.
3. **Consulta Proactiva:** Si sientes que el sistema se está comportando de manera anómala o estás tardando en solucionar un error con Supabase, UI, o estados, DEBES consultar el archivo `docs/HISTORIAL_ERRORES.md` usando `view_file` antes de sugerir refactorizaciones grandes.

# 🏗️ Instrucciones de Implementación

## Para documentar un error nuevo:
Agrega siempre el nuevo bloque al inicio o final de `docs/HISTORIAL_ERRORES.md` usando ESTE formato estricto:

```markdown
### [FECHA] - Categoría: [Backend / Frontend / Database / Configuración]
**Problema Inicial:** [¿Qué estaba fallando visiblemente? Ej. Los datos de propinas no cargaban.]
**Causa Raíz Diagnosticada:** [¿Cuál era la explicación técnica real? Ej. Las políticas RLS bloqueaban peticiones anónimas sin arrojar error.]
**Solución Exitosa:** [Los pasos o el código exacto que resolvió el problema.]
**Lección Aprendida:** [Nota mental para el futuro, ej. "Siempre revisar RLS si los datos llegan vacíos sin error 400/500."]
```

## Para leer el historial:
Si el usuario dice "verifica si este error ya nos pasó antes" o "lee el historial de errores", busca el problema en `docs/HISTORIAL_ERRORES.md`.

# 💻 Ejemplos
Si vas a documentar un problema de base de datos donde elementos borrados seguían apareciendo:
1. Lees la conversación más reciente.
2. Usas la herramienta `write_to_file` / `multi_replace_file_content` para inyectar la solución en `docs/HISTORIAL_ERRORES.md`.
