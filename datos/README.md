# Datos de la app

Hay dos tipos de datos:

1. **Datos de referencia** (esta carpeta): planes, calendarios y, más adelante, reglas de aprobación. Vienen con la app, son iguales para todos los usuarios y se actualizan con nuevas versiones.
2. **Datos del usuario**: su estado, notas y elecciones. Viven en el dispositivo (IndexedDB) y se exportan como backup. **Nunca se mezclan** con los de referencia: referencian sus `id`.

```
datos/
├── esquemas/
│   ├── plan.schema.json          JSON Schema del plan
│   └── calendario.schema.json    JSON Schema del calendario
├── planes/
│   └── utn-frvm-isi-2023.json    Plan ISI 2023 (transcripto 23/11/2026)
├── calendarios/
│   └── utn-frvm-2026-27.json     Calendario académico 2026/27
└── reglas/                       (v0.2) reglas de aprobación por materia y año
```

Validar todo: `node herramientas/validar-datos.mjs` (sin dependencias). Sale con código 1 si hay errores.

## 1. Convenciones

- **ids**: minúsculas, números y guiones (`analisis-matematico-1`). Son estables: **nunca se usa el número del PDF** como referencia, porque cambia entre planes. El número se guarda en `numero` solo para mostrarlo.
- **Fechas**: `AAAA-MM-DD`, hora local de Argentina.
- **Dato desconocido**: `null` (ej. `horas: null` = "no especificado"). La app lo muestra así y deja que el usuario lo complete.
- **`verificar`**: lista de dudas de la transcripción. La app las muestra como advertencias y el validador las lista.
- **`regimenOrigen`**: de dónde sale el régimen cuando el plan no lo trae (`plan`, `horario`, `inferido`, `usuario`).
- **`schemaVersion`**: versión del formato. Cuando cambie, se agrega una migración.

## 2. Plan: semántica

### Correlativas

Cada materia, electiva y requisito tiene:

```json
"correlativas": {
  "cursar": { "regularizadas": [...], "aprobadas": [...] },
  "rendir": { "aprobadas": [...] | "todas" }
}
```

| Campo | Columna del PDF | Se cumple si la correlativa está… |
|---|---|---|
| `cursar.regularizadas` | Para cursar → Cursadas | regular **o** aprobada |
| `cursar.aprobadas` | Para cursar → Aprobadas | aprobada |
| `rendir.aprobadas` | P/Rendir → Aprobadas | aprobada |

- `"todas"` en `rendir.aprobadas`: todas las materias obligatorias, los paquetes de electivas y los requisitos del plan, **excepto** el propio ítem y los demás que también digan `"todas"`. En ISI 2023 lo usan Proyecto Final y PPS.
- Las correlativas pueden apuntar a materias obligatorias o a electivas, nunca a paquetes, requisitos ni títulos.
- **Excepciones del reglamento**: no van en el plan; las aplica el motor (§4 de `docs/idea.md`). Son la de 1 ciclo lectivo para rendir, la de aprobación directa y la de últimas materias.

### Electivas

- `paquetesElectivas`: lo que el plan exige por nivel. `horasExigidas: null` = el plan oficial lo indica, pero no está transcripto.
- `electivas`: catálogo de las materias electivas que se pueden tomar, con sus horas, régimen y correlativas. `paquetesSugeridos` es solo una sugerencia: **el usuario elige** a qué paquete imputa cada electiva (ver §4).
- Las correlativas de las electivas del catálogo actual están **adaptadas del plan 2008** y marcadas con `verificar`.

### Requisitos no-materia

PPS, habilitación profesional, pasantías, seminarios. Usan el mismo formato de correlativas: `cursar` = para iniciarlo, `rendir` = para acreditarlo.

### Títulos

```json
{ "id": "...", "tipo": "intermedio", "hastaNivel": 4 }
```

Se obtiene completando **todo lo que tenga `nivel <= hastaNivel`**: materias obligatorias, paquetes de electivas (horas cumplidas) y requisitos. A eso se suman los `requisitosExtra`. `hastaNivel: null` = todo el plan (título final).

## 3. Calendario: semántica

- `ciclosLectivos`: del inicio de clases al último llamado de feb–mar siguiente. Determinan la excepción de 1 ciclo lectivo y el estado de estudiante regular.
- `cuatrimestres`: inicio y fin de cursado. `inscripcion` es opcional. Si falta, la ventana se estima con `reglas.inscripcionCursadoDiasAntes` y `reglas.inscripcionCursadoDiasDespues` (14 y 14), y se muestra como "estimada".
- `periodosExamen`: cada semana de turno, o bloque de mesas móviles, con su inicio de inscripción. `tipo`:
  - `turno`: turno de examen;
  - `mesas-moviles`: mesas de final durante el cursado;
  - `especial`: mesa especial.
  - Las mesas concretas de cada materia (fecha y hora) las carga el usuario, porque solo están en autogestión.
