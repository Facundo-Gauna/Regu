// Formularios de carga: cursada, final, aprobación y corrección manual. Más la hoja de acciones rápidas de una materia.

import { useState } from 'preact/hooks';
import type { Cursada, EstadoForzado, Evaluacion, Fecha, ResultadoCursada, TipoEvaluacion, Umbrales } from '../motor/index.ts';
import * as A from '../datos/acciones.ts';
import { construirCursada, fechaDeCierre, finDeCursada, periodoSugerido } from '../vista/cierres.ts';
import { detalleCorto, presentarMateria } from '../vista/estados.ts';
import { fechaCorta } from '../vista/formato.ts';
import { UMBRALES_GENERALES } from '../vista/seguimiento.ts';
import { enlaces } from '../vista/rutas.ts';
import { Aviso, Boton, Campo, Hoja, Icono, Insignia, Segmentado } from './componentes.tsx';
import type { Modelo } from './modelo.ts';
import { actualizar } from './store.ts';

type EventoEntrada = { currentTarget: { value: string } };
const valor = (e: EventoEntrada) => e.currentTarget.value;

function entero(s: string): number | null {
  return /^\d+$/.test(s.trim()) ? Number(s) : null;
}

// ---------- Cursada ----------

const RESULTADOS: { valor: ResultadoCursada; etiqueta: string }[] = [
  { valor: 'cursando', etiqueta: 'Cursando' },
  { valor: 'regular', etiqueta: 'Regular' },
  { valor: 'aprobada-directa', etiqueta: 'Promoción (aprobación directa)' },
  { valor: 'promocion-practica', etiqueta: 'Práctica promocionada' },
  { valor: 'libre', etiqueta: 'Libre' },
];

export interface InicialCursada {
  ciclo?: number;
  cuatrimestre?: Cursada['cuatrimestre'];
  resultado?: ResultadoCursada;
  fechaResultado?: Fecha;
}

/**
 * `simple`: solo para empezar a cursar (o volver a cursar): sin elegir resultado, con el período que corresponde sugerido.
 * Sin `simple` es el formulario completo, para cargar lo que ya pasó.
 */
