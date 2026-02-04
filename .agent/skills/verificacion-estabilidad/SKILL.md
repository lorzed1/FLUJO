---
name: Verificación de Estabilidad
description: Lista de chequeo obligatoria para verificar cambios antes de notificar al usuario.
---

# 🛡️ Protocolo de Verificación de Estabilidad

Antes de llamar a `notify_user` para entregar una tarea que involucre cambios en UI o Datos, **DEBES** ejecutar mentalmente este checklist.

## 1. Verificación de UI (Scroll y Layout)
- [ ] **Test de Contenedores**: ¿He verificado que mis cambios en `flex-1` o `h-full` no rompieron el scroll de tablas adyacentes?
- [ ] **Test de Resiliencia**: ¿Si el contenido de la tabla crece a 1000 filas, el header se mantiene fijo y el cuerpo hace scroll? (Busca `overflow-auto` y `sticky top-0`).

## 2. Verificación de Formatos
- [ ] **Moneda**: ¿Todos los nuevos valores monetarios usan `formatCOP`? ¿Se muestran como `$ X.XXX` sin decimales?
- [ ] **Fechas**: ¿Las fechas nuevas siguen el patrón `DD/MM/YYYY`?

## 3. Verificación de Datos (Safety First)
- [ ] **Legacy Fallback**: Si cambié lógica de carga de datos (`storage.ts` o fetchs), ¿he garantizado que si falla la API, los datos no se borran? (Verificar `isDataLoaded` flag).
- [ ] **Sincronización**: Si edito Lado A, ¿verifiqué si afecta la integridad de Lado B?

## 4. Auto-Corrección
- Si detectas que tu cambio rompió una de estas reglas, **NO ENTREGUES**. Inicia una sub-tarea de reparación inmediatamente.
