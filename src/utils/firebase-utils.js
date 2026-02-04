/**
 * UTILIDADES DE FIREBASE
 * 
 * Copia y pega estas funciones en la consola del navegador (F12)
 * para realizar tareas administrativas relacionadas con Firebase.
 */

// ============================================
// MIGRACIÓN DE DATOS
// ============================================

/**
 * Migrar todos los datos de LocalStorage a Firebase
 */
async function migrarAFirebase() {
    console.log('🚀 Iniciando migración a Firebase...');
    try {
        const success = await DataService.migrateToFirebase();
        if (success) {
            console.log('✅ Migración completada exitosamente');
            console.log('🔄 Recarga la página para ver los cambios');
        } else {
            console.error('❌ Error durante la migración');
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// ============================================
// VERIFICACIÓN DE DATOS
// ============================================

/**
 * Mostrar resumen de datos actuales
 */
async function verResumenDatos() {
    console.log('📊 Obteniendo resumen de datos...\n');

    try {
        const data = await DataService.loadInitialData();

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📈 RESUMEN DE DATOS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📝 Transacciones: ${data.transactions.length}`);
        console.log(`🏷️  Categorías: ${data.categories.length}`);
        console.log(`🔄 Gastos Recurrentes: ${data.recurringExpenses.length}`);
        console.log(`📅 Días Registrados: ${data.recordedDays.length}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return data;
    } catch (error) {
        console.error('❌ Error obteniendo datos:', error);
    }
}

/**
 * Ver todas las transacciones
 */
async function verTransacciones() {
    try {
        const transactions = await DataService.getTransactions();
        console.table(transactions);
        return transactions;
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

/**
 * Ver todas las categorías
 */
async function verCategorias() {
    try {
        const categories = await DataService.getCategories();
        console.table(categories);
        return categories;
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

/**
 * Ver gastos recurrentes
 */
async function verGastosRecurrentes() {
    try {
        const expenses = await DataService.getRecurringExpenses();
        console.table(expenses);
        return expenses;
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// ============================================
// CONFIGURACIÓN
// ============================================

/**
 * Cambiar a modo Firebase
 */
function usarFirebase() {
    DataService.setStorageMode(true);
    console.log('✅ Modo Firebase activado');
    console.log('🔄 Recarga la página para aplicar cambios');
}

/**
 * Cambiar a modo LocalStorage
 */
function usarLocalStorage() {
    DataService.setStorageMode(false);
    console.log('✅ Modo LocalStorage activado');
    console.log('🔄 Recarga la página para aplicar cambios');
}

/**
 * Ver modo actual de almacenamiento
 */
function verModoAlmacenamiento() {
    const mode = DataService.getStorageMode();
    console.log(`📦 Modo actual: ${mode ? 'Firebase 🔥' : 'LocalStorage 💾'}`);
    return mode;
}

// ============================================
// EXPORTAR/IMPORTAR
// ============================================

/**
 * Exportar todos los datos
 */
async function exportarDatos() {
    console.log('📥 Exportando datos...');
    try {
        await DataService.exportData();
        console.log('✅ Archivo descargado');
    } catch (error) {
        console.error('❌ Error exportando:', error);
    }
}

/**
 * Comparar datos entre LocalStorage y Firebase
 */
async function compararDatos() {
    console.log('🔍 Comparando LocalStorage vs Firebase...\n');

    try {
        // Obtener datos de LocalStorage
        const localTransactions = JSON.parse(localStorage.getItem('finance_app_transactions') || '[]');
        const localCategories = JSON.parse(localStorage.getItem('finance_app_categories') || '[]');

        // Obtener datos de Firebase
        const firebaseTransactions = await FirestoreService.getTransactions();
        const firebaseCategories = await FirestoreService.getCategories();

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 COMPARACIÓN DE DATOS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
        console.log('📝 TRANSACCIONES:');
        console.log(`   LocalStorage: ${localTransactions.length}`);
        console.log(`   Firebase: ${firebaseTransactions.length}`);
        console.log('');
        console.log('🏷️  CATEGORÍAS:');
        console.log(`   LocalStorage: ${localCategories.length}`);
        console.log(`   Firebase: ${firebaseCategories.length}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return {
            local: { transactions: localTransactions, categories: localCategories },
            firebase: { transactions: firebaseTransactions, categories: firebaseCategories }
        };
    } catch (error) {
        console.error('❌ Error comparando datos:', error);
    }
}

// ============================================
// LIMPIEZA (¡USAR CON PRECAUCIÓN!)
// ============================================

/**
 * Limpiar TODOS los datos de Firebase
 * ⚠️ PRECAUCIÓN: Esta acción no se puede deshacer
 */
async function limpiarFirebase() {
    const confirmacion = confirm('⚠️ ADVERTENCIA: Esto eliminará TODOS los datos de Firebase.\n\n¿Estás seguro de que quieres continuar?');

    if (!confirmacion) {
        console.log('❌ Operación cancelada');
        return;
    }

    const confirmacion2 = confirm('⚠️ ÚLTIMA ADVERTENCIA: Esta acción NO se puede deshacer.\n\n¿Realmente quieres eliminar todos los datos?');

    if (!confirmacion2) {
        console.log('❌ Operación cancelada');
        return;
    }

    try {
        await FirestoreService.clearAllData();
        console.log('✅ Todos los datos de Firebase han sido eliminados');
        console.log('🔄 Recarga la página');
    } catch (error) {
        console.error('❌ Error limpiando datos:', error);
    }
}

/**
 * Limpiar LocalStorage
 * ⚠️ PRECAUCIÓN: Esta acción no se puede deshacer
 */
function limpiarLocalStorage() {
    const confirmacion = confirm('⚠️ ADVERTENCIA: Esto eliminará TODOS los datos de LocalStorage.\n\n¿Estás seguro?');

    if (!confirmacion) {
        console.log('❌ Operación cancelada');
        return;
    }

    localStorage.removeItem('finance_app_transactions');
    localStorage.removeItem('finance_app_categories');
    localStorage.removeItem('finance_app_recurring');
    localStorage.removeItem('finance_app_recurring_overrides');
    localStorage.removeItem('finance_app_recorded_days');

    console.log('✅ LocalStorage limpiado');
    console.log('🔄 Recarga la página');
}

// ============================================
// AYUDA
// ============================================

/**
 * Mostrar ayuda con todas las funciones disponibles
 */
function ayuda() {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔥 UTILIDADES DE FIREBASE - AYUDA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📊 CONSULTAR DATOS:');
    console.log('  verResumenDatos()        - Ver resumen de todos los datos');
    console.log('  verTransacciones()       - Ver todas las transacciones');
    console.log('  verCategorias()          - Ver todas las categorías');
    console.log('  verGastosRecurrentes()   - Ver gastos recurrentes');
    console.log('  compararDatos()          - Comparar LocalStorage vs Firebase');
    console.log('');
    console.log('🔄 MIGRACIÓN:');
    console.log('  migrarAFirebase()        - Migrar datos de LocalStorage a Firebase');
    console.log('');
    console.log('⚙️  CONFIGURACIÓN:');
    console.log('  usarFirebase()           - Cambiar a modo Firebase');
    console.log('  usarLocalStorage()       - Cambiar a modo LocalStorage');
    console.log('  verModoAlmacenamiento()  - Ver modo actual');
    console.log('');
    console.log('💾 EXPORTAR/IMPORTAR:');
    console.log('  exportarDatos()          - Exportar todos los datos a archivo');
    console.log('');
    console.log('🧹 LIMPIEZA (⚠️ PRECAUCIÓN):');
    console.log('  limpiarFirebase()        - Eliminar todos los datos de Firebase');
    console.log('  limpiarLocalStorage()    - Eliminar todos los datos de LocalStorage');
    console.log('');
    console.log('❓ AYUDA:');
    console.log('  ayuda()                  - Mostrar esta ayuda');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
}

// Mostrar ayuda al cargar
console.log('');
console.log('🔥 Utilidades de Firebase cargadas');
console.log('💡 Escribe ayuda() para ver todas las funciones disponibles');
console.log('');
