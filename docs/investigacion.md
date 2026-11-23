# Investigación de fuentes: UTN FRVM

> 23/11/2026. Análisis de los documentos de `planes/` y de lo publicado en https://frvm.utn.edu.ar/. Los documentos descargados de la web están en `planes/descargas/` (las planificaciones de cátedra, en `planes/descargas/planificaciones/`).

## 0. Resumen: qué cambia para el proyecto

| Supuesto en `idea.md` v0.2 | Lo que dicen las fuentes | Impacto |
|---|---|---|
| La regularidad vence a los N años | **El cursado no vence** (Ord. 1549, 7.1.2). Solo caduca con 4 aplazos | Se elimina "regularidad vencida por fecha" |
| "4 turnos" para rendir | Son **4 aplazos** (nota *Insuficiente*). Al cuarto, se recursa. Los ausentes no cuentan (8.2.6) | Se cuentan aplazos, no intentos |
| Correlativas para rendir siempre exigidas | **No se exigen** si: (a) hubo aprobación directa, o (b) te inscribís al final dentro de 1 ciclo lectivo después del cursado (7.2.1, 7.2.2) | La disponibilidad depende de la fecha, por otro motivo |
| Plantilla por defecto 7 / 6 por RA | En Sistemas, lo más común es **8 en cada instancia → AD; 6 → regular**. Básicas usa promedio 7. Hay muchas otras variantes (§4) | La plantilla cambia y conviene precargar las reglas por materia |
| Rendir libre como opción | Solo en materias aprobadas por el Consejo Superior (7.3). En las planificaciones, "libre" significa **recursar** | "Libre" = recursar; el examen libre casi no existe |
| Estados: promocionada / regular / libre | Aparecen además la **promoción de la parte práctica** y la **AD que hay que registrar en una mesa** | Hacen falta estados nuevos |
| Solo existe el estado por materia | También hay un **estado de estudiante regular en la carrera**: aprobar 2 materias por ciclo lectivo (7.4) | Indicador nuevo |

## 1. Ordenanza 1549: Reglamento de Estudio de grado (vigente desde 2017)

Reglas que el motor tiene que respetar:

- **Inscripción a cursar (5.2):** correlativas cumplidas *al momento de inscribirse*. **No hay inscripciones condicionales** (5.2.3).
- **Excepción para las últimas materias (5.3.1):** si te faltan materias cuya carga horaria no supera la del último nivel, podés cursarlas sin correlativas, pero tenés que cumplirlas para rendir.
- **Asistencia (7.1.1):** con más del 25 % de inasistencias caduca la inscripción. Por excepción se puede llegar al 40 %.
- **Cursado (7.1.2):** obligatorio, **sin vencimiento**; solo caduca por 8.2.6.
- **Aprobación directa (7.2.1):**
  - la define cada cátedra, con al menos 1 instancia de recuperación;
  - la nota es el **promedio de las instancias aprobadas, entero, redondeado al más próximo**;
  - **no se exigen las correlativas para rendir**.
- **Aprobación no directa (7.2.2):** se rinde final. Si te inscribís al final **dentro de 1 ciclo lectivo siguiente al cursado**, no se exigen las correlativas para rendir.
- **No aprobación (7.2.3):** se recursa.
- **Examen libre (7.3):** solo en materias autorizadas por el Consejo Superior.
- **Estudiante regular en la carrera (7.4):**
  - hay que aprobar 2 materias por ciclo lectivo; el año de ingreso no cuenta;
  - si no, pasás a *no regular* y podés inscribirte en al menos 1 materia;
  - se recupera automáticamente al aprobar 2 materias en un ciclo.
- **Calificación (8.2.3):** enteros del 1 al 10; se aprueba con 6.
  - 1–5 Insuficiente, 6 Aprobado, 7 Bueno, 8 Muy Bueno, 9 Distinguido, 10 Sobresaliente.
