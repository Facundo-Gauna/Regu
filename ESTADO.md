# Estado del proyecto y lo que falta

> Resumen de la conversación de desarrollo, compactado para poder retomar sin releerla. Es una foto del **23/11/2026**. Si algo de acá contradice al código, manda el código.

## En una línea

Regu es una PWA personal, local y sin cuentas que le dice a un estudiante de Ingeniería en Sistemas de Información de la UTN FRVM qué puede cursar, qué puede rendir y cómo viene en cada materia. El MVP está completo y probado. **No está publicada** y **no tiene todavía el "qué te falta para promocionar"**.

## Qué está hecho

| Área | Qué hay | Dónde se verificó |
|---|---|---|
| Motor de reglas | Estado de cada materia calculado a partir de lo cargado (nunca guardado), disponibilidad para cursar y rendir con las excepciones de la Ord. 1549, estudiante regular, electivas, títulos, calendario | Tests con Node 26 |
| Datos de referencia | Plan ISI 2023 y calendario 2026/27 transcriptos a mano, con validador | `npm run validar-datos` |
| Notas por cursada (1.ª entrega) | Evaluaciones con nota, promedio, mínima, recuperatorio que reemplaza, referencias ajustables | Tests y e2e |
| Camino de la materia | Cursada → Final → Aprobada, con promoción / regular / libre que se ven al instante | Tests y e2e |
| Mapa del plan | Tira horizontal por año con caminos entre materias (sólido = necesita, punteado = desbloquea) | Tests y e2e |
| PWA | Instalable, abre sin conexión, funciona servida desde una subcarpeta | Prueba e2e en **Firefox** |
| Backup | Exportar e importar validado, que conserva las notas | Tests y e2e |

Verificación al 23/11/2026: 102 tests, 27 pruebas e2e, contrastes AA calculados en tema claro y oscuro. Se corre todo con `npm run check` y `npm run e2e`.

## Qué falta, en orden de prioridad

1. **Reglas de aprobación de las 8 materias de 1.er año**, transcriptas de sus planificaciones de cátedra, y recién ahí mostrar el **"qué te falta"**. Las planificaciones tienen unas 20 variantes de regla (mínimo por instancia, promedios, porcentajes, recuperatorios que mantienen o hacen perder la promoción). Hoy solo se muestra un resumen de las notas y la regla general 8 / 6 marcada "sin confirmar".
2. **Publicarla y probarla en un celular.** La instalación como app y el uso sin conexión necesitan HTTPS. Pasos en el [README](README.md#deploy-en-vercel).
3. **Importar pegando** las notas de autogestión o del campus. Para armarlo hace falta una captura de cada pantalla con los datos personales tapados. No hay conexión directa y no se resolvió: ver [`docs/idea.md`](docs/idea.md) §18.
4. **Sin verificar** (se probó solo en Firefox con Node 26): Chrome y Safari, dispositivos Android e iOS reales, el aviso de "hay una versión nueva" del service worker, y la instalación como app.
5. **Datos que la facultad no publica** y se dejan configurables: horas de electivas por nivel, correlativas de las electivas del plan 2023, requisitos del título intermedio, fechas de inscripción a cursado, mesas por materia.
6. **Diseño pendiente:** formatos de fecha mezclados, dos tarjetas de título casi iguales en Progreso, y el detector de diseño sigue marcando 10 hallazgos (franjas laterales de estado, barra ámbar bajo las portadas, la tipografía) que se dejaron a propósito. No se pudo registrar la excepción en el hook.
7. **Más adelante:** simulación "qué pasa si", planificador de carrera, otras carreras, horarios con superposición, exportar a `.ics`.

## Decisiones que no hay que revertir sin avisar

- **El ámbar `#F5A800` es solo para la marca y la acción principal.** Los estados, avisos y selecciones usan otros colores. "Cursando" es violeta.
- **Las notas nunca prometen una promoción.** Es un resumen de lo cargado, no el resultado oficial.
- **Las electivas con datos sin confirmar no figuran como habilitadas.**
- **El estado de una materia se calcula, no se guarda.** Lo único que se guarda son los hechos (cursadas, finales, notas, correcciones).
- **Todo es local:** sin cuentas, sin servidor, nada sale del dispositivo.
- **Las cursadas se fechan "hoy" con tope en el fin del cuatrimestre**, para que el cambio se vea en el momento.
- **Regu no es una app oficial de la UTN.** No usa su logo ni su asterisco, y la fuente de verdad es siempre autogestión.
- **No sondear los servidores de la facultad** (autogestión, campus) sin que el usuario lo pida expresamente.
- **No ejecutar binarios descargados.** Un intento de usar `geckodriver` fue bloqueado; la prueba e2e se hizo con una página propia sobre el Firefox instalado.
- **UI en español rioplatense**, con el vocabulario de la facultad (aplazo, regular, mesa, promoción).

## Cómo retomar

```sh
npm install
npm run check      # tipos + validación de datos + tests + compilación
npm run e2e        # pruebas en Firefox real (necesita Firefox instalado)
npm run dev        # servidor de desarrollo; probar con /?ejemplo=1
```

Para el siguiente paso (reglas de 1.er año): bajar las planificaciones de las 8 materias (ver [`planes/README.md`](planes/README.md)), definir los bloques de regla que hagan falta (ver [`docs/idea.md`](docs/idea.md) §6) y probarlos con casos reales antes de mostrar un "qué te falta".

## Dónde está cada cosa

- Visión, modelo y decisiones: [`docs/idea.md`](docs/idea.md).
- Requisitos y estado por requisito: [`docs/prd.md`](docs/prd.md).
- Qué dicen las fuentes (Ord. 1549, planes, calendario, planificaciones): [`docs/investigacion.md`](docs/investigacion.md).
- Formato de los datos: [`datos/README.md`](datos/README.md).
