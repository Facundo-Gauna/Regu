// Definir cómo se aprueba una cursada: cada nota, el promedio o las dos, para promocionar y para regularizar.

import { useState } from 'preact/hooks';
import type { CondicionNotas, CriterioAprobacion, Cursada } from '../motor/tipos.ts';
import * as A from '../datos/acciones.ts';
import { MINIMO_PARTE_GENERAL } from '../vista/estructura.ts';
import type { Seguimiento } from '../vista/seguimiento.ts';
import { Aviso, Boton, Campo, Segmentado } from './componentes.tsx';
import { actualizar } from './store.ts';

type Modo = 'cada' | 'promedio' | 'ambas';
const MODOS: { valor: Modo; etiqueta: string; detalle: string }[] = [
  { valor: 'cada', etiqueta: 'Cada nota', detalle: 'Todas tienen que llegar al mínimo.' },
  { valor: 'promedio', etiqueta: 'El promedio', detalle: 'Solo importa el promedio.' },
  { valor: 'ambas', etiqueta: 'Las dos cosas', detalle: 'Un mínimo en cada una y además un promedio.' },
];

const modoDe = (c: CondicionNotas | undefined): Modo | null =>
  !c ? null : c.cadaInstanciaMin !== undefined && c.promedioMin !== undefined ? 'ambas' : c.cadaInstanciaMin !== undefined ? 'cada' : 'promedio';

const numero = (t: string) => Number(t.replace(',', '.'));

/** Una nota con botones grandes para subir y bajar; también se puede escribir. */
function Contador({ etiqueta, valor, onCambio }: { etiqueta: string; valor: string; onCambio: (v: string) => void }) {
  const mover = (paso: number) => {
    const n = numero(valor);
    onCambio(String(Math.min(10, Math.max(1, (Number.isFinite(n) ? n : 6) + paso))));
  };
  return (
    <div class="contador">
      <span class="campo__etiqueta">{etiqueta}</span>
      <div class="contador__controles">
        <button type="button" class="boton contador__boton" aria-label={`Bajar: ${etiqueta}`} onClick={() => mover(-1)}>−</button>
        <input type="number" inputMode="decimal" min={1} max={10} step="any" aria-label={etiqueta} value={valor} onInput={e => onCambio(e.currentTarget.value)} />
        <button type="button" class="boton contador__boton" aria-label={`Subir: ${etiqueta}`} onClick={() => mover(1)}>+</button>
      </div>
    </div>
  );
}

interface Borrador { modo: Modo | null; cada: string; promedio: string }

const borrador = (c: CondicionNotas | undefined, porDefecto: number): Borrador => ({
  modo: modoDe(c),
  cada: String(c?.cadaInstanciaMin ?? c?.promedioMin ?? porDefecto),
  promedio: String(c?.promedioMin ?? c?.cadaInstanciaMin ?? porDefecto),
});

function Nivel({ nombre, titulo, b, onCambio }: { nombre: string; titulo: string; b: Borrador; onCambio: (b: Borrador) => void }) {
  return (
    <fieldset class="criterio__nivel">
      <legend class="oculto">{titulo}</legend>
      <h3>{titulo}</h3>
      <Segmentado nombre={nombre} etiqueta="¿Qué se pide?" valor={b.modo as Modo} onCambio={modo => onCambio({ ...b, modo })} opciones={MODOS} />
      {(b.modo === 'cada' || b.modo === 'ambas') && <Contador etiqueta={`Mínimo en cada nota para ${titulo.toLowerCase()}`} valor={b.cada} onCambio={cada => onCambio({ ...b, cada })} />}
      {(b.modo === 'promedio' || b.modo === 'ambas') && <Contador etiqueta={`Promedio mínimo para ${titulo.toLowerCase()}`} valor={b.promedio} onCambio={promedio => onCambio({ ...b, promedio })} />}
    </fieldset>
  );
}

