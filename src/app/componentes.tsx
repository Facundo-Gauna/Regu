// Componentes compartidos: marca, íconos, insignias de estado, hoja inferior y campos de formulario.

import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { GROSOR, LETRAS, VIEWBOX_PALABRA } from './marca.ts';
import type { Icono as NombreIcono, Presentacion } from '../vista/estados.ts';
import type { ItemLista } from '../vista/materias.ts';
import { enlaces } from '../vista/rutas.ts';

// ---------- Marca ----------

export function Logo({ alto = 26, titulo = 'Regu' }: { alto?: number; titulo?: string }) {
  return (
    <svg class="logo" viewBox={VIEWBOX_PALABRA} height={alto} role="img" aria-label={titulo} fill="none" stroke="currentColor" stroke-width={GROSOR} stroke-linecap="butt" stroke-linejoin="round">
      {LETRAS.map(l => (
        <path key={l.x} transform={`translate(${l.x} 0)`} d={l.d} />
      ))}
    </svg>
  );
}

// ---------- Íconos ----------

export type NombreIconoUi =
  | NombreIcono | 'inicio' | 'materias' | 'plan' | 'finales' | 'mas' | 'calendario' | 'progreso' | 'ajustes'
  | 'cerrar' | 'agregar' | 'der' | 'izq' | 'borrar' | 'descargar' | 'subir' | 'editar' | 'instalar' | 'ayuda';

const TRAZOS: Record<string, string> = {
  inicio: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  materias: 'M4 6h16M4 12h16M4 18h10',
  plan: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  finales: 'M9 4h6l1 2h3v14H5V6h3zM9 13l2 2 4-4',
  mas: 'M5 12h.01M12 12h.01M19 12h.01',
  calendario: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  progreso: 'M4 20V12M10 20V4M16 20v-6M2 20h20',
  ajustes: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4',
  check: 'M5 12l5 5 9-10',
  'check-pendiente': 'M4 12l4 4 8-9M20 14v4M20 21h.01',
  'candado-abierto': 'M6 11h12v9H6zM8 11V7a4 4 0 017.5-2',
  candado: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  repetir: 'M4 11a8 8 0 0114-4l2 2M20 4v5h-5M20 13a8 8 0 01-14 4l-2-2M4 20v-5h5',
  alerta: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v6M12 7.5h.01',
  cerrar: 'M5 5l14 14M19 5L5 19',
  agregar: 'M12 5v14M5 12h14',
  der: 'M9 5l7 7-7 7',
  izq: 'M15 5l-7 7 7 7',
  borrar: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  descargar: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  subir: 'M12 16V5M7 9l5-5 5 5M5 20h14',
  editar: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  instalar: 'M12 3v12M7 10l5 5 5-5M4 19h16',
  ayuda: 'M12 3a9 9 0 100 18 9 9 0 000-18zM9.5 9.5a2.6 2.6 0 115 1c0 1.6-2.5 2-2.5 3.5M12 17h.01',
};

