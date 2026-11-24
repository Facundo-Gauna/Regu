import { useState } from 'preact/hooks';
import { fechaCorta, plural, rango, relativo } from '../../vista/formato.ts';
import { enlaces } from '../../vista/rutas.ts';
import { Aviso, Boton, FilaMateria, Icono, Seccion, SinConfirmar, Vacio } from '../componentes.tsx';
import { HojaMateria } from '../formularios.tsx';
import type { Modelo } from '../modelo.ts';

const RESULTADO = { aprobado: 'Aprobado', insuficiente: 'Aplazo', ausente: 'Ausente' } as const;

export function Finales({ m }: { m: Modelo }) {
  const [cargando, setCargando] = useState<string | null>(null);
  const regulares = m.items.filter(i => i.resumen.estado.estado === 'regular');
  const puede = regulares.filter(i => i.resumen.rendir.puede);
  const noPuede = regulares.filter(i => !i.resumen.rendir.puede);
  const pendientes = m.items.filter(i => i.resumen.estado.pendienteRegistrarMesa);
  const nombre = (id: string) => m.items.find(i => i.id === id)?.nombre ?? id;
  const periodos = m.cal.cal.periodosExamen.filter(p => p.hasta >= m.hoy).slice(0, 3);
  const abiertas = new Set(m.resumen.calendario.inscripcionesFinalAbiertas.map(p => p.id));

  const historial = m.datos.materias
    .flatMap(x => x.finales.map(f => ({ ...f, materiaId: x.materiaId })))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div class="pagina">
      <h1 class="pagina__titulo">Finales</h1>

      <Seccion titulo="Turnos" acciones={<a class="enlace-seccion" href={enlaces.calendario()}>Calendario <Icono nombre="der" tam={14} /></a>}>
        {periodos.length ? (
          <ul class="lista">
            {periodos.map(p => (
              <li key={p.id} class={`tarjeta${abiertas.has(p.id) ? ' tarjeta--destacada' : ''}`}>
                <strong>{p.tipo === 'mesas-moviles' ? 'Mesas móviles' : 'Turno de finales'} · {rango(p.desde, p.hasta)}</strong>
                <span class="fila__detalle">
                  {abiertas.has(p.id)
                    ? 'Inscripción abierta: hasta 48 h hábiles antes de cada examen'
                    : p.inscripcionDesde
                      ? `Inscripción desde el ${fechaCorta(p.inscripcionDesde)} (${relativo(p.inscripcionDesde, m.hoy)})`
                      : 'Inscripción sin fecha'}
                </span>
                {p.tipo === 'mesas-moviles' && <span class="fila__detalle">Mesas de final que se toman durante el cursado</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p class="seccion__texto">No hay turnos próximos en el calendario. Podés cargarlos desde Calendario.</p>
        )}
      </Seccion>

      <Seccion titulo={`Podés rendir (${puede.length})`}>
        {puede.length === 0 ? (
          <Vacio icono="finales" titulo="Todavía no tenés finales para rendir">
            {regulares.length ? 'Mirá abajo qué te falta en cada una.' : 'Cuando regularices una materia aparece acá.'}
          </Vacio>
        ) : (
          <ul class="lista">
            {puede.map(i => {
              const r = i.resumen.rendir;
              const e = i.resumen.estado;
              return (
                <li key={i.id} class="tarjeta t-regular tarjeta--materia">
                  <div class="fila__principal">
                    <a class="fila__nombre" href={enlaces.materia(i.id)}>{i.nombre}</a>
                    <span class="fila__detalle">{plural(e.aplazos, 'aplazo', 'aplazos')} de 4{e.promocionPractica ? ' · final solo teórico' : ''}</span>
                    {r.excepcion && (
                      <span class="fila__detalle destacado">
                        Sin correlativas hasta el {r.sinCorrelativasHasta ? fechaCorta(r.sinCorrelativasHasta) : '—'}{r.sinCorrelativasHastaEstimado ? ' (estimado)' : ''}
                      </span>
                    )}
                    {i.sinConfirmar.length > 0 && (
                      <SinConfirmar titulo={i.nombre}>
                        <ul class="razones">{i.sinConfirmar.map(t => <li key={t}>{t}</li>)}</ul>
                      </SinConfirmar>
                    )}
                  </div>
                  <Boton chico onClick={() => setCargando(i.id)}>Cargar resultado</Boton>
                </li>
              );
            })}
          </ul>
        )}
      </Seccion>

      {noPuede.length > 0 && (
        <Seccion titulo={`Regulares que todavía no podés rendir (${noPuede.length})`}>
          <ul class="lista">
            {noPuede.map(i => (
              <li key={i.id}>
                <FilaMateria item={i} />
                <p class="fila__detalle fila__aparte">{i.resumen.rendir.razones.at(-1)}</p>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {pendientes.length > 0 && (
        <Seccion titulo="Aprobación directa sin registrar">
          <Aviso tipo="info">Para que la nota quede en el acta, inscribite a una mesa de examen de estas materias.</Aviso>
          <ul class="lista">{pendientes.map(i => <li key={i.id}><FilaMateria item={i} /></li>)}</ul>
        </Seccion>
      )}

      <Seccion titulo="Historial">
        {historial.length ? (
          <ul class="lista lista--simple">
            {historial.map((f, i) => (
              <li key={`${f.materiaId}-${f.fecha}-${i}`} class="fila-simple">
                <div>
                  <a href={enlaces.materia(f.materiaId)}><strong>{nombre(f.materiaId)}</strong></a>
                  <span class="fila__detalle">{fechaCorta(f.fecha)} · {RESULTADO[f.resultado]}{f.nota != null ? ` · ${f.nota}` : ''}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p class="seccion__texto">Todavía no cargaste finales.</p>
        )}
      </Seccion>

      <HojaMateria m={m} materiaId={cargando} accion="final" onCerrar={() => setCargando(null)} />
    </div>
  );
}
