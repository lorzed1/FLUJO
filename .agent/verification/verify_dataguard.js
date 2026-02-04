// Script de Verificación de Persistencia (DataGuard)
// Ejecutar en la consola del navegador

async function verifyPersistence() {
    console.log("🕵️ DataGuard: Verificando persistencia...");

    // 1. Crear una transacción de prueba
    const testId = `verify-${Date.now()}`;
    const testTx = {
        id: testId,
        date: new Date().toISOString().split('T')[0],
        amount: 100,
        description: 'Verificación DataGuard',
        type: 'expense',
        categoryId: 'test-cat',
        expenseType: 'variable'
    };

    console.log("1. Insertando transacción de prueba...");
    // Simular guardado (esto normalmente lo hace App.tsx)
    // Para probar directamenet necesitaríamos acceder a FirestoreService, 
    // pero como es un módulo, verificamos observando la red o los logs.

    console.log("⚠️ Por favor, crea una transacción manual en la UI con descripción 'TEST DATAGUARD'");
    console.log("Luego revisa la consola para ver el log '💾 Sync Transactions'.");
    console.log("Si ves 'upserts' y no errores, la colección está funcionando.");
}

verifyPersistence();