export function Icono({ nombre, tam = 20 }: { nombre: NombreIconoUi; tam?: number }) {
  const comun = { width: tam, height: tam, viewBox: '0 0 24 24', 'aria-hidden': true, class: 'icono', focusable: 'false' };
  if (nombre === 'play') {
    return (
      <svg {...comun}>
        <path d="M8 5l11 7-11 7z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
      </svg>
    );
  }
  if (nombre === 'mitad') {
    return (
      <svg {...comun}>
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2" />
        <path d="M12 3.5a8.5 8.5 0 010 17z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...comun} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d={TRAZOS[nombre] ?? ''} />
    </svg>
  );
}

// ---------- Estado ----------

export function Insignia({ p, chica = false }: { p: Presentacion; chica?: boolean }) {
  return (
    <span class={`insignia t-${p.tono}${chica ? ' insignia--chica' : ''}`}>
      <Icono nombre={p.icono} tam={chica ? 14 : 16} />
      <span>{p.etiqueta}</span>
    </span>
  );
}

/** Marca no interactiva, para las filas que ya son un enlace: el detalle se ve en la materia. */
export function AvisoDatos({ textos }: { textos: string[] }) {
  if (!textos.length) return null;
  return (
    <span class="sin-confirmar">
      <Icono nombre="alerta" tam={13} /> Sin confirmar
    </span>
  );
}

/** «Sin confirmar ⓘ»: la advertencia queda a la vista y la explicación se abre al tocarla. No usar dentro de un enlace. */
export function SinConfirmar({ titulo, etiqueta = 'Sin confirmar', children }: { titulo: string; etiqueta?: string; children: ComponentChildren | ((cerrar: () => void) => ComponentChildren) }) {
  const [abierta, setAbierta] = useState(false);
  const cerrar = () => setAbierta(false);
  return (
    <>
      <button type="button" class="sin-confirmar sin-confirmar--boton" aria-haspopup="dialog" aria-label={`${etiqueta}: ${titulo}`} onClick={() => setAbierta(true)}>
        <Icono nombre="alerta" tam={13} /> {etiqueta} <Icono nombre="info" tam={15} />
      </button>
      {/* La hoja queda montada: al cerrarse con close() el navegador devuelve el foco al botón */}
      <Hoja abierta={abierta} titulo={titulo} onCerrar={cerrar}>
        {typeof children === 'function' ? children(cerrar) : children}
      </Hoja>
    </>
  );
}

/** Fila de una materia: nombre, detalle, estado y enlace a su detalle. */
export function FilaMateria({ item, nivel = false }: { item: ItemLista; nivel?: boolean }) {
  const p = item.presentacion;
  return (
    <a class={`fila fila--materia t-${p.tono}`} href={enlaces.materia(item.id)}>
      <span class="fila__principal">
        <span class="fila__nombre">{item.nombre}</span>
        <span class="fila__detalle">
          {nivel && item.nivel ? `${item.nivel}.º año · ` : ''}
          {item.regimen} · {item.detalle}
        </span>
        <AvisoDatos textos={item.sinConfirmar} />
      </span>
      <Insignia p={p} chica />
    </a>
  );
}

// ---------- Estructura ----------

export function Seccion({ titulo, acciones, children, id }: { titulo: string; acciones?: ComponentChildren; children: ComponentChildren; id?: string }) {
  return (
    <section class="seccion" id={id}>
      <div class="seccion__cab">
        <h2 class="seccion__titulo">{titulo}</h2>
        {acciones}
      </div>
      {children}
    </section>
  );
}

export function Aviso({ tipo = 'info', titulo, children, accion }: { tipo?: 'info' | 'alerta' | 'error' | 'ok'; titulo?: string; children?: ComponentChildren; accion?: ComponentChildren }) {
  return (
    <div class={`aviso aviso--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <Icono nombre={tipo === 'info' || tipo === 'ok' ? 'info' : 'alerta'} />
      <div class="aviso__texto">
        {titulo && <strong>{titulo}</strong>}
        {children && <div>{children}</div>}
      </div>
      {accion && <div class="aviso__accion">{accion}</div>}
    </div>
  );
}

export function Vacio({ icono = 'info', titulo, children }: { icono?: NombreIconoUi; titulo: string; children?: ComponentChildren }) {
  return (
    <div class="vacio">
      <Icono nombre={icono} tam={32} />
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Barra({ valor, max, etiqueta, tono = 'aprobada' }: { valor: number; max: number; etiqueta: string; tono?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((valor / max) * 100)) : 0;
  return (
    <div class="barra" role="progressbar" aria-valuenow={valor} aria-valuemin={0} aria-valuemax={max} aria-label={etiqueta}>
      <div class={`barra__relleno t-${tono}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Boton({ children, variante = 'secundario', chico = false, ...resto }: { variante?: 'primario' | 'secundario' | 'peligro' | 'texto'; chico?: boolean } & JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...resto} class={`boton boton--${variante}${chico ? ' boton--chico' : ''}${resto.class ? ` ${String(resto.class)}` : ''}`}>
      {children}
    </button>
  );
}

// ---------- Hoja inferior (diálogo modal) ----------

export function Hoja({ abierta, titulo, onCerrar, children }: { abierta: boolean; titulo: string; onCerrar: () => void; children: ComponentChildren }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
  }, [abierta]);
  return (
    <dialog
      ref={ref}
      class="hoja"
      aria-label={titulo}
      onClose={onCerrar}
      onClick={e => {
        if (e.target === ref.current) onCerrar();
      }}
    >
      <div class="hoja__cuerpo">
        <header class="hoja__cab">
          <h2>{titulo}</h2>
          <button type="button" class="boton boton--icono" aria-label="Cerrar" onClick={onCerrar}>
            <Icono nombre="cerrar" />
          </button>
        </header>
        {abierta && <div class="hoja__contenido">{children}</div>}
      </div>
    </dialog>
  );
}

// ---------- Formularios ----------

export function Campo({ etiqueta, ayuda, error, children }: { etiqueta: string; ayuda?: string; error?: string; children: ComponentChildren }) {
  return (
    <label class={`campo${error ? ' campo--error' : ''}`}>
      <span class="campo__etiqueta">{etiqueta}</span>
      {children}
      {ayuda && !error && <span class="campo__ayuda">{ayuda}</span>}
      {error && <span class="campo__error">{error}</span>}
    </label>
  );
}

export function Segmentado<T extends string>({ nombre, valor, opciones, onCambio, etiqueta }: { nombre: string; valor: T; opciones: { valor: T; etiqueta: string; detalle?: string }[]; onCambio: (v: T) => void; etiqueta: string }) {
  return (
    <fieldset class={`segmentado${opciones.some(o => o.detalle) ? ' segmentado--lista' : ''}`}>
      <legend class="campo__etiqueta">{etiqueta}</legend>
      <div class="segmentado__opciones">
        {opciones.map(o => (
          <label key={o.valor} class={`segmentado__opcion${o.valor === valor ? ' segmentado__opcion--activa' : ''}`}>
            <input type="radio" name={nombre} value={o.valor} checked={o.valor === valor} onChange={() => onCambio(o.valor)} />
            <span>{o.etiqueta}{o.detalle && <small>{o.detalle}</small>}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
