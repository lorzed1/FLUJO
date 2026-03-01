---
name: Performance Optimization
description: Patrones y técnicas para optimizar el rendimiento de aplicaciones React
version: 1.0.0
---

# Skill: Performance Optimization

## Contexto
Esta habilidad define los patrones estándar para optimizar aplicaciones React que experimentan problemas de rendimiento en navegación, renderizado o interactividad.

## Reglas de Oro

### 1. **Debouncing en Operaciones Costosas**
- ✅ USAR `useDebouncedSave` para auto-guardado (2-3 segundos)
- ✅ USAR debounce en inputs de búsqueda (300-500ms)
- ❌ NO ejecutar operaciones I/O en cada cambio de estado

### 2. **Optimización de useMemo**
- ✅ USAR useMemo para cálculos pesados (>100 iteraciones)
- ✅ EXTRAER lógica compleja a hooks personalizados
- ❌ NO usar useMemo para cálculos triviales (<10ms)

### 3. **Búsquedas Eficientes**
- ✅ USAR `Set` o `Map` para búsquedas O(1)
- ❌ NO usar `.find()`, `.some()`, `.filter()` en loops anidados

### 4. **División de Contextos**
- ✅ DIVIDIR contextos grandes por dominio (Auth, Data, UI)
- ✅ USAR selectores específicos para evitar re-renders
- ❌ NO poner todo el estado en un solo contexto

### 5. **Lazy Loading**
- ✅ USAR `React.lazy()` para rutas y componentes grandes
- ✅ USAR `Suspense` con fallbacks apropiados
- ❌ NO cargar componentes pesados sincrónicamente

### 6. **Cálculo Limitado Temporalmente (Time-Boxing)**
- ✅ LIMITAR cálculos recurrentes a una ventana relevante (ej: Hoy - 3 meses hasta Hoy + 6 meses)
- ❌ NO calcular proyecciones desde "el inicio de los tiempos" (2020...) si el usuario solo ve el presente
- ✅ USAR saltos inteligentes en bucles: Si `startDate` es 2022 y hoy es 2025, saltar matemáticamente a 2025, no iterar mes a mes.

## Instrucciones

### Cuando detectes navegación lenta:

1. **Diagnóstico:**
   ```bash
   npm run build
   # Revisar dist/assets/*.js para identificar chunks grandes (>500KB)
   ```

2. **Identificar Auto-Guardado Excesivo:**
   - Buscar múltiples `useEffect` con llamadas a storage/DB
   - Implementar debouncing con el hook `useDebouncedSave`

3. **Optimizar Cálculos Pesados:**
   - Identificar `useMemo` con lógica de >50 líneas
   - Extraer a hooks personalizados
   - Reducir ventanas de tiempo (ej: 6 meses en vez de 18)

4. **Virtualización de Listas:**
   - Para tablas con >100 filas, usar `react-window` o `react-virtual`
   - Implementar paginación o scroll infinito

### Prioridades de Optimización:

1. 🔴 **Alto Impacto:** Auto-guardado, cálculos masivos, contextos globales
2. 🟡 **Medio Impacto:** Componentes grandes sin lazy loading
3. 🟢 **Bajo Impacto:** Re-renders innecesarios, memoization trivial

## Herramientas de Diagnóstico

```bash
# Analizar bundle size
npm run build -- --report

# Profiling en desarrollo
# React DevTools > Profiler > Start Recording
```

## Métricas de Éxito

- ✅ Navegación entre rutas: <200ms
- ✅ Auto-guardado: debounced a 2-3s
- ✅ Chunks principales: <300KB gzipped
- ✅ Time to Interactive (TTI): <3s