- `feriados`: días no hábiles. Se usan para el cierre de inscripción a 48 h hábiles (`reglas.cierreInscripcionFinalHorasHabiles`). Sábados y domingos tampoco son hábiles.
- `eventos`: informativos (encuestas docentes, días institucionales).

## 4. Datos del usuario (backup)

La fuente de verdad de la forma de los datos es el código: `DatosUsuario` en `src/motor/tipos.ts`, y su lectura y validación en `src/datos/backup.ts`. El mismo formato se usa para lo que se guarda en el dispositivo (IndexedDB) y para el backup exportable:

```json
{
  "app": "regu",
  "schemaVersion": 1,
  "exportado": "2026-11-23T20:00:00.000Z",
  "datos": {
    "perfil": { "planId": "utn-frvm-isi-2023", "calendarioId": "utn-frvm-2026-27", "anioIngreso": 2026 },
    "materias": [
      {
        "materiaId": "bases-datos",
        "cursadas": [{
          "id": "2026-1C", "ciclo": 2026, "cuatrimestre": "1C", "resultado": "regular", "fechaResultado": "2026-07-03",
          "evaluaciones": [
            { "id": "e1", "nombre": "Parcial 1", "tipo": "parcial", "nota": 8, "fecha": "2026-05-12" },
            { "id": "e2", "nombre": "Recuperatorio P2", "tipo": "recuperatorio", "nota": null, "reemplazaA": "e3" }
          ],
          "umbrales": { "promocion": 8, "regular": 6 }
        }],
        "finales": [{ "fecha": "2026-12-11", "resultado": "insuficiente", "nota": 4 }],
        "aprobacion": { "forma": "directa", "nota": 8, "fecha": "2026-07-03", "registradaEnMesa": false },
        "correccion": { "estado": "regular", "motivo": "…", "fecha": "2026-11-20" }
      }
    ],
    "electivasElegidas": [{ "electivaId": "testing-software", "paqueteId": "electivas-nivel-3", "horas": 48 }],
    "requisitos": [{ "requisitoId": "habilitacion-profesional", "estado": "en-curso" }],
    "horasPaquetes": { "electivas-nivel-3": 96 },
    "correccionesPlan": [{ "ref": "comunicacion-datos", "campo": "regimen", "valor": "1C" }],
    "calendario": { "cuatrimestres": [], "periodosExamen": [], "ciclosLectivos": [], "feriados": [] }
  }
}
```

- `materias`, `electivasElegidas` y `requisitos` son obligatorios en el motor; al importar, los que falten se completan con `[]`.
- `horasPaquetes`: horas exigidas por paquete cargadas por el usuario cuando el plan no las trae.
- `correccionesPlan`: arreglos del usuario sobre datos de referencia (ej. un régimen mal transcripto). Se aplican encima del plan sin modificarlo.
- `calendario`: fechas que el usuario cargó y que todavía no están en el calendario de referencia (ej. el cursado del año siguiente). Un ítem con el mismo `id` reemplaza al de referencia; el resto se agrega.
- `evaluaciones` (por cursada): `nota` es de 1 a 10 o `null` (todavía sin nota); `tipo` es `parcial`, `tp`, `recuperatorio` u `otra`; `reemplazaA` apunta a la evaluación cuya nota reemplaza un recuperatorio. `umbrales` son las referencias del usuario; si faltan se usa la regla general 8 / 6 marcada como sin confirmar. Al volver a guardar una cursada se conservan sus notas.
- Las **mesas de examen por materia** todavía no tienen lugar en el modelo (CAL-4).
- Las preferencias de la app (tema, fecha simulada, último backup) **no** forman parte del backup.

**Importación** (`leerBackup`): rechaza archivos que no son de Regu, versiones de esquema desconocidas o más nuevas, y datos inválidos (fechas, notas fuera de rango, enums), con la ruta de cada error. Los ids que no están en el plan **no se borran**: se conservan y se avisan, porque un plan puede haberse actualizado.

**Decisiones del modelo:**
- **El estado de una materia no se guarda: se calcula** a partir de las cursadas, finales, aprobación, corrección manual y la fecha. Lo único que se guarda son los hechos. Así no hay estados inconsistentes.
- **Aplazos** = cantidad de `finales` con `insuficiente` posteriores al cierre de la última cursada regular. Por eso toda cursada con resultado lleva `fechaResultado`: sin ella se contarían mal los aplazos. Recursar los reinicia.
- **Correcciones** sobre los datos de referencia se guardan aparte para que una actualización del plan no las pise.

## 5. Agregar o actualizar un plan

1. Copiar un plan existente y cambiar `id`, `carrera`, `anioPlan`.
2. Transcribir materias por nivel; usar ids descriptivos.
3. Lo que no esté en el PDF va en `null` + `verificar`.
4. Correr `node herramientas/validar-datos.mjs` hasta tener 0 errores.
5. Subir `versionDatos` en cada cambio.
