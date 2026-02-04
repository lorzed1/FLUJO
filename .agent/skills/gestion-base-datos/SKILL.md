---
name: database-management
description: Estándares unificados para interacciones seguras, eficientes y escalables con la base de datos (Supabase/Firestore).
version: 2.0.0
---

# 🗄️ Database Management Standards

Este skill define las reglas obligatorias para cualquier operación de base de datos, garantizando integridad, rendimiento y seguridad.

## 1. Principios Generales (Integridad & Seguridad)
*   **No Interpolación:** NUNCA interpoles variables en queries SQL. Usa consultas parametrizadas o el SDK.
*   **Tipado Estricto:** Prohibido usar `any`. Define Interfaces para cada modelo de datos.
*   **Manejo de Errores:** Siempre envuelve operaciones DB en `try/catch` con logging estructurado.
*   **Atomicidad:** Si una operación afecta múltiples tablas/documentos, USA TRANSACCIONES (`runTransaction`, `WriteBatch` o transacciones SQL).

## 2. Optimización de Rendimiento
*   **Zero Waste Writes:** NO uses `upsert` o `set` ciego. Verifica si el dato existe y es idéntico antes de escribir.
    *   ❌ Mal: Sobreescribir el mismo valor (costo $$ y latencia).
    *   ✅ Bien: `if (JSON.stringify(current) !== JSON.stringify(new)) save()`.
*   **Batching:** Para >1 escritura, usa `Promise.all` o operaciones bulk/batch.
*   **No Loops:** NUNCA hagas queries dentro de un ciclo `for`.
*   **Lectura Eficiente:**
    *   Usa `select()` para traer solo los campos necesarios.
    *   Usa paginación para listas largas.
    *   Nunca descargues colecciones completas en cliente.

## 3. Estándares Firestore (NoSQL Specific)
*   **Estructura:** NO anides arrays infinitos en un documento. Usa sub-colecciones (ej. `users/{uid}/transactions`).
*   **Document Size:** Mantén los documentos ligeros (<1MB es el límite, pero ideal <10KB).

## 4. Estándares Supabase (SQL Specific)
*   **RLS (Row Level Security):** Todas las tablas deben tener políticas RLS activas.
*   **Migraciones:** Los cambios de esquema se hacen via migraciones, no manualmente en producción.
