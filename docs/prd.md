# PRD: app académica UTN FRVM

> v0.1 (23/11/2026). Basado en `idea.md` v0.4 e `investigacion.md`. El nombre de la app está pendiente; mientras tanto se usa "la app".

## 1. Objetivo

Que un estudiante de la UTN FRVM sepa en todo momento **qué puede cursar, qué puede rendir, cómo viene cada materia y qué fechas tiene encima**, sin cruzar a mano el plan, el reglamento, las planificaciones, autogestión y el campus.

### Métricas de éxito

| Métrica | Meta |
|---|---|
| Decisiones de inscripción tomadas con la app sin abrir el PDF del plan | 100 % en el cuatrimestre 1C 2027 |
| Discrepancias entre el estado que calcula la app y el oficial de autogestión | 0 no explicadas (toda diferencia se resuelve con corrección manual o un arreglo del motor) |
| Tiempo para cargar una nota | ≤ 10 segundos |
| Uso sostenido | Se abre al menos una vez por semana durante el cuatrimestre |

## 2. Usuarios

- **Principal:** estudiante de ISI plan 2023, 1.er año, Android. Carga sus datos a mano, quiere respuestas rápidas en el celular.
- **Secundarios (futuro):** estudiantes de otras carreras de FRVM y de iOS. El diseño no debe impedirlo, aunque el MVP solo trae datos de ISI 2023.

## 3. Alcance por versión

| Versión | Contenido | Hito |
|---|---|---|
| **MVP (v0.1)** | Plan ISI 2023, estado manual por materia, disponibilidad para cursar/rendir según la Ord. 1549, estudiante regular, mapa básico, calendario 2026/27, backup | Usarla en las inscripciones de 1C 2027 (feb–mar 2027) |
| **v0.2** | Notas, motor de reglas, reglas precargadas ISI 2026, "qué te falta", corrección manual | Usarla durante 1C 2027 |
| **v0.3** | Mesas, inscripciones con cierre, alertas, `.ics`, recordatorios de carga | Turno de julio 2027 |
| **v1.0** | Pulido visual, mapa de correlativas completo, modo oscuro | — |
| **Fase 2** | Simulación, planificador, horarios, otras carreras | — |

## 4. Requisitos funcionales

Prioridad: **P0** = MVP, **P1** = v0.2–v0.3, **P2** = posterior.

### 4.1 Plan y configuración

| ID | Requisito | Prioridad |
|---|---|---|
| PLAN-1 | La app trae el plan ISI 2023 como dato de referencia (`datos/planes/utn-frvm-isi-2023.json`) | P0 |
| PLAN-2 | Al primer uso, el usuario elige carrera y plan, y marca en el mapa qué materias tiene aprobadas o regulares | P0 |
| PLAN-3 | Los datos de referencia se validan al cargarse (§6 de `datos/README.md`). Un plan inválido no se carga y se muestra el error | P0 |
| PLAN-4 | El usuario puede corregir un dato del plan (ej. una correlativa mal transcripta). La corrección se guarda aparte y sobrevive a una actualización del plan | P1 |
| PLAN-5 | Importar un plan de otra carrera desde un archivo JSON | P2 |

### 4.2 Estado de materias (MVP: carga manual)

| ID | Requisito | Prioridad |
|---|---|---|
| EST-1 | Por cada materia, el usuario carga: no cursada, cursando (ciclo y cuatrimestre), regular (fecha de cursado), aprobada (nota, fecha, forma: directa / final / equivalencia), libre/recursar | P0 |
| EST-2 | Registrar intentos de final: fecha y resultado (aprobado con nota / insuficiente con nota / ausente) | P0 |
| EST-3 | Contar los aplazos (insuficientes) por materia. Con 4, la materia pasa a "recursar", salvo que sea la última del plan | P0 |
| EST-4 | Marcar una aprobación directa como "falta registrar en mesa" | P1 |
| EST-5 | Estado "promoción práctica" (regular con final solo teórico) | P1 |

### 4.3 Disponibilidad (reglas de la Ord. 1549)

| ID | Requisito | Prioridad |
|---|---|---|
| DISP-1 | **Puede cursar**: correlativas "cursadas" en estado regular o aprobada, y correlativas "aprobadas" aprobadas, a la fecha de consulta | P0 |
| DISP-2 | **Excepción de últimas materias**: si lo que falta no supera la carga del último nivel, se habilita el cursado sin correlativas, con un aviso de que para rendir se exigen | P1 |
| DISP-3 | **Puede rendir**: regular + menos de 4 aplazos (o última materia) + correlativas para rendir aprobadas | P0 |
| DISP-4 | **Excepción de 1 ciclo lectivo**: si la fecha de consulta está dentro del ciclo lectivo siguiente al del cursado, no se exigen las correlativas para rendir. La app muestra hasta qué fecha aplica | P0 |
| DISP-5 | Cada resultado de disponibilidad muestra el **porqué**: qué correlativa falta o qué excepción se aplicó | P0 |
| DISP-6 | **Estudiante regular en la carrera**: materias aprobadas en el ciclo lectivo actual (meta: 2); no cuenta el año de ingreso | P0 |
| DISP-7 | Los cálculos son una función pura de (datos, fecha). La fecha de consulta se puede cambiar (para probar y para la fase 2) | P0 |

