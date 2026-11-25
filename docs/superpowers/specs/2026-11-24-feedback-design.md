# Feedback de quienes usan Regu — diseño

Acordado en la conversación del 24/11/2026 (camino A). Aprobado el 24/11/2026.

## Para qué
Saber qué falla, qué regla o dato está mal en cada cátedra y qué ideas tienen otros estudiantes, para leerlo y arreglarlo. A veces Facundo contesta, **por fuera de GitHub** (mail o WhatsApp), solo si la persona dejó su contacto dentro del mensaje.

## Objetivos
- **«Contanos» en Más:** mandar un comentario cuando sea, haya o no un problema.
- **Desde cada «Sin confirmar»:** dentro de la hoja que ya se abre, un enlace «¿En tu cátedra es distinto? Contanos» que lleva a «Contanos» con el contexto cargado (pantalla, título del aviso y materia, si hay).
- Lo enviado llega como *issue* a un repo **privado** aparte, `Facundo-Gauna/Regu-feedback`, sin que quien escribe necesite cuenta.
- Todo dentro de los planes gratis (Vercel Hobby, GitHub).

## Fuera de alcance
- Responder desde la app o desde GitHub; cuentas o login.
- Envío automático de errores.
- Analytics, rastreo, encuestas emergentes.
- Adjuntar el backup o las notas.

## Evitar
- Que algo salga del dispositivo sin que la persona lo vea y toque «Enviar».
- Que el token de GitHub llegue al navegador.
- Que un mensaje pueda mencionar gente (`@alguien`), cargar imágenes o romper el formato del *issue*.
- Perder lo escrito por falta de conexión.

## Caminos considerados
| Camino | A favor | En contra |
|---|---|---|
| **A. Función de Vercel + token fino de GitHub + protección liviana (elegido)** | Mismo repo y deploy; sin base de datos; gratis | El token vence (renovar a lo sumo una vez por año); el tope por IP es aproximado |
| B. GitHub App + Upstash desde el inicio | Credenciales sin vencimiento; tope exacto | Mucho más armado para pocos usuarios |
| C. Formspree, Tally u otro servicio de formularios | Cero código de servidor | No llega a GitHub; un tercero más con los mensajes |

Si aparece spam real, se suma Upstash (gratis) para un tope exacto, sin cambiar la app.

## La pantalla «Contanos» (`#/contanos`)
```
Contanos
¿Qué querés contarnos?
( ) Algo anda mal   ( ) Una regla o dato está mal
( ) Una idea        ( ) Otra cosa
┌───────────────────────────────────────┐
│ Escribí acá…                          │
└───────────────────────────────────────┘
Si querés que te respondamos, dejá tu mail o WhatsApp en el mensaje.
[✓] Incluir datos técnicos  (ver qué se manda ▾)
    Versión 0.1.0 · Pantalla: Materia · Firefox 140 · Android
    Sobre: «Dudas sobre esta regla» · Análisis Matemático I
Lo que escribas, incluido tu contacto si lo dejás, le llega a quien hace Regu.
                                            [ Enviar ]
```
- El tipo es obligatorio; por defecto «Otra cosa», o «Una regla o dato está mal» si se llegó desde «Sin confirmar».
- El mensaje es obligatorio: 10 a 2000 caracteres, con contador cerca del límite.
- **Datos técnicos (tilde, marcado por defecto, visibles antes de enviar):** versión de la app, pantalla de origen, navegador y sistema (resumidos, no el user agent entero), tema. **Nunca** notas, materias cargadas, estados ni el backup. El contexto de «Sin confirmar» (título del aviso, materia) va aparte y se ve igual.
- **Borrador:** lo escrito se guarda localmente mientras se escribe y se borra al enviar con éxito.
- **Resultados:**
  - Enviado → «¡Gracias! Lo vamos a leer.» y se limpia el borrador.
  - Sin conexión o error del servidor → «No se pudo enviar. Queda guardado: probá de nuevo cuando tengas internet» + botones **Copiar** y **Compartir** (`navigator.share` si existe) con el mensaje armado en texto.
  - Demasiados envíos (429) → «Mandaste varios seguidos. Probá en un rato.»
- No se reintenta solo en segundo plano: siempre envía la persona.

## La función `api/feedback.ts` (Vercel)
- `POST /api/feedback`, JSON: `{ tipo, mensaje, tecnico?, contexto?, sitio_web }`.
- **Validación:** `tipo` de la lista; `mensaje` 10–2000; `tecnico` y `contexto` objetos chicos de texto plano con claves conocidas y largo máximo; cuerpo total < 8 KB.
- **Protección:**
  - Campo trampa `sitio_web` (oculto en el formulario): si viene con algo, responder 201 sin crear nada.
  - `Origin` debe estar en `ORIGENES_PERMITIDOS` (variable de entorno, lista separada por comas: el dominio de producción y `http://localhost:5173`); si no, 403.
  - Tope aproximado por IP en memoria: 5 envíos por hora → 429.
