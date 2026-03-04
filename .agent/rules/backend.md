---
trigger: "**/(services|hooks)/**/*.ts"
---

# 🛑 Regla Suprema de Lógica y Datos (Backend Flow) 🛑

Al estar escribiendo, modificando o consumiendo lógica de negocio compleja, conexiones hacia base de datos externa (Supabase) o manipulaciones matemáticas persistentes en flujos asíncronos en `src/services/` o transformaciones en `src/hooks/`:

1. **DETENTE.** Tienes estrictamente **prohibido** modelar consultas asíncronas pesadas, agrupaciones de Big Data front-end (reducciones de memoria en arrays) o deducción de fórmulas de negocio al azar guiándote por patrones ajenos al proyecto.
2. **LEE OBLIGATORIAMENTE:** Antes de implementar lógicas agrupadas de peso métrico, cálculos contables, u operativas transaccionales, estás obligado a pre-consultar las normativas alojadas de forma aislada en `.context/architecture.md` (ubicado en la raíz).
3. **MANTÉN LA LEY CERO DE DATOS:** Recuerda que este software sigue el paradigma de Matemática Transaccional delegada a utilitarios Puros Typescript (`/src/utils/`) y las Métricas Agrupadas Masivamente deben apoyarse categóricamente en Vistas PostgRest de Supabase sin sobrecargar el client.