### 4.4 Electivas, requisitos y títulos

| ID | Requisito | Prioridad |
|---|---|---|
| ELEC-1 | Paquetes de electivas por nivel con horas exigidas. Si el plan no especifica las horas, se muestra "no especificado" y el usuario puede cargarlas | P0 |
| ELEC-2 | El usuario elige qué electivas toma del catálogo y a qué paquete imputa sus horas | P0 |
| ELEC-3 | Las horas de cada electiva vienen del catálogo; si faltan, el usuario las carga | P0 |
| ELEC-4 | Progreso por paquete: horas aprobadas / exigidas | P0 |
| ELEC-5 | Repartir horas de una electiva entre paquetes (**solo si se confirma que el reglamento lo permite**) | P2 |
| TIT-1 | Título intermedio: progreso = todo lo obligatorio, los paquetes de electivas y los requisitos hasta el nivel indicado por el plan | P0 |
| TIT-2 | Requisitos no-materia (PPS, habilitación) con correlativas y estado | P0 |
| TIT-3 | Progreso hacia el título final | P1 |

### 4.5 Calendario

| ID | Requisito | Prioridad |
|---|---|---|
| CAL-1 | Trae el calendario 2026/27 (`datos/calendarios/utn-frvm-2026-27.json`) y el usuario puede editarlo | P0 |
| CAL-2 | Ciclo lectivo, cursado 1C/2C, receso, turnos de final, mesas móviles, inicios de inscripción a finales, feriados | P0 |
| CAL-3 | Ventana estimada de inscripción a cursado: desde 14 días antes hasta 14 días después del inicio de cada cuatrimestre; el usuario la ajusta | P0 |
| CAL-4 | Cargar mesas por materia (fecha y hora) | P1 |
| CAL-5 | Cierre de inscripción a cada mesa: 48 h hábiles antes, descontando fines de semana y feriados | P1 |
| CAL-6 | Exportar a `.ics` | P1 |
| CAL-7 | Notificaciones locales donde la plataforma lo permita (Android) | P2 |

### 4.6 Notas y motor de reglas (v0.2)

| ID | Requisito | Prioridad |
|---|---|---|
| REG-1 | Reglas de aprobación precargadas por materia (`datos/reglas/utn-frvm-isi-2026.json`), con link a la planificación de origen | P1 |
| REG-2 | Al crear una cursada se copia la regla del año; el usuario puede editarla | P1 |
| REG-3 | El motor cubre los bloques de `idea.md` §6: mínimos por instancia, promedios simples y ponderados, % de puntos, escala % → nota, N de M, obligatorias, asistencia, actividades sin nota, recuperatorios (reemplaza / pondera / umbral / pierde AD / sube nota), promoción parcial | P1 |
| REG-4 | Carga de evaluaciones: nota numérica, porcentaje o valor no numérico; individual/grupal; teórica/práctica | P1 |
| REG-5 | "Qué te falta" en lenguaje natural, con escenarios | P1 |
| REG-6 | Corrección manual del estado con motivo; tiene prioridad sobre el cálculo y se marca visualmente | P1 |
| REG-7 | Nota de AD = promedio de instancias aprobadas, redondeado al entero más próximo, salvo que la regla diga otra cosa | P1 |
| REG-8 | Promedios de carrera con y sin aplazos | P1 |

### 4.7 Datos y backup

| ID | Requisito | Prioridad |
|---|---|---|
| DAT-1 | Todo se guarda localmente (IndexedDB). Sin cuentas ni servidor | P0 |
| DAT-2 | Exportar e importar un backup JSON con versión de esquema | P0 |
| DAT-3 | Pedir almacenamiento persistente (`navigator.storage.persist()`) | P0 |
| DAT-4 | Recordatorio de backup cada N días (por defecto 14) | P1 |
| DAT-5 | Migraciones de esquema: un backup de cualquier versión anterior se puede importar | P0 |
| DAT-6 | Los datos de referencia (plan, reglas, calendario) se actualizan sin tocar los datos del usuario | P0 |

## 5. Requisitos no funcionales

