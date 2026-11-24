# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Estudiantes de Ingeniería en Sistemas de Información de la UTN FRVM (plan 2023): primero quien la desarrolla (cursando 1.er año, usa Android) y también compañeros que la usen. Quien llega de cero tiene que entenderla con un mínimo de explicación. La usan desde el celular, en momentos cortos (entre clases, después de que cargan una nota, antes de una inscripción), y a veces en escritorio.

## Product Purpose

Unificar en un solo lugar las notas, el estado de cada materia, las reglas del plan y del reglamento (Ord. 1549) y las fechas, y responder «¿qué puedo hacer ahora?»: qué cursar, qué rendir y cómo viene cada cursada. Hay éxito si se pueden decidir las inscripciones de un cuatrimestre sin abrir autogestión ni el PDF del plan.

## Positioning

Aplica las reglas reales de la facultad (correlativas, excepciones de la Ord. 1549, planificaciones de cátedra citadas con su fuente) sobre datos cargados por el propio estudiante, y dice con claridad qué parte está sin confirmar.

## Operating Context

- Las notas hoy viven en el campus virtual y en autogestión; se cargan a mano.
- El plan y las correlativas están en PDFs; las reglas de aprobación, en la planificación de cada cátedra, que cambia cada año.
- Momentos clave: inscripción a cursado, carga de notas durante el cuatrimestre, cierre de cursada, turnos de final.

## Capabilities and Constraints

- PWA instalable, abre sin conexión. Todo es local: sin cuentas ni servidor; nada sale del dispositivo. El backup se exporta e importa a mano.
- El estado de cada materia se calcula a partir de los hechos cargados; se puede corregir a mano.
- «Qué te falta» existe para las 8 materias de 1.er año, con reglas todavía sin confirmar; algunas no se pueden calcular y se muestran como texto.
- Las electivas con datos sin confirmar no figuran como habilitadas.
- No se sondean los servidores de la facultad sin pedido expreso.
- Sin decidir: importar pegando desde autogestión, otras carreras.

## Brand Commitments

- Nombre: Regu. No es una aplicación oficial de la UTN; no usa su logo ni su asterisco.
- Identidad inspirada en la FRVM: ámbar #F5A800 sobre negro y blanco. El ámbar es solo para la marca y la acción principal.
- Voz: español rioplatense (voseo) y vocabulario de la facultad (aplazo, regular, mesa, promoción).

## Evidence on Hand

- Plan ISI 2023 y calendario 2026/27 transcriptos en `datos/`; reglas de 1.er año en `datos/reglas/`.
- Estudiante de ejemplo en la app (`?ejemplo=1`).
- No hay testimonios ni métricas de uso.

## Product Principles

- Nunca prometer un resultado: la fuente de verdad es autogestión y la cátedra.
- Decir qué está sin confirmar sin tapar con advertencias lo que importa.
- Responder primero «qué puedo hacer ahora»; el detalle, a un toque.
- Privacidad por diseño: todo queda en el dispositivo.

## Accessibility & Inclusion

Objetivos táctiles de 44 px, estado con ícono y texto (no solo color), contrastes AA en tema claro y oscuro, respetar «reducir movimiento».
