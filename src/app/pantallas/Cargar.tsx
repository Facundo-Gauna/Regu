// Carga rápida: materia en curso → evaluación → nota. Es adonde llevan el atajo del ícono y los accesos de Inicio.

import { useState } from 'preact/hooks';
import type { Evaluacion } from '../../motor/index.ts';
import * as A from '../../datos/acciones.ts';
import { calcular } from '../../vista/estructura.ts';
import { formatearNota, seguimientoCursada } from '../../vista/seguimiento.ts';
import { enlaces } from '../../vista/rutas.ts';
import { Boton, Campo, Hoja, Icono, Vacio } from '../componentes.tsx';
import { TarjetaParte, TecladoNota, FilaItem } from '../estructura.tsx';
import { idNuevo } from '../formularios.tsx';
import type { Modelo } from '../modelo.ts';
import { actualizar, guardarPrefs, useStore } from '../store.ts';

export function enCurso(m: Modelo) {
  return m.items.flatMap(i => (i.resumen.estado.cursadaVigente ? [{ item: i, cursada: i.resumen.estado.cursadaVigente }] : []));
}

export function Cargar({ m, materiaId, parte }: { m: Modelo; materiaId?: string; parte?: string }) {
  const { prefs } = useStore();
  const [elegida, setElegida] = useState<Evaluacion | null>(null);
  const [nueva, setNueva] = useState<{ nombre: string; parte?: string } | null>(null);
  const [aviso, setAviso] = useState('');
  const materias = enCurso(m);
  const actual = materias.find(x => x.item.id === materiaId);

  if (!actual) {
    return (
      <div class="pagina">
        <h1 class="pagina__titulo">Cargar nota</h1>
        {materias.length === 0 ? (
          <Vacio icono="materias" titulo="No tenés materias en curso">
            <a href={enlaces.materias()}>Marcá una como «cursando»</a> y vas a poder cargarle notas.
          </Vacio>
        ) : (
          <ul class="lista">
            {materias.map(({ item }) => (
              <li key={item.id}>
                <a class="fila" href={enlaces.cargar(item.id)}>
                  <span class="fila__principal"><span class="fila__nombre">{item.nombre}</span></span>
                  <Icono nombre="der" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const { item, cursada } = actual;
  const s = seguimientoCursada(cursada);
  const calculo = cursada.estructura ? calcular(cursada, s.umbrales) : null;
  const partes = calculo?.partes.filter(p => !parte || p.parte.id === parte) ?? [];
  // Un acceso a una parte que ya no existe muestra la materia entera
  const visibles = calculo && !partes.length ? calculo.partes : partes;
  const accesos = prefs.accesos ?? [];
  const clave = parte && calculo?.partes.some(p => p.parte.id === parte) ? parte : undefined;
  const fijado = accesos.some(a => a.materiaId === item.id && a.parte === clave);
  const fijar = () =>
    guardarPrefs({ accesos: fijado ? accesos.filter(a => !(a.materiaId === item.id && a.parte === clave)) : [...accesos, { materiaId: item.id, ...(clave ? { parte: clave } : {}) }] });

  const guardar = (ev: Evaluacion) => {
    actualizar(d => A.guardarEvaluacion(d, item.id, cursada.id, ev));
    setAviso(ev.nota === null ? `${ev.nombre}: sin nota` : `${ev.nombre}: ${formatearNota(ev.nota)} guardado`);
    setElegida(null);
    setNueva(null);
  };

  const agregar = (idParte?: string) => (
    <Boton chico onClick={() => setNueva({ nombre: `Nota ${(cursada.evaluaciones?.length ?? 0) + 1}`, ...(idParte ? { parte: idParte } : {}) })}>
      <Icono nombre="agregar" tam={16} /> Nueva nota
    </Boton>
  );

  return (
    <div class="pagina">
      <a class="volver" href={enlaces.cargar()}><Icono nombre="izq" tam={16} /> Otra materia</a>
      <h1 class="pagina__titulo">{item.nombre}</h1>
      <p class="cargar__aviso" role="status">{aviso}</p>

      {calculo ? (
        <>
          {visibles.map(p => (
            <TarjetaParte key={p.parte.id} p={p} minimo={calculo.minimoParte} unica={calculo.partes.length === 1} onNota={i => setElegida(i.reemplazo ?? i.evaluacion)} accion={agregar(p.parte.id)} />
          ))}
          {clave && calculo.partes.length > 1 && <a class="enlace-seccion" href={enlaces.cargar(item.id)}>Ver todas las partes</a>}
          {!clave && calculo.partes.length > 1 && (
            <div class="botonera">
              {calculo.partes.map(p => <a key={p.parte.id} class="boton boton--chico" href={enlaces.cargar(item.id, p.parte.id)}>Solo {p.parte.nombre}</a>)}
            </div>
          )}
        </>
      ) : (
        <div class="parte">
          <ul class="items">
            {s.filas.map(f => (
              <FilaItem key={f.evaluacion.id} item={{ evaluacion: f.evaluacion, nota: f.evaluacion.nota, fraccion: 0 }} minimo={s.umbrales.regular} onNota={() => setElegida(f.evaluacion)} />
            ))}
          </ul>
          {agregar()}
        </div>
      )}

      <div class="botonera">
        <Boton onClick={fijar} aria-pressed={fijado}>{fijado ? 'Quitar de Inicio' : 'Fijar en Inicio'}</Boton>
        <a class="enlace-seccion" href={enlaces.materia(item.id)}>Ver la materia <Icono nombre="der" tam={14} /></a>
      </div>

      <Hoja abierta={elegida !== null} titulo={elegida?.nombre ?? ''} onCerrar={() => setElegida(null)}>
        {elegida && <TecladoNota actual={elegida.nota} onElegir={nota => guardar({ ...elegida, nota })} />}
      </Hoja>
      <Hoja abierta={nueva !== null} titulo="Nueva nota" onCerrar={() => setNueva(null)}>
        {nueva && (
          <>
            <Campo etiqueta="Nombre"><input type="text" value={nueva.nombre} onInput={e => setNueva({ ...nueva, nombre: e.currentTarget.value })} /></Campo>
            <TecladoNota actual={null} onElegir={nota => guardar({ id: idNuevo(), nombre: nueva.nombre.trim() || 'Nota', tipo: 'otra', nota, ...(nueva.parte ? { parte: nueva.parte } : {}) })} />
          </>
        )}
      </Hoja>
    </div>
  );
}

/** Los accesos fijados, en Inicio. Los que quedaron sin materia en curso no se muestran. */
export function AccesosRapidos({ m }: { m: Modelo }) {
  const { prefs } = useStore();
  const materias = enCurso(m);
  if (!materias.length) return null;
  const accesos = (prefs.accesos ?? []).flatMap(a => {
    const x = materias.find(y => y.item.id === a.materiaId);
    if (!x) return [];
    const parte = x.cursada.estructura?.partes.find(p => p.id === a.parte);
    if (a.parte && !parte) return [];
    return [{ href: enlaces.cargar(a.materiaId, a.parte), nombre: x.item.nombre, parte: parte?.nombre }];
  });
  return (
    <section class="seccion">
      <div class="seccion__cab">
        <h2 class="seccion__titulo">Cargar nota</h2>
        <a class="enlace-seccion" href={enlaces.cargar()}>{accesos.length ? 'Otra' : 'Elegir materia'} <Icono nombre="der" tam={14} /></a>
      </div>
      {accesos.length > 0 && (
        <ul class="accesos">
          {accesos.map(a => (
            <li key={a.href}>
              <a class="acceso" href={a.href}>
                <Icono nombre="agregar" tam={18} />
                <strong>{a.nombre}</strong>
                {a.parte && <span class="fila__detalle">{a.parte}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
