# Idea: sistema académico unificado para la UTN FRVM

> Estado: borrador v0.4 (23/11/2026). v0.4: respuestas sobre electivas, título intermedio, mesas móviles, inscripción a cursado y plataforma. El detalle de requisitos está en `prd.md` y el formato de datos en `datos/`.
> v0.3: Incorpora las correcciones de `investigacion.md` (Ord. 1549, planes, calendario 2026/27 y planificaciones de cátedra 2026). Las referencias "Ord. 1549 x.y" apuntan al Reglamento de Estudio de grado. Lo marcado **[PENDIENTE]** no está en ninguna fuente pública.

## 1. Problema

En la UTN Facultad Regional Villa María la información académica está repartida:

- Las notas viven en dos lugares complementarios: el **campus virtual** (cuestionarios, evaluaciones, ejercicios) y **autogestión** (en materias más básicas los profes cargan parciales y notas ahí).
- El **plan de estudios y las correlativas** están en un PDF (en muchos casos, una imagen escaneada).
- Las **condiciones de aprobación de cada materia** están en su planificación de cátedra, que cambia cada año y varía mucho entre materias.
- El **reglamento** (Ord. 1549) agrega reglas que casi nadie conoce: cuándo no se exigen las correlativas para rendir, cuándo se pierde el cursado, qué es ser estudiante regular.
- Hay que cruzar todo a mano para saber: qué puedo cursar, si estoy regularizando o promocionando, qué puedo rendir y cuándo me puedo inscribir.

**Objetivo:** una app personal, local y simple que unifique notas, estado por materia, reglas del plan y del reglamento y fechas importantes, y responda "¿qué puedo hacer ahora?".

### Criterio de éxito

- **MVP:** durante un cuatrimestre la uso para decidir mis inscripciones (cursado y finales) **sin abrir autogestión ni el PDF del plan**.
- **Versión completa:** sé en todo momento si estoy promocionando/regularizando cada materia y qué nota necesito, sin hacer cuentas a mano ni releer la planificación.

## 2. Alcance

La pregunta principal ("¿qué puedo cursar/rendir?") **no necesita notas**: alcanza con el plan, el estado de cada materia y las fechas. Por eso el alcance se divide en etapas.

**MVP (etapa 1): plan y disponibilidad**
- Un solo usuario, datos locales, sin cuentas.
- Plan ISI 2023 transcripto a mano como archivo de datos (JSON versionado + validador).
- Estado por materia **cargado a mano**: no cursada, cursando, regular (con fecha de cursado), aprobada (con nota, fecha y forma: directa / final / equivalencia), y cantidad de aplazos.
- Materias habilitadas para cursar y para rendir, aplicando las reglas de la Ord. 1549 (§4).
- Indicador de **estudiante regular en la carrera**.
- Mapa de correlativas básico (qué desbloquea cada materia).
- Exportar/importar backup.

**Etapa 2: notas y motor de reglas**
- **Reglas de aprobación precargadas por materia** para ISI, transcriptas de las planificaciones de cátedra del año. Se pueden editar.
- Carga manual de notas (decisión tomada: el scraping no compensa).
- Estado calculado automáticamente + "qué te falta" + **corrección manual del estado**.
- Historial de finales y promedios.

**Etapa 3: calendario y finales**
- Calendario académico precargado (2026/27) y editable.
- Turnos de final, mesas móviles, inscripciones con aviso de cierre (48 h hábiles).
- Exportación a `.ics`.
- Recordatorios para cargar notas después de cada evaluación.

**Fuera por ahora:**
- Multicuenta, sincronización en la nube, hosting institucional.
- Scraping automático del campus/autogestión.
- Simulación "¿qué pasa si apruebo X?" y planificador de carrera (**fase 2**, ver §11).

## 3. Preguntas respondidas

