// Cómo se presenta cada estado: etiqueta, ícono y tono. El estado nunca se comunica solo con color (NF-7).

import type { ResumenMateria } from '../motor/index.ts';
import { fechaCorta } from './formato.ts';
import { resumenCorto } from './seguimiento.ts';

export type Tono = 'aprobada' | 'regular' | 'cursando' | 'habilitada' | 'bloqueada' | 'recursar' | 'neutro';
export type Icono = 'check' | 'check-pendiente' | 'mitad' | 'play' | 'candado-abierto' | 'candado' | 'repetir' | 'alerta' | 'info';

export type ClaveEstado =
  | 'aprobada' | 'aprobada-pendiente' | 'regular' | 'regular-practica' | 'cursando' | 'habilitada' | 'bloqueada' | 'recursar';

export interface Presentacion {
  clave: ClaveEstado;
  etiqueta: string;
  icono: Icono;
  tono: Tono;
}

export const NOMBRE_TONO: Record<Tono, string> = {
  aprobada: 'Aprobada',
  regular: 'Regular',
  cursando: 'Cursando',
  habilitada: 'Habilitada',
  bloqueada: 'Bloqueada',
  recursar: 'Recursar',
  neutro: '',
};

export function presentarMateria(m: Pick<ResumenMateria, 'estado' | 'cursar'>): Presentacion {
  const e = m.estado;
  switch (e.estado) {
    case 'aprobada':
      if (e.pendienteRegistrarMesa) return { clave: 'aprobada-pendiente', etiqueta: 'Aprobada · sin registrar', icono: 'check-pendiente', tono: 'aprobada' };
      return { clave: 'aprobada', etiqueta: e.nota != null ? `Aprobada · ${e.nota}` : 'Aprobada', icono: 'check', tono: 'aprobada' };
    case 'regular':
      if (e.promocionPractica) return { clave: 'regular-practica', etiqueta: 'Regular · final teórico', icono: 'mitad', tono: 'regular' };
      return { clave: 'regular', etiqueta: 'Regular', icono: 'mitad', tono: 'regular' };
    case 'cursando':
      return { clave: 'cursando', etiqueta: 'Cursando', icono: 'play', tono: 'cursando' };
    case 'recursar':
      return { clave: 'recursar', etiqueta: 'Recursar', icono: 'repetir', tono: 'recursar' };
    case 'no-cursada':
      return m.cursar.puede
        ? { clave: 'habilitada', etiqueta: 'Habilitada', icono: 'candado-abierto', tono: 'habilitada' }
        : { clave: 'bloqueada', etiqueta: 'Bloqueada', icono: 'candado', tono: 'bloqueada' };
  }
}

/** Frase corta con lo más importante de una materia, para mostrar debajo del nombre. */
export function detalleCorto(m: ResumenMateria): string {
  const e = m.estado;
  switch (e.estado) {
    case 'aprobada': {
      if (e.pendienteRegistrarMesa) return 'Aprobación directa: inscribite a una mesa para que quede en el acta';
      const cuando = e.fechaAprobacion ? ` · ${fechaCorta(e.fechaAprobacion)}` : '';
      if (e.corregido) return 'Estado corregido a mano';
      return e.forma === 'directa' ? `Aprobación directa${cuando}` : e.forma === 'equivalencia' ? `Equivalencia${cuando}` : `Final${cuando}`;
    }
    case 'regular': {
      const partes = [`${e.aplazos} de 4 aplazos`];
      if (m.rendir.puede) partes.push(m.rendir.excepcion ? 'podés rendir (sin correlativas)' : 'podés rendir');
      else partes.push('todavía no podés rendir');
      return partes.join(' · ');
    }
    case 'cursando':
      return e.cursadaVigente ? [`Ciclo ${e.cursadaVigente.ciclo}`, resumenCorto(e.cursadaVigente)].filter(Boolean).join(' · ') : 'En curso';
    case 'recursar':
      return e.razones.at(-1) ?? 'Hay que recursarla';
    case 'no-cursada':
      if (m.cursar.puede) return `Podés cursarla en el ${m.inicia === '2C' ? '2.º' : '1.er'} cuatrimestre`;
      return resumenFaltantes(m.cursar.faltan);
  }
}

export function etiquetaRegimen(r: ResumenMateria['regimen']): string {
  return r === 'anual' ? 'Anual' : r === '1C' ? '1.er cuatrimestre' : r === '2C' ? '2.º cuatrimestre' : 'Régimen sin confirmar';
}

export function etiquetaRegimenCorta(r: ResumenMateria['regimen']): string {
  return r === 'anual' ? 'Anual' : r ?? '¿?';
}

/** Lo que falta para cursar, en una frase corta: "Te falta aprobar X" o "Te faltan 3 correlativas". */
function resumenFaltantes(faltan: ResumenMateria['cursar']['faltan']): string {
  if (faltan.length === 0) return 'Correlativas pendientes';
  const f = faltan[0]!;
  if (faltan.length === 1) return `Te falta ${f.requerido === 'regular' ? 'regularizar' : f.requerido === 'aprobada' ? 'aprobar' : 'cumplir'} ${f.nombre}`;
  return `Te faltan ${faltan.length} correlativas`;
}