- **Repetición (8.2.6):** con 4 *Insuficientes* en la misma materia hay que recursarla. **No aplica a la última materia del plan** (8.2.7).
- **Llamados a final (6.1.2):** 10 por materia en cada ciclo lectivo.
- **Ciclo lectivo (cap. 10):** desde el inicio de clases hasta el último llamado de febrero–marzo del año siguiente.
- **Mesas especiales (6.2):** para quien terminó de cursar toda la carrera (el proyecto final puede adeudarse).
- **Recursado voluntario (5.3.2):** se puede recursar una materia ya regularizada, con autorización del director de carrera.
- **Equivalencias y acreditación (cap. 3 y 4):** hasta 30 % de la carrera por acreditación y 70 % sumando equivalencias. No se acredita parcialmente. En electivas cuentan las horas.

**Sin analizar a fondo:** la Ord. 1622 (pregrado, para las tecnicaturas) está descargada pero solo afecta a las tecnicaturas. Además, la planificación de Redes de Datos cita una *"ordenanza de flexibilización del CS"* que elimina la asistencia; no está publicada en la web.

## 2. Planes de estudio (13 PDF)

### Sistemas 2023 (el tuyo)

36 materias, más los paquetes de electivas de 3.º (2C), 4.º y 5.º nivel, la Habilitación Profesional (título intermedio) y la PPS (n.º 50). Columnas:

- **Para cursar:** materias *cursadas* (regulares) y materias *aprobadas*.
- **Para rendir:** materias *aprobadas*.

Observaciones:

- **El régimen de 4.º y 5.º está vacío en el PDF.** Se completa con los horarios: Simulación, Ing. y Calidad de Software, Redes y Tecnologías para la Automatización son cuatrimestrales; Adm. de SI y Proyecto Final son anuales.
- **Comunicaciones de Datos (21):** la celda de "cursadas" está en blanco en vez de "–". Probablemente sea un "sin requisito", pero hay que confirmarlo.
- **Proyecto Final y PPS:** para rendir dice "TODAS".
- **Título intermedio** (según la web): *Analista Desarrollador/a Universitario/a de Sistemas de Información*. En los horarios aparece como "Seminario Integrador – Tit. Intermedio" (3.er año, 2C). **No figura qué materias exige.**
- **Electivas:** el plan 2023 solo dice "Paquete". La lista concreta sale del **plan 2008** (que numera las electivas con sus correlativas: 39–48), de los horarios 2026 y de las planificaciones:
  - Testing de Software
  - Reingeniería de Procesos de Negocio
  - Programación Avanzada
  - Sistemas de Soporte a las Decisiones
  - Calidad en el Desarrollo de SW
  - Seguridad Informática
  - Enfoque Lean-Ágil
  - Tecnologías DLT / Blockchain
  - Sistemas de Bases de Datos Avanzadas
  - Desarrollo de Aplicaciones Web
- **Las horas de electivas exigidas no figuran** en ningún documento público.

### Plan 2008 de Sistemas

Sigue publicado y conviviendo con el 2023: los horarios de 2026 ofrecen electivas de los dos. El orden y la numeración de las materias son distintos, así que **un plan no se puede identificar por número de materia, sino por id propio.**

### Otras carreras: variaciones de formato a soportar

- **Correlativas en una sola columna** ("PARA CURSAR Y RENDIR"): Civil, Industrial, Programación y Negociación de Bienes. **Es ambiguo** cómo se aplican al rendir.
- **Notaciones:** listas "13-16", rangos "1 A 13", "TODAS", celdas vacías o "–".
- **Requisitos por horas:** PPS de "200 Horas Reloj" (Electrónica), Pasantías y Seminarios de "100" (Mecatrónica).
- **Electivas con número propio y correlativas** (Electrónica, Sistemas 2008); "Física III (Elec)" sin número (Mecánica).
- **Niveles:** hasta 6.º nivel (Civil, Electrónica). La Licenciatura en Administración Rural tiene "Electiva I" como materia numerada.
- **Errores en los PDF:**
  - número 43 duplicado (Electrónica);
  - "1-2-6-1" con un número repetido (Química, Química Aplicada);
  - régimen vacío (Industrial; Sistemas 4.º y 5.º);
  - Inglés I numerado 16 dentro de 1.er nivel (Química).
  - **Conclusión:** hace falta un validador y la posibilidad de corregir el plan a mano.