| Tema | Decisión / dato | Fuente |
|---|---|---|
| Fuente de notas | Campus + autogestión; **carga manual** | Decisión |
| Plan y correlativas | Transcripción manual a JSON (los PDF son imágenes y tienen errores) | Planes |
| Carrera principal | Ingeniería en Sistemas de Información, **plan 2023**, cursando 1.er año | Usuario |
| Otras carreras | Diseño genérico; el formato del plan cubre las variantes de las 13 carreras de FRVM | Planes |
| Reglas de aprobación | Por **cursada**, precargadas por materia desde la planificación del año; editables | Planificaciones |
| Plantilla por defecto | AD: ≥ 8 en cada instancia; regular: ≥ 6 en cada instancia; 1 recuperatorio; 75 % asistencia | Patrón más común en ISI |
| Escala de notas | Enteros 1–10; aprueba con 6; AD = promedio de instancias aprobadas redondeado al entero más próximo | Ord. 1549 7.2.1, 8.2.3 |
| Vencimiento del cursado | **No vence**. Solo se pierde con 4 aplazos | Ord. 1549 7.1.2, 8.2.6 |
| Límite de finales | **4 aplazos** (nota 1–5) por materia → recursar. Ausentes no cuentan. No aplica a la última materia | Ord. 1549 8.2.6, 8.2.7 |
| Llamados por año | 10 por materia por ciclo lectivo | Ord. 1549 6.1.2 |
| Examen libre | Solo en materias autorizadas por el Consejo Superior; en la práctica "libre" = recursar | Ord. 1549 7.3 |
| Inscripción condicional | No existe | Ord. 1549 5.2.3 |
| Título intermedio | Lo indica el plan en el nivel donde aparece. Se otorga al **completar todo hasta ese nivel inclusive** (obligatorias, electivas y la habilitación de ese tramo). En ISI 2023 aparece en 4.º: hay que completar 1.º a 4.º. El nivel varía según la carrera. Nombre en ISI: Analista Desarrollador/a Universitario/a de Sistemas de Información | Usuario + plan + web |
| Electivas | Se exige una **cantidad de horas** de electivas por nivel, indicada en el plan oficial. El resumen PDF de FRVM no la muestra, así que el valor queda **configurable y "no especificado"** hasta conseguirlo. El usuario **elige qué electivas toma** y cada una suma sus horas al paquete | Usuario + planes |
| Uso | Celular primero, **Android e iOS**; también escritorio / web | Usuario |
| Datos | Locales por usuario; hosting por la UTN es idea futura, sin definir | Decisión |
| Estética | Diseño llamativo es requisito | Decisión |
| Reglas que cambian entre años | La regla se **copia a la cursada** al crearla (las planificaciones se renuevan cada año) | Planificaciones |

## 4. Reglas del reglamento (Ord. 1549) que aplica el sistema

Estas reglas son comunes a todas las carreras de grado y van en el motor, no en los datos de cada materia.

### Inscripción a cursar

- Se exigen las correlativas del plan **al momento de inscribirse**: las de la columna "cursadas" (regular o aprobada) y las de la columna "aprobadas" (5.2.1).
- No hay inscripciones condicionales (5.2.3).
- **Excepción de últimas materias:** si lo que te falta no supera la carga horaria del último nivel, podés cursar sin correlativas, pero tenés que cumplirlas para rendir (5.3.1).
- **Estudiante no regular en la carrera:** puede inscribirse en al menos 1 materia (7.4.3).
- El cálculo es por correlativas, no por año: se pueden cursar materias de otros niveles.

### Rendir final

**Puedo rendir X** si se cumplen todas estas condiciones:
1. X está **regular** (cursado aprobado, aprobación no directa).
2. Tengo **menos de 4 aplazos** en X, o X es la última materia del plan.
3. Se cumplen las **correlativas para rendir** del plan, **salvo** que:
   - la inscripción al final sea dentro de **1 ciclo lectivo siguiente al cursado** (7.2.2).
4. Hay una **mesa con inscripción abierta**, que cierra 48 h hábiles antes del examen.

