# Módulo: Gestión de Beneficios (Propinas)

## 1. Problema de Negocio
La distribución de incentivos económicos al personal suele ser un proceso opaco y propenso a errores de cálculo. Se requiere un sistema que automatice el reparto equitativo, descuente costos operativos de plataformas de pago y constituya un fondo de reserva (UNP) de forma transparente.

---

## 2. Arquitectura de Datos (Data Blueprint)

| Atributo | Propósito de Negocio | Regla / Requisito |
| :--- | :--- | :--- |
| **Fecha de Registro** | Día operativo al que corresponde el recaudo. | Clave de relación con Arqueos y Turnos. |
| **Total Propinas Bruto** | Monto total capturado por todos los medios de pago. | Origen: Módulo de Caja. |
| **Comisión Operativa** | Costo financiero por procesamiento electrónico. | Valor calculado (3% del total). |
| **Base Repartible** | Capital neto disponible para el personal. | `Total - Comisión`. |
| **Factor de División** | Número de colaboradores con derecho a incentivo. | Debe sincronizarse con el sistema de turnos/asistencia. |
| **Monto Individual** | Valor exacto que recibe cada colaborador. | `Base / Factor de División` (truncado). |
| **Fondo de Reserva (UNP)** | Capital que permanece en la empresa para gastos operativos. | `Comisión + Cuota de 1 colaborador`. |

---

## 3. Mapa de Interconexiones (Contexto Sistémico)

- **Entrada desde Caja**: El módulo recibe automáticamente el monto de propinas mediante una sincronización con el historial de cierres diarios.
- **Entrada desde Turnos**: Se conecta con un servicio externo (Firebase) para obtener el conteo exacto de personas que trabajaron en la fecha específica.
- **Salida hacia Contabilidad**: Los montos de "Comisión" y "Propinas" se mapean a cuentas de gasto y pasivo exigible en el reporte contable.

---

## 4. Inteligencia y Cálculos (Fórmulas Legales)
El sistema aplica un algoritmo de reparto estricto:

1.  **Deducción Bancaria**: Se sustrae un **3%** lineal del total recaudado para cubrir costos de pasarelas de pago.
2.  **Reparto Equitativo**: Se calcula el valor por persona dividiendo la base neta entre el número de trabajadores del día. El sistema siempre redondea hacia abajo (`floor`) para evitar repartir dinero inexistente.
3.  **Constitución de Fondo UNP**: El sistema reserva la comisión bancaria más una "parte de un hombre" (una cuota individual) como fondo de sostenibilidad.

---

## 5. Capacidades de Interacción (Operaciones)
- **Sincronización de Beneficios**: Botón para traer el total de propinas desde el módulo de caja.
- **Sincronización de Personal**: Botón para actualizar el número de personas basado en el registro de asistencia/turnos del día.
- **Edición Granular**: El auditor puede modificar manualmente el factor de división en caso de excepciones operativas.
- **Auditoría de Totales**: Vista de tabla con resaltado de valores negativos o incoherentes.

---

## 6. Escenarios de Usuario
- **Cierre de Jornada**: El cajero cierra la caja → Se pulsa "Sincronizar" en Propinas → El sistema trae el monto, consulta cuánta gente trabajó y muestra inmediatamente cuánto le corresponde a cada uno.
- **Ajuste de Nómina**: Si un trabajador se retira antes o entra después, el administrador ajusta el "Factor de División" y el sistema recalcula automáticamente el monto individual y el fondo de reserva.
