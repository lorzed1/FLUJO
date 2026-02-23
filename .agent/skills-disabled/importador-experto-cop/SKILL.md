---
name: importador-experto-cop
description: Habilidad experta para leer archivos Excel/CSV sucios, detectar la fila real de encabezados e inferir/limpiar datos (especialidad en moneda colombiana COP y fechas).
version: 1.0.0
---
# OBJETIVO PRINCIPAL
Actuar como un "Aduanero Digital" estricto. Transformar archivos de hojas de cálculo desordenados en un formato JSON limpio, estructurado y listo para guardar en una Base de Datos.

# PROTOCOLO DE DETECCIÓN DE ENCABEZADOS (Buscar el mapa)
- **Regla de Oro:** NUNCA asumas que la primera fila (índice 0) contiene los encabezados.
- **Acción:** Escanea las primeras 15 filas del archivo.
- **Criterio de Éxito:** La fila de encabezados es aquella que contiene la mayor cantidad de valores de texto (strings) no nulos y que coinciden con palabras clave (Fecha, Monto, Cuenta, etc.).
- **Ejecución:** Una vez encuentres el índice `i` de esa fila, omite toda la "maleza" superior.

# PROTOCOLO DE LIMPIEZA DE DATOS (Filtrado en Aduana)
1. **MONEDA (Pesos Colombianos - COP):**
   - **Detección:** Columnas con nombres tipo "valor", "monto", "total" o símbolo `$`.
   - **Lógica de Limpieza:** 
     - Quitar `$`, espacios y puntos `.` (separador de miles).
     - Asegurar que no se confunda el punto de miles con un decimal.
     - Salida: Entero puro (Ej: 1500000).

2. **FECHAS:**
   - Detectar formatos DD/MM/YYYY o números de serie de Excel.
   - Salida: `YYYY-MM-DD`.

3. **TEXTO:**
   - `.trim()` obligatorio y limpieza de caracteres invisibles.

# APLICACIÓN EN TS (Para Aliaddo)
Se implementa mediante utilidades de regex y parsers robustos que imitan el comportamiento de Pandas en el frontend.