| ID | Requisito |
|---|---|
| NF-1 | **Plataformas:** PWA instalable en Android (Chrome) e iOS (Safari ≥ 16.4); usable en navegador de escritorio. Se mantiene la opción de empaquetarla con Capacitor sin reescribir |
| NF-2 | **Offline:** todas las funciones del MVP funcionan sin conexión después de la primera carga |
| NF-3 | **Rendimiento:** cualquier pantalla abre en < 1 s en un celular de gama media; recalcular la disponibilidad del plan completo tarda < 50 ms |
| NF-4 | **Arquitectura:** el motor (disponibilidad y reglas) es TypeScript puro, sin dependencias de UI ni de almacenamiento, con tests unitarios |
| NF-5 | **Tests:** los escenarios de `idea.md` §14 son tests automáticos del motor |
| NF-6 | **Mobile first:** diseño para 360 px de ancho; objetivos táctiles ≥ 44 px |
| NF-7 | **Accesibilidad:** contraste AA; el estado no se comunica solo con color (también con ícono o texto) |
| NF-8 | **Privacidad:** ningún dato sale del dispositivo |
| NF-9 | **Idioma:** español rioplatense; terminología de la UTN (aprobación directa, regular, aplazo, mesa, correlativa) |

## 6. Historias de usuario del MVP

**H1. Configuración inicial.** Como estudiante nuevo en la app, quiero elegir mi plan y marcar rápido lo que ya aprobé o regularicé, para empezar a usarla en menos de 5 minutos.
- *Acepta si:* puedo marcar el estado de cada materia tocándola en el mapa, y al terminar veo la lista de habilitadas.

**H2. ¿Qué puedo cursar?** Como estudiante que se va a inscribir, quiero ver las materias que puedo cursar el próximo cuatrimestre y, para las que no, qué me falta.
- *Acepta si:* la lista respeta el régimen (1C/2C/anual), las correlativas y la excepción de últimas materias; cada materia bloqueada dice qué correlativa falta.

**H3. ¿Qué puedo rendir?** Como estudiante regular, quiero ver qué finales puedo rendir y hasta cuándo no me piden correlativas.
- *Acepta si:* se aplican la excepción de 1 ciclo lectivo y el límite de 4 aplazos, y la app muestra la fecha límite de la excepción.

**H4. Registrar un final.** Como estudiante que rindió, quiero cargar el resultado en dos toques.
- *Acepta si:* un aplazo suma al contador; un ausente no; un aprobado cambia el estado y recalcula las habilitadas.

**H5. Estudiante regular.** Como estudiante, quiero saber si mantengo la condición de regular este ciclo.
- *Acepta si:* la pantalla de Inicio muestra "X de 2 materias aprobadas en el ciclo 2026".

**H6. Electivas.** Como estudiante, quiero elegir mis electivas y ver cuántas horas me faltan por paquete.
- *Acepta si:* puedo agregar una electiva a un paquete; si el plan no tiene las horas exigidas, la app lo dice y me deja cargarlas.

**H7. Fechas.** Como estudiante, quiero ver en Inicio la próxima ventana de inscripción (a cursado o a finales) y el próximo turno.
- *Acepta si:* los datos salen del calendario cargado y la ventana de inscripción a cursado figura como "estimada".

**H8. Backup.** Como estudiante, quiero exportar mis datos a un archivo y restaurarlos en otro dispositivo.
- *Acepta si:* exportar → borrar datos → importar deja todo igual.

## 7. Fuera de alcance

- Login, cuentas, sincronización en la nube.
- Scraping o integración con autogestión y el campus.
- Equivalencias entre planes (2008 → 2023).
- Planes de otras carreras (el formato los soporta, pero no se transcriben en el MVP).

## 8. Supuestos y riesgos

| Supuesto / riesgo | Mitigación |
|---|---|
| El plan transcripto a mano tiene errores | Validador + revisión conjunta + corrección del usuario (PLAN-4) |
| Las horas de electivas no aparecen en fuentes públicas | "No especificado" + carga manual (ELEC-1) |
| Las correlativas de las electivas para el plan 2023 no se conocen | Se cargan las del 2008 marcadas "verificar"; editables |
| La interpretación de "48 h hábiles" puede no coincidir con autogestión | Se muestra como estimado; ajustable |
| iOS limita notificaciones y almacenamiento de PWA | `.ics` + backup + aviso de instalación en inicio |

## 9. Dependencias de datos

| Archivo | Estado |
|---|---|
| `datos/planes/utn-frvm-isi-2023.json` | Transcripto v0.1; requiere revisión |
| `datos/calendarios/utn-frvm-2026-27.json` | Por transcribir (MVP) |
| `datos/reglas/utn-frvm-isi-2026.json` | Por transcribir (v0.2) |

## 10. Estado de implementación (23/11/2026)

MVP completo en lo funcional. Leyenda: ✅ hecho · ◐ parcial · ⬜ pendiente.

