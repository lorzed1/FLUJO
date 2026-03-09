---
trigger: "**/src/**/*.tsx"
---

# 🛑 Regla Suprema de Frontend y UI 🛑

Al momento de estar operando, modficando o creando cualquier componente visual (`.tsx`) dentro de `src/features/` o carpetas de UI:

1. **DETENTE.** Tienes estrictamente **prohibido** inyectar lógica de colores, estilos o dependencias de contenedores atómicos guiado puramente por tu razonamiento estándar.
2. **LEE OBLIGATORIAMENTE:** Debes apoyarte siempre en el archivo `.context/brand-book.md` situado en la raíz de este proyecto para conocer la "Identidad Visual", los colores acentuados imperativos, y las anatomías de distribución (PageHeader y Zones).
3. **NO USAR ETIQUETAS CRUDAS HTML:** Componentes nativos brutos como `<button>`, `<input>`, `<select>`, `<table>`, o divs estilizables simuladores como `<div className="bg-white rounded-xl shadow-sm...">` y modales programados en vanilla react están terminantemente restringidos. Existen piezas de React construidas para este rol en `src/components/ui/` (`<Button>`, `<Input>`, `<Card>`, `<AlertModal>`, `<FormGroup>`, etc.) que debes importar y utilizar obligatoriamente para favorecer la estandarización y evitar la Deuda Técnica Visual de la app.
4. **LABELS DE FORMULARIO:** Queda **prohibido** escribir `<label className="block text-...">` manualmente. Todo label + input debe ir envuelto en `<FormGroup label="..." required description="...">`. Ver `src/components/ui/FormGroup.tsx` para la API completa.
5. **BARREL DE ICONOS:** Queda **prohibido** importar de `@heroicons/react/24/outline` directamente. Siempre importar desde `src/components/ui/Icons.tsx` que es el barrel centralizado.
