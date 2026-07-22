# 🌟 BLUEPRINT: FlowTrack — Sistema de Gestión Financiera HORECA

> **Última actualización:** 2026-02-13
> **Estado:** 🟡 En Migración (Firebase → Supabase)

## 🎯 Visión y Objetivo
Sistema de gestión financiera integral para un Gastrobar HORECA que permite:
- Proyectar flujo de caja futuro con IA y patrones estacionales
- Controlar efectivo diario mediante arqueos de caja
- Gestionar presupuestos y gastos operativos
- Analizar rendimiento con dashboard BI avanzado
- Sistema de roles (Admin / Cajero) con acceso diferenciado

## 1. Stack Tecnológico (Source of Truth)

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Runtime** | Node.js | 18+ |
| **Framework** | React (Functional Components) | 19.x |
| **Lenguaje** | TypeScript (Strict Mode) | 5.8.x |
| **Build Tool** | Vite | 6.x |
| **Router** | React Router DOM | 7.x |
| **Estilos** | Tailwind CSS | 3.4.x |
| **Iconos** | Lucide React *(principal)*, HeroIcons *(legacy)* | — |
| **Backend** | Supabase *(target)*, Firebase *(legacy, en migración)* | — |
| **Gráficos** | Recharts | 3.x |
| **Calendario** | React Big Calendar | 1.x |
| **Layout Grid** | React Grid Layout | 2.x |
| **Excel** | xlsx (SheetJS) | 0.18.x |
| **PDF** | jspdf + jspdf-autotable | 4.x / 5.x |
| **Fechas** | date-fns | 4.x |
| **UI Primitives** | Radix UI (Checkbox, Dropdown, Separator) | — |
| **Animations** | tailwindcss-animate | 1.x |

### Dependencias Prohibidas
- ❌ jQuery, Bootstrap, Material UI, moment.js, Redux
- ❌ No agregar nuevas librerías sin justificación explícita

## 2. Arquitectura (Feature-Based)

```
src/
├── app/                    # Configuración de la app (si aplica)
├── features/               # MÓDULOS DE DOMINIO
│   ├── auth/               # Login, gestión de usuarios, roles
│   ├── budget/             # Presupuestos (Dashboard, Calendario, Tabla, Recurrentes, Categorías, Ejecución, Historial)
│   │   ├── components/     # Componentes específicos del módulo
│   │   ├── layouts/        # Layout con navegación interna (tabs)
│   │   └── pages/          # Páginas/vistas del módulo
│   ├── cash-flow/          # Arqueos de caja, importación Excel, transferencias
│   │   └── components/     # Sub-componentes
│   ├── dashboard/          # Dashboard BI (KPIs, gráficos, análisis)
│   │   └── components/     # Sub-componentes (Charts, Filters)
│   └── projections/        # Proyecciones de venta, calendario de eventos
│       ├── components/     # Charts, KPIs, EventCards
│       ├── hooks/          # useProjections, useEvents
│       └── pages/          # Sub-páginas
│
├── components/             # COMPONENTES COMPARTIDOS
│   ├── layout/             # MainLayout, TopBar, PageHeader
│   ├── ui/                 # UI Kit (Button, Card, Input, Table, Modal, etc.)
│   └── cash-flow/          # Componentes legacy (pendiente migrar)
│
├── context/                # CONTEXTOS GLOBALES
│   ├── AppContext.tsx       # Estado global de datos (⚠️ pendiente dividir)
│   ├── AuthContext.tsx      # Autenticación
│   └── UIContext.tsx        # Estado de interfaz (modales, alertas)
│
├── hooks/                  # HOOKS GLOBALES REUTILIZABLES
├── providers/              # Composición de Providers
├── routes/                 # AppRouter con lazy loading
├── services/               # CAPA DE DATOS
│   ├── supabaseClient.ts   # Cliente Supabase (nuevo)
│   ├── firestore.ts        # Servicio Firebase (legacy)
│   ├── auth.ts             # Lógica de autenticación
│   ├── budgetService.ts    # Servicio de presupuestos
│   ├── storage.ts          # LocalStorage tipado
│   └── ...                 # Otros servicios
│
├── types/                  # TIPOS GLOBALES (index.ts + por dominio)
├── utils/                  # UTILIDADES PURAS (sin estado)
│   ├── formatters.ts       # Formato de moneda, números, fechas
│   ├── dateUtils.ts        # Parsing/manipulación de fechas
│   ├── numbers.ts          # Operaciones numéricas seguras
│   ├── validators.ts       # Validaciones reutilizables
│   └── ...
│
├── constants/              # CONSTANTES GLOBALES
│   └── index.ts            # Locale, moneda, zona horaria, breakpoints
│
├── lib/                    # Configuraciones de librerías
└── styles/                 # Estilos globales adicionales
```

