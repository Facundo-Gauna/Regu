# Estado del proyecto y lo que falta

> Resumen de la conversación de desarrollo, compactado para poder retomar sin releerla. Es una foto del **23/11/2026**. Si algo de acá contradice al código, manda el código.

## En una línea

Regu es una PWA personal, local y sin cuentas que le dice a un estudiante de Ingeniería en Sistemas de Información de la UTN FRVM qué puede cursar, qué puede rendir y cómo viene en cada materia. El MVP está completo y probado, y está desplegada en Vercel. El **"qué te falta"** existe solo para las 8 materias de 1.er año y con las reglas sin confirmar.

## Qué está hecho

| Área | Qué hay | Dónde se verificó |
|---|---|---|
| Motor de reglas | Estado de cada materia calculado a partir de lo cargado (nunca guardado), disponibilidad para cursar y rendir con las excepciones de la Ord. 1549, estudiante regular, electivas, títulos, calendario | Tests con Node 26 |
| Datos de referencia | Plan ISI 2023 y calendario 2026/27 transcriptos a mano, con validador | `npm run validar-datos` |
| Notas por cursada (1.ª entrega) | Evaluaciones con nota, promedio, mínima, recuperatorio que reemplaza, referencias ajustables | Tests y e2e |
| Camino de la materia | Cursada → Final → Aprobada, con promoción / regular / libre que se ven al instante | Tests y e2e |
| Mapa del plan | Tira horizontal por año con caminos entre materias (sólido = necesita, punteado = desbloquea) | Tests y e2e |
| PWA | Instalable, abre sin conexión, funciona servida desde una subcarpeta | Prueba e2e en **Firefox** |
| Reglas de cátedra de 1.er año | Las 8 materias transcriptas de sus planificaciones 2026, con fuente, cita y dudas. Cinco se calculan («qué te falta», con asistencia y laboratorios aparte) y tres se muestran como texto | Tests y e2e |
| Backup | Exportar e importar validado, que conserva las notas | Tests y e2e |

Verificación al 24/11/2026: 169 tests, 41 pruebas e2e, contrastes de la paleta recalculados en tema claro y oscuro. Se corre todo con `npm run check` y `npm run e2e`.

## Qué falta, en orden de prioridad

1. **Confirmar las reglas de 1.er año con quien cursa** (están transcriptas pero ninguna está confirmada: cada una trae su lista de dudas) y completar lo que falta. Física I, Arquitectura y Sistemas y Procesos tienen interpretaciones a verificar; Análisis Matemático I tiene una contradicción en el texto («promedio 6(siete)»). Quedan **como texto, sin calcular**: Algoritmos (se mide en puntos), Análisis Matemático I y Álgebra (ponderaciones por resultado de aprendizaje). Después, las reglas de 2.º año en adelante.
2. **Probarla en un celular real.** Ya está desplegada en Vercel (HTTPS), pero no se verificó la instalación como app ni el uso sin conexión en Android ni iOS.
3. **Importar pegando** las notas de autogestión o del campus. Para armarlo hace falta una captura de cada pantalla con los datos personales tapados. No hay conexión directa y no se resolvió: ver [`docs/idea.md`](docs/idea.md) §18.
4. **Sin verificar** (se probó solo en Firefox con Node 26): Chrome y Safari, dispositivos Android e iOS reales, el aviso de "hay una versión nueva" del service worker, y la instalación como app.
5. **Datos que la facultad no publica** y se dejan configurables: horas de electivas por nivel, correlativas de las electivas del plan 2023, requisitos del título intermedio, fechas de inscripción a cursado, mesas por materia.
6. **Diseño (en la rama `diseno-calido`, sin publicar):** hechos el recorte de textos y la dirección cálida (ver [`DESIGN.md`](DESIGN.md)). También: Inicio con «próxima acción», turnos siguientes plegados en Finales y años plegables en Materias. Falta: escala de tipografía, animaciones y la pasada final. Siguen los formatos de fecha mezclados. El detector de diseño marca 1 hallazgo (la tipografía), que se deja a propósito. Sin probar en un celular real. En la rama `notas-estructura` (encima de la anterior): notas por partes con ponderaciones, carga rápida en `#/cargar`, accesos en Inicio y atajo del ícono ([diseño](docs/superpowers/specs/2026-11-24-notas-estructura-design.md)). Falta probar el atajo en un Android real. En la misma rama: temas UTN, Atardecer, Violeta y Océano; período fijo según el plan (corrige un error que sigue en `main`); «Cómo se aprueba» por cursada; resultados explicados.
7. **Dependencias:** `npm audit` marca 1 aviso moderado en las herramientas de compilación (`glob` dentro de `workbox-build`, que trae `vite-plugin-pwa`) y **0 en producción**. El arreglo que propone npm (`--force`) baja `workbox-build` a una versión anterior con cambios incompatibles: no se aplicó. Revisar cuando `workbox-build` publique una versión corregida.
8. **Más adelante:** simulación "qué pasa si", planificador de carrera, otras carreras, horarios con superposición, exportar a `.ics`.

