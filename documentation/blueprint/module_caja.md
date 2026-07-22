# Módulo: Gestión de Arqueos y Cierres de Caja

## 1. Problema de Negocio
La falta de control sobre los medios de pago fragmentados y la dificultad de conciliar el efectivo físico con las ventas digitales genera riesgos de pérdida de capital y errores humanos en la suma de transacciones múltiples.

---

## 2. Arquitectura de Datos (Data Blueprint)

| Atributo | Propósito de Negocio | Regla / Requisito |
| :--- | :--- | :--- |
| **Fecha de Cierre** | Define el período operativo auditado. | Formato ISO. Solo un arqueo por día permitido. |
| **Venta Sistema (POS)** | Monto base de ventas reportado por el software externo. | Valor numérico absoluto. |
| **Identificación Operador** | Nombre del cajero responsable del turno. | Auditoría de responsabilidad. |
| **Contador de Visitas** | Cantidad de clientes atendidos en el día. | Análisis de ticket promedio. |
| **Recaudo Efectivo** | Suma total del dinero físico (Billetes/Monedas). | Alimentado por el desglose de denominaciones. |
| **Listado Nequi** | Historial de transferencias individuales por esta vía. | Lista de montos. Permite validar contra extracto. |
| **Listado Bancolombia** | Historial de transferencias bancarias directas. | Lista de montos. Permite validar contra extracto. |
| **Ingreso por Covers** | Recaudo por concepto de entrada/acceso. | Se suma a la expectativa de venta total. |
| **Propinas Recaudadas** | Incentivos dejados por el cliente. | Origen de datos para el módulo de Beneficios. |
| **Egresos de Turno** | Pagos realizados con efectivo de la caja (Facturas, Suministros). | Resta del recaudo esperado sin afectar la venta bruta. |
| **Consumo Personal** | Valor de productos usados por el equipo. | Gasto operativo interno. |
| **Gastos Operativos** | Salidas de caja para pagos inmediatos a terceros. | Debe justificarse con soporte (Factura). |
| **Descuadre** | Diferencia calculada en tiempo real. | `(Recaudo Total) - (Venta POS + Propinas + Covers)`. |

---

## 3. Mapa de Interconexiones
- **Hacia Módulo de Propinas**: Al guardar el arqueo, se dispara un proceso de sincronización que transfiere el valor de `Propinas Recaudadas` para su reparto.
- **Hacia Módulo Contable**: El arqueo consolidado sirve como entrada para el generador de comprobantes contables (Débitos a Caja/Bancos, Créditos a Ingresos).

---

## 4. Capacidades de Interacción (Operaciones)
1.  **Registro de Conteo Físico**: Interfaz para ingresar cantidades de cada denominación (desde billetes de 100k hasta monedas de 50).
2.  **Consolidación de Transferencias**: El usuario añade montos uno a uno; el sistema realiza la sumatoria automática para evitar errores manuales.
3.  **Auditoría de Descuadres**: Alerta visual si la diferencia entre lo esperado y lo recaudado supera el margen de tolerancia.
4.  **Carga de Históricos**: Importación vía hojas de cálculo para migración de datos.

---

## 5. Inteligencia y Cálculos
- **Fórmula de Venta Esperada**: `ventaPos + propina + ingresoCovers`.
- **Fórmula de Recaudo Real**: `efectivo + datafonoDavid + datafonoJulian + transfBancolombia + nequi + rappi`.
- **Fórmula de Ajuste Contable**: El sistema detecta la diferencia y asigna automáticamente el valor sobrante o faltante a una cuenta de "Ajuste al peso" para balancear los libros.

---

## 6. Escenarios de Usuario
- **Camino Feliz**: El usuario ingresa la venta POS, cuenta el dinero, registra las 5 transferencias del día, el descuadre da 0, y guarda con éxito.
- **Caso de Error de Conteo**: Si el descuadre es negativo, el sistema obliga a revisar el desglose de billetes o la lista de transferencias antes de proceder.
