# Verificación de Migración Firestore

## Objetivo
Verificar que las transacciones ahora se guardan como documentos individuales en la colección `transactions` y no como un array gigante en `settings/transactions`.

## Pasos de Verificación

1.  **Abrir la Consola del Navegador (F12)**
2.  **Realizar una Acción de Guardado**:
    *   Ve a la aplicación.
    *   Edita una transacción existente o crea una nueva.
    *   Esto disparará el auto-guardado (`saveTransactions`).

3.  **Observar Logs**:
    *   Deberías ver un mensaje similar a:
        ```
        💾 Sync Transactions: X upserts, Y deletes.
        ```
    *   Si ves este mensaje, significa que el nuevo servicio está activo.

4.  **Verificación de "Primer Arrancada" (Migración)**:
    *   Si es la primera vez que cargas la app con este cambio, verás:
        ```
        ⚠️ Migrando datos legacy de documento único a colección...
        ```
    *   Esto confirma que tus datos antiguos se han movido a la nueva estructura automáticamente.

## Verificación Técnica (Código)
El archivo `src/services/firestore.ts` ha sido modificado para:
*   Usar `collection(db, 'transactions')`.
*   Usar `writeBatch` para guardar cambios de forma atómica.
*   Mantener compatibilidad con la estructura `Transaction[]` que usa la App.

## Estado
✅ Implementado y Listo.
