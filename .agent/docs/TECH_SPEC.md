# 🧠 Memoria Técnica — Decisiones y Contexto Vivo

> Este documento registra DECISIONES TÉCNICAS, LECCIONES APRENDIDAS y CONTEXTO que no pertenece al BLUEPRINT.
> **No duplicar información del BLUEPRINT.md.**

## 📋 Decisiones Arquitectónicas

### DEC-001: Migración Firebase → Supabase (Febrero 2026)
- **Razón**: Costos, escalabilidad SQL, RLS nativo, mejor developer experience.
- **Estado**: En progreso.
- **Plan**: Migrar tablas una por una. Mantener Firebase funcional hasta completar.
- **Archivos clave**: `supabaseClient.ts` (nuevo), `firestore.ts` (legacy).

### DEC-002: Alias de importación `@/` (Enero 2026)
- Configurado en `tsconfig.json` → `paths: { "@/*": ["./src/*"] }`
- Configurado en `vite.config.ts` → `resolve.alias: { '@': './src' }`
- **Regla**: Preferir `@/utils/formatters` sobre `../../utils/formatters`.

### DEC-003: Sistema de diseño basado en CSS Variables HSL
- Variables CSS definidas en `index.css` bajo `:root` y `.dark`.
- Tailwind las consume via `hsl(var(--primary))`.
- **NO usar colores hex arbitrarios.** Siempre usar tokens semánticos.

### DEC-004: Lucide como sistema de iconos principal
- HeroIcons es legacy y se mantiene por compatibilidad.
- Nuevos componentes deben usar `lucide-react`.
- `src/components/ui/Icons.tsx` encapsula ambos sistemas.

## ⚠️ Lecciones Aprendidas (Anti-Patrones)

### LESSON-001: Mega-Componentes causan inestabilidad
- `ArqueoPreview.tsx` creció a 2000+ líneas y cada cambio rompe algo.
- **Regla**: Máximo 250 líneas por componente. Extraer sub-componentes.

### LESSON-002: Mega-Contexto causa re-renders masivos
- `AppContext.tsx` maneja TODO y re-renderiza la app completa.
- **Plan**: Dividir en contextos por dominio cuando se refactorice.

### LESSON-003: Formato de números inconsistente
- Usábamos `.toLocaleString()` en algunos sitios y `formatMoney()` en otros.
- **Regla**: SIEMPRE usar `@/utils/formatters.ts` para formateo.

### LESSON-004: Fechas UTC vs Local
- `new Date().toISOString()` devuelve UTC, no hora colombiana.
- **Regla**: Usar `getLocalDateISO()` de `@/utils/dateUtils.ts`.

### LESSON-005: Excel parsing destruye números grandes
- Excel interpreta `914.350` como `914.35` (trata punto de miles como decimal).
- **Regla**: Siempre usar `{ raw: false }` al leer con xlsx.

### LESSON-006: Doble scrollbar destruye UX
- Si body Y main hacen scroll, aparecen dos barras.
- **Regla**: `html,body { overflow: hidden; height: 100% }`. Solo `<main>` hace scroll.

## 🔧 Configuración Específica del Entorno
- **Puerto dev**: 3000 (`vite.config.ts`)
- **Host**: `0.0.0.0` (accesible en red local)
- **Zona horaria objetivo**: America/Bogota (UTC-5)
- **Locale de moneda**: es-CO (COP)
- **Locale de fechas**: es-CO (DD/MM/YYYY)