**Aprobación directa:** no se exigen correlativas para rendir (7.2.1). En algunas materias hay que inscribirse a una mesa para que la nota quede en el acta (ver §5).

**Ciclo lectivo:** desde el inicio de clases del año hasta el último llamado de febrero–marzo del año siguiente. Ejemplo: el ciclo 2026 va del 16/3/2026 al 12/3/2027.

### Pérdida del cursado

- Con más del 25 % de inasistencias caduca la inscripción a la materia (hasta 40 % por excepción) (7.1.1).
- Con el 4.º aplazo hay que recursar (8.2.6).
- No hay vencimiento por tiempo.

### Estudiante regular en la carrera

- Hay que aprobar al menos **2 materias por ciclo lectivo**; el año de ingreso no cuenta (7.4).
- Si no, pasás a **no regular**. Volvés a ser regular automáticamente cuando aprobás 2 materias en un ciclo.
- La app muestra el estado y cuántas materias faltan en el ciclo actual.

## 5. Modelo conceptual

Entidades principales:

- **Carrera / Plan**: id, nombre, año del plan, versión de los datos, niveles, materias, requisitos no-materia, paquetes de electivas, título intermedio (si el plan lo indica).
- **Materia del plan**: id estable (no el número del PDF, que cambia entre planes), número en el plan, nombre, nivel, régimen (anual / 1C / 2C), correlativas:
  - para cursar: lista de *cursadas* y lista de *aprobadas*;
  - para rendir: lista de *aprobadas*, o "TODAS".
- **Paquete de electivas**: nivel, cuatrimestre (si aplica), **horas exigidas** (dato del plan oficial; mientras falte queda como "no especificado" y el usuario puede cargarlo).
- **Catálogo de electivas**: materias electivas con sus horas, régimen y correlativas propias. Se comparte entre planes (en 2026 se ofrecen electivas del plan 2008).
- **Elección de electivas** (dato del usuario): qué electiva toma, a qué paquete la imputa y cuántas horas suma. Posibilidad a validar: no está confirmado si una electiva puede repartir horas entre paquetes.
- **Requisito no-materia**: PPS, horas de pasantías o seminarios (ej. "200 horas reloj" en Electrónica). Tienen correlativas y estado (pendiente / en curso / cumplido).
- **Título intermedio**: si el plan lo indica, se obtiene completando todo hasta su nivel: obligatorias, paquetes de electivas e ítems de habilitación de esos niveles.
- **Cursada** (materia + ciclo lectivo + cuatrimestre): es lo que tiene estado y notas. Guarda **una copia de la regla de aprobación** vigente ese año.
- **Evaluación**: parcial, TP, cuestionario, integrador, coloquio, recuperatorio. Tiene:
  - nota numérica, porcentaje o valor no numérico (aprobado / desaprobado / entregado);
  - fecha;
  - tipo: individual o grupal;
  - parte: teórica, práctica o ambas;
  - a qué RA/unidad o instancia pertenece, y a cuál reemplaza si es recuperatorio.
- **Regla de aprobación**: bloques combinables (§6).
- **Intento de final**: fecha, llamado, resultado (aprobado con nota / insuficiente con nota / ausente).
- **Corrección manual**: estado forzado + motivo + fecha. Tiene prioridad sobre el estado calculado.
- **Calendario**: versión, ciclo lectivo, periodos de cursado, turnos de final, mesas móviles, inicios de inscripción, feriados, receso, encuestas.
- **Evento personal**: parcial, entrega, recordatorio.

### Estados de una cursada

`cursando` → `aprobada directa` | `promoción práctica` | `regular` | `libre (recursar)`

- **Aprobada directa:** la materia queda aprobada con la nota de la cursada. Puede tener la marca "falta registrar en mesa".
- **Promoción práctica:** regular, con el final solo teórico (Física II, Seguridad Informática, DLT).
- **Regular:** puede rendir final.
- **Libre:** hay que recursar.

