// Notas con estructura propia: el teclado para cargar una nota, la vista por partes y el editor.

import { useState } from 'preact/hooks';
import type { Cursada, Evaluacion, Umbrales } from '../motor/tipos.ts';
import * as A from '../datos/acciones.ts';
import { formatearContra, formatearTotal, MINIMO_PARTE_GENERAL, type CalculoEstructura, type ItemParte, type ParteCalculada } from '../vista/estructura.ts';
import { aplicarPlantilla, plantillasPara, type ClavePlantilla } from '../vista/plantillas.ts';
import { formatearNota, type ResultadoNivel } from '../vista/seguimiento.ts';
import { Aviso, Boton, Campo, Icono } from './componentes.tsx';
import { idNuevo } from './formularios.tsx';
import { Medidor } from './medidor.tsx';
import { actualizar } from './store.ts';

const numero = (s: string) => Number(s.replace(',', '.'));

// ---------- Teclado de nota ----------

/** Un toque para las notas enteras; el campo de abajo para decimales como 7,5. */
export function TecladoNota({ actual, onElegir }: { actual: number | null; onElegir: (n: number | null) => void }) {
  const [texto, setTexto] = useState(actual !== null && !Number.isInteger(actual) ? String(actual) : '');
  const [error, setError] = useState('');
  const guardarTexto = (e: Event) => {
    e.preventDefault();
    const n = numero(texto);
    if (texto.trim() === '' || !Number.isFinite(n) || n < 1 || n > 10) return setError('La nota va de 1 a 10');
    onElegir(n);
  };
  return (
    <div class="teclado">
      <div class="teclado__numeros" role="group" aria-label="Elegir nota">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button key={n} type="button" class={`teclado__tecla${actual === n ? ' teclado__tecla--activa' : ''}`} aria-pressed={actual === n} onClick={() => onElegir(n)}>{n}</button>
        ))}
      </div>
      <form class="teclado__decimal" onSubmit={guardarTexto}>
        <input type="text" inputMode="decimal" value={texto} onInput={e => setTexto(e.currentTarget.value)} placeholder="Otra, ej. 7,5" aria-label="Nota con decimales" />
        <Boton type="submit">Guardar</Boton>
      </form>
      {error && <Aviso tipo="error">{error}</Aviso>}
      {actual !== null && <Boton variante="texto" onClick={() => onElegir(null)}>Dejar sin nota</Boton>}
    </div>
  );
}

// ---------- Vista por partes ----------

/** A qué evaluación va la nota al tocar un ítem: al recuperatorio si hay uno. */
export const notaVigente = (i: ItemParte) => i.reemplazo ?? i.pendiente ?? i.evaluacion;

const ESTADO_PARTE: Record<ParteCalculada['estado'], { tono: string; texto: string }> = {
  aprobada: { tono: 'aprobada', texto: 'Parte aprobada' },
  desaprobada: { tono: 'recursar', texto: 'No llega' },
  pendiente: { tono: 'bloqueada', texto: 'Falta cargar' },
};
const TEXTO_NIVEL = { cumple: ['aprobada', 'Por tus notas, cumplís'], 'no-cumple': ['recursar', 'Por tus notas, no alcanza'], pendiente: ['cursando', 'Todavía no se puede saber'] } as const;

