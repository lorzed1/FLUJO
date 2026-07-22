# Sistema de Inteligencia Financiera y Operativa - Blueprint de Producto

## 1. Misión del Sistema
El sistema actúa como el núcleo de control y auditoría de la operación comercial. Su propósito es garantizar la integridad financiera mediante la conciliación de flujos de dinero físico y digital, la automatización del reparto de beneficios al personal y la traducción de la operación diaria a estructuras contables normalizadas.

## 2. Mapa de Interconexiones Globales
La aplicación funciona como un organismo interconectado donde la información fluye de la siguiente manera:

1.  **Punto de Origen (Caja/Arqueos)**: Captura la realidad del recaudo.
2.  **Módulo de Beneficios (Propinas)**: Es alimentado por el arqueo diario. Aplica reglas de comisión y reparto equitativo.
3.  **Módulo de Tesorería (Gastos y Presupuestos)**: Controla las salidas de dinero autorizadas que afectan el saldo de caja.
4.  **Núcleo Contable**: Traduce todos los movimientos anteriores a un lenguaje de asientos (PUC) para auditoría externa.

## 3. Principios de Diseño Funcional
- **Verdad Única**: Los datos se capturan una vez y fluyen hacia el resto de los módulos.
- **Trazabilidad Forense**: Cada monto registrado en medios digitales (Nequi, Bancolombia) debe permitir la identificación individual para evitar fraudes.
- **Auditoría de Descuadres**: El sistema es punitivo y preventivo ante diferencias entre la venta esperada y el recaudo real.
