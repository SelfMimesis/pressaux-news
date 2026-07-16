# PressAux Interview Deck

Tablet responsive de entrevistas hecha únicamente con HTML, CSS y JavaScript vanilla.

## Ejecución

El SVG se inserta mediante `fetch`, por lo que debe abrirse desde un servidor estático (no directamente como `file://`). Desde esta carpeta:

```powershell
npx serve .
```

También sirve `python -m http.server 8000`. Abra la URL local indicada.

## Integración SVG y responsive

`app.js` descarga `sc1.A1_Newscaster_Tablet.svg`, lo inserta inline y conserva `#BG`, `#UI`, el `viewBox` 1600×2560 y `preserveAspectRatio="xMidYMid meet"`. El arte no recibe eventos de puntero. La aplicación HTML se superpone en `x=79`, `y=431`, `w=1443`, `h=1529`, convertidos a porcentajes del viewBox. En retrato la tablet se limita por ancho/altura; en paisaje se ajusta por altura, sin deformación. A partir de 1200 px de ancho aparece el panel ambiental secundario.

## Parser de preguntas

Se carga el SVG 1600×5120 con `DOMParser`. Solo se consideran `tspan` hoja (sin `tspan` descendientes), se heredan coordenadas del padre cuando hace falta, se ordenan por Y, X y orden original, y se concatenan hasta encontrar la siguiente numeración `1.`–`39.`. Se valida que el resultado tenga exactamente 39 entradas. `FALLBACK_QUESTIONS` contiene una copia literal para funcionamiento de respaldo.

Para modificar preguntas, edite los `tspan` del SVG manteniendo la numeración y coordenadas. Actualice también `FALLBACK_QUESTIONS` si desea que el respaldo coincida.

## Persistencia

- `pressaux.activeSession`: id de la sesión activa.
- `pressaux.interview.<id>`: JSON con `session` (`id`, `name`, `startedAt`, `updatedAt`) y `records` (`note`, `completed`, `favorite`).

El guardado automático tiene un debounce de 450 ms. Los indicadores son `SAVING`, `SAVED` u `OFFLINE`. El cuarto botón inferior (`FX`) activa una ráfaga visual y no descarga archivos.

## Teclado

- `↑` / `↓`: pregunta anterior/siguiente.
- `Page Up` / `Page Down`: salto de cinco preguntas.
- `Ctrl/Cmd + F`: buscador.
- `Ctrl/Cmd + S`: guardado inmediato.

Todos los controles admiten ratón, teclado y táctil. `prefers-reduced-motion` desactiva las animaciones decorativas.
