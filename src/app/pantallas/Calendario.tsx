import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CuatrimestreCalendario, Fecha, PeriodoExamen } from '../../motor/index.ts';
import { sumarDias } from '../../motor/fechas.ts';
import * as A from '../../datos/acciones.ts';
import { agruparPorMes, construirAgenda, type ItemAgenda } from '../../vista/agenda.ts';
import { fechaCorta, rango } from '../../vista/formato.ts';
import { Aviso, Boton, Campo, Hoja, Icono, Segmentado } from '../componentes.tsx';
import type { Modelo } from '../modelo.ts';
import { actualizar } from '../store.ts';
import { referencia } from '../modelo.ts';

type Edicion = { tipo: 'cuatrimestre'; inicial?: CuatrimestreCalendario } | { tipo: 'periodo'; inicial?: PeriodoExamen } | null;

export function Calendario({ m }: { m: Modelo }) {
  const [edicion, setEdicion] = useState<Edicion>(null);
  const desde = `${m.hoy.slice(0, 7)}-01`;
  const hasta = sumarDias(m.hoy, 430);
  const meses = useMemo(() => agruparPorMes(construirAgenda(m.cal, desde, hasta), desde), [m]);
  const usuario = m.datos.calendario;
  const esMio = (id?: string) => !!id && !!(usuario?.cuatrimestres?.some(q => q.id === id) || usuario?.periodosExamen?.some(p => p.id === id));

  // Abre mirando lo que viene: lo que ya pasó queda arriba, fuera de la vista
  const proximo = useRef<HTMLLIElement>(null);
  useEffect(() => {
    proximo.current?.scrollIntoView({ block: 'start' });
  }, []);
  const primeroVigente = meses.flatMap(x => x.items).find(i => i.hasta >= m.hoy)?.clave;

  const editar = (i: ItemAgenda) => {
    if (!i.origenId) return;
    if (i.tipo === 'cursado' || i.tipo === 'inscripcion-cursado') {
      setEdicion({ tipo: 'cuatrimestre', inicial: m.cal.cal.cuatrimestres.find(q => q.id === i.origenId) });
    } else {
      setEdicion({ tipo: 'periodo', inicial: m.cal.cal.periodosExamen.find(p => p.id === i.origenId) });
    }
  };

  return (
    <div class="pagina">
      <h1 class="pagina__titulo">Calendario</h1>
      <p class="seccion__texto">
        Calendario académico {referencia.ok ? referencia.calendario.versionDatos : ''} de la FRVM. Si algo cambió o falta, cargalo vos.
      </p>
      <div class="botonera">
        <Boton chico onClick={() => setEdicion({ tipo: 'cuatrimestre' })}><Icono nombre="agregar" tam={16} /> Cursado</Boton>
        <Boton chico onClick={() => setEdicion({ tipo: 'periodo' })}><Icono nombre="agregar" tam={16} /> Turno de finales</Boton>
      </div>

      {meses.map(mes => (
        <section key={mes.clave} class="seccion">
          <div class="seccion__cab"><h2 class="seccion__titulo">{mes.titulo}</h2></div>
          <ul class="agenda">
            {mes.items.map(i => (
              <li key={i.clave} ref={i.clave === primeroVigente ? proximo : undefined} class={`agenda__item agenda__item--${i.tipo}${i.hasta < m.hoy ? ' agenda__item--pasado' : ''}`}>
                <div class="agenda__fecha">{rango(i.desde, i.hasta)}</div>
                {i.origenId && (
                  <Boton chico variante="texto" class="agenda__editar" aria-label={`Editar ${i.titulo}`} onClick={() => editar(i)}><Icono nombre="editar" tam={16} /> Editar</Boton>
                )}
                <div class="agenda__cuerpo">
                  <strong class="agenda__titulo">{i.titulo}</strong>
                  {i.estimado && <span class="etiqueta etiqueta--estimado">estimado</span>}
                  {esMio(i.origenId) && <span class="etiqueta etiqueta--mio">cargado por vos</span>}
                  {i.detalle && <span class="fila__detalle">{i.detalle}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Hoja abierta={edicion !== null} titulo={edicion?.tipo === 'periodo' ? 'Turno de finales' : 'Cursado de un cuatrimestre'} onCerrar={() => setEdicion(null)}>
        {edicion?.tipo === 'cuatrimestre' && <FormCuatrimestre m={m} inicial={edicion.inicial} onListo={() => setEdicion(null)} />}
        {edicion?.tipo === 'periodo' && <FormPeriodo m={m} inicial={edicion.inicial} onListo={() => setEdicion(null)} />}
      </Hoja>
    </div>
  );
}

const val = (e: { currentTarget: { value: string } }) => e.currentTarget.value;

function FormCuatrimestre({ m, inicial, onListo }: { m: Modelo; inicial?: CuatrimestreCalendario; onListo: () => void }) {
  const proximo = m.cal.cal.cuatrimestres.at(-1);
  const [ciclo, setCiclo] = useState(String(inicial?.ciclo ?? (proximo ? proximo.ciclo + (proximo.cuatrimestre === '2C' ? 1 : 0) : m.resumen.ciclo)));
  const [cuatri, setCuatri] = useState<'1C' | '2C'>(inicial?.cuatrimestre ?? (proximo?.cuatrimestre === '2C' ? '1C' : '2C'));
  const [inicio, setInicio] = useState<string>(inicial?.inicio ?? '');
  const [fin, setFin] = useState<string>(inicial?.fin ?? '');
  const [inscDesde, setInscDesde] = useState<string>(inicial?.inscripcion?.desde ?? '');
  const [inscHasta, setInscHasta] = useState<string>(inicial?.inscripcion?.hasta ?? '');
  const [finCiclo, setFinCiclo] = useState('');
  const [error, setError] = useState('');
  const idNuevo = `${ciclo}-${cuatri.toLowerCase()}`;
  const hayMio = !!m.datos.calendario?.cuatrimestres?.some(q => q.id === idNuevo);

  const guardar = (e: Event) => {
    e.preventDefault();
    const c = Number(ciclo);
    if (!Number.isInteger(c) || c < 1990 || c > 2200) return setError('El ciclo lectivo no es válido');
    if (!inicio || !fin) return setError('Indicá cuándo empieza y cuándo termina el cursado');
    if (fin < inicio) return setError('El cursado no puede terminar antes de empezar');
    if ((inscDesde && !inscHasta) || (!inscDesde && inscHasta)) return setError('Completá las dos fechas de inscripción, o ninguna');
    if (inscDesde && inscHasta && inscDesde > inscHasta) return setError('La inscripción no puede cerrar antes de abrir');
    if (finCiclo && finCiclo <= fin) return setError('El ciclo lectivo termina después del cursado (con el último llamado de febrero–marzo)');
    const q: CuatrimestreCalendario = { id: idNuevo, ciclo: c, cuatrimestre: cuatri, inicio, fin, ...(inscDesde && inscHasta ? { inscripcion: { desde: inscDesde, hasta: inscHasta } } : {}) };
    actualizar(d => {
      let nuevo = A.guardarCuatrimestre(d, q);
      if (finCiclo) {
        const existente = m.cal.cal.ciclosLectivos.find(x => x.id === c);
        nuevo = A.guardarCiclo(nuevo, { id: c, inicio: existente?.inicio ?? (cuatri === '1C' ? inicio : null), fin: finCiclo });
      }
      return nuevo;
    });
    onListo();
  };

  return (
    <form class="formulario" onSubmit={guardar}>
      <div class="campos-fila">
        <Campo etiqueta="Ciclo lectivo"><input type="number" inputMode="numeric" value={ciclo} onInput={e => setCiclo(val(e))} required /></Campo>
        <Segmentado nombre="cuat" etiqueta="Cuatrimestre" valor={cuatri} onCambio={setCuatri} opciones={[{ valor: '1C', etiqueta: '1.er' }, { valor: '2C', etiqueta: '2.º' }]} />
      </div>
      <div class="campos-fila">
        <Campo etiqueta="Empieza"><input type="date" value={inicio} onInput={e => setInicio(val(e))} required /></Campo>
        <Campo etiqueta="Termina"><input type="date" value={fin} onInput={e => setFin(val(e))} required /></Campo>
      </div>
      <fieldset class="agrupado">
        <legend class="campo__etiqueta">Inscripción a cursado en autogestión (opcional)</legend>
        <div class="campos-fila">
          <Campo etiqueta="Abre"><input type="date" value={inscDesde} onInput={e => setInscDesde(val(e))} /></Campo>
          <Campo etiqueta="Cierra"><input type="date" value={inscHasta} onInput={e => setInscHasta(val(e))} /></Campo>
        </div>
        <p class="nota-ayuda">Si no la cargás, Regu la estima: 14 días antes a 14 días después del inicio.</p>
      </fieldset>
      <Campo etiqueta="Último llamado del ciclo lectivo (opcional)" ayuda="Fin del ciclo: el último día de los finales de febrero–marzo del año siguiente. Se usa para la excepción de correlativas.">
        <input type="date" value={finCiclo} onInput={e => setFinCiclo(val(e))} />
      </Campo>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div class="botonera">
        <Boton type="submit" variante="primario">Guardar</Boton>
        {hayMio && (
          <Boton variante="texto" onClick={() => { actualizar(d => A.quitarCuatrimestre(d, idNuevo)); onListo(); }}>
            {m.calendario.cuatrimestres.some(q => q.id === idNuevo) ? 'Volver a los valores originales' : 'Borrar'}
          </Boton>
        )}
      </div>
    </form>
  );
}

function FormPeriodo({ m, inicial, onListo }: { m: Modelo; inicial?: PeriodoExamen; onListo: () => void }) {
  const [tipo, setTipo] = useState<PeriodoExamen['tipo']>(inicial?.tipo ?? 'turno');
  const [desde, setDesde] = useState<string>(inicial?.desde ?? '');
  const [hasta, setHasta] = useState<string>(inicial?.hasta ?? '');
  const [insc, setInsc] = useState<string>(inicial?.inscripcionDesde ?? '');
  const [error, setError] = useState('');
  const id = inicial?.id ?? `usuario-${desde || 'nuevo'}`;
  const hayMio = !!inicial && !!m.datos.calendario?.periodosExamen?.some(p => p.id === inicial.id);

  const guardar = (e: Event) => {
    e.preventDefault();
    if (!desde || !hasta) return setError('Indicá desde y hasta cuándo son los exámenes');
    if (hasta < desde) return setError('Los exámenes no pueden terminar antes de empezar');
    if (insc && insc >= desde) return setError('La inscripción tiene que abrir antes del primer examen');
    actualizar(d => A.guardarPeriodoExamen(d, { id, tipo, desde: desde as Fecha, hasta: hasta as Fecha, inscripcionDesde: insc || null }));
    onListo();
  };

  return (
    <form class="formulario" onSubmit={guardar}>
      <Segmentado
        nombre="tipo-periodo"
        etiqueta="Tipo"
        valor={tipo}
        onCambio={setTipo}
        opciones={[{ valor: 'turno', etiqueta: 'Turno' }, { valor: 'mesas-moviles', etiqueta: 'Mesas móviles' }, { valor: 'especial', etiqueta: 'Especial' }]}
      />
      <div class="campos-fila">
        <Campo etiqueta="Desde"><input type="date" value={desde} onInput={e => setDesde(val(e))} required /></Campo>
        <Campo etiqueta="Hasta"><input type="date" value={hasta} onInput={e => setHasta(val(e))} required /></Campo>
      </div>
      <Campo etiqueta="Abre la inscripción (opcional)" ayuda={insc ? `Cierra 48 h hábiles antes de cada examen. Primer día: ${fechaCorta(insc)}` : undefined}>
        <input type="date" value={insc} onInput={e => setInsc(val(e))} />
      </Campo>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <div class="botonera">
        <Boton type="submit" variante="primario">Guardar</Boton>
        {hayMio && inicial && (
          <Boton variante="texto" onClick={() => { actualizar(d => A.quitarPeriodoExamen(d, inicial.id)); onListo(); }}>
            {m.calendario.periodosExamen.some(p => p.id === inicial.id) ? 'Volver a los valores originales' : 'Borrar'}
          </Boton>
        )}
      </div>
    </form>
  );
}
