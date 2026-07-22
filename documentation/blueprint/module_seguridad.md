# Módulo: Seguridad y Gobernanza (Roles y Permisos)

## 1. Problema de Negocio
El acceso indiscriminado a información financiera sensible y la capacidad de modificar registros históricos sin supervisión pone en riesgo la integridad del negocio. Se requiere un modelo de gobernanza que segregue funciones entre la operación diaria y la auditoría administrativa.

---

## 2. Arquitectura de Roles (Agnóstica)

### A. Perfil: Cajero (Operador)
- **Propósito**: Ejecución de la operación diaria.
- **Acceso**: 
    - Registro de arqueos del día actual.
    - Consulta de su propio historial de cierres.
    - Captura de gastos de turno y registros de propinas.
- **Restricciones**: 
    - No puede borrar arqueos una vez guardados.
    - No tiene acceso al módulo de proyecciones ni conciliación bancaria.
    - No puede modificar reglas de reparto de beneficios.

### B. Perfil: Administrador (Gerente)
- **Propósito**: Auditoría, planeación estratégica y gestión fiscal.
- **Acceso**: 
    - Acceso total a todos los módulos.
    - Modificación de registros históricos (con trazabilidad).
    - Gestión de metas de ventas y eventos de impacto.
    - Sincronización contable y bancaria.
- **Capacidades**: 
    - Edición de factores de división de propinas.
    - Configuración de márgenes de tolerancia de descuadre.

---

## 3. Mapa de Interconexiones
- **Identidad → Operación**: Cada registro de Arqueo, Propina o Gasto queda marcado con la identidad del usuario que lo creó, permitiendo auditorías por responsabilidad.
- **Gobernanza → Contabilidad**: Solo el nivel Administrador puede realizar la exportación final al sistema contable externo, actuando como filtro de calidad.

---

## 4. Políticas de Seguridad de Datos
1.  **Protección de Históricos**: Los arqueos guardados entran en modo "Solo Lectura" para el perfil Cajero pasadas 24 horas.
2.  **Validación de Sesión**: La aplicación debe garantizar que los datos locales (caché) se limpien al cerrar la sesión para evitar que el siguiente turno vea información privilegiada.
3.  **Trazabilidad de Cambios**: Cualquier ajuste manual a una meta de venta o a un asiento contable debe registrar la fecha y autoría del cambio.

---

## 5. Escenarios de Usuario
- **Turno Nuevo**: Un cajero inicia sesión -> El sistema solo le ofrece el formulario de arqueo en blanco y su historial reciente. No ve los saldos bancarios de la empresa.
- **Auditoría Semanal**: El administrador revisa un descuadre de hace 3 días -> Detecta un error de digitación y lo corrige -> El sistema recalcula la disponibilidad semanal y actualiza el reporte contable automáticamente.