function Nivel({ titulo, r }: { titulo: string; r: ResultadoNivel }) {
  const [tono, texto] = TEXTO_NIVEL[r.estado];
  return (
    <div class="condicion">
      <strong>{titulo}</strong>
      <span class={`etiqueta t-${tono}`}>{texto}</span>
      <ul class="razones">{r.detalles.map(t => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

export function FilaItem({ item, minimo, onNota, onEditar, onEditarRecu }: { item: ItemParte; minimo: number; onNota: () => void; onEditar?: () => void; onEditarRecu?: (e: Evaluacion) => void }) {
  const e = item.evaluacion;
  const tono = item.nota === null ? 'bloqueada' : item.nota >= minimo ? 'aprobada' : 'recursar';
  const recu = item.reemplazo ?? item.pendiente;
  const detalle = [e.peso !== undefined ? `${formatearNota(e.peso)} %` : '', item.reemplazo ? `con «${item.reemplazo.nombre}»` : '', item.pendiente ? `«${item.pendiente.nombre}» sin nota` : ''].filter(Boolean).join(' · ');
  const texto = (
    <>
      <strong>{e.nombre}</strong>
      {detalle && <span class="fila__detalle">{detalle}</span>}
    </>
  );
  return (
    <li class="item">
      {onEditar
        ? <button type="button" class="item__texto" aria-label={`Editar ${e.nombre}`} onClick={onEditar}>{texto}</button>
        : <span class="item__texto">{texto}</span>}
      {onEditar && recu && onEditarRecu && <Boton chico variante="texto" aria-label={`Editar ${recu.nombre}`} onClick={() => onEditarRecu(recu)}><Icono nombre="repetir" tam={16} /></Boton>}
      <button type="button" class={`item__nota t-${tono}${item.nota === null ? ' item__nota--vacia' : ''}`} aria-label={`Nota de ${e.nombre}: ${item.nota === null ? 'sin cargar' : formatearNota(item.nota)}`} onClick={onNota}>
        {item.nota === null ? 'Cargar' : formatearNota(item.nota)}
      </button>
    </li>
  );
}

export function TarjetaParte({ p, minimo, unica, onNota, onEditar, accion }: { p: ParteCalculada; minimo: number; unica: boolean; onNota: (e: ItemParte) => void; onEditar?: (e: Evaluacion) => void; accion?: preact.ComponentChildren }) {
  const estado = ESTADO_PARTE[p.estado];
  return (
    <section class="parte" aria-label={p.parte.nombre}>
      <header class="parte__cab">
        <div>
          <h3>{p.parte.nombre}</h3>
          {!unica && <span class="fila__detalle">pesa {formatearNota(Math.round(p.fraccion * 100))} %</span>}
        </div>
        {p.nota !== null && <strong class="parte__nota">{formatearContra(p.nota, minimo)}</strong>}
      </header>
      {p.nota !== null && <Medidor valor={p.nota} marcas={[minimo]} tono={p.nota < minimo ? 'recursar' : 'aprobada'} />}
      {!unica && <span class={`etiqueta t-${estado.tono}`}>{estado.texto}</span>}
      {p.aviso && <Aviso tipo="alerta">{p.aviso}</Aviso>}
      {p.items.length ? (
        <ul class="items">
          {p.items.map(i => <FilaItem key={i.evaluacion.id} item={i} minimo={minimo} onNota={() => onNota(i)} {...(onEditar ? { onEditar: () => onEditar(i.evaluacion), onEditarRecu: onEditar } : {})} />)}
        </ul>
      ) : (
        <p class="fila__detalle">Todavía no tiene evaluaciones.</p>
      )}
      {accion}
    </section>
  );
}

export function VistaEstructura({ calculo, umbrales, onNota, onEditar, onAsignar }: { calculo: CalculoEstructura; umbrales: Umbrales; onNota: (e: Evaluacion) => void; onEditar: (e: Evaluacion) => void; onAsignar: (e: Evaluacion, parte: string) => void }) {
  const unica = calculo.partes.length === 1;
  const notaDe = (i: ItemParte) => onNota(notaVigente(i));
  return (
    <>
      <div class="marcador">
        <strong class="marcador__titulo total">{calculo.total === null ? 'Todavía no hay notas cargadas' : <>Con lo cargado: <span class="marcador__nota">{formatearTotal(calculo.total, umbrales)}</span></>}</strong>
        {calculo.total !== null && <Medidor valor={calculo.total} marcas={[umbrales.regular, umbrales.promocion]} tono={calculo.total >= umbrales.promocion ? 'aprobada' : calculo.total >= umbrales.regular ? 'regular' : 'recursar'} />}
        <Nivel titulo="Para promocionar" r={calculo.promocion} />
        <Nivel titulo="Para regularizar" r={calculo.regular} />
      </div>
      {calculo.partes.map(p => <TarjetaParte key={p.parte.id} p={p} minimo={calculo.minimoParte} unica={unica} onNota={notaDe} onEditar={onEditar} />)}
      {calculo.sinParte.length > 0 && (
        <section class="parte parte--suelta" aria-label="Sin parte">
          <h3>Sin parte: no cuentan</h3>
          <ul class="items">
            {calculo.sinParte.map(e => (
              <li key={e.id} class="item">
                <span class="item__texto"><strong>{e.nombre}</strong><span class="fila__detalle">{e.nota === null ? 'sin nota' : formatearNota(e.nota)}</span></span>
                <select class="item__asignar" aria-label={`Asignar ${e.nombre} a una parte`} value="" onChange={ev => ev.currentTarget.value && onAsignar(e, ev.currentTarget.value)}>
                  <option value="">Asignar a…</option>
                  {calculo.partes.map(p => <option key={p.parte.id} value={p.parte.id}>{p.parte.nombre}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// ---------- Editor ----------

interface ParteBorrador { id: string; nombre: string; peso: string }
interface EvaluacionBorrador { e: Evaluacion; nombre: string; peso: string }

const aBorrador = (e: Evaluacion): EvaluacionBorrador => ({ e, nombre: e.nombre, peso: e.peso !== undefined ? String(e.peso) : '' });

/** Trabaja sobre un borrador y guarda una sola vez. Nunca borra una evaluación que tenga nota. */
export function EditorEstructura({ materiaId, cursada, onListo }: { materiaId: string; cursada: Cursada; onListo: () => void }) {
  const inicial = cursada.estructura;
  const [partes, setPartes] = useState<ParteBorrador[] | null>(inicial ? inicial.partes.map(p => ({ id: p.id, nombre: p.nombre, peso: String(p.peso) })) : null);
  const [items, setItems] = useState<EvaluacionBorrador[]>((cursada.evaluaciones ?? []).map(aBorrador));
  const [referencias, setReferencias] = useState(inicial?.referencias);
  const [minimo, setMinimo] = useState(inicial?.minimoParte !== undefined ? String(inicial.minimoParte) : '');
  const [error, setError] = useState('');
  const [quitando, setQuitando] = useState(false);

  const usar = (clave: ClavePlantilla) => {
    const r = aplicarPlantilla(clave, cursada.evaluaciones ?? [], idNuevo);
    setPartes(r.estructura.partes.map(p => ({ id: p.id, nombre: p.nombre, peso: String(p.peso) })));
    setItems(r.evaluaciones.map(aBorrador));
    setReferencias(r.estructura.referencias);
  };

  if (!partes) {
    return (
      <div class="plantillas">
        <p class="seccion__texto">Elegí por dónde empezar. Después cambiás nombres, porcentajes y partes.</p>
        {plantillasPara(materiaId).map(p => (
          <button key={p.clave} type="button" class="plantilla" onClick={() => usar(p.clave)}>
            <strong>{p.nombre}</strong>
            <span class="fila__detalle">{p.detalle}</span>
          </button>
        ))}
      </div>
    );
  }

  // Un recuperatorio que reemplaza a otra no es un ítem: va en el lugar de la que reemplaza
  const esReemplazo = (x: EvaluacionBorrador) => x.e.tipo === 'recuperatorio' && !!x.e.reemplazaA && items.some(o => o.e.id === x.e.reemplazaA);
  const deParte = (id: string) => items.filter(x => x.e.parte === id && !esReemplazo(x));
  const cambiarItem = (id: string, cambio: Partial<EvaluacionBorrador>) => setItems(items.map(x => (x.e.id === id ? { ...x, ...cambio } : x)));
  const cambiarParte = (id: string, cambio: Partial<ParteBorrador>) => setPartes(partes.map(p => (p.id === id ? { ...p, ...cambio } : p)));

  /** Saca ítems de su parte: los vacíos se borran, los que tienen nota quedan «sin parte». */
  const soltar = (ids: Set<string>) =>
    setItems(items.flatMap(x => (!ids.has(x.e.id) ? [x] : x.e.nota === null ? [] : [{ ...x, peso: '', e: { ...x.e, parte: undefined } as Evaluacion }])));

  const guardar = (ev: Event) => {
    ev.preventDefault();
    if (!partes.length) return setError('Agregá al menos una parte');
    for (const p of partes) {
      if (!p.nombre.trim()) return setError('Todas las partes necesitan un nombre');
      if (!(numero(p.peso) > 0)) return setError(`«${p.nombre}»: el peso tiene que ser mayor que cero`);
      const suyos = deParte(p.id);
      if (suyos.some(x => !x.nombre.trim())) return setError(`«${p.nombre}»: todas las evaluaciones necesitan un nombre`);
      const conPeso = suyos.filter(x => x.peso.trim() !== '');
      if (!conPeso.length) continue;
      if (conPeso.length < suyos.length) return setError(`«${p.nombre}»: poné porcentaje en todas o en ninguna`);
      if (conPeso.some(x => !(numero(x.peso) > 0 && numero(x.peso) <= 100))) return setError(`«${p.nombre}»: cada porcentaje va de 1 a 100`);
      const suma = conPeso.reduce((s, x) => s + numero(x.peso), 0);
      if (Math.abs(suma - 100) > 0.01) return setError(`«${p.nombre}»: los porcentajes suman ${formatearNota(suma)}, tienen que sumar 100`);
    }
    const min = minimo.trim() === '' ? undefined : numero(minimo);
    if (min !== undefined && !(min >= 1 && min <= 10)) return setError('El mínimo por parte va de 1 a 10');
    const ids = new Set(items.map(x => x.e.id));
    const evaluaciones = items.map(x => {
      const e: Evaluacion = { ...x.e, nombre: x.nombre.trim() || x.e.nombre };
      delete e.peso;
      if (!e.parte) delete e.parte;
      else if (x.peso.trim() !== '') e.peso = numero(x.peso);
      if (e.reemplazaA && !ids.has(e.reemplazaA)) delete e.reemplazaA;
      return e;
    });
    const estructura = { partes: partes.map(p => ({ id: p.id, nombre: p.nombre.trim(), peso: numero(p.peso) })), ...(min !== undefined ? { minimoParte: min } : {}), ...(referencias ? { referencias } : {}) };
    actualizar(d => A.guardarEstructura(d, materiaId, cursada.id, estructura, evaluaciones));
    onListo();
  };

  return (
    <form class="formulario editor" onSubmit={guardar} noValidate>
      {partes.map(p => (
        <fieldset key={p.id} class="editor__parte">
          <legend class="oculto">Parte {p.nombre}</legend>
          <div class="editor__fila">
            <Campo etiqueta="Parte"><input type="text" value={p.nombre} onInput={e => cambiarParte(p.id, { nombre: e.currentTarget.value })} /></Campo>
            {partes.length > 1 && <Campo etiqueta="Peso"><input type="text" inputMode="decimal" value={p.peso} onInput={e => cambiarParte(p.id, { peso: e.currentTarget.value })} /></Campo>}
          </div>
          {deParte(p.id).map(x => (
            <div key={x.e.id} class="editor__item">
              <input type="text" aria-label="Nombre de la evaluación" placeholder="Nombre" value={x.nombre} onInput={e => cambiarItem(x.e.id, { nombre: e.currentTarget.value })} />
              <input type="text" inputMode="decimal" aria-label={`Porcentaje de ${x.nombre || 'la evaluación'}`} placeholder="%" value={x.peso} onInput={e => cambiarItem(x.e.id, { peso: e.currentTarget.value })} />
              <button type="button" class="boton boton--icono" aria-label={`Sacar ${x.nombre || 'la evaluación'}`} onClick={() => soltar(new Set([x.e.id]))}><Icono nombre="cerrar" tam={16} /></button>
            </div>
          ))}
          <div class="botonera">
            <Boton chico onClick={() => setItems([...items, aBorrador({ id: idNuevo(), nombre: '', tipo: 'otra', nota: null, parte: p.id })])}><Icono nombre="agregar" tam={16} /> Evaluación</Boton>
            {partes.length > 1 && (
              <Boton chico variante="texto" onClick={() => { soltar(new Set(deParte(p.id).map(x => x.e.id))); setPartes(partes.filter(o => o.id !== p.id)); }}>Quitar parte</Boton>
            )}
          </div>
        </fieldset>
      ))}
      <Boton onClick={() => setPartes([...partes, { id: idNuevo(), nombre: `Parte ${partes.length + 1}`, peso: '1' }])}><Icono nombre="agregar" tam={16} /> Agregar parte</Boton>
      {partes.length > 1 && (
        <Campo etiqueta="Nota para aprobar cada parte" ayuda={`Vacío: ${MINIMO_PARTE_GENERAL}, sin confirmar.`}>
          <input type="text" inputMode="decimal" value={minimo} placeholder={String(MINIMO_PARTE_GENERAL)} onInput={e => setMinimo(e.currentTarget.value)} />
        </Campo>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="submit" variante="primario">Guardar estructura</Boton>
      {inicial && (
        <Boton variante="texto" onClick={() => {
          if (!quitando) return setQuitando(true);
          actualizar(d => A.guardarEstructura(d, materiaId, cursada.id, null, cursada.evaluaciones ?? []));
          onListo();
        }}>
          {quitando ? 'Tocá otra vez: tus notas se conservan' : 'Volver a la lista simple'}
        </Boton>
      )}
    </form>
  );
}
