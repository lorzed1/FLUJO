# 🔐 Sistema de Roles - FlowTrack

## Descripción General

La aplicación ahora cuenta con un sistema de roles que diferencia entre **Administradores** y **Cajeros**.

---

## 👥 Tipos de Usuarios

### 1. **Administrador** (Admin)
- **Acceso**: Completo a toda la aplicación
- **Funcionalidades**:
  - Dashboard con gráficos y estadísticas
  - Gestión de transacciones
  - Calendario de pagos
  - Categorías
  - Historial completo
  - Egresos recurrentes  
  - Arqueo de caja (con sidebar)
  - Exportar/Importar datos
  
### 2. **Cajero**
- **Acceso**: Solo módulo de Arqueo de Caja
- **Funcionalidades**:
  - Crear arqueos de caja
  - Sin acceso al resto de módulos
  - Vista standalone (sin menú lateral)

---

## 🔑 Asignación de Roles

Los roles se asignan automáticamente al hacer login basándose en el **email del usuario**.

### Configurar Administradores

Edita el archivo: `src/services/roles.ts`

Busca la constante `ADMIN_EMAILS` y agrega los emails de los administradores:

\`\`\`typescript
const ADMIN_EMAILS = [
  'admin@flowtrack.com',
  'david@flowtrack.com',
  'tuadmin@email.com',  // ⬅️ Agrega aquí tus admins
];
\`\`\`

**Importante**: 
- Cualquier email que NO esté en esta lista será considerado **Cajero** por defecto
- Los emails NO son case-sensitive (se comparan en minúsculas)

---

## 🌐 URLs de Acceso

### Para Administradores:
- **Desktop**: `http://localhost:3000/`
- **Móvil**: `http://192.168.20.63:3000/`
- Tienen acceso a todas las rutas

### Para Cajeros:
- **Desktop**: `http://localhost:3000/arqueo`
- **Móvil**: `http://192.168.20.63:3000/arqueo`
- **Solo** pueden acceder a `/arqueo`
- Si intentan acceder a otras rutas, verán un mensaje de "Acceso Restringido"

---

## 📝 Flujo de Autenticación

1. **Usuario inicia sesión** (email/password o Google)
2. **Sistema verifica el email** contra la lista de `ADMIN_EMAILS`
3. **Asigna rol**:
   - Si está en la lista → `admin`
   - Si NO está en la lista → `cajero`
4. **Guarda el rol en Firestore** (colección `users`)
5. **Redirige automáticamente**:
   - Admin → `/dashboard`
   - Cajero → `/arqueo`

---

## 🗄️ Estructura en Firestore

El sistema crea una colección `users` con la siguiente estructura:

\`\`\`
users/
  └── {userId}/
      ├── email: string
      ├── role: 'admin' | 'cajero'
      ├── createdAt: string
      └── lastLogin: string
\`\`\`

---

## 🛡️ Protección de Rutas

### Rutas Protegidas (Solo Admin):
- `/` - Dashboard
- `/dashboard` - Dashboard
- `/transactions` - Transacciones
- `/calendar` - Calendario
- `/categories` - Categorías
- `/history` - Historial
- `/recurring` - Egresos Recurrentes
- `/arqueos` - Arqueo con sidebar

### Ruta Pública (Cajero y Admin):
- `/arqueo` - Arqueo de Caja standalone

---

## 🔄 Cambio de Roles

Para cambiar el rol de un usuario existente:

1. **Opción 1**: Agregar/quitar su email de `ADMIN_EMAILS` en `src/services/roles.ts`
2. El usuario debe **cerrar sesión y volver a iniciar sesión**
3. Se actualizará su rol automáticamente

**O**

1. **Opción 2**: Modificar manualmente en Firestore:
   - Ir a Firebase Console
   - Firestore Database
   - Colección `users`
   - Seleccionar el usuario
   - Cambiar el campo `role` a `'admin'` o `'cajero'`

---

## 📱 Ejemplo de Uso

### Configuración Típica de un Restaurante:

\`\`\`typescript
const ADMIN_EMAILS = [
  'gerente@restaurante.com',      // Gerente
  'contadora@restaurante.com',    // Contadora
];
\`\`\`

**Todos los demás usuarios serán cajeros automáticamente:**
- `cajero1@restaurante.com` → Cajero
- `cajero2@restaurante.com` → Cajero
- `mesero@restaurante.com` → Cajero

---

## ⚙️ Características Adicionales

### Auto-redirección
- Al iniciar sesión, cada usuario es redirigido automáticamente a su módulo correspondiente
- Admin → Dashboard principal
- Cajero → Formulario de Arqueo

### Mensajes en Consola
El sistema registra información útil en la consola del navegador:
\`\`\`
✅ Usuario autenticado: cajero@email.com
🔐 Rol del usuario: cajero
✅ Rol asignado: cajero@email.com -> cajero
\`\`\`

---

## 🚀 Próximos Pasos

1. **Configura tus admins** en `src/services/roles.ts`
2. **Crea usuarios** en Firebase Authentication
3. **Comparte el link** `/arqueo` con los cajeros
4. **Opcional**: Configura reglas de seguridad en Firestore para reforzar los permisos

---

## 🛠️ Soporte

Si necesitas ayuda para configurar roles o agregar funcionalidades, consulta la documentación de Firebase o contacta al desarrollador.
