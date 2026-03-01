---
name: SkillForge (El Fabricante de Herramientas)
description: Protocolo especializado para la creación, actualización y mantenimiento de Habilidades (Skills) y Reglas de Espacio de Trabajo en español.
version: 1.1.0
---

# 🛠️ SkillForge: Constructor de Habilidades

Este skill se activa automáticamente cuando el usuario solicita "crear una habilidad", "estandarizar un proceso" o cuando se detecta un patrón técnico recurrente que debe ser preservado.

## 🎯 Misión
Convertir conocimiento abstracto o repetitivo en activos técnicos estructurados en **idioma español** que permitan al agente trabajar con autonomía y precisión quirúrgica.

## 📋 Protocolo de Creación de Skills

Para cada nueva Skill, se debe generar la siguiente estructura:

### 1. Ubicación y Nomenclatura
- **Ruta:** `.agent/skills/[Data_BI|generic]/[kebab-case-nombre-skill]/`
- **Categoría:** 
  - `Data_BI/`: Para lógica de negocio, diseño de Aliaddo o reglas específicas de la app.
  - `generic/`: Para herramientas abstractas (UI, Perf, Debugging, etc.).
- **Idioma:** Todo el contenido (incluyendo descripciones y comentarios) debe ser en **Español**.
- **Nombre:** Debe ser descriptivo y técnico (ej. `supabase-realtime`, `logica-auth`).

### 2. El Manifiesto (`SKILL.md`)
Debe contener obligatoriamente:
- **Frontmatter YAML:**
  ```yaml
  ---
  name: Nombre Legible de la Skill
  description: Breve resumen para que el agente la detecte basándose en la intención.
  version: 1.0.0
  ---
  ```
- **Secciones Recomendadas:**
  - `# 📚 Contexto`: Por qué existe esta skill.
  - `# ⚡ Reglas de Oro`: Instrucciones innegociables (Hard Rules).
  - `# 🏗️ Instrucciones de Implementación`: Pasos técnicos detallados.
  - `# 💻 Ejemplos de Código`: Snippets de código "Best Practice".

### 3. Documentación Complementaria
Si la skill es compleja, debe referenciar archivos en `.antigravity/docs/` para no saturar la memoria del agente con detalles que solo se necesitan en momentos específicos.

## 🛠️ Protocolo de Optimización

Al revisar las skills existentes, SkillForge debe:
1. **Detectar Redundancia:** Fusionar skills que cubran el mismo dominio (ej: `DataGuard` + `ArqueoLogic`).
2. **Traducir y Limpiar:** Traducir al español cualquier skill que esté en inglés y moverla a la ruta correcta dentro de `.agent/skills/`.
3. **Purgar Proyectos:** Eliminar skills que no aplican al stack tecnológico actual o que son confusas.

## ⚡ Activación Automática (Self-Trigger)
Si el usuario corrige el mismo error de lógica o diseño **3 veces**, SkillForge DEBE proponer la creación de una nueva Skill para evitar futuras regresiones.
