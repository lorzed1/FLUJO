# 🚀 Inicio Rápido - FlowTrack

## 📋 Resumen del Nuevo Sistema

✅ **Autenticación local** - Sin necesidad de Firebase Authentication  
✅ **Usuarios predefinidos** - Admin y Cajero listos para usar  
✅ **Acceso según rol** - Auto-redirección a su módulo correspondiente  

---

## 1️⃣ Credenciales por Defecto

### 👨‍💼 Administrador (Acceso Completo)
```
Usuario: admin
Contraseña: admin123
```
**Acceso a**: Dashboard, reportes, configuración, todos los módulos

### 👤 Cajero (Solo Arqueo)
```
Usuario: cajero
Contraseña: cajero123
```
**Acceso a**: Solo módulo de Arqueo de Caja

---

## 2️⃣ Acceder a la Aplicación

### Desde PC:
```
http://localhost:3000/
```

### Desde Celular (mismo WiFi):
```
http://192.168.20.63:3000/
```

---

## 3️⃣ Probar el Sistema

### Prueba como Administrador:
1. Abre `http://localhost:3000/`
2. Ingresa:
   - Usuario: `admin`
   - Contraseña: `admin123`
3. ✅ Serás redirigido al **Dashboard completo**
4. Verás el sidebar con todos los módulos

### Prueba como Cajero:
1. **Cierra sesión** (botón en el sidebar)
2. Vuelve a iniciar sesión con:
   - Usuario: `cajero`
   - Contraseña: `cajero123`
3. ✅ Serás redirigido al **Arqueo de Caja**
4. Solo verás el formulario de arqueo (sin sidebar)

---

## 4️⃣ Personalizar Usuarios

### Cambiar Contraseñas:

1. Abre: `src/services/auth.ts`
2. Busca `LOCAL_USERS`
3. Cambia los campos `password`:

```typescript
const LOCAL_USERS: LocalUser[] = [
  {
    username: 'admin',
    password: 'TU_NUEVA_CONTRASEÑA',  // ⬅️ Cambia aquí
    role: 'admin',
    displayName: 'Administrador'
  },
  {
    username: 'cajero',
    password: 'OTRA_CONTRASEÑA',  // ⬅️ Cambia aquí
    role: 'cajero',
    displayName: 'Cajero'
  },
];
```

4. Guarda el archivo
5. Reinicia el servidor si es necesario

---

## 5️⃣ Agregar Más Usuarios

### Ejemplo: Agregar un segundo cajero

```typescript
const LOCAL_USERS: LocalUser[] = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    displayName: 'Administrador'
  },
  {
    username: 'cajero',
    password: 'cajero123',
    role: 'cajero',
    displayName: 'Cajero Turno Mañana'
  },
  // ⬇️ NUEVO USUARIO ⬇️
  {
    username: 'cajero2',
    password: 'pass456',
    role: 'cajero',
    displayName: 'Cajero Turno Tarde'
  },
];
```

---

## 6️⃣ Acceso Móvil para Cajeros

### Crear Acceso Directo:

1. **Desde el celular**, abre el navegador
2. **Ve a**: `http://192.168.20.63:3000/`
3. **Inicia sesión** con credenciales de cajero
4. **Agrega a pantalla de inicio**:
   - **Android**: Menú → "Agregar a pantalla de inicio"
   - **iOS**: Compartir → "Agregar a pantalla de inicio"

Ahora los cajeros tendrán un ícono directo! 📱

---

## 📊 Comparación de Accesos

| Característica | Admin | Cajero |
|----------------|-------|--------|
| Dashboard | ✅ | ❌ |
| Arqueo de Caja | ✅ | ✅ |
| Transacciones | ✅ | ❌ |
| Calendario | ✅ | ❌ |
| Historial | ✅ | ❌ |
| Categorías | ✅ | ❌ |
| Egresos Recurrentes | ✅ | ❌ |
| Exportar/Importar | ✅ | ❌ |
| Sidebar/Menú | ✅ | ❌ |

---

## ⚙️ Configuración Recomendada

### Para Producción:

1. ✅ **Cambia TODAS las contraseñas** en `src/services/auth.ts`
2. ✅ **Usa contraseñas fuertes** (12+ caracteres, mezcla de todo)
3. ✅ **No compartas** la contraseña de admin con cajeros
4. ✅ **Documenta** quién tiene qué credenciales
5. ✅ **Cambia contraseñas** cada 3-6 meses

### Ejemplo de Contraseña Fuerte:
```
❌ admin123 (muy débil)
✅ M1P4ss$3cur4!2024 (fuerte)
```

---

## 🔄 Cerrar Sesión

- **Admin**: Click en "Cerrar Sesión" en el sidebar
- **Cajero**: Cierra el navegador o limpia localStorage

---

## 🛠️ Archivos Importantes

| Archivo | Descripción |
|---------|-------------|
| `src/services/auth.ts` | **Configuración de usuarios** |
| `components/Login.tsx` | Pantalla de login |
| `App.tsx` | Lógica de rutas y roles |
| `AUTENTICACION_LOCAL.md` | Documentación completa |

---

## 🆘 Problemas Comunes

### "No me deja entrar"
- Verifica usuario y contraseña (case-sensitive)
- Revisa `src/services/auth.ts`

### "No veo el sidebar siendo admin"
- Cierra sesión y vuelve a entrar
- Verifica que iniciaste con `admin` / `admin123`

### "El cajero ve todos los módulos"
- Verifica que en `src/services/auth.ts` el rol sea `'cajero'` no `'admin'`

---

## ✨ Listo para Usar!

La aplicación está configurada y lista. ¡Prueba ambos roles y empieza a trabajar!

**Credenciales de prueba**:
- Admin: `admin` / `admin123`
- Cajero: `cajero` / `cajero123`

---

Para más detalles, consulta: `AUTENTICACION_LOCAL.md`