A nivel materia: `aprobada` (directa / final / equivalencia), `regular` (con aplazos usados, de 4), `cursando`, `recursar` (libre o 4 aplazos), `no cursada`, `bloqueada` (correlativas no cumplidas).

Cada estado muestra **por qué** (qué regla y qué notas lo determinaron) y si fue **corregido a mano**.

### El tiempo como entrada

Varias reglas dependen de la fecha: el ciclo lectivo para la excepción de correlativas, las mesas abiertas, el cierre a 48 h hábiles y el estado de estudiante regular. El motor es una función pura:

```
estado = f(plan, calendario, cursadas, notas, intentos, correcciones, fecha)
```

Ventajas: tests triviales (se fija la fecha), y la simulación "qué pasa si" de la fase 2 sale casi gratis.

## 6. Motor de reglas de aprobación (etapa 2)

### Bloques necesarios

Sale del relevamiento de las 49 planificaciones (detalle en `investigacion.md` §4). Cada regla tiene condiciones para **AD** y para **regular** por separado, y cada condición combina estos bloques:

| Bloque | Ejemplo real |
|---|---|
| Nota mínima en cada instancia | ≥ 8 en cada una para AD (Legislación, Testing) |
| Promedio mínimo (simple o **ponderado**) | Promedio ≥ 8 (Economía); ponderado por RA (AGA); 40/60 (Proyecto Final) |
| Mínimo por instancia **y** promedio | Cada una ≥ 7 y promedio ≥ 8 (Bases de Datos) |
| % de puntos totales | ≥ 80 % → AD (Paradigmas, AED) |
| Escala % → nota propia de la cátedra | Tablas distintas en DSI, Desarrollo de Software, Química |
| Instancias obligatorias / **N de M** | AI3 obligatoria + 1 de las otras 2 (AM II); como máximo 1 parcial desaprobado (Redes) |
| Actividades sin nota con % de cumplimiento | 50 % para regular / 70 % para AD (ASI) |
| Asistencia mínima, distinta para AD y regular | 80 % / 75 % (Gestión Gerencial); 100 % de laboratorios (Física I) |
| Integrador / coloquio / defensa obligatoria | Integradora para AD (AM I); coloquio (Lógica) |
| Promoción de una parte (práctica) | Física II, Seguridad Informática |
| Entrega con fecha límite | TP integrador al 31/8 (Redes) |
| Redondeo o no | Promedio AD redondeado (Ord. 1549); "no se redondea" para aprobar parciales (ASI) |

### Recuperatorios

Cada recuperatorio define:
- **a qué instancias puede reemplazar** y cuántos hay (ej. 2 de 3 en Química; 1 para AD y 2 para regular en Inglés);
- **cómo afecta la nota:** reemplaza (ASI), se pondera con el resto (AGA) o vale como integrador;
- **efecto sobre la AD:** la mantiene, la mantiene solo con un umbral propio (≥ 8 en Testing), o **la hace perder** (Seguridad Informática);
- si se puede usar para **subir la nota** de una instancia ya aprobada (AM II, IA).

### Plantilla por defecto

Para materias sin regla cargada: AD con ≥ 8 en cada instancia; regular con ≥ 6 en cada instancia; 1 recuperatorio que reemplaza y mantiene la AD; 75 % de asistencia. Nota AD = promedio redondeado.

### Reglas precargadas

- La app trae un archivo de **reglas ISI 2026** con una regla por materia, transcripta de las planificaciones de cátedra. Cada regla guarda el **link a la planificación** de donde salió.
- Al crear una cursada se copia la regla del año; el usuario puede ajustarla.
- Las redacciones ambiguas se marcan como "verificar con la cátedra".

### Salidas del motor

- Estado calculado y explicación.
- **"Qué te falta"** en lenguaje natural, con escenarios: "Si sacás ≥ 8 en el recuperatorio del Parcial 2, promocionás; con 6 regularizás".
- Avisos: "Usar el recuperatorio te hace perder la AD", "Faltan 3 actividades del campus para el 70 %".

