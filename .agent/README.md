# 🤖 Sistema de Agentes - Proyecto FlowTrack

Bienvenido al sistema de configuración y memoria de agentes del proyecto.

---

## 📚 PUNTO DE ENTRADA

### Para Agentes AI
**INICIO OBLIGATORIO:** Lee primero `.agent/rules/SISTEMA_AGENTES.md`

Este archivo contiene:
- ⚡ Protocolo de inicialización automática
- 🎯 Lógica de selección de roles
- 📉 Reglas de eficiencia y ahorro de tokens
- 🛠️ Uso de Skills y creación de nuevos patrones

---

## 🗂️ ESTRUCTURA DEL DIRECTORIO

### 📁 `/knowledge` - Cerebro del Proyecto
Documentación centralizada y contexto global. ALMACENA LA VERDAD.
- `BLUEPRINT.md`: Visión, objetivos y arquitectura.
- `MEMORIA_TECNICA.md`: Estado actual y deuda técnica.

### 📁 `/profiles` - Roles Especializados
Define los diferentes "sombreros" que puede asumir un agente.
- `manager.md`: Protocolo de orquestación (Manager Agent).
- `arquitecto.md`: Arquitectura y refactorización.
- `guardian-datos.md`: Datos y seguridad.
- `especialista-ui.md`: UI/UX y estilos.
- `qa-debugger.md`: Calidad y debugging.

### 📁 `/skills` - Habilidades Técnicas
Manuales de "experto" para tareas específicas (ej: `estandares-firestore/`, `sistema-diseño-ui/`).

### 📁 `/rules` - Reglas Inquebrantables
Estándares que **NO** se pueden romper.
- `SISTEMA_AGENTES.md` (**⭐ PUNTO DE ENTRADA**)
- `BUSINESS_RULES.md`
- `DESIGN_SYSTEM_RULES.md`
- `coding-style.md`

### 📁 `/workflows` - Procedimientos Paso a Paso
Flujos de trabajo documentados (ej: `new-feature.md`).

### 📁 `/docs` - Documentación Técnica Detallada
Guías específicas (Firebase, Auth, etc).

### 📁 `/plans` - Planes de Implementación
Planes de trabajo activos y archivados.

---

## 🔄 FLUJO DE TRABAJO RECOMENDADO

### Para un Nuevo Agente
1. ✅ **Lee** `rules/SISTEMA_AGENTES.md` (obligatorio)
2. ✅ **Revisa** `knowledge/MEMORIA_TECNICA.md` para contexto
3. ✅ **Identifica** el perfil en `/profiles` (o `profiles/manager.md` si orquestas)
4. ✅ **Consulta** skills en `/skills`
5. ✅ **Ejecuta** la tarea

---

## 📝 CONVENCIONES

### Nombres de Archivos
- **Perfiles**: `kebab-case` (`arquitecto.md`)
- **Skills**: Carpetas en `kebab-case` con `SKILL.md`
- **Reglas**: `SCREAMING_SNAKE_CASE` o `kebab-case`

### Idioma
- **Español** para documentación y contexto.
- **Inglés** para términos técnicos estándar.

---

**Última actualización:** Febrero 2026
**Configurado por:** Antigravity Multi-Agent System
