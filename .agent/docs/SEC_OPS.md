# 🔒 REGLAS DE SEGURIDAD DE FIREBASE

## 📋 **Opciones de Seguridad**

Elige la opción que mejor se adapte a tu necesidad:

---

## **OPCIÓN 1: Solo Usuario Único (Recomendado para ti)**

### **Descripción:**
- Solo TÚ puedes acceder a los datos
- Requiere autenticación simple
- Cada usuario tiene sus propios datos privados

### **Reglas de Firestore:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados pueden acceder
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### **¿Qué Necesitas?**
- ✅ Habilitar autenticación en Firebase Console
- ✅ Agregar login a tu app
- ⏳ Tiempo: 10-15 minutos

**Ver instrucciones completas en:** `SETUP_AUTH.md`

---

## **OPCIÓN 2: Datos Separados por Usuario**

### **Descripción:**
- Múltiples usuarios pueden usar la app
- Cada usuario ve solo SUS datos
- Más seguro y escalable

### **Reglas de Firestore:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cada usuario solo puede acceder a su propia carpeta
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### **¿Qué Necesitas?**
- ✅ Habilitar autenticación
- ✅ Modificar estructura de datos
- ✅ Agregar login a la app
- ⏳ Tiempo: 30-45 minutos

**Ver instrucciones completas en:** `SETUP_MULTI_USER.md`

---

## **OPCIÓN 3: Acceso de Solo Lectura Público**

### **Descripción:**
- Todos pueden VER los datos
- Solo usuarios autenticados pueden MODIFICAR

### **Reglas de Firestore:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Cualquiera puede leer
      allow read: if true;
      // Solo usuarios autenticados pueden escribir
      allow write: if request.auth != null;
    }
  }
}
```

### **¿Qué Necesitas?**
- ✅ Habilitar autenticación solo para administradores
- ⏳ Tiempo: 5-10 minutos

---

## **OPCIÓN 4: IP Whitelist (Avanzado)**

### **Descripción:**
- Solo ciertas IPs pueden acceder
- No requiere autenticación de usuario
- Útil para uso interno

### **Reglas de Firestore:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Permitir solo desde ciertas IPs (requiere Cloud Functions)
      allow read, write: if request.auth != null;
      // Nota: IP filtering requiere Firebase Functions
    }
  }
}
```

### **¿Qué Necesitas?**
- ✅ Firebase Functions (plan Blaze - de pago)
- ✅ Configuración avanzada
- ⏳ Tiempo: 1-2 horas

---

## **OPCIÓN 5: Reglas Granulares por Colección**

### **Descripción:**
- Control fino sobre cada tipo de dato
- Diferentes permisos para diferentes colecciones

### **Reglas de Firestore:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Configuración de la app (solo lectura para autenticados)
    match /settings/categories {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.auth.token.admin == true;
    }
    
    match /settings/transactions {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /settings/recurringExpenses {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /settings/recurringOverrides {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /settings/recordedDays {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // Reglas para la colección de Arqueos
    match /arqueos/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### **¿Qué Necesitas?**
- ✅ Habilitar autenticación
- ✅ Sistema de roles (opcional)
- ⏳ Tiempo: 20-30 minutos

---

## 🎯 **RECOMENDACIÓN PARA TI**

### **Para Uso Personal:**
👉 **OPCIÓN 1: Solo Usuario Único**

Es la forma más simple y segura de proteger tus datos:
- Solo tú puedes acceder
- Fácil de implementar
- No requiere cambios en la estructura de datos

### **Para Compartir con Equipo:**
👉 **OPCIÓN 2: Datos Separados por Usuario**

Cada persona tiene sus propios datos privados.

---

## 📝 **CÓMO APLICAR LAS REGLAS**

### **Paso 1: Elegir Reglas**
Copia el código de la opción que elegiste arriba.

### **Paso 2: Ir a Firebase Console**
1. https://console.firebase.google.com/
2. Proyecto: **flujo-caja-d0fcf**
3. **Firestore Database** → Pestaña **"Reglas"**

### **Paso 3: Pegar Reglas**
1. **Borra todo** el contenido actual
2. **Pega** las reglas que elegiste
3. Haz clic en **"Publicar"**

### **Paso 4: Configurar Autenticación** (si elegiste Opción 1 o 2)
Ver archivo: **`SETUP_AUTH.md`** para instrucciones completas

---

## ⚠️ **IMPORTANTE**

### **Antes de Cambiar las Reglas:**

Si cambias a reglas que requieren autenticación **SIN configurar el login primero**:

❌ Tu app **NO podrá** acceder a Firebase  
✅ Seguirá funcionando con **LocalStorage** (respaldo automático)  
⏳ Cuando agregues autenticación, todo funcionará

### **Orden Recomendado:**

1. **Primero:** Configura autenticación en tu app (ver `SETUP_AUTH.md`)
2. **Segundo:** Prueba que el login funciona
3. **Tercero:** Cambia las reglas de Firestore
4. **Cuarto:** Verifica que todo funciona

---

## 🔐 **Comparación de Seguridad**

| Opción | Seguridad | Facilidad | Uso |
|--------|-----------|-----------|-----|
| **Pública** (actual) | ⭐ | ⭐⭐⭐⭐⭐ | Desarrollo |
| **Opción 1** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Personal |
| **Opción 2** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Multiusuario |
| **Opción 3** | ⭐⭐⭐ | ⭐⭐⭐⭐ | Público con admin |
| **Opción 4** | ⭐⭐⭐⭐ | ⭐⭐ | Uso interno |
| **Opción 5** | ⭐⭐⭐⭐⭐ | ⭐⭐ | Empresarial |

---

## 📚 **Próximos Pasos**

### **Si Elegiste Opción 1 o 2:**
1. Lee **`SETUP_AUTH.md`** para configurar autenticación
2. Implementa login en tu app
3. Cambia las reglas de Firestore
4. ¡Listo!

### **Si Elegiste Opción 3:**
1. Configura autenticación solo para ti (admin)
2. Cambia las reglas
3. Los demás pueden ver, solo tú puedes editar

---

## 🆘 **Ayuda**

¿Necesitas ayuda implementando alguna opción?

- **Opción 1:** Ver `SETUP_AUTH.md`
- **Opción 2:** Ver `SETUP_MULTI_USER.md`
- **Otras opciones:** Consulta documentación de Firebase

---

## ✅ **Resumen**

**Para uso personal (recomendado):**
```javascript
allow read, write: if request.auth != null;
```

**Luego configura autenticación siguiendo:** `SETUP_AUTH.md`