**Corrección manual:** si la cátedra decide algo distinto (redondeos, excepciones, redacción ambigua), se fuerza el estado con un motivo. Sin esto la app termina mostrando datos falsos y se abandona.

## 7. Formato de los datos del plan

Los planes de las 13 carreras tienen variantes que el formato debe cubrir:

- Correlativas en tres listas (cursar-cursadas, cursar-aprobadas, rendir-aprobadas), o en una sola columna "PARA CURSAR Y RENDIR" (Civil, Industrial, Programación, Negociación de Bienes) **[PENDIENTE: confirmar cómo se aplican al rendir]**.
- Notaciones: listas ("13-16"), rangos ("1 A 13"), "TODAS", vacío o "–".
- Hasta 6 niveles.
- Requisitos medidos en horas.
- Electivas numeradas con correlativas propias, o paquetes sin detalle.
- Régimen faltante en el PDF: se completa con los horarios (en ISI 2023, 4.º y 5.º nivel).

**Validador** (obligatorio, los PDF tienen errores: números duplicados, correlativas repetidas, celdas vacías):
- correlativas que apuntan a materias existentes;
- sin ciclos;
- sin números duplicados;
- correlativas de niveles anteriores (advertencia, no error).

## 8. Calendario

- Precargado con el **calendario 2026/27** publicado en la web, como dato **versionado y editable**: ya hay dos versiones que difieren en diciembre.
- Contiene:
  - periodos de cursado: 1C 16/3–3/7, 2C 10/8–27/11;
  - receso de invierno;
  - turnos de final (feb, mar, jul, ago, dic de 2026; feb, mar de 2027);
  - **mesas móviles** (may y sep): mesas de final que se toman **durante el cursado**. Se tratan como un turno más;
  - inicios de inscripción a finales;
  - feriados;
  - encuestas docentes.
- **Inscripción / anulación a finales: hasta 48 h hábiles antes del examen.** Se calcula con los feriados.
- **Inscripción a cursado** (se hace en autogestión): abre entre **1 y 2 semanas antes** del inicio de cada cuatrimestre y suele seguir abierta **1 o 2 semanas después** del inicio. Como las fechas no se publican, la app genera una ventana estimada (inicio − 14 días a inicio + 14 días) y el usuario la ajusta cuando autogestión la confirma.
- **No publicado:** la fecha de cada mesa por materia. Está en autogestión y se carga a mano.

**Sistemas de la facultad:** **autogestión** es el sistema académico-administrativo (inscripciones, cursado, notas oficiales, trámites). El **campus virtual** es el de cada materia (aulas, cuestionarios, notas parciales).

## 9. Pantallas

1. **Inicio**: qué te conviene hacer ahora (inscripciones abiertas y su cierre, finales próximos, materias en riesgo, notas por cargar, estado de estudiante regular).
2. **Materias**: lista con estado, filtros (cursando / habilitadas / regulares / aprobadas / bloqueadas).
3. **Detalle de materia**:
   - notas y regla (con link a la planificación);
   - progreso hacia AD / regular y "qué te falta";
   - recuperatorios disponibles y su efecto;
   - aplazos usados (de 4);
   - si aplica la excepción de correlativas por ciclo lectivo;
   - por qué del estado y corrección manual.
4. **Plan / Mapa de correlativas**: visual del plan con colores por estado y qué desbloquea cada materia.
5. **Calendario**: cursado, turnos, mesas, inscripciones; exportar `.ics`.
6. **Finales**:
   - materias que podés rendir;
   - aplazos usados;
   - hasta cuándo no te piden correlativas para rendir;
   - historial de intentos;
   - AD pendientes de registrar en mesa.
7. **Progreso**: promedios con y sin aplazos, electivas, PPS, título intermedio, estudiante regular.
8. **Configuración**: carrera y plan, calendario, reglas, importar/exportar backup.

