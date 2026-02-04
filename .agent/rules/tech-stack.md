# Tech Stack & Libraries

Este proyecto utiliza un stack tecnológico moderno y optimizado. Cualquier adición de nuevas librerías debe ser aprobada explícitamente.

## Core Framework
- **Runtime**: Node.js (v18+)
- **Framework Web**: React 18+ (Functional Components)
- **Lenguaje**: TypeScript (Strict Mode)
- **Build Tool**: Vite

## Estilos y UI
- **Framework CSS**: Tailwind CSS (Prioridad 1)
  - Uso extensivo de clases utilitarias
  - Soporte nativo para Dark Mode (`dark:`)
- **Iconografía**: HeroIcons (encapsulados en `src/components/ui/Icons.tsx`)
- **Visualización de Datos**: Recharts
- **PDF/Excel**: `jspdf`, `jspdf-autotable`, `xlsx`

## Backend & Servicios
- **Base de Datos**: Firebase Firestore
- **Autenticación**: Firebase Auth + Custom Local Auth
- **Persistencia Local**: LocalStorage (con interfaces tipadas en `services/storage.ts`)

## Reglas de Uso
1. **No jQuery**: Estrictamente prohibido.
2. **No Bootstrap/MaterialUI**: Usar componentes propios en `src/components/ui` estilizados con Tailwind.
3. **No Redux**: Usar React Context o gestión de estado local a menos que la complejidad lo justifique absolutamente.
4. **Fechas**: Usar utilidades nativas o el helper `src/utils/dateUtils.ts`. No instalar `moment.js` (pesado). Si se necesita algo más potente, usar `date-fns`.
