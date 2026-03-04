---
trigger: "**/src/**/*.tsx"
---

# 🛑 Regla Suprema de Frontend y UI 🛑

Al momento de estar operando, modficando o creando cualquier componente visual (`.tsx`) dentro de `src/features/` o carpetas de UI:

1. **DETENTE.** Tienes estrictamente **prohibido** inyectar lógica de colores, estilos o dependencias de contenedores atómicos guiado puramente por tu razonamiento estándar.
2. **LEE OBLIGATORIAMENTE:** Debes apoyarte siempre en el archivo `.context/brand-book.md` situado en la raíz de este proyecto para conocer la "Identidad Visual", los colores acentuados imperativos, y las anatomías de distribución (PageHeader y Zones).
3. **NO USAR ETIQUETAS CRUDAS HTML:** Componentes nativos brutos como `<button>`, `<input>`, `<select>`, `<table>`, o divs estilizables simuladores como `<div className="bg-white rounded-xl shadow-sm...">` y modales programados en vanilla react están terminantemente restringidos. Existen piezas de React construidas para este rol en `src/components/ui/` (`<Button>`, `<Input>`, `<Card>`, `<AlertModal>`, etc.) que debes importar y utilizar obligatoriamente para favorecer la estandarización y evitar la Deuda Técnica Visual de la app.