### Reglas de UX contra el abandono

- Cargar una nota en **2 toques** como máximo desde Inicio.
- El calendario pregunta solo: "Ayer tuviste el Parcial 2 de AED, ¿cargás la nota?".
- Configuración inicial rápida: marcar en el mapa qué materias ya están aprobadas o regulares.
- Las reglas vienen precargadas; el usuario solo las corrige si hace falta.

## 10. Tecnología (propuesta, abierta a cambio)

**Recomendación: PWA local (sin backend).**

> Nota del 24/11/2026: los datos siguen siendo locales, pero «Contanos» suma una función de Vercel para recibir comentarios ([diseño](superpowers/specs/2026-11-24-feedback-design.md)).

- Una sola app web instalable en el celular (y que corre igual en la PC), 100 % offline.
- **Un solo código** cubre celular, escritorio y web local.
- Sin servidor, sin cuentas: coincide con "local y simple".
- Lenguaje: **TypeScript** (el motor de reglas es lógica pura, fácil de testear).
- Dependencias mínimas: sin frameworks pesados salvo que hagan falta.
- **Almacenamiento:** estado JSON en IndexedDB con exportar/importar backup. El modelo se diseña de forma relacional por si más adelante se migra a SQLite en el navegador.

### Datos de referencia incluidos en la app

Son archivos JSON versionados, separados de los datos del usuario:
- `plan-isi-2023.json` (y el 2008 para el catálogo de electivas);
- `reglas-isi-2026.json`;
- `calendario-2026-27.json`.

Al publicar una versión nueva de estos archivos, los datos del usuario no se tocan. Las cursadas ya creadas conservan su copia de la regla.

### Durabilidad de los datos

- Backup manual por exportar/importar un archivo es obligatorio: el almacenamiento del navegador puede borrarse.
- Pedir almacenamiento persistente con `navigator.storage.persist()`.
- Recordatorio de backup cada N días.
- **Versión de esquema desde el día uno** en el estado guardado, en los backups y en los archivos de referencia, con migraciones.

Alternativas descartadas por ahora: app nativa Android (más trabajo, un solo uso), Electron/Tauri (peso extra), servidor propio (contradice "local").

**Plataformas:** el usuario principal usa Android, pero mucha gente usa iOS, así que la app tiene que funcionar en los dos. Una PWA se instala en Android y en iOS (Safari → "Agregar a inicio") y además funciona como web en la PC. Si más adelante hace falta publicarla en las tiendas o usar notificaciones nativas, se puede empaquetar con **Capacitor** sin reescribirla. Por eso la lógica (motor, datos) va separada de la UI.

**Notificaciones:** en Android la PWA puede notificar; en iOS es limitado. La exportación a `.ics` resuelve los recordatorios en cualquier celular.

**Futuro (si se abre a otros):** compartir la app es publicar la PWA estática y distribuir planes, reglas y calendarios como archivos. Una versión alojada por la UTN requeriría su permiso y backend.

## 11. Ideas para fase 2 y más allá

- **Simulación "qué pasa si"**: usa el motor con datos o fecha modificados.
- **Planificador de carrera**: "¿qué curso cada cuatrimestre para recibirme en X?", usando las correlativas como grafo; mostrar el **camino crítico** y qué materias bloquean más cosas. Tiene que respetar el régimen de cada materia (1C/2C/anual) y el turno de cada año.
- **Superposición de horarios**, importando los horarios publicados por carrera.
- **Carga de notas pegando texto** desde autogestión.
- **Otras carreras**: planes y reglas de las 13 carreras de FRVM (todas tienen planificaciones publicadas).
- **Cambio de plan y equivalencias** (2008 → 2023).
- **Actualización anual de reglas**: comparar la planificación nueva con la anterior y avisar qué cambió.

## 12. Riesgos (pre-mortem)

*"Pasó un año y no la uso. ¿Por qué?"*

