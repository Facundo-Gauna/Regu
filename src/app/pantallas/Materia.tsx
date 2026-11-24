import { useEffect, useState } from 'preact/hooks';
import type { Cursada, Evaluacion, Falta, ResultadoCursada } from '../../motor/index.ts';
import type { ReglaCursada } from '../../motor/tipos.ts';
import * as A from '../../datos/acciones.ts';
import { detalleCorto, etiquetaRegimen, presentarMateria } from '../../vista/estados.ts';
import { fechaCorta, nombreCuatrimestre } from '../../vista/formato.ts';
import { formatearNota, queFalta, seguimientoCursada, type EstadoCondicion, type NivelNota, type ResultadoNivel } from '../../vista/seguimiento.ts';
import { relaciones } from '../../vista/mapa.ts';
import { enlaces } from '../../vista/rutas.ts';
import { caminoMateria, GLOSA, type Camino } from '../../vista/camino.ts';
import { veredictoCursar, veredictoRendir, type Veredicto } from '../../vista/veredicto.ts';
import { Boton, Hoja, Icono, Insignia, Seccion, SinConfirmar, Vacio } from '../componentes.tsx';
import { FormAprobacion, FormCorreccion, FormCursada, FormEvaluacion, FormFinal, FormResultado, FormUmbrales } from '../formularios.tsx';
import { referencia, type Modelo } from '../modelo.ts';
import { BotonAyuda } from '../ayuda.tsx';
import { Medidor } from '../medidor.tsx';
import { Referencias } from '../referencias.tsx';
import { EditorEstructura, TecladoNota, VistaEstructura } from '../estructura.tsx';
import { calcular } from '../../vista/estructura.ts';
import { actualizar } from '../store.ts';

const RESULTADO_CURSADA: Record<ResultadoCursada, string> = {
  cursando: 'Cursando',
  regular: 'Regular',
  'aprobada-directa': 'Promoción',
  'promocion-practica': 'Práctica promocionada',
  libre: 'Libre',
};

const RESULTADO_FINAL = { aprobado: 'Aprobado', insuficiente: 'Aplazo', ausente: 'Ausente' } as const;

/** Botón de borrado en dos toques: el primero pide confirmación (sin diálogos del navegador). */
function BotonBorrar({ etiqueta, onBorrar }: { etiqueta: string; onBorrar: () => void }) {
  const [confirmando, setConfirmando] = useState(false);
  useEffect(() => {
    if (!confirmando) return;
    const t = setTimeout(() => setConfirmando(false), 3500);
    return () => clearTimeout(t);
  }, [confirmando]);
  return confirmando ? (
    <Boton chico variante="peligro" onClick={onBorrar} aria-label={`Confirmar: ${etiqueta}`}>¿Borrar?</Boton>
  ) : (
    <Boton chico variante="texto" onClick={() => setConfirmando(true)} aria-label={etiqueta}><Icono nombre="borrar" tam={16} /></Boton>
  );
}

