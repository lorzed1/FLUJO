# Directory Structure & Architecture

El proyecto sigue una arquitectura modular basada en **Features** para escalar de forma ordenada.

## Estructura Raíz
```
src/
├── features/           # MÓDULOS PRINCIPALES (Dominio)
│   ├── dashboard/      # Vistas y lógica del Dashboard
│   ├── operations/     # Transacciones, Calendario, Gastos Recurrentes
│   ├── reconciliation/ # Conciliación Bancaria, Importación
│   ├── cash-flow/      # Arqueos de Caja
│   └── auth/           # Login y Gestión de Usuarios
│
├── components/         # COMPONENTES COMPARTIDOS/GENÉRICOS
│   └── ui/             # UI Kit base (Botones, Inputs, Cards, Iconos)
│
├── services/           # LÓGICA DE NEGOCIO & DATOS
│   ├── firebase.ts     # Configuración Firebase
│   ├── firestore.ts    # Servicio de Base de Datos
│   ├── auth.ts         # Servicio de Autenticación
│   └── storage.ts      # Servicio de LocalStorage
│
├── types/              # DEFINICIONES DE TIPOS GLOBALES
│   └── index.ts        # Archivo principal de tipos
│
├── utils/              # UTILIDADES PURAS (Stateless)
│   ├── dateUtils.ts    # Formateo de fechas
│   └── excelParser.ts  # Lógica de parsing
│
├── App.tsx             # Entry Point & Router
└── main.tsx            # Bootstrap
```

## Reglas de Colocación
1. **Nuevas Funcionalidades**: Si es una entidad de negocio nueva, crea una carpeta en `src/features/[nombre]`.
2. **Componentes Reutilizables**: Si un componente se usa en más de una feature (ej. un Modal genérico), va a `src/components/ui`.
3. **Logica de Negocio**: No poner lógica pesada dentro de los componentes UI. Extraer a `src/services` o custom hooks.

## Prohibiciones
- ❌ No crear archivos de componentes sueltos en `src/` raíz.
- ❌ No mezclar dominios (ej. el código de conciliación no debe estar en la carpeta de dashboard).
- ❌ No usar rutas relativas profundas confusas si es posible evitarlo (aunque actualmente usamos relativas, mantenerlas ordenadas).
