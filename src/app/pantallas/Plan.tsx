import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { columnasPlan, relacionadas, relaciones } from '../../vista/mapa.ts';
import { repartirAnclas, trazar, type Caja } from '../../vista/conectores.ts';
import { detalleCorto } from '../../vista/estados.ts';
import type { ItemLista } from '../../vista/materias.ts';
import { enlaces } from '../../vista/rutas.ts';
import { Aviso, Boton, Icono, Insignia } from '../componentes.tsx';
import { HojaMateria } from '../formularios.tsx';
import type { Modelo } from '../modelo.ts';

const NOMBRE_NIVEL = ['', '1.er año', '2.º año', '3.er año', '4.º año', '5.º año', '6.º año'];

interface Conector {
  clave: string;
  tipo: 'requisito' | 'desbloquea';
  d: string;
}

/** Lo que le falta a una materia bloqueada, en una línea corta para la tarjeta. */
function faltaCorta(i: ItemLista): string | null {
  if (i.presentacion.tono !== 'bloqueada') return null;
  const f = i.resumen.cursar.faltan;
  if (f.length === 0) return null;
  return f.length === 1 ? `Falta ${f[0]!.nombre}` : `Faltan ${f.length} correlativas`;
}

export function Plan({ m, inicial }: { m: Modelo; inicial?: string }) {
  const columnas = useMemo(() => columnasPlan(m.resumen, m.plan), [m]);
  const [seleccion, setSeleccion] = useState<string | null>(inicial ?? null);
  const [editando, setEditando] = useState<string | null>(null);
  const [conectores, setConectores] = useState<Conector[]>([]);
  const mapa = useRef<HTMLDivElement>(null);
  const tarjetas = useRef(new Map<string, HTMLButtonElement>());

  // Un enlace con ?sel=<id> deja esa materia seleccionada
  useEffect(() => setSeleccion(inicial ?? null), [inicial]);

  const relac = useMemo(() => (seleccion ? relacionadas(m.plan, seleccion) : null), [m.plan, seleccion]);
  const elegida = seleccion ? m.items.find(i => i.id === seleccion) : undefined;
  const rel = seleccion ? relaciones(m.plan, seleccion) : null;
  const nombre = (id: string) => m.items.find(i => i.id === id)?.nombre ?? id;
  const necesita = rel ? [...new Set([...rel.requiere.regularizadas, ...rel.requiere.aprobadas])] : [];
  const desbloquea = rel ? [...new Set([...rel.desbloqueaCursar, ...rel.desbloqueaRendir])] : [];

  /** Mide las tarjetas y arma los caminos. Las coordenadas son relativas al mapa, así que el desplazamiento no las cambia. */
  const medir = useCallback(() => {
    const cont = mapa.current;
    const origen = seleccion ? tarjetas.current.get(seleccion) : undefined;
    if (!cont || !relac || !origen) return setConectores([]);
    const base = cont.getBoundingClientRect();
    const caja = (el: Element): Caja => {
      const r = el.getBoundingClientRect();
      return { izq: r.left - base.left, der: r.right - base.left, arriba: r.top - base.top, abajo: r.bottom - base.top };
    };
    const centro = caja(origen);
    const otros = [...relac]
      .map(([id, tipo]) => ({ id, tipo, el: tarjetas.current.get(id) })) // las electivas no están en el mapa
      .filter((x): x is { id: string; tipo: 'requisito' | 'desbloquea'; el: HTMLButtonElement } => !!x.el)
      .map(x => ({ ...x, caja: caja(x.el) }));
    // Cada camino engancha a una altura distinta del costado de la tarjeta elegida
    const nuevos: Conector[] = [];
    for (const tipo of ['requisito', 'desbloquea'] as const) {
      const grupo = otros.filter(x => x.tipo === tipo);
      const anclas = repartirAnclas(centro, grupo.map(x => (x.caja.arriba + x.caja.abajo) / 2));
      grupo.forEach((x, k) => {
        const d = tipo === 'requisito' ? trazar(x.caja, centro, { y2: anclas[k] }) : trazar(centro, x.caja, { y1: anclas[k] });
        nuevos.push({ clave: `${tipo}-${x.id}`, tipo, d });
      });
    }
    setConectores(nuevos);
  }, [seleccion, relac]);

  useLayoutEffect(() => {
    medir();
  }, [medir, columnas]);

  // Si cambia el tamaño (girar el celular, cargar la tipografía), los caminos se recalculan
  useEffect(() => {
    const cont = mapa.current;
    if (!cont || typeof ResizeObserver === 'undefined') return;
    // Se mide en el cuadro siguiente: medir dentro del aviso del observador cambia el layout y el navegador
    // responde «ResizeObserver loop completed with undelivered notifications».
    let cuadro = 0;
    const observador = new ResizeObserver(() => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(medir);
    });
    observador.observe(cont);
    return () => {
      cancelAnimationFrame(cuadro);
      observador.disconnect();
    };
  }, [medir]);

  // La materia elegida se centra en la tira para ver lo que necesita y lo que desbloquea
  useEffect(() => {
    if (!seleccion) return;
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    tarjetas.current.get(seleccion)?.scrollIntoView({ block: 'center', inline: 'center', behavior: quieto ? 'auto' : 'smooth' });
  }, [seleccion]);

  return (
    <div class="pagina pagina--ancha">
      <h1 class="pagina__titulo">Plan de estudios</h1>
      {m.datos.materias.length === 0 ? (
        <Aviso tipo="info" titulo="Marcá lo que ya hiciste">
          Tocá una materia y después <strong>Editar estado</strong> para cargar cómo te fue.
        </Aviso>
      ) : (
        !seleccion && <p class="seccion__texto">Tocá una materia para ver qué necesita y qué desbloquea.</p>
      )}

      <div class="leyenda" aria-label="Referencias de colores">
        {(['aprobada', 'regular', 'cursando', 'habilitada', 'bloqueada', 'recursar'] as const).map(t => (
          <span key={t} class={`leyenda__item t-${t}`}>
            <span class="leyenda__punto" />
            {{ aprobada: 'Aprobada', regular: 'Regular', cursando: 'Cursando', habilitada: 'Habilitada', bloqueada: 'Bloqueada', recursar: 'Recursar' }[t]}
          </span>
        ))}
        {seleccion && (
          <span class="leyenda__camino" aria-hidden="true">
            <svg width="30" height="8" viewBox="0 0 30 8"><path class="conector" d="M1 4H29" /></svg> necesita
            <svg width="30" height="8" viewBox="0 0 30 8"><path class="conector conector--desbloquea" d="M1 4H29" /></svg> desbloquea
          </span>
        )}
      </div>

      <div class="mapa-marco" tabIndex={0} role="region" aria-label="Mapa del plan de estudios, se desplaza hacia los costados">
        <div class="mapa" ref={mapa}>
          <svg class="mapa__conectores" aria-hidden="true" focusable="false">
            <defs>
              <marker id="flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
                <path d="M1 1.5L9 5L1 8.5z" />
              </marker>
            </defs>
            {conectores.map(c => (
              <path key={c.clave} class={`conector${c.tipo === 'desbloquea' ? ' conector--desbloquea' : ''}`} d={c.d} markerEnd="url(#flecha)" />
            ))}
          </svg>
          {columnas.map(c => (
            <section key={c.nivel} class="mapa__nivel" aria-label={NOMBRE_NIVEL[c.nivel]}>
              <h2 class="mapa__titulo">{NOMBRE_NIVEL[c.nivel] ?? `${c.nivel}.º año`}</h2>
              <ul class="mapa__lista">
                {c.items.map(i => {
                  const tipo = relac?.get(i.id);
                  const falta = faltaCorta(i);
                  const clases = ['chip-materia', `t-${i.presentacion.tono}`];
                  if (seleccion === i.id) clases.push('chip-materia--elegida');
                  if (tipo === 'requisito') clases.push('chip-materia--requisito');
                  if (tipo === 'desbloquea') clases.push('chip-materia--desbloquea');
                  if (seleccion && seleccion !== i.id && !tipo) clases.push('chip-materia--apagada');
                  return (
                    <li key={i.id}>
                      <button
                        type="button"
                        class={clases.join(' ')}
                        aria-pressed={seleccion === i.id}
                        ref={el => {
                          if (el) tarjetas.current.set(i.id, el);
                          else tarjetas.current.delete(i.id);
                        }}
                        onClick={() => setSeleccion(seleccion === i.id ? null : i.id)}
                      >
                        <span class="chip-materia__nombre">{i.nombre}</span>
                        <span class="chip-materia__estado">
                          <Icono nombre={i.presentacion.icono} tam={13} />
                          {i.presentacion.etiqueta}
                        </span>
                        {falta && <span class="chip-materia__falta">{falta}</span>}
                        {tipo && <span class="chip-materia__relacion">{tipo === 'requisito' ? 'necesaria' : 'desbloquea'}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {elegida && rel && (
        <aside class="panel-seleccion" aria-live="polite">
          <div class="panel-seleccion__cab">
            <div>
              <strong>{elegida.nombre}</strong>
              <div class="panel-seleccion__estado">
                <Insignia p={elegida.presentacion} chica />
                <span class="fila__detalle">{detalleCorto(elegida.resumen)}</span>
              </div>
            </div>
            <button type="button" class="boton boton--icono" aria-label="Cerrar selección" onClick={() => setSeleccion(null)}><Icono nombre="cerrar" /></button>
          </div>
          <p class="panel-seleccion__resumen" aria-hidden="true">
            Necesita {necesita.length} · Desbloquea {desbloquea.length}
          </p>
          {/* El mapa se ve con las líneas; esta lista es la misma información en texto para lectores de pantalla */}
          <dl class="oculto">
            <dt>Necesita</dt>
            <dd>{necesita.length ? necesita.map(nombre).join(', ') : 'Nada para cursar'}</dd>
            <dt>Desbloquea</dt>
            <dd>{desbloquea.map(nombre).join(', ') || 'Nada'}</dd>
          </dl>
          <div class="botonera">
            <Boton variante="primario" chico onClick={() => setEditando(elegida.id)}><Icono nombre="editar" tam={16} /> Editar estado</Boton>
            <a class="boton boton--chico" href={enlaces.materia(elegida.id)}>Ver detalle</a>
          </div>
        </aside>
      )}

      <HojaMateria m={m} materiaId={editando} onCerrar={() => setEditando(null)} />
    </div>
  );
}
