# ⚡ CONFIGURAR FIREBASE EN 3 PASOS

## 🎯 SOLO NECESITAS HACER ESTO:

---

### **PASO 1: Abrir Firebase Console** 

🔗 Ve a: **https://console.firebase.google.com/**

Selecciona proyecto: **flujo-caja-d0fcf**

---

### **PASO 2: Crear/Configurar Firestore**

En el menú lateral → **Firestore Database**

#### **¿Ves un botón "Crear base de datos"?**

##### **SI HAY BOTÓN** → Haz clic:
- Selecciona: **"Iniciar en modo de prueba"**
- Ubicación: **us-central** (o la que prefieras)
- Clic en: **"Habilitar"**
- Espera 1-2 minutos

##### **NO HAY BOTÓN** → La base de datos ya existe, continúa

---

### **PASO 3: Configurar Reglas**

En Firestore Database → Pestaña **"Reglas"**

**Borra todo** y pega esto:

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

Haz clic en: **"Publicar"**

---

## ✅ **VERIFICAR**

1. **Recarga tu app** (F5)
2. **Abre consola** (F12)
3. Verás: `✅ Datos cargados desde Firebase`

---

## 🎉 ¡LISTO!

Tu app ahora está conectada a Firebase y sincroniza en la nube.

---

### **¿Problemas?**

Lee el archivo **ERROR_RESUELTO.md** para más detalles.
