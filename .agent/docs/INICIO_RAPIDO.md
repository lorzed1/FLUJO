# 🚀 Guía Rápida de Inicio - Firebase

## ⏱️ Configuración en 5 Minutos

### Paso 1: Configurar Reglas de Firestore (CRÍTICO)

**Sin este paso, la app no funcionará**

1. Abre [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `flujo-caja-d0fcf`
3. Haz clic en **Firestore Database** en el menú lateral
4. Ve a la pestaña **Reglas**
5. Reemplaza el contenido con esto:

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

6. Haz clic en **Publicar**

✅ **¡Listo!** Ahora tu app puede conectarse a Firebase.

---

### Paso 2: Probar la Aplicación

1. **Abre la app**: http://localhost:3001/
2. **Abre la consola del navegador**: Presiona `F12`
3. **Busca estos mensajes**:
   - ✅ `Datos cargados desde Firebase`
   - ✅ `Transacciones guardadas en Firestore`

Si ves estos mensajes, ¡todo está funcionando! 🎉

---

### Paso 3: Verificar Datos en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en **Firestore Database**
3. Deberías ver una colección llamada `settings` con documentos:
   - `transactions`
   - `categories`
   - `recurringExpenses`
   - `recurringOverrides`
   - `recordedDays`

---

## 💡 Funciones Útiles (Consola del Navegador)

Abre la consola del navegador `F12` y prueba estas funciones:

```javascript
// Ver resumen de datos
await verResumenDatos()

// Ver todas las transacciones
await verTransacciones()

// Ver categorías
await verCategorias()

// Migrar datos de LocalStorage a Firebase
await migrarAFirebase()

// Exportar datos a archivo
await exportarDatos()

// Ver ayuda completa
ayuda()
```

---

## ✅ Checklist

- [ ] Configurar reglas de Firestore
- [ ] Abrir la app en el navegador
- [ ] Verificar mensajes en la consola
- [ ] Verificar datos en Firebase Console
- [ ] (Opcional) Migrar datos existentes
- [ ] (Opcional) Probar agregar una transacción

---

## 🆘 Problemas Comunes

### Error: "Error cargando datos iniciales"

**Solución**: Configura las reglas de Firestore (Paso 1)

### La pantalla de carga no desaparece

**Solución**: 
1. Abre F12 para ver el error
2. Verifica tu conexión a Internet
3. Verifica las reglas de Firestore

### Los datos no se guardan

**Solución**:
1. Revisa las reglas de Firestore
2. Verifica errores en la consola (F12)

---

## 📚 Más Información

- **Documentación completa**: Ver archivo `FIREBASE_CONFIG.md`
- **Resumen de cambios**: Ver archivo `CONFIGURACION_COMPLETADA.md`
- **Utilidades**: Ver archivo `firebase-utils.js`

---

## 🎯 Próximos Pasos (Opcional)

1. **Agregar Autenticación**: Para que cada usuario tenga sus propios datos
2. **Mejorar Reglas**: Hacer las reglas de Firestore más seguras
3. **Multi-dispositivo**: Sincronizar entre múltiples dispositivos

---

## 🔗 Enlaces Útiles

- [Firebase Console](https://console.firebase.google.com/)
- [Documentación Firebase](https://firebase.google.com/docs)
- [Tu App Local](http://localhost:3001/)

---

**¿Todo listo?** ¡Empieza a usar tu app con Firebase! 🚀
