# 💾 Data Engineering & Formatting Standards (DATA_ENGINEERING)

## 1. Stack de Datos
*   **Base de Datos:** Supabase (PostgreSQL).
    *   **IDs:** UUID (`gen_random_uuid()`).
    *   **Timezone:** `America/Bogota` (UTC-5).
*   **Legacy:** Firebase Firestore (⚠️ No agregar nuevas colecciones).

## 2. Formato de Datos (Display & Logic)
**Regla de Oro:** NUNCA formatear datos manualmente en componentes. Usa `@/utils/formatters`.

### Moneda (COP)
*   **Visualización:** `$ 1.234.567` (Sin decimales).
*   **Función:** `formatMoney(valor)`.
*   **Compacto:** `formatMoneyCompact(valor)` -> `$1.5M`.
*   **Parsing:** `parseCurrency(string)` -> `number`.

### Números
*   **Decimales:** `formatNumber(valor, 2)` -> `1.234,56` (Coma decimal).
*   **Porcentajes:** `formatPercent(valor)` -> `25,5%`.
*   **Cálculos Seguros:** Usar `safeRound`, `safeSum` de `@/utils/numbers` para evitar errores de punto flotante.

### Fechas
*   **Storage (BD):** ISO 8601 Strings (`YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss...`).
*   **Display:** `DD/MM/YYYY`. Función: `formatDate`.
*   **Actual:** `getLocalDateISO()` (Retorna fecha local en ISO, NO UTC).
*   **PROHIBIDO:** `new Date().toISOString()` (Es UTC, causa desfase de día).

## 3. Database Interactions (Supabase)
### Seguridad
*   **No SQL Injection:** Usar SDK parametrizado (`.eq('id', id)`), nunca interpolación de strings en RPCs.
*   **RLS:** Row Level Security obligatorio en todas las tablas.

### Performance
*   **Select:** `select('id, name')` (Traer solo lo necesario).
*   **Pagination:** Usar `.range(from, to)` para listas > 50 items.
*   **Server-Side Filtering:** Filtrar en la query, no en el cliente.

### Escritura
*   **Manejo de Errores:** `try/catch` con feedback visual (`showAlert`).
*   **Batching:** `Promise.all` para múltiples escrituras independientes.

## 4. Estándares PostgreSQL
*   **Nombres:** `snake_case` para tablas y columnas.
*   **Borrado:** Todo borrado es físico (Hard Delete). No usar columnas `deleted_at`.
*   **Migraciones:** Usar `apply_migration` tool. NUNCA modificar esquema manualmente en producción.