export function FormCursada({ m, materiaId, inicial, simple = false, onListo }: { m: Modelo; materiaId: string; inicial?: InicialCursada; simple?: boolean; onListo: () => void }) {
  const item = m.items.find(i => i.id === materiaId);
  const regimen = item?.resumen.regimen;
  const sugerido = periodoSugerido(m.cal, regimen ?? null, m.hoy, m.resumen.ciclo);
  const [ciclo, setCiclo] = useState(String(inicial?.ciclo ?? (simple ? sugerido.ciclo : m.resumen.ciclo)));
  const [cuatri, setCuatri] = useState<Cursada['cuatrimestre']>(inicial?.cuatrimestre ?? (simple ? sugerido.cuatrimestre : regimen === 'anual' ? 'anual' : (regimen ?? '1C')));
  const [resultado, setResultado] = useState<ResultadoCursada>(simple ? 'cursando' : (inicial?.resultado ?? 'regular'));
  const [cierre, setCierre] = useState(inicial?.fechaResultado ?? '');
  const [nota, setNota] = useState('');
  const [registrada, setRegistrada] = useState(false);
  const [error, setError] = useState('');

  const cicloNum = entero(ciclo);
  const delCalendario = cicloNum !== null ? finDeCursada(m.cal, cicloNum, cuatri) : null;
  const necesitaCierre = resultado !== 'cursando';

  const guardar = (e: Event) => {
    e.preventDefault();
    if (cicloNum === null) return setError('Indicá el ciclo lectivo (por ejemplo, 2026)');
    const r = construirCursada(m.cal, { ciclo: cicloNum, cuatrimestre: cuatri, resultado, fechaResultado: cierre || undefined });
    if ('error' in r) return setError(r.error);
    const notaNum = nota.trim() === '' ? null : entero(nota);
    if (resultado === 'aprobada-directa' && nota.trim() !== '' && (notaNum === null || notaNum < 6 || notaNum > 10)) return setError('La nota de una aprobación directa va de 6 a 10');
    actualizar(d => {
      let nuevo = A.agregarCursada(d, materiaId, r.cursada);
      if (resultado === 'aprobada-directa' && notaNum !== null) {
        nuevo = A.fijarAprobacion(nuevo, materiaId, { forma: 'directa', nota: notaNum, fecha: r.cursada.fechaResultado ?? m.hoy, registradaEnMesa: registrada });
      }
      return nuevo;
    });
    onListo();
  };

  return (
    <form class="formulario" onSubmit={guardar}>
      <div class="campos-fila">
        <Campo etiqueta="Ciclo lectivo">
          <input type="number" inputMode="numeric" value={ciclo} onInput={e => setCiclo(valor(e))} min={1990} max={2200} required />
        </Campo>
        <Segmentado
          nombre="cuatri"
          etiqueta="Período"
          valor={cuatri}
          onCambio={setCuatri}
          opciones={[{ valor: '1C', etiqueta: '1.er cuat.' }, { valor: '2C', etiqueta: '2.º cuat.' }, { valor: 'anual', etiqueta: 'Anual' }]}
        />
      </div>
      {simple && cicloNum !== null && cicloNum > m.resumen.ciclo && (
        <Aviso tipo="info">El período de este año ya terminó, así que se anota para el {cuatri === 'anual' ? 'cursado anual' : cuatri === '1C' ? '1.er cuatrimestre' : '2.º cuatrimestre'} {cicloNum}. Va a figurar como «cursando» cuando empiece.</Aviso>
      )}
      {!simple && <Segmentado nombre="resultado" etiqueta="¿Cómo te fue?" valor={resultado} onCambio={setResultado} opciones={RESULTADOS} />}
      {necesitaCierre && (
        <Campo
          etiqueta="Fecha de cierre del cursado"
          ayuda={delCalendario ? `Si la dejás vacía se usa el fin del cursado: ${fechaCorta(delCalendario.fecha)}` : undefined}
          error={!delCalendario && !cierre ? 'El calendario no trae este período: indicá la fecha' : undefined}
        >
          <input type="date" value={cierre} onInput={e => setCierre(valor(e))} required={!delCalendario} />
        </Campo>
      )}
      {resultado === 'aprobada-directa' && (
        <>
          <Campo etiqueta="Nota (opcional)" ayuda="Si todavía no la sabés, queda marcada como pendiente de registrar en mesa">
            <input type="number" inputMode="numeric" min={6} max={10} value={nota} onInput={e => setNota(valor(e))} />
          </Campo>
          <label class="casilla">
            <input type="checkbox" checked={registrada} onChange={e => setRegistrada(e.currentTarget.checked)} />
            <span>Ya la registré en una mesa de examen</span>
          </label>
        </>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="submit" variante="primario">{simple ? 'Empezar a cursarla' : 'Guardar cursada'}</Boton>
    </form>
  );
}

// ---------- Resultado de la cursada en curso ----------

const TEXTO_RESULTADO = {
  'aprobada-directa': { titulo: 'Promoción', texto: 'Aprobás la materia sin rendir el final.', boton: 'Confirmar promoción' },
  regular: { titulo: 'Regular', texto: 'Cursaste y te queda rendir el final en una mesa.', boton: 'Confirmar: regularicé' },
  libre: { titulo: 'Libre', texto: 'No alcanzaste la regularidad: tenés que volver a cursar la materia.', boton: 'Confirmar: quedé libre' },
} as const;

/**
 * El usuario cuenta cómo le fue en la cursada que tenía en curso. Se registra con la fecha de hoy (con tope en el fin del
 * cuatrimestre), así el estado cambia en el momento aunque el cuatrimestre todavía no haya terminado.
 */
export function FormResultado({ m, materiaId, resultado, onListo }: { m: Modelo; materiaId: string; resultado: keyof typeof TEXTO_RESULTADO; onListo: () => void }) {
  const actual = m.datos.materias.find(x => x.materiaId === materiaId)?.cursadas.findLast(c => c.resultado === 'cursando');
  const [nota, setNota] = useState('');
  const [registrada, setRegistrada] = useState(false);
  const [error, setError] = useState('');
  const t = TEXTO_RESULTADO[resultado];
  if (!actual) return <Aviso tipo="alerta">Esta materia no tiene una cursada en curso. Cargala desde «Cursadas».</Aviso>;

  const confirmar = (e: Event) => {
    e.preventDefault();
    const n = nota.trim() === '' ? null : entero(nota);
    if (resultado === 'aprobada-directa' && nota.trim() !== '' && (n === null || n < 6 || n > 10)) return setError('La nota de una promoción va de 6 a 10');
    const fecha = fechaDeCierre(m.cal, actual.ciclo, actual.cuatrimestre, m.hoy);
    actualizar(d => A.declararResultado(d, materiaId, { resultado, fecha, nota: n, registradaEnMesa: registrada }));
    onListo();
  };

  return (
    <form class="formulario" onSubmit={confirmar}>
      <div>
        <strong>{t.titulo}</strong>
        <p class="fila__detalle">{t.texto}</p>
      </div>
      {resultado === 'aprobada-directa' && (
        <>
          <Campo etiqueta="Nota (opcional)" ayuda="Si todavía no la sabés, queda como pendiente de registrar en mesa">
            <input type="number" inputMode="numeric" min={6} max={10} value={nota} onInput={e => setNota(valor(e))} />
          </Campo>
          <label class="casilla">
            <input type="checkbox" checked={registrada} onChange={e => setRegistrada(e.currentTarget.checked)} />
            <span>Ya la registré en una mesa de examen</span>
          </label>
        </>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="submit" variante="primario">{t.boton}</Boton>
    </form>
  );
}

// ---------- Notas de la cursada ----------

const TIPOS: { valor: TipoEvaluacion; etiqueta: string }[] = [
  { valor: 'parcial', etiqueta: 'Parcial' },
  { valor: 'tp', etiqueta: 'Trabajo práctico' },
  { valor: 'recuperatorio', etiqueta: 'Recuperatorio' },
  { valor: 'otra', etiqueta: 'Otra' },
];

function idNuevo(): string {
  return globalThis.crypto?.randomUUID?.() ?? `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Carga o edita una evaluación de la cursada. La nota puede quedar vacía hasta que te la den. */
export function FormEvaluacion({ m, materiaId, cursadaId, existentes, inicial, onListo }: { m: Modelo; materiaId: string; cursadaId: string; existentes: Evaluacion[]; inicial?: Evaluacion; onListo: () => void }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [tipo, setTipo] = useState<TipoEvaluacion>(inicial?.tipo ?? 'parcial');
  const [nota, setNota] = useState(inicial?.nota != null ? String(inicial.nota) : '');
  const [fecha, setFecha] = useState<string>(inicial?.fecha ?? '');
  const [reemplaza, setReemplaza] = useState(inicial?.reemplazaA ?? '');
  const [error, setError] = useState('');
  const candidatas = existentes.filter(e => e.id !== inicial?.id && e.tipo !== 'recuperatorio');

  const guardar = (e: Event) => {
    e.preventDefault();
    if (!nombre.trim()) return setError('Poné un nombre para reconocerla (por ejemplo, «Parcial 1»)');
    let n: number | null = null;
    if (nota.trim() !== '') {
      n = Number(nota.replace(',', '.'));
      if (!Number.isFinite(n) || n < 1 || n > 10) return setError('La nota va de 1 a 10. Si todavía no te la dieron, dejala vacía.');
    }
    const ev: Evaluacion = {
      id: inicial?.id ?? idNuevo(),
      nombre: nombre.trim(),
      tipo,
      nota: n,
      ...(fecha ? { fecha } : {}),
      ...(tipo === 'recuperatorio' && reemplaza ? { reemplazaA: reemplaza } : {}),
    };
    actualizar(d => A.guardarEvaluacion(d, materiaId, cursadaId, ev));
    onListo();
  };

  return (
    <form class="formulario" onSubmit={guardar}>
      <Campo etiqueta="Nombre">
        <input type="text" value={nombre} onInput={e => setNombre(valor(e))} placeholder="Ej.: Parcial 1" list="nombres-evaluacion" required />
        <datalist id="nombres-evaluacion">
          {['Parcial 1', 'Parcial 2', 'TP 1', 'TP 2', 'Recuperatorio'].map(n => <option key={n} value={n} />)}
        </datalist>
      </Campo>
      <Segmentado nombre="tipo-evaluacion" etiqueta="Tipo" valor={tipo} onCambio={setTipo} opciones={TIPOS} />
      <Campo etiqueta="Nota" ayuda="De 1 a 10. Dejala vacía si todavía no te la dieron.">
        <input type="number" inputMode="decimal" min={1} max={10} step="any" value={nota} onInput={e => setNota(valor(e))} />
      </Campo>
      <Campo etiqueta="Fecha (opcional)">
        <input type="date" value={fecha} onInput={e => setFecha(valor(e))} max={m.hoy} />
      </Campo>
      {tipo === 'recuperatorio' && (
        <Campo etiqueta="¿Qué evaluación reemplaza?" ayuda="Su nota reemplaza a la que elijas. Si en tu cátedra se calcula distinto (por ejemplo, se queda la mayor), cargala como «Otra».">
          <select value={reemplaza} onChange={e => setReemplaza(e.currentTarget.value)}>
            <option value="">Ninguna: cuenta como una más</option>
            {candidatas.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.nota != null ? ` (${c.nota})` : ''}</option>)}
          </select>
        </Campo>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="submit" variante="primario">{inicial ? 'Guardar cambios' : 'Cargar nota'}</Boton>
    </form>
  );
}

/** Las notas de referencia para ver cómo viene la cursada. Cada cátedra tiene las suyas: se ajustan según su planificación. */
export function FormUmbrales({ materiaId, cursadaId, actual, propios, onListo }: { materiaId: string; cursadaId: string; actual: Umbrales; propios: boolean; onListo: () => void }) {
  const [promocion, setPromocion] = useState(String(actual.promocion));
  const [regular, setRegular] = useState(String(actual.regular));
  const [error, setError] = useState('');

  const guardar = (e: Event) => {
    e.preventDefault();
    const p = Number(promocion.replace(',', '.'));
    const r = Number(regular.replace(',', '.'));
    if (![p, r].every(x => Number.isFinite(x) && x >= 1 && x <= 10)) return setError('Las dos notas van de 1 a 10');
    if (r > p) return setError('La nota para regularizar no puede ser mayor que la de promocionar');
    actualizar(d => A.fijarUmbrales(d, materiaId, cursadaId, { promocion: p, regular: r }));
    onListo();
  };

  return (
    <form class="formulario" onSubmit={guardar}>
      <p class="fila__detalle">Son tus referencias para leer las notas: no cambian el estado de la materia. Usá lo que dice la planificación de tu cátedra.</p>
      <div class="campos-fila">
        <Campo etiqueta="Para promocionar"><input type="number" inputMode="decimal" min={1} max={10} step="any" value={promocion} onInput={e => setPromocion(valor(e))} required /></Campo>
        <Campo etiqueta="Para regularizar"><input type="number" inputMode="decimal" min={1} max={10} step="any" value={regular} onInput={e => setRegular(valor(e))} required /></Campo>
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div class="botonera">
        <Boton type="submit" variante="primario">Guardar referencias</Boton>
        {propios && (
          <Boton variante="texto" onClick={() => { actualizar(d => A.fijarUmbrales(d, materiaId, cursadaId, null)); onListo(); }}>
            Volver a la regla general ({UMBRALES_GENERALES.promocion} / {UMBRALES_GENERALES.regular})
          </Boton>
        )}
      </div>
    </form>
  );
}

// ---------- Final ----------

type ResultadoFinal = 'aprobado' | 'insuficiente' | 'ausente';

export function FormFinal({ m, materiaId, onListo }: { m: Modelo; materiaId: string; onListo: () => void }) {
  const info = m.resumen.materias.find(x => x.id === materiaId);
  const [fecha, setFecha] = useState<string>(m.hoy);
  const [resultado, setResultado] = useState<ResultadoFinal>('aprobado');
  const [nota, setNota] = useState('');
  const [soloTeorico, setSoloTeorico] = useState(false);
  const [error, setError] = useState('');

  const guardar = (e: Event) => {
    e.preventDefault();
    if (!fecha) return setError('Indicá la fecha del examen');
    let notaNum: number | undefined;
    if (resultado !== 'ausente') {
      const n = entero(nota);
      if (n === null) return setError('Indicá la nota');
      if (resultado === 'aprobado' && (n < 6 || n > 10)) return setError('Un final aprobado va de 6 a 10');
      if (resultado === 'insuficiente' && (n < 1 || n > 5)) return setError('Un aplazo va de 1 a 5');
      notaNum = n;
    }
    actualizar(d => A.agregarFinal(d, materiaId, { fecha, resultado, ...(notaNum !== undefined ? { nota: notaNum } : {}), ...(soloTeorico ? { soloTeorico: true } : {}) }));
    onListo();
  };

  return (
    <form class="formulario" onSubmit={guardar}>
      <Campo etiqueta="Fecha del examen">
        <input type="date" value={fecha} onInput={e => setFecha(valor(e))} required />
      </Campo>
      <Segmentado
        nombre="final"
        etiqueta="Resultado"
        valor={resultado}
        onCambio={setResultado}
        opciones={[{ valor: 'aprobado', etiqueta: 'Aprobé' }, { valor: 'insuficiente', etiqueta: 'Me aplazaron' }, { valor: 'ausente', etiqueta: 'No me presenté' }]}
      />
      {resultado !== 'ausente' && (
        <Campo etiqueta="Nota" ayuda={resultado === 'aprobado' ? 'De 6 a 10' : 'De 1 a 5'}>
          <input type="number" inputMode="numeric" min={1} max={10} value={nota} onInput={e => setNota(valor(e))} required />
        </Campo>
      )}
      {resultado === 'ausente' && <p class="nota-ayuda">Un ausente no cuenta como aplazo (Ord. 1549 8.2.6).</p>}
      {info?.estado.promocionPractica && (
        <label class="casilla">
          <input type="checkbox" checked={soloTeorico} onChange={e => setSoloTeorico(e.currentTarget.checked)} />
          <span>Rendí solo la parte teórica</span>
        </label>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="submit" variante="primario">Guardar final</Boton>
    </form>
  );
}

// ---------- Aprobación ----------

type Forma = 'directa' | 'final' | 'equivalencia';

export function FormAprobacion({ m, materiaId, onListo }: { m: Modelo; materiaId: string; onListo: () => void }) {
  const [forma, setForma] = useState<Forma>('final');
  const [fecha, setFecha] = useState<string>(m.hoy);
  const [nota, setNota] = useState('');
  const [registrada, setRegistrada] = useState(true);
  const [error, setError] = useState('');

  const guardar = (e: Event) => {
    e.preventDefault();
    if (!fecha) return setError('Indicá la fecha');
    const n = nota.trim() === '' ? null : entero(nota);
    if (nota.trim() !== '' && (n === null || n < 6 || n > 10)) return setError('La nota va de 6 a 10');
    if (forma === 'final' && n === null) return setError('Indicá la nota del final');
    actualizar(d => {
      if (forma === 'final') return A.agregarFinal(d, materiaId, { fecha, resultado: 'aprobado', nota: n! });
      return A.fijarAprobacion(d, materiaId, forma === 'directa' ? { forma, nota: n, fecha, registradaEnMesa: registrada } : { forma, nota: n, fecha });
    });
    onListo();
  };

  return (
    <form class="formulario" onSubmit={guardar}>
      <Segmentado
        nombre="forma"
        etiqueta="¿Cómo la aprobaste?"
        valor={forma}
        onCambio={setForma}
        opciones={[{ valor: 'final', etiqueta: 'Final' }, { valor: 'directa', etiqueta: 'Aprobación directa' }, { valor: 'equivalencia', etiqueta: 'Equivalencia' }]}
      />
      <Campo etiqueta={forma === 'final' ? 'Fecha del examen' : 'Fecha de aprobación'}>
        <input type="date" value={fecha} onInput={e => setFecha(valor(e))} required />
      </Campo>
      <Campo etiqueta={forma === 'final' ? 'Nota' : 'Nota (opcional)'} ayuda={forma === 'equivalencia' ? 'Las equivalencias no cuentan para el promedio ni para estudiante regular' : undefined}>
        <input type="number" inputMode="numeric" min={6} max={10} value={nota} onInput={e => setNota(valor(e))} required={forma === 'final'} />
      </Campo>
      {forma === 'directa' && (
        <label class="casilla">
          <input type="checkbox" checked={registrada} onChange={e => setRegistrada(e.currentTarget.checked)} />
          <span>Ya la registré en una mesa de examen</span>
        </label>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="submit" variante="primario">Marcar como aprobada</Boton>
    </form>
  );
}

// ---------- Corrección manual ----------

const ESTADOS: { valor: EstadoForzado; etiqueta: string }[] = [
  { valor: 'no-cursada', etiqueta: 'No cursada' },
  { valor: 'cursando', etiqueta: 'Cursando' },
  { valor: 'regular', etiqueta: 'Regular' },
  { valor: 'aprobada', etiqueta: 'Aprobada' },
  { valor: 'recursar', etiqueta: 'Recursar' },
];

export function FormCorreccion({ m, materiaId, onListo }: { m: Modelo; materiaId: string; onListo: () => void }) {
  const actual = m.datos.materias.find(x => x.materiaId === materiaId)?.correccion;
  const [estado, setEstado] = useState<EstadoForzado>(actual?.estado ?? 'regular');
  const [motivo, setMotivo] = useState(actual?.motivo ?? '');
  const [error, setError] = useState('');

  const guardar = (e: Event) => {
    e.preventDefault();
    if (!motivo.trim()) return setError('Escribí el motivo: ayuda a recordar por qué lo cambiaste');
    actualizar(d => A.fijarCorreccion(d, materiaId, { estado, motivo: motivo.trim(), fecha: m.hoy }));
    onListo();
  };

  return (
    <form class="formulario" onSubmit={guardar}>
      <Aviso tipo="info">Si la cátedra o autogestión dicen algo distinto de lo que calcula Regu, forzá el estado acá. Tiene prioridad sobre el cálculo.</Aviso>
      <Segmentado nombre="estado-forzado" etiqueta="Estado" valor={estado} onCambio={setEstado} opciones={ESTADOS} />
      <Campo etiqueta="Motivo">
        <input type="text" value={motivo} onInput={e => setMotivo(valor(e))} placeholder="Ej.: la cátedra me dio la regularidad" required />
      </Campo>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Boton type="submit" variante="primario">Guardar corrección</Boton>
    </form>
  );
}

// ---------- Hoja de acciones rápidas de una materia ----------

export type AccionRapida = 'cursada' | 'final' | 'aprobada' | null;

export function HojaMateria({ m, materiaId, accion: accionInicial, inicialCursada, onCerrar }: { m: Modelo; materiaId: string | null; accion?: AccionRapida; inicialCursada?: InicialCursada; onCerrar: () => void }) {
  const [accion, setAccion] = useState<AccionRapida>(null);
  const [claveAccion, setClaveAccion] = useState<string | null>(null);
  const item = materiaId ? m.items.find(i => i.id === materiaId) : undefined;

  // Reinicia la acción cuando se abre otra materia
  const clave = `${materiaId}|${accionInicial ?? ''}`;
  if (claveAccion !== clave) {
    setClaveAccion(clave);
    setAccion(accionInicial ?? null);
  }

  const cerrar = () => {
    setAccion(null);
    onCerrar();
  };
  const volver = () => setAccion(null);

  return (
    <Hoja abierta={!!item} titulo={item?.nombre ?? ''} onCerrar={cerrar}>
      {item && (
        <>
          <div class="hoja__estado">
            <Insignia p={presentarMateria(item.resumen)} />
            <span class="fila__detalle">{detalleCorto(item.resumen)}</span>
          </div>
          {accion === null && (
            <div class="acciones-rapidas">
              <Boton onClick={() => setAccion('aprobada')}><Icono nombre="check" /> Aprobada</Boton>
              <Boton onClick={() => setAccion('cursada')}><Icono nombre="play" /> Cursada / regular</Boton>
              <Boton onClick={() => setAccion('final')}><Icono nombre="finales" /> Cargar final</Boton>
              {m.datos.materias.some(x => x.materiaId === item.id) && (
                <Boton variante="texto" onClick={() => { actualizar(d => A.borrarMateria(d, item.id)); cerrar(); }}>
                  <Icono nombre="borrar" /> Borrar sus datos
                </Boton>
              )}
              <a class="boton boton--texto" href={enlaces.materia(item.id)} onClick={cerrar}>Ver detalle completo <Icono nombre="der" tam={16} /></a>
            </div>
          )}
          {accion !== null && (
            <>
              <Boton variante="texto" chico onClick={volver}><Icono nombre="izq" tam={16} /> Volver</Boton>
              {accion === 'aprobada' && <FormAprobacion m={m} materiaId={item.id} onListo={cerrar} />}
              {accion === 'cursada' && <FormCursada m={m} materiaId={item.id} inicial={inicialCursada} onListo={cerrar} />}
              {accion === 'final' && <FormFinal m={m} materiaId={item.id} onListo={cerrar} />}
            </>
          )}
        </>
      )}
    </Hoja>
  );
}