function Enlaces({ m, ids }: { m: Modelo; ids: string[] }) {
  if (!ids.length) return <span class="fila__detalle">Ninguna</span>;
  return (
    <ul class="etiquetas">
      {ids.map(id => {
        const item = m.items.find(i => i.id === id);
        return (
          <li key={id}>
            <a class={`etiqueta${item ? ` t-${item.presentacion.tono}` : ''}`} href={enlaces.materia(id)}>
              {item ? <Icono nombre={item.presentacion.icono} tam={13} /> : null}
              {item?.nombre ?? id}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Las correlativas que faltan, con el color del estado en que están hoy y qué hace falta hacer con cada una. */
function Faltan({ faltan, m, pendientes }: { faltan: Falta[]; m: Modelo; pendientes: boolean }) {
  if (!faltan.length) return null;
  return (
    <div class="faltan">
      <span class="fila__detalle">{pendientes ? 'Pendientes (por ahora no te las piden):' : 'Te faltan:'}</span>
      <ul class="etiquetas">
        {faltan.map(f => {
          const item = m.items.find(i => i.id === f.id);
          return (
            <li key={f.id}>
              <a class={`etiqueta t-${item?.presentacion.tono ?? 'bloqueada'}`} href={item ? enlaces.materia(f.id) : enlaces.plan()}>
                {item && <Icono nombre={item.presentacion.icono} tam={13} />}
                {f.nombre}
                <small>{f.requerido === 'regular' ? 'falta regularizar' : f.requerido === 'aprobada' ? 'falta aprobar' : 'falta cumplir'}</small>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FilaVeredicto({ etiqueta, v, faltan, m }: { etiqueta: string; v: Veredicto; faltan: Falta[]; m: Modelo }) {
  return (
    <div class="veredicto">
      <span class="veredicto__que">{etiqueta}</span>
      <div class="veredicto__cuerpo">
        <strong class="veredicto__titulo">
          <Icono nombre={v.icono} tam={18} /> {v.titulo}
        </strong>
        {v.detalle && <p class="veredicto__detalle">{v.detalle}</p>}
        <Faltan faltan={faltan} m={m} pendientes={v.puede === true} />
      </div>
    </div>
  );
}

const TONO_NIVEL: Record<NivelNota, string> = { promocion: 'aprobada', regular: 'regular', debajo: 'recursar', pendiente: 'bloqueada' };
/** La regla de la cátedra para esa materia y ciclo, si la tenemos transcripta. */
const reglaDe = (materiaId: string, ciclo: number): ReglaCursada | undefined => (referencia.ok ? referencia.reglas.find(r => r.materiaId === materiaId && r.ciclo === ciclo) : undefined);

const TEXTO_TIPO = { parcial: 'Parcial', tp: 'Trabajo práctico', recuperatorio: 'Recuperatorio', otra: 'Otra' } as const;

const TONO_CONDICION: Record<EstadoCondicion, string> = { cumple: 'aprobada', 'no-cumple': 'recursar', pendiente: 'cursando' };
const TEXTO_CONDICION: Record<EstadoCondicion, string> = { cumple: 'Por tus notas, cumplís', 'no-cumple': 'Por tus notas, no alcanza', pendiente: 'Todavía no se puede saber' };

function Condicion({ titulo, r }: { titulo: string; r: ResultadoNivel }) {
  return (
    <div class="condicion">
      <strong>{titulo}</strong>
      <span class={`etiqueta t-${TONO_CONDICION[r.estado]}`}>{TEXTO_CONDICION[r.estado]}</span>
      <ul class="razones">{r.detalles.map(t => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

/**
 * La regla de la cátedra para esta cursada, transcripta de su planificación, y qué te falta según tus notas.
 * Habla solo de notas: la asistencia y lo demás se listan aparte porque la app no lo sabe. No promete resultados.
 */
function ReglaCatedra({ regla, cursada }: { regla: ReglaCursada; cursada: Cursada }) {
  const q = queFalta(seguimientoCursada(cursada, regla), regla);
  // Con estructura propia manda la del alumno: no se calculan dos cosas distintas
  const calcula = q.calculable && !cursada.estructura;
  const aConfirmar = regla.verificar.length > 0;
  return (
    <div class="tarjeta regla">
      <div class="regla__cab">
        <strong>Regla de tu cátedra · planificación {regla.ciclo}</strong>
        {aConfirmar && (
          <SinConfirmar titulo="Dudas sobre esta regla">
            <p class="seccion__texto">La transcribimos de la planificación, pero nadie de la cátedra la confirmó:</p>
            <ul class="razones">{regla.verificar.map(t => <li key={t}>{t}</li>)}</ul>
          </SinConfirmar>
        )}
      </div>
      <p class="seccion__texto">{regla.resumen}</p>
      {calcula ? (
        <>
          {q.promocion && <Condicion titulo="Para promocionar" r={q.promocion} />}
          {q.regular && <Condicion titulo="Para regularizar" r={q.regular} />}
        </>
      ) : cursada.estructura ? null : (
        <p class="fila__detalle">Esta regla no se puede calcular con tus notas; va como la escribió la cátedra.</p>
      )}
      {q.dependeDeVos.length > 0 && (
        <div>
          <strong class="fila__detalle">Esto depende de vos</strong>
          <ul class="razones">{q.dependeDeVos.map(t => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      <details class="plegable">
        <summary>Recuperatorios y fuente</summary>
        <div class="plegable__cuerpo">
          <h3>Recuperatorios</h3>
          <p class="seccion__texto">{regla.recuperatorios}</p>
          <h3>Fuente</h3>
          <p class="fila__detalle">{regla.fuente.archivo} · {regla.fuente.seccion}</p>
          <blockquote class="cita">{regla.fuente.cita}</blockquote>
        </div>
      </details>
    </div>
  );
}

/**
 * Cómo viene la cursada: las notas que fue cargando, con el promedio y la mínima. Es un resumen de lo cargado:
 * no afirma que vaya a promocionar ni a regularizar, porque eso lo define la planificación de cada cátedra.
 */
function SeguimientoCursada({ cursada, regla, materiaId, abrirNota, editarNota, ponerNota, abrirUmbrales, abrirEstructura }: { cursada: Cursada; regla?: ReglaCursada; materiaId: string; abrirNota: () => void; editarNota: (e: Evaluacion) => void; ponerNota: (e: Evaluacion) => void; abrirUmbrales: () => void; abrirEstructura: () => void }) {
  const s = seguimientoCursada(cursada, regla);
  const hay = s.filas.length > 0;
  const { promocion, regular } = s.umbrales;
  const nivelTexto: Record<NivelNota, string> = { promocion: `${formatearNota(promocion)} o más`, regular: `${formatearNota(regular)} o más`, debajo: `menos de ${formatearNota(regular)}`, pendiente: 'sin nota' };

  return (
    <Seccion titulo="Cómo viene la cursada" acciones={<Boton chico onClick={abrirNota}><Icono nombre="agregar" tam={16} /> Cargar nota</Boton>}>
      {cursada.estructura ? (
        <VistaEstructura
          calculo={calcular(cursada, s.umbrales)}
          umbrales={s.umbrales}
          onNota={ponerNota}
          onEditar={editarNota}
          onAsignar={(e, parte) => actualizar(d => A.guardarEvaluacion(d, materiaId, cursada.id, { ...e, parte }))}
        />
      ) : !hay ? (
        <p class="seccion__texto">Cargá tus parciales y trabajos prácticos y acá ves cómo vas.</p>
      ) : (
        <>
          <ul class="notas">
            {s.filas.map(f => {
              const e = f.evaluacion;
              return (
                <li key={e.id} class={`nota t-${TONO_NIVEL[f.nivel]}${f.vigente ? '' : ' nota--reemplazada'}`}>
                  <div class="nota__texto">
                    <strong>{e.nombre}</strong>
                    <span class="fila__detalle">
                      {TEXTO_TIPO[e.tipo]}{e.fecha ? ` · ${fechaCorta(e.fecha)}` : ''}
                      {f.reemplazadaPor ? ` · reemplazada por «${f.reemplazadaPor.nombre}»` : ''}
                      {!f.reemplazadaPor && e.tipo === 'recuperatorio' && e.reemplazaA ? ' · reemplaza otra nota' : ''}
                    </span>
                  </div>
                  <span class="nota__valor" title={nivelTexto[f.nivel]}>
                    {e.nota !== null ? formatearNota(e.nota) : '–'}
                    <span class="oculto"> ({f.vigente ? nivelTexto[f.nivel] : 'reemplazada'})</span>
                  </span>
                  <Boton chico variante="texto" aria-label={`Editar ${e.nombre}`} onClick={() => editarNota(e)}><Icono nombre="editar" tam={16} /></Boton>
                  <BotonBorrar etiqueta={`Borrar ${e.nombre}`} onBorrar={() => actualizar(d => A.quitarEvaluacion(d, materiaId, cursada.id, e.id))} />
                </li>
              );
            })}
          </ul>
          <div class="marcador">
            {s.promedio !== null ? (
              <>
                <strong class="marcador__titulo">
                  Promedio <span class="marcador__nota">{formatearNota(s.promedio)}</span> <small>mínima {formatearNota(s.minima!.nota)} ({s.minima!.nombre})</small>
                </strong>
                <Medidor valor={s.promedio} marcas={[regular, promocion]} tono={TONO_NIVEL[s.promedio >= promocion ? 'promocion' : s.promedio >= regular ? 'regular' : 'debajo']} />
              </>
            ) : (
              <strong>Todavía no hay notas cargadas</strong>
            )}
            {s.conNota > 0 && (
              <span class="marcador__detalle">
                {s.enPromocion} de {s.conNota} en {formatearNota(promocion)} o más
                {s.debajo.length > 0 ? ` · por debajo de ${formatearNota(regular)}: ${s.debajo.map(e => `${e.nombre} (${formatearNota(e.nota!)})`).join(', ')}` : ''}
              </span>
            )}
            {s.pendientes.length > 0 && <span class="marcador__detalle">Sin nota todavía: {s.pendientes.map(e => e.nombre).join(', ')}</span>}
          </div>
        </>
      )}
      <Boton class="boton--organizar" onClick={abrirEstructura}>
        <Icono nombre={cursada.estructura ? 'editar' : 'plan'} tam={16} /> {cursada.estructura ? 'Editar estructura' : 'Organizar mis notas por partes'}
      </Boton>
      {regla && <ReglaCatedra regla={regla} cursada={cursada} />}
      <Referencias cursada={cursada} s={s} onAjustar={abrirUmbrales} />
      <BotonAyuda ruta="materia" texto="¿Cómo se cargan las notas?" clase="boton boton--texto" />
    </Seccion>
  );
}

type Panel = 'estructura' | 'poner' | 'cursada' | 'empezar' | 'final' | 'aprobada' | 'correccion' | 'promocion' | 'regularidad' | 'libre' | 'nota' | 'umbrales' | null;

/** Los tres pasos del camino: cursada, final y aprobada, con el actual marcado. */
function Pasos({ c }: { c: Camino }) {
  const TEXTO = { hecho: 'hecho', actual: 'paso actual', pendiente: 'pendiente', omitido: 'no hizo falta' } as const;
  return (
    <ol class="camino" aria-label="Camino de la materia">
      {c.pasos.map((p, i) => (
        <li key={p.clave} class={`camino__paso camino__paso--${p.estado}`} aria-current={p.estado === 'actual' ? 'step' : undefined}>
          <span class="camino__marca" aria-hidden="true">{p.estado === 'hecho' ? <Icono nombre="check" tam={16} /> : p.estado === 'omitido' ? '–' : i + 1}</span>
          <span class="camino__etiqueta">{p.etiqueta}<span class="oculto"> ({TEXTO[p.estado]})</span></span>
          {p.nota && <span class="camino__nota">{p.nota}</span>}
        </li>
      ))}
    </ol>
  );
}

/** Qué sigue ahora, con la única acción que corresponde al estado. */
function SiguientePaso({ c, abrir }: { c: Camino; abrir: (p: Exclude<Panel, null>) => void }) {
  return (
    <div class="tarjeta siguiente">
      <strong>{c.titulo}</strong>
      <p class="fila__detalle">{c.texto}</p>
      {c.accion === 'empezar' && <Boton variante="primario" onClick={() => abrir('empezar')}>Empezar a cursarla</Boton>}
      {c.accion === 'resultado' && (
        <div class="botonera">
          <Boton onClick={() => abrir('promocion')}>Promocioné</Boton>
          <Boton onClick={() => abrir('regularidad')}>Regularicé</Boton>
          <Boton onClick={() => abrir('libre')}>Quedé libre</Boton>
        </div>
      )}
      {c.accion === 'final' && <Boton variante="primario" onClick={() => abrir('final')}>Cargar resultado del final</Boton>}
      {c.accion === 'recursar' && <Boton variante="primario" onClick={() => abrir('empezar')}>Volver a cursarla</Boton>}
    </div>
  );
}

/** Los "Te faltan: …" ya se muestran como etiquetas con enlace: no se repiten en el texto. */
const sinFaltan = (razones: string[]) => razones.filter(t => !t.startsWith('Te faltan'));

export function Materia({ m, id }: { m: Modelo; id: string }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [evaluacionEditada, setEvaluacionEditada] = useState<Evaluacion | undefined>(undefined);
  const item = m.items.find(i => i.id === id);
  if (!item) {
    return (
      <div class="pagina">
        <Vacio icono="alerta" titulo="Esa materia no existe en el plan"><a href={enlaces.materias()}>Volver a Materias</a></Vacio>
      </div>
    );
  }
  const r = item.resumen;
  const datos = m.datos.materias.find(x => x.materiaId === id);
  const rel = relaciones(m.plan, id);
  const p = presentarMateria(r);
  const cerrar = () => {
    setPanel(null);
    setEvaluacionEditada(undefined);
  };
  const titulos: Record<Exclude<Panel, null>, string> = {
    cursada: 'Cargar cursada', empezar: 'Empezar a cursarla', final: 'Cargar final', aprobada: 'Marcar como aprobada', correccion: 'Corregir el estado',
    promocion: 'Promocioné', regularidad: 'Regularicé', libre: 'Quedé libre',
    nota: evaluacionEditada ? 'Editar nota' : 'Cargar nota', umbrales: 'Ajustar las notas que se piden',
    estructura: 'Estructura de la cursada', poner: evaluacionEditada?.nombre ?? 'Cargar nota',
  };
  const cursadaVigente = r.estado.cursadaVigente;
  const camino = caminoMateria(r);
  // Una cursada de un ciclo que todavía no empezó: el motor la ignora hasta que arranque, así que se muestra como "anotada"
  const anotada = datos?.cursadas.find(c => c.ciclo > m.resumen.ciclo && c.resultado === 'cursando');
  const estadoActual = r.estado.estado;
  const hayAcciones = !!(datos?.aprobacion || datos?.correccion);

  return (
    <div class="pagina">
      <a class="volver" href={enlaces.materias()}><Icono nombre="izq" tam={16} /> Materias</a>
      <header class={`encabezado-materia t-${p.tono}`}>
        {estadoActual === 'aprobada' && <span class="encabezado-materia__sello" aria-hidden="true"><Icono nombre="check" tam={28} /></span>}
        <h1>{item.nombre}</h1>
        <p class="encabezado-materia__meta">
          {item.nivel ? `${item.nivel}.º año · ` : 'Electiva · '}
          {etiquetaRegimen(r.regimen)}
        </p>
        <div class="encabezado-materia__estado">
          <Insignia p={p} />
          {item.sinConfirmar.length > 0 && (
            <SinConfirmar titulo="Datos sin confirmar">
              {cerrarAviso => (
                <>
                  <ul class="razones">{item.sinConfirmar.map(t => <li key={t}>{t}</li>)}</ul>
                  <p class="fila__detalle">
                    Si ves algo distinto en autogestión,{' '}
                    <button type="button" class="enlace-boton" onClick={() => { cerrarAviso(); setPanel('correccion'); }}>corregí el estado</button> a mano.
                  </p>
                </>
              )}
            </SinConfirmar>
          )}
        </div>
        <p class="fila__detalle">{r.estado.corregido ? 'Estado corregido a mano.' : detalleCorto(r)}</p>
      </header>

      <Seccion titulo="Tu camino">
        <div class="tarjeta camino-tarjeta">
          <Pasos c={camino} />
          <details class="camino__glosa">
            <summary>¿Qué es cursar y qué es rendir?</summary>
            <p>{GLOSA}</p>
          </details>
        </div>
        {anotada && estadoActual === 'no-cursada' ? (
          <div class="tarjeta siguiente">
            <strong>Anotada para el {nombreCuatrimestre(anotada.cuatrimestre).toLowerCase()} {anotada.ciclo}</strong>
            <p class="fila__detalle">Va a figurar como «cursando» cuando arranque. Podés sacarla desde «Cursadas».</p>
          </div>
        ) : (
          <SiguientePaso c={camino} abrir={setPanel} />
        )}
      </Seccion>

      {/* Las condiciones solo aparecen cuando hay algo que decidir: cursarla de nuevo, o rendir el final */}
      {(estadoActual === 'no-cursada' || estadoActual === 'recursar' || estadoActual === 'regular') && (
        <Seccion titulo="Qué podés hacer">
          <div class="tarjeta veredictos">
            {estadoActual !== 'regular' && <FilaVeredicto etiqueta="Cursar" v={veredictoCursar(r)} faltan={r.cursar.faltan} m={m} />}
            {estadoActual === 'regular' && <FilaVeredicto etiqueta="Rendir" v={veredictoRendir(r)} faltan={r.rendir.faltan} m={m} />}
          </div>
        </Seccion>
      )}

      {cursadaVigente && (
        <SeguimientoCursada
          cursada={cursadaVigente}
          regla={reglaDe(id, cursadaVigente.ciclo)}
          materiaId={id}
          abrirNota={() => { setEvaluacionEditada(undefined); setPanel('nota'); }}
          editarNota={e => { setEvaluacionEditada(e); setPanel('nota'); }}
          abrirUmbrales={() => setPanel('umbrales')}
          ponerNota={e => { setEvaluacionEditada(e); setPanel('poner'); }}
          abrirEstructura={() => setPanel('estructura')}
        />
      )}

      <details class="plegable">
        <summary>Cómo se calculó</summary>
        <div class="plegable__cuerpo">
          <h3>Estado</h3>
          <ul class="razones">{r.estado.razones.map(t => <li key={t}>{t}</li>)}</ul>
          <h3>Para cursar</h3>
          <ul class="razones">
            {sinFaltan(r.cursar.razones).map(t => <li key={t}>{t}</li>)}
            {r.cursar.excepcion && <li>{r.cursar.excepcion}</li>}
          </ul>
          <h3>Para rendir</h3>
          <ul class="razones">
            {sinFaltan(r.rendir.razones).map(t => <li key={t}>{t}</li>)}
            {r.rendir.excepcion && <li>{r.rendir.excepcion}</li>}
          </ul>
        </div>
      </details>

      <Seccion titulo="Cursadas" acciones={<Boton chico onClick={() => setPanel('cursada')}><Icono nombre="agregar" tam={16} /> Cargar</Boton>}>
        {datos?.cursadas.length ? (
          <ul class="lista lista--simple">
            {datos.cursadas.map(c => (
              <li key={c.id} class="fila-simple">
                <div>
                  <strong>{nombreCuatrimestre(c.cuatrimestre)} {c.ciclo}</strong>
                  <span class="fila__detalle">{RESULTADO_CURSADA[c.resultado]}{c.fechaResultado ? ` · cierre ${fechaCorta(c.fechaResultado)}` : ''}</span>
                </div>
                <BotonBorrar etiqueta="Borrar cursada" onBorrar={() => actualizar(d => A.quitarCursada(d, id, c.id))} />
              </li>
            ))}
          </ul>
        ) : (
          <p class="seccion__texto">Todavía no cargaste cursadas.</p>
        )}
      </Seccion>

      <Seccion titulo="Finales" acciones={<Boton chico onClick={() => setPanel('final')}><Icono nombre="agregar" tam={16} /> Cargar</Boton>}>
        {datos?.finales.length ? (
          <ul class="lista lista--simple">
            {datos.finales.map((f, i) => (
              <li key={`${f.fecha}-${i}`} class="fila-simple">
                <div>
                  <strong>{fechaCorta(f.fecha)} · {RESULTADO_FINAL[f.resultado]}{f.nota != null ? ` · ${f.nota}` : ''}</strong>
                  <span class="fila__detalle">{f.resultado === 'ausente' ? 'No cuenta como aplazo' : f.soloTeorico ? 'Solo la parte teórica' : f.resultado === 'insuficiente' ? 'Cuenta como aplazo' : ''}</span>
                </div>
                <BotonBorrar etiqueta="Borrar final" onBorrar={() => actualizar(d => A.quitarFinal(d, id, i))} />
              </li>
            ))}
          </ul>
        ) : (
          <p class="seccion__texto">Todavía no cargaste finales.</p>
        )}
      </Seccion>

      <details class="plegable">
        <summary>Correlativas</summary>
        <div class="plegable__cuerpo correlativas">
          <div>
            <h3>Para cursar necesitás</h3>
            <p class="fila__detalle">Regulares (o aprobadas):</p>
            <Enlaces m={m} ids={rel.requiere.regularizadas} />
            <p class="fila__detalle">Aprobadas:</p>
            <Enlaces m={m} ids={rel.requiere.aprobadas} />
          </div>
          <div>
            <h3>Para rendir necesitás aprobadas</h3>
            {rel.requiereParaRendir === 'todas' ? <span class="fila__detalle">Todas las materias del plan, las electivas y los requisitos</span> : <Enlaces m={m} ids={rel.requiereParaRendir} />}
          </div>
          <div>
            <h3>Desbloquea</h3>
            <p class="fila__detalle">Para cursar:</p>
            <Enlaces m={m} ids={rel.desbloqueaCursar} />
            <p class="fila__detalle">Para rendir:</p>
            <Enlaces m={m} ids={rel.desbloqueaRendir} />
          </div>
          <a class="enlace-seccion" href={enlaces.plan(id)}>Verlo en el mapa del plan <Icono nombre="der" tam={14} /></a>
        </div>
      </details>

      <details class="plegable" open={hayAcciones}>
        <summary>Aprobación y corrección manual</summary>
        <div class="plegable__cuerpo">
          <Seccion titulo="Aprobación" acciones={<Boton chico onClick={() => setPanel('aprobada')}><Icono nombre="check" tam={16} /> Marcar aprobada</Boton>}>
            {datos?.aprobacion ? (
              <div class="fila-simple">
                <div>
                  <strong>
                    {datos.aprobacion.forma === 'directa' ? 'Aprobación directa' : datos.aprobacion.forma === 'final' ? 'Final' : 'Equivalencia'}
                    {datos.aprobacion.nota != null ? ` · ${datos.aprobacion.nota}` : ''}
                  </strong>
                  <span class="fila__detalle">
                    {fechaCorta(datos.aprobacion.fecha)}
                    {datos.aprobacion.forma === 'directa' ? (datos.aprobacion.registradaEnMesa ? ' · registrada en mesa' : ' · falta registrar en mesa') : ''}
                  </span>
                </div>
                <BotonBorrar etiqueta="Quitar aprobación" onBorrar={() => actualizar(d => A.fijarAprobacion(d, id, null))} />
              </div>
            ) : (
              <p class="seccion__texto">{r.estado.estado === 'aprobada' ? 'Está aprobada por el final o la cursada cargados.' : 'Sin aprobación cargada.'}</p>
            )}
            {datos?.aprobacion?.forma === 'directa' && datos.aprobacion.registradaEnMesa === false && (
              <Boton chico onClick={() => actualizar(d => A.fijarAprobacion(d, id, { ...datos.aprobacion!, registradaEnMesa: true }))}>Ya la registré en una mesa</Boton>
            )}
          </Seccion>

          <Seccion titulo="Corrección manual" acciones={<Boton chico onClick={() => setPanel('correccion')}><Icono nombre="editar" tam={16} /> {datos?.correccion ? 'Editar' : 'Corregir'}</Boton>}>
            {datos?.correccion ? (
              <div class="fila-simple">
                <div>
                  <strong>Forzado a «{datos.correccion.estado}»</strong>
                  <span class="fila__detalle">{datos.correccion.motivo} · {fechaCorta(datos.correccion.fecha)}</span>
                </div>
                <BotonBorrar etiqueta="Quitar corrección" onBorrar={() => actualizar(d => A.fijarCorreccion(d, id, null))} />
              </div>
            ) : (
              <p class="seccion__texto">Si la cátedra decide algo distinto, podés forzar el estado.</p>
            )}
          </Seccion>

          {datos && (
            <div class="zona-peligro">
              <BotonBorrar etiqueta="Borrar todos los datos de esta materia" onBorrar={() => actualizar(d => A.borrarMateria(d, id))} />
              <span class="fila__detalle">Borra cursadas, finales, aprobación y corrección de esta materia.</span>
            </div>
          )}
        </div>
      </details>

      <Hoja abierta={panel !== null} titulo={panel ? titulos[panel] : ''} onCerrar={cerrar}>
        {panel === 'cursada' && <FormCursada m={m} materiaId={id} onListo={cerrar} />}
        {panel === 'empezar' && <FormCursada m={m} materiaId={id} simple onListo={cerrar} />}
        {panel === 'nota' && cursadaVigente && (
          <FormEvaluacion m={m} materiaId={id} cursadaId={cursadaVigente.id} existentes={cursadaVigente.evaluaciones ?? []} inicial={evaluacionEditada} {...(cursadaVigente.estructura ? { partes: cursadaVigente.estructura.partes } : {})} onListo={cerrar} />
        )}
        {panel === 'poner' && cursadaVigente && evaluacionEditada && (
          <TecladoNota actual={evaluacionEditada.nota} onElegir={nota => { actualizar(d => A.guardarEvaluacion(d, id, cursadaVigente.id, { ...evaluacionEditada, nota })); cerrar(); }} />
        )}
        {panel === 'estructura' && cursadaVigente && <EditorEstructura materiaId={id} cursada={cursadaVigente} onListo={cerrar} />}
        {panel === 'umbrales' && cursadaVigente && (
          <FormUmbrales materiaId={id} cursadaId={cursadaVigente.id} actual={seguimientoCursada(cursadaVigente, reglaDe(id, cursadaVigente.ciclo)).umbrales} propios={cursadaVigente.umbrales !== undefined} {...((cursadaVigente.estructura?.partes.length ?? 0) > 1 ? { minimoParte: cursadaVigente.estructura!.minimoParte ?? null } : {})} onListo={cerrar} />
        )}
        {panel === 'promocion' && <FormResultado m={m} materiaId={id} resultado="aprobada-directa" onListo={cerrar} />}
        {panel === 'regularidad' && <FormResultado m={m} materiaId={id} resultado="regular" onListo={cerrar} />}
        {panel === 'libre' && <FormResultado m={m} materiaId={id} resultado="libre" onListo={cerrar} />}
        {panel === 'final' && <FormFinal m={m} materiaId={id} onListo={cerrar} />}
        {panel === 'aprobada' && <FormAprobacion m={m} materiaId={id} onListo={cerrar} />}
        {panel === 'correccion' && <FormCorreccion m={m} materiaId={id} onListo={cerrar} />}
      </Hoja>
    </div>
  );
}
