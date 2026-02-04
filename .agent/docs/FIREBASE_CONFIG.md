# Configuración de Firebase para App de Flujo de Caja

## ✅ Firebase ya está configurado

Tu aplicación ahora está configurada para usar **Firebase Firestore** como base de datos en la nube.

## 🚀 Características

- **Sincronización automática**: Todos los cambios se guardan automáticamente en Firebase
- **Cache local**: Los datos se guardan también en LocalStorage como respaldo
- **Modo offline**: Si Firebase no está disponible, la app usa el cache local
- **Migración automática**: Puedes migrar tus datos de LocalStorage a Firebase

## 📁 Archivos Creados

1. **`src/services/firebase.ts`**: Configuración de Firebase
2. **`src/services/firestore.ts`**: Servicio completo para operaciones CRUD
3. **`src/services/storage.ts`**: Servicio híbrido (Firebase + LocalStorage)

## 🔧 Reglas de Firestore

Para que tu aplicación funcione correctamente, necesitas configurar las reglas de seguridad en Firebase Console:

### Opción 1: Modo de Prueba (Solo para desarrollo)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **Advertencia**: Estas reglas permiten acceso completo a todos. Solo úsalas durante desarrollo.

### Opción 2: Modo Seguro (Recomendado para producción)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acceso solo a usuarios autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Opción 3: Reglas Personalizadas por Usuario

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cada usuario solo puede acceder a sus propios datos
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Datos compartidos en /settings
    match /settings/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📋 Pasos para Configurar Reglas

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **flujo-caja-d0fcf**
3. En el menú lateral, haz clic en **Firestore Database**
4. Ve a la pestaña **Reglas**
5. Copia y pega una de las opciones de reglas de arriba
6. Haz clic en **Publicar**

## 🔐 Autenticación (Opcional)

Si quieres agregar autenticación de usuarios, necesitas:

1. En Firebase Console, ve a **Authentication**
2. Haz clic en **Comenzar**
3. Habilita el método de autenticación que prefieras:
   - Correo/Contraseña
   - Google
   - Facebook
   - etc.

## 💾 Estructura de Datos en Firestore

Tu aplicación guarda los datos en la siguiente estructura:

```
firestore/
└── settings/
    ├── transactions
    │   └── data: Transaction[]
    ├── categories
    │   └── data: Category[]
    ├── recurringExpenses
    │   └── data: RecurringExpense[]
    ├── recurringOverrides
    │   └── data: RecurringExpenseOverrides
    └── recordedDays
        └── data: string[]
```

## 🛠️ Funciones Útiles

### Migrar datos de LocalStorage a Firebase

Si tenías datos guardados anteriormente en LocalStorage, puedes migrarlos a Firebase:

```typescript
// Ejecuta esto desde la consola del navegador
await DataService.migrateToFirebase();
```

### Exportar todos los datos

```typescript
DataService.exportData();
```

### Importar datos desde un archivo

```typescript
const file = // tu archivo JSON
await DataService.importData(file);
```

### Cambiar entre Firebase y LocalStorage

```typescript
// Usar Firebase (por defecto)
DataService.setStorageMode(true);

// Usar LocalStorage
DataService.setStorageMode(false);
```

## 🔍 Verificar que Firebase está funcionando

1. Abre la consola del navegador (F12)
2. Busca el mensaje: `✅ Datos cargados desde Firebase`
3. También verás mensajes de confirmación cuando se guarden datos

## ⚡ Rendimiento

- Los datos se cargan de forma asíncrona al iniciar la app
- Mientras se cargan, se muestra una pantalla de carga
- Los cambios se guardan automáticamente en segundo plano
- LocalStorage actúa como cache para acceso rápido

## 🐛 Solución de Problemas

### "Error cargando datos iniciales"

- Verifica tu conexión a Internet
- Asegúrate de que las reglas de Firestore estén configuradas
- Revisa la consola del navegador para más detalles

### Los datos no se sincronizan

- Verifica que `useFirebase` esté en `true`
- Revisa las reglas de seguridad de Firestore
- Comprueba la consola del navegador para errores

### Migración fallida

- Asegúrate de tener datos en LocalStorage antes de migrar
- Verifica la conexión a Internet
- Revisa las reglas de Firestore

## 📞 Soporte

Si encuentras problemas, revisa:
- Consola del navegador (F12)
- Firebase Console > Firestore Database
- Firebase Console > Autenticación (si la habilitaste)