| Área | Estado |
|---|---|
| PLAN-1, PLAN-2, PLAN-3 | ✅ Plan ISI 2023 incluido, onboarding con marcado en el mapa, validación al arrancar |
| PLAN-4 | ◐ El motor aplica `correccionesPlan` y se guarda en el backup; falta la pantalla para editarlas |
| PLAN-5 | ⬜ |
| EST-1 a EST-5 | ✅ Cursadas, finales, aplazos, aprobación directa pendiente de mesa, práctica promocionada |
| DISP-1 a DISP-7 | ✅ DISP-2 se aproxima por cantidad de materias (el plan no trae horas) |
| ELEC-1 a ELEC-4 | ✅ ELEC-5 ⬜ |
| TIT-1 a TIT-3 | ✅ |
| CAL-1, CAL-2, CAL-3, CAL-5 | ✅ Calendario editable (cuatrimestres, turnos, fin de ciclo); los feriados no se editan desde la app |
| CAL-4, CAL-6, CAL-7 | ⬜ Mesas por materia, exportar `.ics`, notificaciones |
| REG-4 | ◐ Primera entrega: notas por cursada (nombre, tipo, nota, fecha, recuperatorio que reemplaza) con promedio, mínima y referencias ajustables. Sin regla de aprobación por materia |
| REG-1 a REG-3, REG-5 a REG-7 | ⬜ Reglas por materia y «qué te falta»: siguiente entrega (REG-8, promedios de carrera, ✅) |
| DAT-1 a DAT-6 | ✅ Backup exportable/importable validado, almacenamiento persistente, recordatorio de backup, migraciones preparadas (solo existe la versión 1) |
| NF-1, NF-2 | ✅ PWA que abre sin conexión (probado en Firefox). **No se probó en dispositivos Android ni iOS reales** |
| NF-3, NF-5 | ✅ Evaluar el plan completo < 50 ms está en un test; los escenarios de `idea.md` §14 son tests |
| NF-6, NF-7, NF-8 | ✅ Objetivos táctiles de 44 px, estado con ícono y texto, contrastes AA verificados por cálculo (claro y oscuro), nada sale del dispositivo |
| Historias H1 a H8 | ✅ H8 probada de punta a punta en el navegador: exportar, borrar todo, importar |

**Verificación:** 102 tests en Node y 27 pruebas e2e en Firefox (`npm run e2e`), repetidas con la app servida bajo una subcarpeta. Cubren: primer uso, marcar y recargar, el mapa del plan (un camino por cada materia relacionada), la barra lateral de escritorio pegada al scroll, el camino cursada → final → aprobada (promoción, regular y libre se ven en el momento), uso sin conexión sin tocar el servidor, cursadas y finales con validación, cierre de cursada desde Inicio, calendario 2027, fecha simulada visible en todas las pantallas, tema, exportar el backup (se lee el archivo generado) e importarlo de vuelta tras borrar todo, importaciones inválidas, modo ejemplo y borrado.

**Sin verificar:** dispositivos Android e iOS reales, el aviso de versión nueva del service worker.

**Pendiente de decisión del usuario:** dónde publicar la app (hace falta HTTPS para instalarla en el celular).

**Mapa del plan (crítica de diseño del 23/11/2026):** el Plan es una tira horizontal por año; al elegir una materia se dibujan los caminos (sólido = lo que necesita, punteado = lo que desbloquea) y `#/plan?sel=<id>` deja una materia seleccionada. El detalle de materia responde "cursar" y "rendir" en una línea cada una y pliega el resto. El ámbar quedó para la marca y la acción principal.

**Notas de la cursada (primera entrega, 23/11/2026):** en el detalle de cada materia, «Cómo viene la cursada» permite cargar evaluaciones (parcial, trabajo práctico, recuperatorio, otra) con nota opcional y fecha. Muestra el promedio, la mínima, cuántas están en la nota de promoción y cuáles quedan sin nota. Las referencias (8 para promocionar, 6 para regularizar) se muestran como «regla general, sin confirmar» hasta que el usuario las ajusta. **No afirma que se vaya a promocionar ni a regularizar**: las planificaciones tienen unas 20 variantes de regla. Siguiente: transcribir las reglas de las 8 materias de 1.er año y recién ahí mostrar «qué te falta». Las notas viajan en el backup y se conservan al declarar el resultado de la cursada.

**Conexión con autogestión o el campus:** sin resolver (ver `idea.md` §18). Ruta realista: importar pegando la tabla; hace falta una muestra con los datos personales tapados.

**Reglas de cátedra de 1.er año (23/11/2026):** las 8 materias transcriptas de sus planificaciones 2026 en `datos/reglas/` (fuente, cita y dudas por regla). Cinco se calculan («qué te falta» según las notas, con asistencia y laboratorios como «depende de vos») y tres (Algoritmos, Análisis Matemático I, Álgebra) se muestran como texto. Ninguna está confirmada con la cátedra. Quedan las de 2.º año en adelante.
