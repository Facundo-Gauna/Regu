import { useState } from 'preact/hooks';
import type { ProgresoPaquete } from '../../motor/index.ts';
import * as A from '../../datos/acciones.ts';
import { plural } from '../../vista/formato.ts';
import { calcularPromedios } from '../../vista/promedios.ts';
import { enlaces } from '../../vista/rutas.ts';
import { Barra, Boton, Campo, Icono, Seccion, SinConfirmar } from '../componentes.tsx';
import type { Modelo } from '../modelo.ts';
import { actualizar } from '../store.ts';

const fmt = (n: number | null) => (n === null ? '—' : n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

function nota(texto: string): number | null {
  const n = Number(texto.replace(',', '.'));
  return texto.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
}

function Paquete({ m, p }: { m: Modelo; p: ProgresoPaquete }) {
  const [horasExigidas, setHorasExigidas] = useState(p.horasExigidasOrigen === 'usuario' ? String(p.horasExigidas ?? '') : '');
  const [nueva, setNueva] = useState('');
  const [horasNueva, setHorasNueva] = useState('');
  const elegidas = new Set(m.datos.electivasElegidas.map(e => e.electivaId));
  const catalogo = m.plan.electivas.filter(e => !elegidas.has(e.id));
  const sugeridas = catalogo.filter(e => e.paquetesSugeridos.includes(p.id));
  const resto = catalogo.filter(e => !e.paquetesSugeridos.includes(p.id));

  const agregar = (e: Event) => {
    e.preventDefault();
    if (!nueva) return;
    const horas = horasNueva.trim() === '' ? undefined : Number(horasNueva);
    actualizar(d => A.elegirElectiva(d, { electivaId: nueva, paqueteId: p.id, ...(horas !== undefined && Number.isFinite(horas) && horas >= 0 ? { horas } : {}) }));
    setNueva('');
    setHorasNueva('');
  };

  return (
    <div class="tarjeta tarjeta--paquete">
      <div class="paquete__cab">
        <strong>{p.nombre}</strong>
        <span class={`etiqueta ${p.cumplido === true ? 't-aprobada' : p.cumplido === null ? 't-cursando' : 't-bloqueada'}`}>
          {p.cumplido === true ? 'Cumplido' : p.cumplido === null ? 'Sin datos' : 'En curso'}
        </span>
      </div>
      {p.horasExigidas !== null ? (
        <>
          <Barra valor={p.horasAprobadas} max={p.horasExigidas} etiqueta={`${p.horasAprobadas} de ${p.horasExigidas} horas`} />
          <p class="fila__detalle">{p.horasAprobadas} de {p.horasExigidas} h aprobadas{p.horasEnCurso ? ` · ${p.horasEnCurso} h en curso` : ''}</p>
        </>
      ) : (
        <p class="fila__detalle destacado">Horas exigidas sin especificar.</p>
      )}
      <Campo etiqueta="Horas exigidas por el plan" ayuda={p.horasExigidasOrigen === 'plan' ? 'Dato del plan' : p.horasExigidasOrigen === 'usuario' ? 'Dato tuyo' : 'Buscalas en el plan oficial'}>
        <input
          type="number" inputMode="numeric" min={0} placeholder="Sin especificar" value={horasExigidas}
          onInput={e => setHorasExigidas(e.currentTarget.value)}
          onChange={() => actualizar(d => A.fijarHorasPaquete(d, p.id, nota(horasExigidas)))}
        />
      </Campo>

      {p.electivas.length > 0 && (
        <ul class="lista lista--simple">
          {p.electivas.map(e => (
            <li key={e.id} class="fila-simple">
              <div>
                <a href={enlaces.materia(e.id)}><strong>{e.nombre}</strong></a>
                <span class="fila__detalle">{e.horas !== null ? `${e.horas} h` : 'horas sin cargar'} · {e.estado === 'aprobada' ? 'aprobada' : e.estado === 'no-cursada' ? 'sin cursar' : e.estado}</span>
              </div>
              <Boton chico variante="texto" aria-label={`Quitar ${e.nombre}`} onClick={() => actualizar(d => A.quitarElectiva(d, e.id))}><Icono nombre="borrar" tam={16} /></Boton>
            </li>
          ))}
        </ul>
      )}
      {p.electivasSinHoras.length > 0 && <p class="fila__detalle destacado">Cargá las horas de tus electivas aprobadas.</p>}

      <form class="formulario formulario--linea" onSubmit={agregar}>
        <Campo etiqueta="Agregar electiva">
          <select value={nueva} onChange={e => setNueva(e.currentTarget.value)}>
            <option value="">Elegir…</option>
            {sugeridas.length > 0 && (
              <optgroup label="Sugeridas para este nivel">
                {sugeridas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </optgroup>
            )}
            {resto.length > 0 && (
              <optgroup label="Otras">
                {resto.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </optgroup>
            )}
          </select>
        </Campo>
        <Campo etiqueta="Horas">
          <input type="number" inputMode="numeric" min={0} value={horasNueva} onInput={e => setHorasNueva(e.currentTarget.value)} placeholder="h" />
        </Campo>
        <Boton type="submit" chico disabled={!nueva}>Agregar</Boton>
      </form>
    </div>
  );
}

export function Progreso({ m }: { m: Modelo }) {
  const r = m.resumen;
  const prom = calcularPromedios(r, m.datos);
  const obligatorias = r.materias.filter(x => x.clase === 'materia');
  const aprobadas = obligatorias.filter(x => x.estado.estado === 'aprobada').length;

  return (
    <div class="pagina">
      <h1 class="pagina__titulo">Progreso</h1>

      <Seccion titulo="Carrera">
        <div class="cifras">
          <div class="cifra"><strong>{aprobadas}<small>/{obligatorias.length}</small></strong><span>materias aprobadas</span></div>
          <div class="cifra"><strong>{fmt(prom.sinAplazos)}</strong><span>promedio sin aplazos</span></div>
          <div class="cifra"><strong>{fmt(prom.conAplazos)}</strong><span>promedio con aplazos</span></div>
        </div>
        <Barra valor={aprobadas} max={obligatorias.length} etiqueta="Progreso de la carrera" />
        <p class="fila__detalle">
          {prom.aprobadasConNota} materias con nota en el promedio · {prom.aplazos} aplazos
          {prom.aprobadasSinNota ? ` · ${prom.aprobadasSinNota} aprobadas sin nota (no entran)` : ''}
        </p>
      </Seccion>

      <Seccion titulo="Títulos">
        <ul class="lista">
          {r.titulos.map(t => (
            <li key={t.id} class={`tarjeta${t.completo ? ' tarjeta--ok' : ''}`}>
              <div class="paquete__cab">
                <strong>{t.nombre}</strong>
                <span class="etiqueta">{t.tipo === 'intermedio' ? 'Título intermedio' : 'Título final'}</span>
              </div>
              <Barra valor={t.materias.aprobadas} max={t.materias.total} etiqueta={`${t.materias.aprobadas} de ${t.materias.total} materias`} />
              <p class="fila__detalle">
                {t.materias.aprobadas} de {t.materias.total} materias{t.hastaNivel ? ` hasta ${t.hastaNivel}.º año` : ''}
                {t.completo ? ' · ¡completo!' : ` · ${t.faltan.length === 1 ? 'falta' : 'faltan'} ${plural(t.faltan.length, 'pendiente', 'pendientes')}`}
              </p>
              {!t.completo && (
                <details>
                  <summary>Ver qué falta</summary>
                  <ul class="razones">
                    {t.faltan.map(f => <li key={f.id}>{f.nombre} <small>({f.tipo})</small></li>)}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
        {r.titulos.some(t => t.incierto) && (
          <SinConfirmar titulo="Faltan las horas de electivas" etiqueta="Títulos sin confirmar">
            <p class="seccion__texto">No se puede confirmar si los títulos están completos. Cargá las horas en «Electivas».</p>
          </SinConfirmar>
        )}
      </Seccion>

      <Seccion titulo="Electivas">
        <details class="plegable" open={m.datos.electivasElegidas.length > 0}>
          <summary>Elegir electivas y cargar horas</summary>
          <div class="plegable__cuerpo">
            <p class="seccion__texto">
              Elegí tus electivas y a qué paquete suman. Su estado se carga en <a href={enlaces.materias()}>Materias</a>.
            </p>
            <SinConfirmar titulo="Electivas sin confirmar">
              <p class="seccion__texto">Las correlativas y las horas de las electivas del plan 2023 todavía no están confirmadas: Regu no las muestra como habilitadas hasta que las cargues vos.</p>
            </SinConfirmar>
            <ul class="lista">{r.paquetes.map(p => <li key={p.id}><Paquete m={m} p={p} /></li>)}</ul>
          </div>
        </details>
      </Seccion>

      <Seccion titulo="Requisitos">
        <ul class="lista">
          {r.requisitos.map(q => (
            <li key={q.id} class="tarjeta">
              <strong>{q.nombre}</strong>
              <span class="fila__detalle">{q.iniciar.puede ? 'Podés iniciarlo' : q.iniciar.razones.at(-1)}</span>
              {!!m.plan.requisitos.find(x => x.id === q.id)?.verificar?.length && (
                <SinConfirmar titulo={q.nombre}>
                  <ul class="razones">{m.plan.requisitos.find(x => x.id === q.id)!.verificar!.map(t => <li key={t}>{t}</li>)}</ul>
                </SinConfirmar>
              )}
              <label class="campo">
                <span class="campo__etiqueta">Estado</span>
                <select value={q.estado} onChange={e => actualizar(d => A.fijarRequisito(d, { requisitoId: q.id, estado: e.currentTarget.value as 'pendiente' | 'en-curso' | 'cumplido' }))}>
                  <option value="pendiente">Pendiente</option>
                  <option value="en-curso">En curso</option>
                  <option value="cumplido">Cumplido</option>
                </select>
              </label>
            </li>
          ))}
        </ul>
      </Seccion>
    </div>
  );
}
