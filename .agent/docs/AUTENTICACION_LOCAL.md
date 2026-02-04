# 🔐 Sistema de Autenticación Local - FlowTrack

## ✨ Nuevo Sistema Implementado

Se ha implementado un sistema de autenticación local que **NO requiere crear usuarios en Firebase**. Ahora puedes gestionar usuarios directamente desde el código de la aplicación.

---

## 🎯 Ventajas del Nuevo Sistema

✅ **Sin Firebase Auth**: No necesitas crear cuentas en Firebase para cada usuario  
✅ **Credenciales compartidas**: Los cajeros pueden usar las mismas credenciales  
✅ **Gestión centralizada**: Todos los usuarios se configuran en un solo archivo  
✅ **Simple y rápido**: Agregar o quitar usuarios es inmediato  
✅ **Ideal para negocios pequeños**: Perfecto para restaurantes, tiendas, etc.  

---

## 👥 Usuarios Predefinidos

Por defecto, la aplicación viene con dos usuarios:

| Usuario | Contraseña | Rol | Acceso |
|---------|------------|-----|--------|
| `admin` | `admin123` | Administrador | Completo (Dashboard, reportes, configuración) |
| `cajero` | `cajero123` | Cajero | Solo Arqueo de Caja |

---

## ⚙️ Agregar o Modificar Usuarios

### 📁 Archivo de Configuración

**Ubicación**: `src/services/auth.ts`

### 🔧 Cómo Editar

1. **Abre el archivo** `src/services/auth.ts`

2. **Busca la sección** `LOCAL_USERS`:

```typescript
const LOCAL_USERS: LocalUser[] = [
  // ADMINISTRADORES
  {
    username: 'admin',
    password: 'admin123',  // ⚠️ CAMBIAR EN PRODUCCIÓN
    role: 'admin',
    displayName: 'Administrador'
  },
  
  // CAJEROS
  {
    username: 'cajero',
    password: 'cajero123',  // ⚠️ CAMBIAR EN PRODUCCIÓN
    role: 'cajero',
    displayName: 'Cajero'
  },
];
```

3. **Modifica o agrega usuarios** según necesites

---

## 📝 Ejemplos de Configuración

### Ejemplo 1: Restaurante con 3 cajeros

```typescript
const LOCAL_USERS: LocalUser[] = [
  // Admin
  {
    username: 'gerente',
    password: 'MiPass123!',
    role: 'admin',
    displayName: 'Gerente'
  },
  
  // Cajeros - Turno Mañana
  {
    username: 'cajero',
    password: 'Caja2024',
    role: 'cajero',
    displayName: 'Cajero Turno Mañana'
  },
  
  // Cajeros - Turno Tarde
  {
    username: 'cajero-tarde',
    password: 'Tarde2024',
    role: 'cajero',
    displayName: 'Cajero Turno Tarde'
  },
  
  // Cajeros - Turno Noche
  {
    username: 'cajero-noche',
    password: 'Noche2024',
    role: 'cajero',
    displayName: 'Cajero Turno Noche'
  },
];
```

### Ejemplo 2: Varios administradores

```typescript
const LOCAL_USERS: LocalUser[] = [
  {
    username: 'gerente',
    password: 'Gerente2024!',
    role: 'admin',
    displayName: 'Gerente General'
  },
  {
    username: 'contador',
    password: 'Conta2024!',
    role: 'admin',
    displayName: 'Contador'
  },
  {
    username: 'cajero',
    password: 'Caja2024',
    role: 'cajero',
    displayName: 'Cajero'
  },
];
```

---

## 🌐 URLs de Acceso

### Desde PC/Desktop:

| Rol | URL | Descripción |
|-----|-----|-------------|
| **Admin** | `http://localhost:3000/` | Dashboard completo |
| **Cajero** | `http://localhost:3000/arqueo` | Solo Arqueo de Caja |

### Desde Móvil (mismo WiFi):

| Rol | URL | Descripción |
|-----|-----|-------------|
| **Admin** | `http://192.168.20.63:3000/` | Dashboard completo |
| **Cajero** | `http://192.168.20.63:3000/arqueo` | Solo Arqueo de Caja |

