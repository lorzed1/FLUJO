# 🔐 CONFIGURAR AUTENTICACIÓN EN FIREBASE

## 📋 **Guía Completa - Autenticación Simple**

Esta guía te ayudará a agregar login a tu app para usar reglas seguras de Firebase.

---

## **PARTE 1: Configurar Firebase Console** (5 minutos)

### **Paso 1: Habilitar Autenticación**

1. Ve a: https://console.firebase.google.com/
2. Selecciona proyecto: **flujo-caja-d0fcf**
3. En el menú lateral: **Authentication** (Autenticación)
4. Haz clic en **"Comenzar"**

### **Paso 2: Habilitar Método de Autenticación**

Elige **UNO** de estos métodos (recomiendo Email/Contraseña):

#### **Opción A: Email y Contraseña** (Más simple)

1. En la pestaña **"Sign-in method"** (Métodos de inicio de sesión)
2. Haz clic en **"Email/Password"** (Correo electrónico/Contraseña)
3. **Habilita** la primera opción ("Email/Password")
4. **NO habilites** "Email link" (por ahora)
5. Haz clic en **"Guardar"**

#### **Opción B: Google** (Más rápido para usuarios)

1. En "Sign-in method"
2. Haz clic en **"Google"**
3. **Habilitar**
4. Correo electrónico del proyecto: (el tuyo)
5. **"Guardar"**

### **Paso 3: Crear Tu Usuario**

1. En Authentication, pestaña **"Users"** (Usuarios)
2. Haz clic en **"Add user"** (Agregar usuario)
3. Email: (tu correo)
4. Password: (tu contraseña, mínimo 6 caracteres)
5. **"Add user"**

✅ ¡Firebase configurado!

---

## **PARTE 2: Agregar Login a Tu App** (10-15 minutos)

### **Archivo 1: Crear Componente de Login**

Crea: `components/Login.tsx`

```typescript
import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../src/services/firebase';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess();
    } catch (err: any) {
      setError('Error: ' + (err.message || 'No se pudo iniciar sesión'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onLoginSuccess();
    } catch (err: any) {
      setError('Error: ' + (err.message || 'No se pudo iniciar sesión con Google'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          Flujo de Caja
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          Inicia sesión para continuar
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tu@email.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Opcional: Login con Google */}
        <div className="mt-4">
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">o</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-500 text-center">
          Tus datos están protegidos y encriptados
        </p>
      </div>
    </div>
  );
};

export default Login;
```

### **Archivo 2: Actualizar App.tsx**

Modifica tu `App.tsx` para incluir autenticación:

```typescript
import React, { useState, useMemo, useEffect } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './src/services/firebase';
import Login from './components/Login';
// ... resto de tus imports

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  // ... resto de tu estado

  // Escuchar cambios en autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        console.log('✅ Usuario autenticado:', currentUser.email);
      }
    });

    return () => unsubscribe();
  }, []);

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('👋 Sesión cerrada');
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  // Mostrar pantalla de carga mientras verifica autenticación
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-light-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, mostrar login
  if (!user) {
    return <Login onLoginSuccess={() => {}} />;
  }

  // Usuario autenticado - mostrar app normal
  return (
    <div className="flex h-screen bg-light-bg font-sans">
      {/* Tu app actual aquí */}
      {/* Agrega botón de logout en el sidebar */}
    </div>
  );
};

export default App;
```

### **Archivo 3: Agregar Botón de Logout al Sidebar**

En `components/Sidebar.tsx`, agrega al final:

```typescript
// Dentro del componente Sidebar, agrega esta prop
interface SidebarProps {
  // ... tus props existentes
  onLogout?: () => void;
}

// Y al final del sidebar, antes del cierre:
{onLogout && (
  <button
    onClick={onLogout}
    className="mt-auto p-3 text-red-600 hover:bg-red-50 rounded flex items-center gap-2 transition-colors"
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
    Cerrar Sesión
  </button>
)}
```

---

## **PARTE 3: Actualizar Reglas de Firestore** (2 minutos)

### **Una Vez que el Login Funcione:**

1. Ve a Firebase Console
2. Firestore Database → Reglas
3. Pega esto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. **Publicar**

---

## **PARTE 4: Probar** (5 minutos)

### **Prueba 1: Login**
1. Abre tu app
2. Deberías ver la pantalla de login
3. Ingresa tu email y contraseña
4. ✅ Deberías entrar a la app

### **Prueba 2: Firebase**
1. Abre consola (F12)
2. Verás: `✅ Usuario autenticado: tu@email.com`
3. Verás: `✅ Datos cargados desde Firebase`

### **Prueba 3: Logout**
1. Haz clic en "Cerrar Sesión"
2. Deberías volver a la pantalla de login
3. ✅ Funciona correctamente

---

## **SOLUCIÓN DE PROBLEMAS**

### **Error: "auth/configuration-not-found"**
- Ve a Firebase Console → Authentication
- Asegúrate de habilitar Email/Password

### **Error: "auth/invalid-email"**
- Verifica que el email esté bien escrito
- Debe ser un email válido

### **Error: "auth/user-not-found"**
- El usuario no existe
- Créalo en Firebase Console → Authentication → Users

### **Error: "auth/wrong-password"**
- Contraseña incorrecta
- Resetea la contraseña en Firebase Console

### **Error: "Missing or insufficient permissions"**
- Verifica que las reglas de Firestore permitan acceso a usuarios autenticados
- Verifica que el usuario esté realmente autenticado (`request.auth != null`)

---

## **EXTRAS OPCIONALES**

### **Recordar Sesión**
Firebase ya recuerda la sesión automáticamente. El usuario no necesita hacer login cada vez.

### **Resetear Contraseña**
Agrega este código al componente Login:

```typescript
import { sendPasswordResetEmail } from 'firebase/auth';

const handleResetPassword = async () => {
  if (!email) {
    alert('Ingresa tu email primero');
    return;
  }
  
  try {
    await sendPasswordResetEmail(auth, email);
    alert('Email de recuperación enviado. Revisa tu bandeja de entrada.');
  } catch (error) {
    alert('Error enviando email de recuperación');
  }
};
```

### **Registro de Nuevos Usuarios**
```typescript
import { createUserWithEmailAndPassword } from 'firebase/auth';

const handleRegister = async () => {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Error registrando:', error);
  }
};
```

---

## ✅ **CHECKLIST COMPLETO**

- [ ] Habilitada autenticación en Firebase Console
- [ ] Creado método de login (Email/Password o Google)
- [ ] Creado usuario de prueba
- [ ] Creado componente `Login.tsx`
- [ ] Actualizado `App.tsx` con autenticación
- [ ] Agregado botón de logout
- [ ] Actualizado reglas de Firestore
- [ ] Probado login
- [ ] Probado que Firebase funciona
- [ ] Probado logout
- [ ] ¡Todo funciona! 🎉

---

## 📚 **Recursos Adicionales**

- [Documentación Firebase Auth](https://firebase.google.com/docs/auth)
- [Guía de Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Auth UI (opcional)](https://firebase.google.com/docs/auth/web/firebaseui)

---

## 🎯 **Resumen**

**Total de tiempo:** 20-25 minutos

**Pasos:**
1. ✅ Habilitar autenticación en Firebase (5 min)
2. ✅ Crear componente Login (10 min)
3. ✅ Actualizar App.tsx (5 min)
4. ✅ Actualizar reglas Firestore (2 min)
5. ✅ Probar (5 min)

**¡Y listo!** Tu app ahora es segura y solo tú puedes acceder. 🔒
