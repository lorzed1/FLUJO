# 📖 Historial Clínico de Errores y Soluciones

*Este documento mantendrá un registro detallado de los problemas estructurales, de base de datos o lógica tramposa que hemos resuelto en el proyecto "Data BI". Consultar siempre antes de perder horas en diagnósticos repetidos.*

---

### [2026-02-28] - Categoría: Base de Datos / RLS (Supabase)
**Problema Inicial:** La nueva tabla de Propinas no mostraba los datos cargados en el frontend, regresaba los arreglos vacíos `[]` silenciosamente, a pesar de que la consola de red no reportaba errores explícitos (Status 200/204 de la consulta).
**Causa Raíz Diagnosticada:** La tabla en Supabase fue creada con políticas de seguridad a nivel de filas (RLS) estrictas que exigían `authenticated users` (usuarios autenticados). Al acceder internamente como usuario "público/anónimo" sin sesión activa desde el dashboard, Supabase cortaba el acceso sin escupir errores ruidosos.
**Solución Exitosa:** Se forzaron políticas públicas en la base de datos para la nueva tabla:
```sql
ALTER TABLE public.tips_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.tips_records;
CREATE POLICY "allow_all_tips_records" ON public.tips_records FOR ALL TO public USING (true) WITH CHECK (true);
```
**Lección Aprendida:** Si las tablas en Supabase no devuelven su data en el frontend pero no muestran errores obvios de conexión (o devuelven status exitosos silenciosos), **siempre** revisar primero las políticas RLS. 

---

### [2026-02-28] - Categoría: Base de Datos / Lógica de Borrado
**Problema Inicial:** Al borrar registros en el frontend (ej. un Arqueo del 28 de febrero), el sistema volvía a "revivirlos" automáticamente y mostrarlos de nuevo en otras tablas sincronizadas, como las Propinas.
**Causa Raíz Diagnosticada:** El sistema utilizaba un formato transitorio de "Borrado Suavizado" (Soft Delete) usando una columna interna `deleted_at`. Al aplicar el borrado lógico desde pantallas, el registro desaparecía del componente visual pero seguía existiendo físicamente. Las consultas RPC posteriores y algunos servicios fallaban al filtrarlo o arrastraban el dato "zombi" creando duplicados.
**Solución Exitosa:** 
1. Eliminar completamente el borrado suavizado del código (`.is('deleted_at', null)`).
2. Cambiar  `.update({ deleted_at: ... })` por `.delete()` puro (Borrado Duro).
3. Entrar vía SQL y purgar de manera definitiva (`DELETE FROM...`) los registros marcados como eliminados para no dejar rastros en `arqueos`, `tips_records` ni `transactions`.
**Lección Aprendida:** **Jamás usar borrado suavizado para las tablas de transacciones y arqueos de este aplicativo**. El borrado debe ser total (`Hard Delete`) desde Supabase y en los archivos de servicio de forma física.