---

## 🔄 Flujo de Uso

1. **Usuario abre la app**
2. **Ingresa credenciales**:
   - Usuario: `cajero`
   - Contraseña: `cajero123`
3. **Sistema valida** contra `LOCAL_USERS`
4. **Crea sesión** y guarda en localStorage
5. **Redirige automáticamente**:
   - Admin → `/dashboard`
   - Cajero → `/arqueo`

---

## 🛡️ Seguridad

### ⚠️ Importante en Producción

**DEBES cambiar las contraseñas por defecto** antes de usar en producción:

```typescript
{
  username: 'admin',
  password: 'admin123',  // ❌ MUY INSEGURO
  role: 'admin',
  displayName: 'Administrador'
}
```

**Cámbiala por algo fuerte**:

```typescript
{
  username: 'admin',
  password: 'M1C0ntr4s3ñ4S3gur4!2024',  // ✅ Mucho mejor
  role: 'admin',
  displayName: 'Administrador'
}
```

### Recomendaciones:

- ✅ Usa contraseñas de al menos 12 caracteres
- ✅ Combina mayúsculas, minúsculas, números y símbolos
- ✅ NO uses contraseñas obvias como "123456"
- ✅ Cambia las contraseñas cada 3-6 meses
- ✅ No compartas la contraseña de admin con cajeros

---

## 📱 Crear Acceso Directo en Móvil

### Para Cajeros:

1. **Abre el navegador** en el celular
2. **Ve a**: `http://192.168.20.63:3000/`
3. **Inicia sesión** con credenciales de cajero
4. **Android (Chrome)**:
   - Menú (⋮) → "Agregar a pantalla de inicio"
5. **iOS (Safari)**:
   - Compartir → "Agregar a pantalla de inicio"

¡Ahora tendrán un ícono directo a la app! 📲

---

## 🔓 Cerrar Sesión

Los usuarios pueden cerrar sesión desde:
- **Admins**: Click en el botón "Cerrar Sesión" en el sidebar
- **Cajeros**: Limpiar localStorage o cerrar el navegador

Para cerrar manualmente:
1. Abre la consola del navegador (F12)
2. Ve a "Application" → "Local Storage"
3. Elimina `flowtrack_session`

---

## 🆘 Solución de Problemas

### "No puedo iniciar sesión"
- ✅ Verifica que el usuario y contraseña sean correctos (case-sensitive)
- ✅ Revisa `src/services/auth.ts` para confirmar las credenciales

### "No me redirige a mi módulo"
- ✅ Cierra sesión y vuelve a entrar
- ✅ Borra el cache del navegador

### "Olvidé la contraseña"
- ✅ Ve a `src/services/auth.ts` y verifica/cambia la contraseña
- ✅ Reinicia el servidor si es necesario

---

## 🔄 Migración desde Firebase Auth

Si tenías usuarios en Firebase Authentication, ya no es necesario mantenerlos. El sistema local es completamente independiente.

**Pasos**:
1. ✅ Identifica qué usuarios necesitas
2. ✅ Agrégalos a `LOCAL_USERS` en `src/services/auth.ts`
3. ✅ Comparte las nuevas credenciales con tus usuarios
4. ✅ Listo! Ya no dependes de Firebase Auth

---

## 📞 Soporte Técnico

### Estructura del Usuario

```typescript
interface LocalUser {
  username: string;      // Nombre de usuario para login
  password: string;      // Contraseña en texto plano (cambiar en producción)
  role: 'admin' | 'cajero';  // Rol del usuario
  displayName: string;   // Nombre para mostrar en la UI
}
```

### Roles Disponibles

- `admin`: Acceso completo a toda la aplicación
- `cajero`: Solo acceso al módulo de Arqueo de Caja

---

## 🚀 Próximos Pasos Recomendados

1. **Cambia las contraseñas** por defecto en `src/services/auth.ts`
2. **Prueba el login** con ambos roles
3. **Comparte credenciales** con tu equipo
4. **Crea accesos directos** en móviles para cajeros
5. **(Opcional)** Implementa encriptación de contraseñas para mayor seguridad

---

¡El sistema está listo para usar! 🎉
