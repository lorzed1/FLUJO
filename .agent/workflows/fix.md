---
description: Protocolo para diagnosticar y resolver errores de compilación o renderizado
---

# Workflow: /fix — Diagnóstico y Corrección de Errores

Protocolo para cuando la app no compila, no renderiza, o muestra un error.

## 1. Diagnóstico
// turbo
1. **Leer la terminal** de `npm run dev` para capturar el error exacto.

2. **Clasificar el error:**
   - 🔴 **Compilación** (TypeScript/Vite): Error de tipos, imports rotos, sintaxis.
   - 🟡 **Runtime** (Consola del navegador): Error en ejecución (null reference, etc.)
   - 🟠 **Renderizado** (Pantalla en blanco/rota): Error en componente React.

3. **Verificar Estándares (Solo si es fix visual):**
   - Si el "bug" es visual (colores, alineación), consultar `.agent/skills/Data_BI/design-system/SKILL.md` antes de aplicar parches CSS.

## 2. Resolución por Tipo

### Error de Compilación
1. Leer el mensaje de error completo.
2. Ir al archivo y línea indicados.
3. Corregir el error específico (import, tipo, sintaxis).
4. NO hacer cambios adicionales — solo corregir el error.
// turbo
5. Verificar compilación.

### Error de Runtime
1. Identificar el componente que falla.
2. Revisar datos/props que recibe (¿null? ¿undefined? ¿tipo incorrecto?)
3. Agregar null checks o valores por defecto.
4. Verificar.

### Error de Renderizado
1. Si hay pantalla en blanco, verificar `ErrorBoundary`.
2. Revisar la consola de desarrollo.
3. Verificar que los imports del componente son correctos.
4. Verificar que el componente exporta default o named correctamente.

## 3. Post-Corrección
- Confirmar que la app carga correctamente.
- Si el error era repetitivo, considerar crear un test o validación preventiva.
- Si el error revela un patrón, documentar en `MEMORIA_TECNICA.md` como lección aprendida.

## ⚠️ Reglas
- **Un error a la vez:** No intentar corregir múltiples errores simultáneamente.
- **Mínimo cambio:** Corregir SOLO lo necesario para resolver el error.
- **No refactorizar:** Un fix no es momento de mejorar código — solo arreglar.