| Riesgo | Mitigación |
|---|---|
| Cansancio de cargar datos | Reglas y calendario precargados, UX de 2 toques, recordatorios, configuración inicial desde el mapa |
| El motor calcula mal por una regla ambigua o rara | Corrección manual + "por qué" visible + link a la planificación |
| Transcribir planes y reglas lleva más de lo esperado | Empezar solo por ISI 2023 y las materias que estoy cursando; validador |
| Las reglas cambian cada año | Regla copiada a la cursada; archivo de reglas por año |
| El calendario oficial cambia | Calendario versionado y editable |
| Se borraron los datos del navegador | Backup + `storage.persist()` + recordatorio |
| El diseño se comió el tiempo | Pulido visual al final de la hoja de ruta |
| Cambió el formato y el backup viejo no se pudo importar | Versión de esquema y migraciones |

## 13. Puntos abiertos

**[NO ESPECIFICADO: se deja configurable]**
- Horas de electivas exigidas por nivel en ISI 2023: figuran en el plan oficial, no en el resumen de FRVM. Conseguir el documento del plan (ordenanza del diseño curricular) o preguntar en el departamento.
- Horas de cada electiva.
- Si una electiva puede repartir horas entre paquetes.

**[PENDIENTE]**
- Normas complementarias de FRVM (Redes cita una "ordenanza de flexibilización" que elimina la asistencia).
- Cómo se aplican las correlativas en los planes de una sola columna (otras carreras).
- Si la AD siempre requiere inscribirse a una mesa para registrar la nota, o solo en algunas materias.
- Correlativas de las electivas para el plan 2023 (solo se conocen las del 2008).
- Si el Seminario Integrador de los horarios es el ítem "Habilitación Profesional (Título Intermedio)".

**[RESUELTO en v0.4]** Plan 2023 (1.er año); Android, con soporte iOS obligatorio; mesas móviles; inscripción a cursado; título intermedio.

**[RESUELTO]** Nombre: **Regu** (ver §17).

**[DECISIONES MÍAS A VALIDAR]**
- PWA + TypeScript + almacenamiento local con backup exportable.
- MVP sin notas: plan + estado manual + disponibilidad según la Ord. 1549.
- Reglas precargadas por materia desde las planificaciones; plantilla por defecto 8/6.
- La regla se copia a la cursada.
- Corrección manual del estado con prioridad sobre el cálculo.

## 14. Escenarios de prueba

Basados en las reglas reales. Se completan y amplían con casos tuyos.

**Motor de aprobación (etapa 2)**

| # | Materia | Datos | Estado esperado | "Qué te falta" esperado |
|---|---|---|---|---|
| 1 | Paradigmas (≥ 80 % de puntos) | 72 % de puntos al cierre | regular | "Te faltan 8 puntos porcentuales para la AD" |
| 2 | Bases de Datos (cada ≥ 7 y promedio ≥ 8) | P1: 7, P2: 7, TFI: 8 (promedio 7,33) | regular | "Necesitás subir el promedio a 8: recuperá P1 o P2 con ≥ 9" |
| 3 | Seguridad Informática | Teoría 9, Práctica 7 → recupera práctica con 9 | regular (pierde AD por recuperatorio) | Aviso: "el recuperatorio hace perder la AD" |
| 4 | Comunicación de Datos (promedio de 6) | Promedio 5 | regular (umbral 4) | "Con promedio ≥ 8 promocionabas" |
| 5 | Física II | Prácticas ≥ 7, promedio 6 | promoción práctica | "El final es solo teórico" |

**Disponibilidad (MVP)**