- **GitHub:** `POST https://api.github.com/repos/{FEEDBACK_REPO}/issues` con `Authorization: Bearer {GITHUB_TOKEN}`. Variables de entorno: `GITHUB_TOKEN`, `FEEDBACK_REPO` (`Facundo-Gauna/Regu-feedback`), `ORIGENES_PERMITIDOS`.
- **El issue:**
  - Título: `[Tipo] primeros ~60 caracteres del mensaje` (en una línea).
  - Cuerpo: el mensaje dentro de un bloque de código con una cerca más larga que cualquier secuencia de comillas invertidas del texto (así no hay menciones, enlaces ni imágenes activas), y debajo una tabla con datos técnicos y contexto.
  - Etiquetas: `error`, `regla`, `idea` u `otro` según el tipo.
- **Respuestas:** 201 creado · 400 inválido · 403 origen · 405 método · 429 tope · 502 GitHub falló · 500 falta configuración.
- No se registra el contenido del mensaje en los logs; la IP no va al issue.

## Cómo se arma en el código (propuesta, el builder ajusta)
- `src/vista/feedback.ts` (puro, testeable en Node): tipos, validación compartida, armado del cuerpo para enviar, armado del texto para Copiar/Compartir.
- `api/feedback.ts`: la función. La lógica pura (validar, armar el issue, tope) en `api/_feedback.ts` (Vercel no publica como ruta los archivos que empiezan con `_`) o reutilizando `src/vista/feedback.ts` si el empaquetado de Vercel lo resuelve; verificarlo.
- `src/vista/rutas.ts`: ruta `contanos` con parámetros de contexto (`?d=regla&t=<título>&m=<materia>`).
- `src/app/pantallas/Contanos.tsx`; entrada en `Mas.tsx`.
- `SinConfirmar` (`src/app/componentes.tsx`): agrega al final de la hoja el enlace a «Contanos» con su `titulo` y, cuando lo haya, la materia (nueva prop opcional `materiaId`).
- **URL de envío:** `/api/feedback` absoluta por defecto (la app también funciona desde una subcarpeta), configurable con `VITE_FEEDBACK_URL`. La versión sale de `package.json` vía `define` de Vite.
- **Detección en Vercel:** confirmar en la documentación actual que un proyecto Vite publica `api/*.ts` como funciones sin configuración extra, y qué firma de handler usar (Request/Response estándar).
- **Service worker:** confirmar que Workbox no intercepta `/api/` (navigateFallback con `denylist` para `/api/`).
- **Ayuda** (`src/vista/ayuda.ts`) y textos de privacidad: «Nada sale del dispositivo salvo lo que vos mandás desde Contanos.» en PRODUCT.md, docs/prd.md (NF-8), ESTADO.md y la ayuda.

## Pruebas
- Node: validación, cerca del bloque de código con mensajes que traen comillas invertidas, `@menciones` y Markdown; que sin tilde no vaya ningún dato técnico; que nunca haya datos académicos; armado del issue; trampa; origen; tope; respuestas de GitHub (con `fetch` simulado).
- e2e: abrir «Contanos» desde Más y desde un «Sin confirmar» (con contexto visible), ver la vista previa, borrador que sobrevive a recargar, error simulado de red muestra Copiar y Compartir. El e2e no toca GitHub (la función se prueba en Node).

## Pruebas en navegador
Además del e2e en Firefox, se prueba a mano en Brave (pedido de Facundo).

## Puesta en marcha (lo hace Facundo; la guía va en ESTADO.md)
1. Crear el repo privado `Regu-feedback` en GitHub, vacío, con las etiquetas `error`, `regla`, `idea`, `otro`.
2. Crear un *fine-grained token* con acceso solo a ese repo y permiso **Issues: Read and write**; vencimiento de un año (anotar la fecha).
3. En Vercel → proyecto Regu → Settings → Environment Variables: `GITHUB_TOKEN`, `FEEDBACK_REPO`, `ORIGENES_PERMITIDOS`.
4. Activar notificaciones de GitHub para ese repo (para enterarse de cada mensaje).

## Rama y publicación
Se construye en una rama nueva `feedback` desde `notas-estructura` (ahí están las pantallas actuales). Llega a producción recién cuando se mergee a `main`, lo que sigue siendo decisión de Facundo.

## Decisiones tomadas por Claude (revisar)
- Los cuatro tipos y sus etiquetas.
- Límites: 10–2000 caracteres, 5 envíos por IP por hora, 8 KB.
- Datos técnicos marcados por defecto (se ven y se pueden sacar).
- Borrador local y sin reintento automático.
- Texto del aviso de privacidad sin nombrar GitHub.