export function FormCriterio({ materiaId, cursada, s, onListo }: { materiaId: string; cursada: Cursada; s: Seguimiento; onListo: () => void }) {
  const estructura = cursada.estructura;
  const variasPartes = (estructura?.partes.length ?? 0) > 1;
  const inicialPromocion = borrador(s.criterio?.promocion, s.umbrales.promocion);
  const inicialRegular = borrador(s.criterio?.regular, s.umbrales.regular);
  const [promocion, setPromocion] = useState(inicialPromocion);
  const [regular, setRegular] = useState(inicialRegular);
  const [instancias, setInstancias] = useState(String(s.criterio?.instancias ?? ''));
  const [porParte, setPorParte] = useState(!estructura?.sinMinimo);
  const [minimo, setMinimo] = useState(String(estructura?.minimoParte ?? MINIMO_PARTE_GENERAL));
  const [error, setError] = useState('');

  // Guardar sin tocar nada no convierte algo «sin confirmar» en propio
  const tocoReglas = JSON.stringify([promocion, regular, instancias]) !== JSON.stringify([inicialPromocion, inicialRegular, String(s.criterio?.instancias ?? '')]);
  const tocoMinimo = minimo !== String(estructura?.minimoParte ?? MINIMO_PARTE_GENERAL);

  const condicion = (b: Borrador): CondicionNotas | null => {
    const r: CondicionNotas = {};
    if (b.modo !== 'promedio') r.cadaInstanciaMin = numero(b.cada);
    if (b.modo !== 'cada') r.promedioMin = numero(b.promedio);
    return Object.values(r).every(n => Number.isFinite(n) && n >= 1 && n <= 10) ? r : null;
  };

  const guardar = (e: Event) => {
    e.preventDefault();
    if (!promocion.modo || !regular.modo) return setError('Elegí qué se pide para promocionar y para regularizar');
    const p = condicion(promocion);
    const r = condicion(regular);
    const min = numero(minimo);
    if (!p || !r || (variasPartes && porParte && !(min >= 1 && min <= 10))) return setError('Las notas van de 1 a 10');
    const techo = (c: CondicionNotas) => c.promedioMin ?? c.cadaInstanciaMin!;
    if (techo(r) > techo(p)) return setError('Para regularizar no se puede pedir más que para promocionar');
    const total = instancias.trim() === '' ? undefined : Number(instancias);
    if (total !== undefined && !(Number.isInteger(total) && total > 0 && total <= 60)) return setError('La cantidad de notas es un número entero');
    const criterio: CriterioAprobacion = { promocion: p, regular: r, ...(total !== undefined && !estructura ? { instancias: total } : {}) };
    actualizar(d => {
      let nuevo = tocoReglas || s.origenUmbrales === 'usuario' ? A.fijarCriterio(d, materiaId, cursada.id, criterio) : d;
      if (variasPartes) {
        nuevo = A.fijarSinMinimo(nuevo, materiaId, cursada.id, !porParte);
        if (porParte && tocoMinimo) nuevo = A.fijarMinimoParte(nuevo, materiaId, cursada.id, min);
      }
      return nuevo;
    });
    onListo();
  };

  return (
    <form class="formulario" onSubmit={guardar} noValidate>
      <p class="seccion__texto">Copiá lo que dice la planificación de tu cátedra. Con esto Regu hace las cuentas; no cambia el estado de la materia.</p>
      <Nivel nombre="modo-promocion" titulo="Promocionar" b={promocion} onCambio={setPromocion} />
      <Nivel nombre="modo-regular" titulo="Regularizar" b={regular} onCambio={setRegular} />
      {!estructura && (
        <Campo etiqueta="¿Cuántas notas se toman en total? (opcional)" ayuda="Con este dato te decimos cuánto necesitás en las que faltan.">
          <input type="text" inputMode="numeric" value={instancias} onInput={e => setInstancias(e.currentTarget.value)} />
        </Campo>
      )}
      {variasPartes && (
        <>
          <label class="casilla">
            <input type="checkbox" checked={porParte} onChange={e => setPorParte(e.currentTarget.checked)} />
            <span>Además hay que aprobar cada parte por separado</span>
          </label>
          {porParte && <Contador etiqueta="Para aprobar cada parte" valor={minimo} onCambio={setMinimo} />}
        </>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="submit" variante="primario">Guardar referencias</Boton>
      {(cursada.criterio || cursada.umbrales) && (
        <Boton variante="texto" onClick={() => { actualizar(d => A.fijarCriterio(d, materiaId, cursada.id, null)); onListo(); }}>
          Volver a lo que traía por defecto
        </Boton>
      )}
    </form>
  );
}
