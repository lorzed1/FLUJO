---
name: calendar-full-view
description: Estándares y configuración para forzar la visualización completa de eventos en React Big Calendar (RBC) sin ocultamiento ni popups.
version: 1.0.0
---

# Contexto
React Big Calendar, por defecto, oculta los eventos que exceden la altura de una celda de día en la vista mensual, mostrando un enlace "+X more". 
El botón abre un popup o navega a la vista de día, comportamientos que interrumpen la experiencia de usuario cuando se requiere una "Vista de Águila" completa.

Este skill define cómo configurar RBC para que las celdas se expandan verticalmente (auto-height) y muestren *todos* los eventos directamente en la cuadrícula.

# Reglas de Visibilidad
1.  **Cero Ocultamiento**: Nunca se debe permitir que el calendario trunque la lista de eventos.
2.  **Expansión Vertical**: La celda del día debe crecer para acomodar el contenido.
3.  **Sin Popups Nativos**: No usar la propiedad `popup={true}`.
4.  **Override de Componente**: Se debe reemplazar el componente `showMore` para renderizar los eventos "sobrantes" in-situ.

# Instrucciones de Implementación

## 1. Configuración CSS (Styles Override)
Es obligatorio romper la altura fija de las filas de RBC para permitir flex-growth.

```css
/* Permitir crecimiento vertical */
.rbc-calendar, 
.rbc-month-view, 
.rbc-month-row, 
.rbc-row-content { 
    height: auto !important; 
    overflow: visible !important; 
    max-height: none !important;
}

/* Forzar renderizado en bloque o flex-col */
.rbc-row-content .rbc-row {
    height: auto !important;
    align-items: flex-start;
}
```

## 2. Componente "ShowMore" Customizado
En lugar de mostrar un botón, interceptamos los eventos ocultos y los renderizamos.

```tsx
const CustomShowMore = ({ events }: { events: MyEvent[] }) => {
    // Renderizamos los eventos que RBC decidió ocultar,
    // colocándolos justo debajo de los visibles.
    return (
        <div className="flex flex-col gap-1 w-full" onClick={e => e.stopPropagation()}>
            {events.map(evt => (
                <div key={evt.id} className="rbc-event">
                    <MyEventComponent event={evt} />
                </div>
            ))}
        </div>
    );
};
```

## 3. Inyección en el Calendario
```tsx
<Calendar
    popup={true} // Se requiere 'true' para activar la lógica de agrupación, pero...
                 // ...al reemplazar 'showMore', evitamos el popup real.
    components={{
        showMore: CustomShowMore 
    }}
    // ...
/>
```
*Nota: A veces `popup={true}` + override funciona mejor que `false` porque `false` intenta navegar.*

# Debugging Común
- **Filas desalineadas**: Si una celda crece y las otras no, el grid se rompe. Asegúrate de que `.rbc-row` tenga `align-items: flex-start` y que todas las celdas compartan el row expandido.
- **Drag and Drop**: Los eventos renderizados dentro de `showMore` pueden perder la capacidad de arrastre (DnD) nativa. Se debe advertir al usuario o implementar wrappers manuales si es crítico.

