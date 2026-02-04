---
name: react-architecture
description: Estándares para escribir código React mantenible, modular y limpio.
version: 2.0.0
---

# ⚛️ React Architecture & Coding Style

Este skill define cómo estructurar, nombrar y escribir componentes React en este proyecto.

## 1. Naming Conventions (Convenciones de Nombres)
*   **Componentes:** `PascalCase` (ej. `DashboardView.tsx`, `PrimaryButton.tsx`).
*   **Hooks:** `useCamelCase` (ej. `useAuth.ts`).
*   **Funciones/Variables:** `camelCase` (ej. `calculateTotal`, `isActive`).
*   **Interfaces:** `PascalCase`. NO usar prefijo `I` (ej. `UserProps`, no `IUserProps`).
*   **Constantes:** `UPPER_CASE` (ej. `MAX_RETRIES`).

## 2. Estructura de Componentes
Sigue estrictamente este orden en el código:

```typescript
// 1. Imports (Externos primero, luego Internos)
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

// 2. Interfaces/Types
interface MyComponentProps {
    title: string;
}

// 3. Componente
export const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
    // 3.1. Hooks & State
    const { user } = useAuth();
    
    // 3.2. Effects
    
    // 3.3. Handlers (Lógica)
    
    // 3.4. Render
    return (
        <div className="p-4">
            <h1>{title}</h1>
        </div>
    );
};
```

## 3. Principios de Arquitectura
*   **Functional Components Only:** Prohibido Class Components.
*   **Separación de Responsabilidades:**
    *   **Container/Page:** Maneja la data y estado (Hooks).
    *   **Presentational/UI:** Solo recibe props y renderiza.
*   **Límite de Tamaño:** Si un archivo pasa de 150 líneas, considera dividirlo.

## 4. TypeScript Best Practices
*   **No `any`**: Tipa todo explícitamente.
*   **Optional Chaining**: Usa `user?.profile?.name` en lugar de `user && user.profile && user.profile.name`.
*   **Interfaces Compartidas**: Si una interfaz se usa en >1 archivo, muévela a `src/types`.

## 5. Manejo de Errores
*   Usa `try/catch` en llamadas asíncronas.
*   Feedback Visual: Informa al usuario si algo falla.
