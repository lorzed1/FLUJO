# 🧠 Memoria Técnica del Proyecto

Este documento sirve como contexto vivo y "cerebro" para cualquier agente que trabaje en el código. Define el estado actual, la arquitectura y los próximos pasos.

## 🛠️ Stack Tecnológico
- **Core**: React 18 + TypeScript + Vite.
- **Estilos**: Tailwind CSS (Preferencia) + Vanilla CSS.
- **Backend**: Firebase (Firestore, Auth).
- **Iconos**: Lucide React.
- **Router**: React Router DOM v6.

## 🏗️ Arquitectura (Feature-Based)
La aplicación ha sido refactorizada (Enero 2026) a una arquitectura modular por características.
- `src/features/auth/`: Autenticación, Login y Panel de Migración.
- `src/features/cash-flow/`: Arqueos de caja, Flujo de efectivo, Importación Excel.
- `src/features/dashboard/`: Vistas principales y resumen.
- `src/features/operations/`: Gestión operativa diaria.
- `src/features/reconciliation/`: Conciliación Bancaria (Lado A vs Lado B).
- `src/shared/`: Componentes UI reutilizables (`SmartDataTable`, Inputs, etc.).
- `src/services/`: Capa de datos (Firestore, Storage, Auth).
- `src/types/`: Definiciones de tipos globales (`index.ts`).

## � Gobernanza y Reglas de Agente
Se han establecido reglas estrictas en `.agent/` que **deben ser consultadas**:
- `.agent/rules/`: Reglas inquebrantables (Stack, Estilo, Estructura).
- `.agent/skills/`: Manuales de experto (React, Debugging, Base de Datos).
- `.agent/workflows/`: Flujos de trabajo para nuevas funcionalidades.

## ✅ Estado Actual (Hito: Refactor & Estabilidad)
- **Estado**: 🟢 Estable. Servidor corriendo en puerto 3000.
- **Logros Recientes**:
    1. Reorganización completa de archivos a `src/features`.
    2. Centralización de tipos en `src/types/index.ts`.
    3. Corrección de todas las importaciones relativas rotas.
    4. Creación de documentación de gobernanza.
- **Bugs Conocidos**:
    - Ninguno bloqueante actualmente.

## ⚠️ Puntos Críticos y Pendientes
1.  **Reglas de Seguridad Firebase**: La consola de Firebase necesita configurarse para permitir persistencia real (actualmente avisa de permisos insuficientes y usa datos locales).
2.  **Validación de Roles**: Probar exhaustivamente las vistas de `cajero` vs `admin` tras el refactor.
3.  **Subagente Navegador**: Requiere configuración de variables de entorno (HOME) en el host para funcionar.

## 🔄 Flujo de Trabajo
Para implementar nuevas features, seguir estrictamente: `.agent/workflows/new-feature.md`.