- **Formato de los archivos:** 7 de los 13 PDF son imágenes sin texto. **Los planes hay que transcribirlos a mano a JSON**; no se pueden parsear automáticamente.

## 3. Calendario académico 2026/27

Hay **dos versiones distintas**: la tuya y la publicada hoy en la web. Difieren en diciembre:

| | Tu versión | Versión web |
|---|---|---|
| Inicio de inscripción a finales de diciembre | 7/12 | 9/12 |
| Finales de diciembre | 9 al 18/12 | 10 al 18/12 |

Es decir, **el calendario cambia durante el año** y tiene que ser un dato editable y versionado.

Estructura (versión web):

| Evento | Fechas 2026 | Fechas 2027 |
|---|---|---|
| Cursado 1C | 16/3 – 3/7 | |
| Receso de invierno | 6/7 – 17/7 | |
| Cursado 2C | 10/8 – 27/11 | |
| Turnos de final | Feb (2–6, 9–13, 23–27), Mar 9–13, Jul 20–24, Ago 3–7, Dic 10–18 | Feb 1–5, 15–19; Mar 1–5, 8–12 |
| Mesas móviles | May 4–22, Sep 7–25 | |
| Inicio de inscripción a finales | 2/2, 18/2, 2/3, 27/4, 13/7, 27/7, 31/8, 9/12 | 25/1, 10/2, 22/2, 1/3 |
| Encuestas docentes | Jun 22–26, Nov 9–13 | |

Regla operativa: la **inscripción o anulación a un final se puede hacer hasta 48 h hábiles antes del examen**. Para calcularla hacen falta los feriados (marcados en rojo en el calendario).

**No figura:**
- las ventanas de inscripción a cursado;
- la fecha de cada mesa por materia (está en autogestión, que requiere login);
- qué son exactamente las "mesas móviles".

## 4. Planificaciones de cátedra 2026: las reglas reales de cada materia

Están publicadas en https://frvm.utn.edu.ar/cultura-utn/planificaciones-catedra/: 35 de Sistemas y 14 de Básicas, todas con texto extraíble. Las demás carreras también tienen las suyas. **Son la fuente de las reglas de cada materia** y se renuevan cada año, lo que confirma que la regla se copia a la cursada.

### Variantes encontradas (el motor tiene que soportarlas)

