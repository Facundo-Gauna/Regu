# Notas con estructura propia y carga rápida — diseño

Aprobado en la conversación del 24/11/2026 (camino A y accesos rápidos).

## Para qué
Cada cátedra calcula distinto (por ejemplo, resultados de aprendizaje con ítems ponderados) y cambia cada año. El alumno arma la estructura de su cursada, y cargar una nota tiene que llevar segundos.

## Objetivos
- Partes con nombre y peso; cada parte con ítems ponderados. Una sola parte sirve para una lista plana con porcentajes.
- Nota mínima para aprobar cada parte, y notas de promoción y regularidad, editables.
- «Con lo cargado» y «necesitás X en lo que falta».
- Carga rápida de una nota desde Inicio, un atajo del ícono y la materia.

## Fuera de alcance
Fórmulas libres; reglas de recuperatorio más allá de «reemplaza a otra»; excepciones como «regular con dos RA»; widgets de pantalla de inicio (una PWA en Android no puede: exigiría envolverla con Capacitor y código nativo).

## Evitar
Prometer un resultado; perder notas ya cargadas; que una app vieja descarte la estructura sin avisar.

## Caminos considerados
| Camino | A favor | En contra |
|---|---|---|
| **A. Partes con ítems ponderados (elegido)** | Cubre los RA y las listas planas | No todas las reglas de recuperatorio |
| B. Lista única con porcentajes | Simple | No expresa «todas las partes aprobadas» |
| C. Fórmulas libres | Muy flexible | Difícil en el celular |

## Datos
- Se reutilizan las evaluaciones. Cada una suma `parte?` (id) y `peso?`. Un ítem sin nota es una casilla por completar.
- La cursada suma `estructura?: { partes: { id, nombre, peso }[], minimoParte? }`. Promoción y regularidad siguen en `umbrales`.
- Todo es opcional. El sobre de guardado y backup pasa a versión 2 **solo** si hay alguna estructura: sin ella sigue en 1 y una app anterior lo lee; con ella, una app anterior lo rechaza en vez de descartar datos.
- Quitar la estructura no borra evaluaciones.

## Cálculo
- Peso de la parte: relativo a las demás (1, 1, 1 son tercios).
- Ítems de una parte: todos con porcentaje o ninguno (partes iguales). Si los porcentajes no suman 100, se avisa y no se concluye.
- Un recuperatorio con nota ocupa el lugar (parte y peso) de la que reemplaza.
- Nota de la parte y total: promedio ponderado de lo cargado. «Necesitás»: lo que hace falta en el peso pendiente para llegar al mínimo; más de 10 = ya no alcanza.
- Parte aprobada: completa y ≥ mínimo (6 por defecto, marcado «Sin confirmar»).
- «Cumple» solo con todo cargado, todas las partes aprobadas y el promedio suficiente. Se compara sin redondear.
- Evaluaciones sin parte no cuentan y se muestran aparte.
- Con estructura propia, la regla transcripta de la cátedra se muestra como texto: no se calculan dos cosas distintas.

## Pantallas
- **Materia:** tarjetas por parte; cada ítem se toca para cargar con un teclado de 1 a 10. Botón «Editar estructura» (u «Organizar mis notas» si no hay).
- **Editor:** hoja con partes, ítems y mínimos. Plantillas editables: Álgebra y Análisis Matemático I (según planificación 2026, «Sin confirmar»), tres partes y lista única.
- **Cargar (`#/cargar`):** materias en curso → ítem → teclado. Permite fijar un acceso.
- **Inicio:** accesos fijados (preferencia del dispositivo, no va en el backup).
- **Manifest:** atajo «Cargar nota» a `./#/cargar`.

## Para quien construye
Textos, disposición fina y nombres internos, siguiendo `PRODUCT.md` y `DESIGN.md`.