## 3. Módulos Funcionales

### 3.1 Dashboard BI (`/dashboard`)
- KPIs dinámicos (ventas, visitas, ticket promedio, comparativos)
- Gráficos de evolución temporal (area, bar, line)
- Análisis de mix de pagos (pie chart + evolución)
- Heatmap de rendimiento por día/hora
- Filtros: Año, Mes, Semana, Día de la semana
- Modos: Ventas / Visitas / Combinado
- Layout customizable con drag-and-drop (react-grid-layout)

### 3.2 Arqueos de Caja (`/arqueo`)
- Registro diario de cierre de caja
- Conteo de efectivo por denominación
- Cálculo automático de descuadres
- Importación desde Excel
- Historial con tabla filtrable y exportable
- Accesible para rol Cajero

### 3.3 Presupuestos (`/budget`)
- Dashboard de presupuesto con KPIs
- Calendario visual de compromisos
- Tabla de transacciones con filtros avanzados
- Gestión de gastos recurrentes
- Categorías personalizables
- Ejecución presupuestaria
- Historial de presupuestos

### 3.4 Proyecciones (`/projections`)
- Proyecciones de venta basadas en datos históricos
- Calendario de eventos que afectan ventas
- Gráficos de tendencia y punto de equilibrio
- KPIs de punto de equilibrio

### 3.5 Autenticación (`/login`, `/users`)
- Login con Firebase Auth (migrando a Supabase Auth)
- RBAC: Admin (acceso total) / Cajero (solo `/arqueo`)
- Panel de gestión de usuarios (Admin)

## 4. Reglas de Gobernanza

### Código
- **Feature-First**: Organizar por dominio, no por tipo técnico
- **Separation of Concerns**: Lógica de negocio fuera de componentes UI
- **TypeScript Strict**: Prohibido `any`, todo tipado explícitamente
- **Límite de archivo**: Máximo 250 líneas por componente, 400 por servicio
- **DRY**: Reutilizar componentes de `components/ui/`
- **Imports**: Usar alias `@/` para rutas absolutas

### Datos y Formato
- **Moneda**: COP, sin decimales, formato `$ 1.234.567` via `formatMoney()`
- **Fechas display**: `DD/MM/YYYY` — siempre usar `formatDateToDisplay()`
- **Fechas storage**: ISO 8601 `YYYY-MM-DD`
- **Zona horaria**: America/Bogota (UTC-5)
- **Números**: Usar utilidades de `numbers.ts` para operaciones seguras

### UI/UX
- Dark mode soportado via variables CSS HSL
- Diseño "Clean, Modern & Professional"
- Mobile-first responsive design
- Glassmorphism y micro-animaciones sutiles
- Scroll único (main container), sin doble scrollbar

## 5. Deuda Técnica Conocida
1. ⚠️ `AppContext.tsx` (361 líneas) — Mega-contexto, necesita dividirse
2. ⚠️ `ArqueoPreview.tsx` (~2000 líneas) — Componente monolítico
3. ⚠️ `SmartDataTable.tsx` (~1000 líneas) — Necesita modularización
4. ⚠️ `budgetService.ts` (~1000 líneas) — Necesita dividirse
5. ⚠️ Migración Firebase → Supabase en progreso
6. ⚠️ Iconos duplicados (lucide-react + @heroicons/react)
7. ⚠️ `firestore.ts` referenciado pero en proceso de deprecación