| # | Situación | Fecha | Esperado |
|---|---|---|---|
| 6 | Regular en Bases de Datos (cursada 2026), sin Sintaxis y Semántica aprobada (correlativa para rendir) | 10/12/2026 | **Puede rendir** (dentro de 1 ciclo lectivo) |
| 7 | Mismo caso | 15/7/2028 | No puede rendir hasta aprobar Sintaxis y Semántica |
| 8 | Regular en AM II con 4 aplazos | cualquiera | Debe recursar |
| 9 | Regular con 3 aplazos y 2 ausentes | cualquiera | Puede rendir (los ausentes no cuentan) |
| 10 | Mesa el 15/12/2026 (martes) | 14/12/2026 (lunes) | Inscripción cerrada (48 h hábiles). **[PENDIENTE: confirmar cómo cuenta autogestión las 48 h hábiles]** |
| 11 | Aprobó 1 materia en el ciclo 2026 | 12/3/2027 | No regular en la carrera; recupera la condición al aprobar 2 en un ciclo |

## 15. Hoja de ruta

1. **Datos de referencia**:
   - formato JSON versionado + validador;
   - transcribir el plan ISI 2023, más las electivas del 2008 y los horarios para completar el régimen;
   - cargar el calendario 2026/27.
2. **MVP** *(hecho el 23/11/2026: ver `prd.md` §10)*:
   - estado manual por materia;
   - disponibilidad según la Ord. 1549 (con fechas);
   - estudiante regular;
   - mapa básico y backup.
   - → *Usarlo en las inscripciones del próximo cuatrimestre.*
3. **Notas por cursada** *(adelantado el 23/11/2026 por pedido del usuario; primera entrega hecha)*: cargar evaluaciones y ver cómo viene la cursada, con referencias ajustables. Falta: las reglas de las materias de 1.er año y recién ahí el motor de §6 con «qué te falta».
3b. **Motor de reglas**: bloques de §6, tests con los escenarios de §14.
4. **Reglas precargadas**: transcribir las planificaciones ISI 2026 a `reglas-isi-2026.json`.
5. **Notas y finales**: carga rápida de notas, historial de intentos, promedios, progreso de carrera.
6. **Calendario**: mesas, inscripciones con cierre, alertas, `.ics`, recordatorios.
7. **Pulido visual**: mapa de correlativas completo, diseño llamativo, modo oscuro.
8. **Fase 2**: simulación, planificador, horarios, otras carreras.

## 16. Próximos pasos

- Revisar `prd.md` y el esquema en `datos/`.
- Revisar la transcripción del plan ISI 2023 (`datos/planes/utn-frvm-isi-2023.json`).
- Conseguir las horas de electivas del plan oficial.

## 17. Nombre y marca

- **Nombre: Regu** (de "regular", la palabra que más se usa en la cursada).
- **Símbolo:** la palabra "regu" como logotipo, siguiendo los colores y el enfoque visual de la UTN FRVM: negro y blanco con el acento amarillo-naranja de la facultad, tipografía sans geométrica y pesada, formas simples.
- **Cuidado de identidad:** Regu no es una app oficial. Toma el estilo de la FRVM, pero **no usa el logo ni el asterisco de la UTN**, ni textos que sugieran que la publica la facultad. Si algún día la adopta la UTN, eso se revisa con ellos.
- **Pendiente:** tomar los valores exactos de color del material de la FRVM (web y calendario) y diseñar el logotipo en la etapa de pulido visual.

## 18. Conexión con autogestión y el campus virtual (sin resolver)

- **Lo que no se verificó:** nunca se entró a autogestión ni al campus; no se sabe si exponen una API ni cómo entregan las notas.
- **Por qué no es directo:** Regu es una página estática que corre en el navegador. Un navegador no puede leer los datos de otro sitio sin que ese sitio lo permita (CORS), y entrar con tu usuario y clave implica guardar tus credenciales y tener un servidor, lo que contradice "local, nada sale del dispositivo".
- **Ruta realista:** *importar pegando*: copiar la tabla de notas de autogestión o del campus y pegarla en Regu, que la interpreta. Sin credenciales, sin servidor. Hace falta una muestra (con los datos personales tapados) de cada pantalla, como se hizo con los planes.
- **No se sondean los servidores de la facultad** sin que el usuario lo pida expresamente.
