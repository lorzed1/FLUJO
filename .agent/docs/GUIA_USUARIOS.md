# 👤 Guía Rápida: Configuración de Usuarios

## 🎯 Objetivo
Configurar usuarios Administradores y Cajeros para tu aplicación FlowTrack.

---

## 1️⃣ Definir Administradores

### Paso 1: Abre el archivo de configuración
📁 **Archivo**: `src/services/roles.ts`

### Paso 2: Edita la lista de administradores

```typescript
const ADMIN_EMAILS = [
  'admin@flowtrack.com',
  'david@flowtrack.com',
  // ⬇️ AGREGA AQUÍ TUS ADMINISTRADORES ⬇️
  'tu.email@ejemplo.com',
];
```

### Paso 3: Guarda el archivo
✅ Los cambios se aplicarán automáticamente al reiniciar el servidor.

---

## 2️⃣ Crear Usuarios en Firebase

### Opción A: Desde Firebase Console

1. **Ve a Firebase Console**: https://console.firebase.google.com
2. **Selecciona tu proyecto**
3. **Ve a Authentication** → **Users**
4. **Click en "Add User"**
5. **Ingresa**:
   - Email: `cajero@tuempresa.com`
   - Password: (elige una segura)
6. **Click en "Add User"**

### Opción B: Los usuarios se auto-registran

Si habilitaste el registro, los usuarios pueden crear sus propias cuentas.
El sistema asignará el rol automáticamente según su email.

---

## 3️⃣ Compartir Accesos

### Para Administradores:
```
URL: http://192.168.20.63:3000/
Rol: Acceso completo a toda la app
```

**Credenciales de ejemplo:**
- Email: `admin@tuempresa.com`
- Password: `[la que configuraste]`

### Para Cajeros:
```
URL: http://192.168.20.63:3000/arqueo
Rol: Solo Arqueo de Caja
```

**Credenciales de ejemplo:**
- Email: `cajero1@tuempresa.com`
- Password: `[la que configuraste]`

---

## 4️⃣ Verificar Roles

### En la Consola del Navegador:

Al iniciar sesión, verás mensajes como:

```
✅ Usuario autenticado: cajero@tuempresa.com
🔐 Rol del usuario: cajero
✅ Rol asignado: cajero@tuempresa.com -> cajero
```

### En Firestore:

1. Ve a Firestore Database
2. Colección `users`
3. Verifica que cada usuario tenga el campo `role` correcto

---

## 📋 Ejemplo Completo: Restaurante

### Configuración en `roles.ts`:

```typescript
const ADMIN_EMAILS = [
  'gerente@mirestaurante.com',
  'contador@mirestaurante.com',
];
```

### Usuarios creados en Firebase Auth:

| Email | Password | Rol Auto-asignado | URL de Acceso |
|-------|----------|------------------|---------------|
| `gerente@mirestaur ante.com` | `Admin123!` | admin | `http://192.168.20.63:3000/` |
| `contador@mirestaurante.com` | `Conta123!` | admin | `http://192.168.20.63:3000/` |
| `cajero1@mirestaurante.com` | `Cajero1!` | cajero | `http://192.168.20.63:3000/arqueo` |
| `cajero2@mirestaurante.com` | `Cajero2!` | cajero | `http://192.168.20.63:3000/arqueo` |

---

## 🔄 Cambiar un Usuario de Cajero a Admin

### Método 1: Editar roles.ts (Recomendado)

1. Agrega el email a `ADMIN_EMAILS`
2. El usuario debe cerrar sesión y volver a entrar
3. ✅ Ahora es admin

### Método 2: Modificar Firestore

1. Firebase Console → Firestore
2. Colección `users` → selecciona el usuario
3. Edita el campo `role` de `'cajero'` a `'admin'`
4. El usuario debe cerrar sesión y volver a entrar

---

## 🛡️ Mejores Prácticas de Seguridad

### ✅ DO:
- Usa contraseñas fuertes (mínimo 8 caracteres, letras, números, símbolos)
- Mantén la lista de `ADMIN_EMAILS` actualizada
- Revisa periódicamente los usuarios en Firebase Auth

### ❌ DON'T:
- No compartas contraseñas de admin con cajeros
- No uses contraseñas simples como "123456"
- No dejes emails de prueba en producción

---

## 📱 Crear Accesos Directos en Móvil

### Para Cajeros (Android/iOS):

1. **Abre el navegador** en el celular
2. **Ve a**: `http://192.168.20.63:3000/arqueo`
3. **Android (Chrome)**:
   - Menú (⋮) → "Agregar a pantalla de inicio"
4. **iOS (Safari)**:
   - Compartir → "Agregar a pantalla de inicio"

Ahora tendrán un ícono directo al módulo de Arqueo! 📲

---

## 🆘 Solución de Problemas

### Problema: "No puedo iniciar sesión"
**Solución**: Verifica que el email y password sean correctos en Firebase Auth

### Problema: "Soy admin pero no veo el sidebar"
**Solución**: 
1. Verifica que tu email esté en `ADMIN_EMAILS`
2. Cierra sesión y vuelve a iniciar

### Problema: "El cajero puede ver otros módulos"
**Solución**: Asegúrate de que su email NO esté en `ADMIN_EMAILS`

---

## 📞 Soporte

¿Preguntas? Revisa `SISTEMA_ROLES.md` para más detalles técnicos.
