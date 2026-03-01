# 🧱 Coding Standards & React Architecture (CODING_STANDARDS)

## 1. Clean Architecture Principles
*   **Separación de Responsabilidades (SoC):**
    *   **UI Components:** Solo renderizan. NO llaman a APIs ni BD directamente.
    *   **Hooks/Services:** Manejan la lógica de negocio, estado y llamadas a datos.
    *   **Ejemplo:** `UserProfile.tsx` (UI) usa `useUserProfile.ts` (Logic) que llama a `UserService.ts` (Data).
*   **Modularidad:**
    *   Componentes > 150 líneas → **Refactorizar (Dividir)**.
    *   Funciones > 30 líneas → **Simplificar**.

## 2. Naming Conventions
*   **File Names:** `PascalCase.tsx` (Componentes), `camelCase.ts` (Hooks/Utils).
*   **Interfaces:** `PascalCase` (Ej: `UserProps`). **NO usar prefijo `I`**.
*   **Variables/Funciones:** `camelCase`.
*   **Constantes:** `UPPER_CASE`.

## 3. React Architecture
*   **Functional Components Only:** Prohibido Class Components.
*   **Estructura del Archivo:**
    1.  Imports (Externos -> Internos).
    2.  Interfaces/Types.
    3.  Component Definition.
        *   Hooks.
        *   Effects.
        *   Handlers.
        *   Render (JSX).

## 4. TypeScript Best Practices
*   **NO `any`:** Usa tipos explícitos, Interfaces o Generics.
*   **No Null Assertions:** Evita `!`. Usa Optional Chaining `?.` o Nullish Coalescing `??`.
*   **Props:** Tipar siempre `children` si se usa (`React.ReactNode`).

## 5. Manejo de Errores & Seguridad
*   **Async/Await:** Siempre envolver en `try/catch`.
*   **Feedback:** Mostrar Toast/Alert al usuario en error, no un crash silencioso.
*   **Sanitización:** No inyectar HTML crudo (`dangerouslySetInnerHTML`) sin sanitizar.