| Variante | Ejemplos |
|---|---|
| Nota mínima en **cada** instancia (8 → AD, 6 → regular) | Legislación, Sistemas de Gestión, Lógica, Prob. y Estadística, Ing. y Sociedad, Testing, SSD, Diseño de SI |
| **Promedio** mínimo | Economía (≥ 8 AD), Sistemas Operativos (8 / 6), Física I (7 / 6), AGA y AM II (7 / 6 por RA) |
| **Mínimo por instancia y promedio** combinados | Bases de Datos (cada una ≥ 7 y promedio ≥ 8), Física II (ninguna < 6 y promedio ≥ 8) |
| **% de puntos** totales | Paradigmas y AED (≥ 80 % → AD) |
| Regular con **menos de 6** | Comunicación de Datos: promedio de 6 instancias; ≥ 8 AD, **≥ 4 regular** |
| **N de M** o instancias obligatorias | AM II (AI3 obligatoria + 1 de las otras 2), Redes (como máximo 1 parcial desaprobado), Economía (2 notas ≥ 6) |
| Recuperatorio **reemplaza** la nota | ASI, Sistemas y Procesos de Negocio |
| Recuperatorio **se pondera** con el resto | AGA |
| Recuperatorio **con umbral propio** para mantener la AD | Adm. de SI, Gestión Gerencial, Testing (≥ 8) |
| Recuperatorio **hace perder la AD** | Seguridad Informática, DLT |
| Recuperatorio **para subir la nota** de una instancia aprobada | AM II, IA, Sintaxis, Sistemas y Procesos de Negocio (hasta 3) |
| Límite de recuperatorios | Química (2 de 3), Inglés (1 para AD, 2 para regular), Investigación Operativa (1 sin perder AD) |
| **Promoción de la parte práctica** (el final es solo teórico) | Física II, Seguridad Informática, DLT |
| **Asistencia** distinta para AD y para regular | Adm. de SI y Gestión Gerencial (80 / 75), Física I (80 + 100 % de laboratorios); Redes no la exige |
| **Actividades sin nota** con % de cumplimiento | ASI (50 % regular / 70 % AD), Arquitectura (80 % de cuestionarios), Sist. y Proc. de Negocio (60 / 80 %) |
| **Integrador o coloquio** obligatorio para la AD | AM I (integradora escrita), Lógica (coloquio), Bases de Datos (defensa del TFI) |
| **Escala % → nota** propia de cada cátedra | Desarrollo de Software, DSI, Química General, Proyecto Final: **tablas distintas entre sí** |
| **Ponderaciones** | Proyecto Final (40 % el promedio de las 2 primeras instancias, 60 % la última), tabla de AM I, AGA por RA |
| Nota sin redondeo para aprobar un parcial | ASI ("valor absoluto, no se redondea") |
| Entrega con **fecha límite** | Redes (TP integrador al 31/8) |
| AD que **hay que registrar inscribiéndose a una mesa** | Sistemas de Soporte a las Decisiones |
| Evaluaciones **grupales e individuales** por separado | DSI, SSD, Sist. y Proc. de Negocio |

**Conclusiones:**
1. Una sola plantilla "7/6 por RA" no alcanza. Lo más útil es que la app **traiga precargada la regla de cada materia de ISI 2026**, transcripta de las planificaciones. Eso además elimina la carga manual de reglas, que era uno de los riesgos de abandono.
2. Los bloques combinables del motor siguen siendo el diseño correcto, pero tienen que cubrir la tabla de arriba.
3. Hay redacciones ambiguas: por ejemplo, Desarrollo de Aplicaciones Web dice "2 parciales" y "≥ 8 en los 3 parciales". La **corrección manual del estado** y el **"por qué"** visible siguen siendo imprescindibles.

## 5. Web: otros recursos

- **Horarios por carrera** (https://frvm.utn.edu.ar/estudiantes/), en PDF o XLSX:
  - el de Sistemas tiene la grilla 2C 2026 por año, con materia, régimen, profesores, código de cátedra y marcas "(Elec)" y "Tit. Intermedio";
  - los turnos son: 1.º–2.º año a la mañana, 3.º a la tarde, 4.º–5.º a la noche;
  - **sirve para detectar superposición de horarios** y para completar el régimen que falta en el plan.
- **Autogestión** (autogestion.frvm.utn.edu.ar): mesas, inscripciones y notas oficiales. Requiere login, así que no lo revisé.
- **Campus:** cvirtual.frvm.utn.edu.ar y virtualtec.frvm.utn.edu.ar.
- **Acreditación:** ISI está acreditada por CONEAU por 6 años (noticia del 5/11/2026).
- **Reglamentos:** Ord. 1549 (grado) y Ord. 1622 (pregrado).

## 6. Puntos que siguen abiertos

1. **Horas de electivas exigidas** en ISI 2023 y si las electivas del plan 2008 cuentan para el 2023.
2. **Requisitos del título intermedio** (qué materias y si exige el Seminario Integrador).
3. **Qué son las "mesas móviles"** y quién puede usarlas.
4. **Ventanas de inscripción a cursado** (no están en el calendario).
5. **Normas complementarias de FRVM**, incluida la "ordenanza de flexibilización" que cita Redes.
6. Qué significan las columnas en los planes con formato "PARA CURSAR Y RENDIR" (otras carreras).
7. Confirmar que estás en el **plan 2023** y si en tu caso hubo equivalencias desde el 2008.
8. Si la aprobación directa siempre exige inscribirse a una mesa para registrar la nota, o solo en algunas materias.