## Puesta en marcha del feedback («Contanos»)

El código está en la rama `feedback` ([diseño](docs/superpowers/specs/2026-11-24-feedback-design.md)), que cuelga de `notas-estructura`, que cuelga de `diseno-calido`: **mergear `feedback` en `main` publica las tres juntas**. La función está probada en Node, pero **todavía no corrió en Vercel ni creó un issue real**. La firma `export function POST` está tomada de la documentación de Vercel; que su `.ts` compile con el `tsconfig.json` del repo **no está confirmado**: en el primer despliegue de prueba, mirar primero el log de compilación de la función.

1. En GitHub, crear el repo **privado** `Regu-feedback` (alcanza con un README) y las etiquetas `error`, `regla`, `idea` y `otro`.
2. Crear un *fine-grained token* (Settings → Developer settings → Personal access tokens): acceso **solo** a `Regu-feedback`, permiso **Issues: Read and write**, vencimiento de un año. Anotar acá la fecha de vencimiento: ______.
3. En Vercel → proyecto Regu → Settings → Environment Variables (en **Production** y **Preview**):
   - `GITHUB_TOKEN`: el token (marcarlo como *Sensitive*; con eso Vercel puede pedir cargarlo por entorno).
   - `FEEDBACK_REPO`: `Facundo-Gauna/Regu-feedback`
   - `ORIGENES_PERMITIDOS`: el origen de producción (`https://…`, sin barra final). Para probar una preview, sumar su origen separado por coma.
   - Después de crear o cambiar variables hay que volver a desplegar.
4. En `Regu-feedback`, activar las notificaciones (Watch → All activity).

**Cómo probarlo:** mandar un mensaje desde Más → Contanos en el sitio desplegado y ver que aparece el issue. Si sale «No se pudo enviar», mirar los logs de la función en Vercel: 403 es el origen, 500 son las variables, 502 es el token o el repo.

## Decisiones que no hay que revertir sin avisar

- **El ámbar `#F5A800` es solo para la marca y la acción principal.** Los estados, avisos y selecciones usan otros colores. "Cursando" es violeta.
- **Nunca se promete un resultado.** «Qué te falta» dice si por las **notas** se cumple, no se cumple o todavía no se sabe, siempre «según la planificación 2026»; la asistencia, los laboratorios y demás se listan como «depende de vos» porque la app no los conoce. Una regla con dudas se muestra «A confirmar», y una que no se puede expresar sin interpretar se muestra como texto y no se calcula.
- **Las electivas con datos sin confirmar no figuran como habilitadas.**
- **El estado de una materia se calcula, no se guarda.** Lo único que se guarda son los hechos (cursadas, finales, notas, correcciones).
- **Los datos son locales:** sin cuentas. Nada sale del dispositivo salvo lo que vos mandás desde «Contanos».
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
