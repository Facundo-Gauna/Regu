import { useMemo, useState } from 'preact/hooks';
import * as A from '../../datos/acciones.ts';
import { fechaLocal } from '../../datos/hoy.ts';
import { modeloInicio } from '../../vista/inicio.ts';
import { diasEntre, fechaCorta, fechaLarga, plural, rango, relativo } from '../../vista/formato.ts';
import { enlaces } from '../../vista/rutas.ts';
import { Aviso, Barra, Boton, FilaMateria, Icono, Seccion } from '../componentes.tsx';
import { HojaMateria, type AccionRapida, type InicialCursada } from '../formularios.tsx';
import type { Modelo } from '../modelo.ts';
import { actualizar, useStore } from '../store.ts';

const DIAS_RECORDATORIO_BACKUP = 14;

export function Inicio({ m }: { m: Modelo }) {
  const s = useStore();
  const v = useMemo(() => modeloInicio(m.resumen, m.datos, m.plan, m.cal, m.hoy), [m]);
  const [hoja, setHoja] = useState<{ id: string; accion: AccionRapida; inicial?: InicialCursada } | null>(null);

  // El recordatorio usa la fecha real, no la simulada: un backup viejo es viejo aunque se simule otro día.
  const diasSinBackup = s.prefs.ultimoBackup ? diasEntre(fechaLocal(new Date(s.prefs.ultimoBackup)), s.hoyReal) : null;
  const recordarBackup = s.modo === 'normal' && !v.vacio && (diasSinBackup === null || diasSinBackup >= (s.prefs.recordatorioBackupDias ?? DIAS_RECORDATORIO_BACKUP));

  return (
    <div class="pagina">
      {v.proxima && (
        <section class="proxima" aria-label="Lo próximo">
          <h1 class="proxima__titulo">{v.proxima.titulo}</h1>
          <p class="proxima__texto">{v.proxima.texto}</p>
          <a class="boton boton--primario" href={v.proxima.destino === 'finales' ? enlaces.finales() : enlaces.materias(v.proxima.destino)}>{v.proxima.boton}</a>
        </section>
      )}

      <header class="portada">
        <p class="portada__fecha">{fechaLarga(m.hoy)} <span class="portada__ciclo">· ciclo {v.ciclo}</span></p>
        <div class="portada__cifras" aria-label="Resumen de la carrera">
          <div><strong>{v.cantidades.aprobadas}</strong><span>aprobadas</span></div>
          <div><strong>{v.cantidades.cursando}</strong><span>cursando</span></div>
          <div><strong>{v.cantidades.regulares}</strong><span>regulares</span></div>
        </div>
        <Barra valor={v.cantidades.aprobadas} max={v.cantidades.total} etiqueta={`${v.cantidades.aprobadas} de ${v.cantidades.total} materias aprobadas`} />
        <p class="portada__pie">{v.cantidades.aprobadas} de {v.cantidades.total} materias obligatorias aprobadas</p>
        {v.regular.regular && <p class="portada__pie">Estudiante regular · {v.regular.aprobadasCicloActual} de {v.regular.meta} materias aprobadas este ciclo</p>}
      </header>

      {v.vacio && (
        <Aviso tipo="info" titulo="Empecemos por lo que ya hiciste" accion={<a class="boton boton--primario boton--chico" href={enlaces.plan()}>Ir al plan</a>}>
          Marcá en el plan lo que aprobaste, regularizaste o estás cursando.
        </Aviso>
      )}

      {recordarBackup && (
        <Aviso tipo="alerta" titulo="Hacé un backup" accion={<a class="boton boton--chico" href={enlaces.ajustes()}>Ajustes</a>}>
          {diasSinBackup === null ? 'Todavía no exportaste tus datos.' : `Hace ${diasSinBackup} días que no exportás tus datos.`} Es lo único que los recupera si el navegador los borra.
        </Aviso>
      )}

      {v.porCerrar.length > 0 && (
        <Seccion titulo="¿Cómo te fue en el cursado?">
          <p class="seccion__texto">Terminó el cuatrimestre. ¿Qué resultado tuviste?</p>
          <ul class="lista">
            {v.porCerrar.map(c => (
              <li key={c.materiaId} class="tarjeta tarjeta--cierre">
                <div class="fila__principal">
                  <a class="fila__nombre" href={enlaces.materia(c.materiaId)}>{c.nombre}</a>
                  <span class="fila__detalle">{c.cuatrimestre === 'anual' ? 'Anual' : c.cuatrimestre} {c.ciclo} · terminó el {fechaCorta(c.fin)}</span>
                </div>
                <div class="botonera">
                  <Boton chico onClick={() => actualizar(d => A.agregarCursada(d, c.materiaId, { ciclo: c.ciclo, cuatrimestre: c.cuatrimestre, resultado: 'regular', fechaResultado: c.fin }))}>Regularicé</Boton>
                  <Boton chico onClick={() => setHoja({ id: c.materiaId, accion: 'cursada', inicial: { ciclo: c.ciclo, cuatrimestre: c.cuatrimestre, resultado: 'aprobada-directa', fechaResultado: c.fin } })}>Promocioné</Boton>
                  <Boton chico variante="texto" onClick={() => actualizar(d => A.agregarCursada(d, c.materiaId, { ciclo: c.ciclo, cuatrimestre: c.cuatrimestre, resultado: 'libre', fechaResultado: c.fin }))}>Quedé libre</Boton>
                </div>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {v.riesgos.length > 0 && (
        <Seccion titulo="Atención">
          <ul class="lista">
            {v.riesgos.map(r => (
              <li key={`${r.id}-${r.texto}`}>
                <a class={`fila ${r.gravedad === 'urgente' ? 't-recursar' : 't-cursando'}`} href={enlaces.materia(r.id)}>
                  <span class="fila__principal">
                    <span class="fila__nombre">{r.nombre}</span>
                    <span class="fila__detalle">{r.texto}</span>
                  </span>
                  <Icono nombre="alerta" />
                </a>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      <Seccion titulo="Finales" acciones={<a class="enlace-seccion" href={enlaces.finales()}>Ver todo <Icono nombre="der" tam={14} /></a>}>
        {v.inscripcionesFinal.length > 0 ? (
          <ul class="lista">
            {v.inscripcionesFinal.map(({ periodo, cierre }) => (
              <li key={periodo.id} class="tarjeta tarjeta--destacada">
                <strong>Inscripción abierta</strong>
                <span>Finales del {rango(periodo.desde, periodo.hasta)}</span>
                <span class="fila__detalle">Hasta 48 h hábiles antes de cada examen (el último cierra el {fechaCorta(cierre)}).</span>
              </li>
            ))}
          </ul>
        ) : v.proxima?.tipo === 'finales-pronto' ? null : v.proximoPeriodo ? (
          <div class="tarjeta">
            <strong>Próximo turno: {rango(v.proximoPeriodo.desde, v.proximoPeriodo.hasta)}</strong>
            <span class="fila__detalle">
              {v.proximoPeriodo.inscripcionDesde ? `La inscripción abre el ${fechaCorta(v.proximoPeriodo.inscripcionDesde)} (${relativo(v.proximoPeriodo.inscripcionDesde, m.hoy)}).` : 'La inscripción todavía no tiene fecha.'}
            </span>
          </div>
        ) : (
          <p class="seccion__texto">No hay turnos de final cargados en el calendario.</p>
        )}
        {v.rendir.length > 0 ? (
          <>
            <p class="seccion__texto">Podés rendir {plural(v.rendir.length, 'materia', 'materias')} ahora:</p>
            <ul class="lista">{v.rendir.slice(0, 3).map(i => <li key={i.id}><FilaMateria item={i} /></li>)}</ul>
            {v.rendir.length > 3 && <a class="enlace-seccion" href={enlaces.finales()}>y {v.rendir.length - 3} más</a>}
          </>
        ) : (
          !v.vacio && <p class="seccion__texto">Todavía no tenés materias regulares para rendir.</p>
        )}
        {v.pendientesMesa.length > 0 && (
          <Aviso tipo="info" titulo="Aprobación directa sin registrar">
            Inscribite a una mesa para que quede en el acta: {v.pendientesMesa.map(i => i.nombre).join(', ')}.
          </Aviso>
        )}
      </Seccion>

      {v.proximo && (
        <Seccion titulo={`Para cursar en el ${v.proximo.cuatrimestre} ${v.proximo.ciclo}`} acciones={<a class="enlace-seccion" href={enlaces.materias('habilitadas')}>Habilitadas <Icono nombre="der" tam={14} /></a>}>
          <p class="seccion__texto">
            {v.proximo.inicio ? `Empieza${v.proximo.estimado ? ' aproximadamente' : ''} el ${fechaCorta(v.proximo.inicio)}. ` : ''}
            {v.proximo.ventana
              ? `Inscripción${v.proximo.ventana.estimada ? ' (estimada)' : ''}: ${rango(v.proximo.ventana.desde, v.proximo.ventana.hasta)}.`
              : 'Todavía no hay fechas de inscripción.'}
            {v.proximo.estimado && <> <a href={enlaces.calendario()}>Cargá las fechas reales</a> cuando salgan.</>}
          </p>
          {v.paraCursar.length > 0 ? (
            <>
              <ul class="lista">{v.paraCursar.slice(0, 4).map(i => <li key={i.id}><FilaMateria item={i} nivel /></li>)}</ul>
              {v.paraCursar.length > 4 && <a class="enlace-seccion" href={enlaces.materias('habilitadas')}>y {v.paraCursar.length - 4} más</a>}
            </>
          ) : (
            <p class="seccion__texto">{v.vacio ? 'Cargá tu estado para ver qué podés cursar.' : 'No hay materias habilitadas que arranquen en ese cuatrimestre.'}</p>
          )}
        </Seccion>
      )}

      {!v.regular.regular && (
        <Seccion titulo="Estudiante regular">
          <div class="tarjeta tarjeta--alerta">
            <strong>Sos estudiante no regular</strong>
            <span class="fila__detalle">{v.regular.razon}</span>
            <span class="fila__detalle">Aprobadas en el ciclo {v.ciclo}: {v.regular.aprobadasCicloActual} de {v.regular.meta}</span>
          </div>
        </Seccion>
      )}

      {hoja && <HojaMateria m={m} materiaId={hoja.id} accion={hoja.accion} inicialCursada={hoja.inicial} onCerrar={() => setHoja(null)} />}
    </div>
  );
}
