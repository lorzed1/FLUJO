# 🌟 BLUEPRINT: FlowTrack (Proyector de Flujo de Caja)

## 🎯 Visión y Objetivo
Sistema de gestión financiera para PYMEs que permite proyectar el flujo de caja futuro, controlar el efectivo diario (arqueos) y gestionar conciliaciones bancarias, con un sistema de roles robusto (Administrador/Cajero).

## 1. Arquitectura del Sistema
El proyecto sigue una arquitectura modular y estricta, diseñada para escalabilidad y mantenimiento bajo las reglas definidas en `.agent/rules/`.

### Estructura de Directorios (Source of Truth)
- **`src/features/`**: Módulos de dominio encapsulados.
    - `auth/`: Login, Gestión de Usuarios y Herramientas Admin (incl. `FirebaseMigrationPanel`).
    - `dashboard/`: Analítica, Gráficos y KPIs.
    - `operations/`: Gestión diaria (Transacciones, Calendario, Gastos Recurrentes).
    - `reconciliation/`: Módulo avanzado de conciliación bancaria.
    - `cash-flow/`: Arqueos de caja y control de efectivo.
- **`src/types/`**: Definiciones de tipos globales. El punto de entrada es `index.ts`.
- **`src/services/`**: Capa de datos e infraestructura (Firebase, LocalStorage, Auth).
- **`src/components/ui/`**: Librería de componentes visuales puros y reutilizables.

## 2. Stack Tecnológico
- **Frontend**: React 18/19 + TypeScript + Vite.
- **Estilos**: Tailwind CSS + HeroIcons.
- **Backend/BaAS**: Firebase (Firestore, Auth).
- **Persistencia**: Híbrida (LocalStorage + Firebase Firestore).
- **Librerías Clave**: `xlsx` (Excel), `jspdf` (PDF), `recharts` (Gráficos), React Router 7.

## 3. Funcionalidades Principales
1. **Dashboard de Proyección**: Visualización híbrida de transacciones reales vs. proyectadas a 6 meses.
2. **Motor de Recurrencia**: Generación automática de proyecciones basadas en gastos fijos (semanales/mensuales) y excepciones.
3. **Módulo de Arqueo (Cajeros)**: Interfaz simplificada para conteo de efectivo, cálculo de descuadres y cierre de caja.
4. **Conciliación Bancaria**: Herramienta para cruzar movimientos bancarios con registros internos.
5. **Control de Accesos (RBAC)**:
   - *Admin*: Acceso total (Configuración, Usuarios, Reportes).
   - *Cajero*: Acceso restringido exclusivamente a `/arqueo`.

## 4. Reglas de Gobernanza y Principios
- **Feature-First**: Organizar código por dominio (ej: `features/cash-flow`) y no por tipo técnico.
- **Separation of Concerns**: La lógica de cálculo debe vivir fuera de los componentes UI.
- **Offline-First (Meta)**: Estructura preparada para eventual soporte offline (PWA).
- **Workflow Strictness**: Todo nuevo desarrollo debe seguir el workflow `new-feature`.

## 5. Estado Actual
- **Refactorización Completada**: Todos los módulos extraídos a `features/`.
- **Tipos Unificados**: Centralizados en `src/types/index.ts`.
- **Gobernanza**: Reglas activas en `.agent/rules/`.
