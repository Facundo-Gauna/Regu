// Progreso de paquetes de electivas, requisitos no-materia y títulos.

import type { Id, Titulo } from './tipos.ts';
import { nombreDe, type Contexto } from './contexto.ts';

export interface ProgresoPaquete {
  id: Id;
  nombre: string;
  nivel: number;
  horasExigidas: number | null;
  /** Origen de las horas exigidas. */
  horasExigidasOrigen: 'plan' | 'usuario' | 'no-especificado';
  horasAprobadas: number;
  horasEnCurso: number;
  /** Electivas aprobadas cuyas horas no se conocen. */
  electivasSinHoras: Id[];
  /** null = no se puede saber (faltan horas exigidas o de alguna electiva). */
  cumplido: boolean | null;
  electivas: { id: Id; nombre: string; horas: number | null; estado: string }[];
}

export function progresoPaquetes(ctx: Contexto): ProgresoPaquete[] {
  return ctx.plan.paquetesElectivas.map(p => {
    const deUsuario = ctx.usuario.horasPaquetes?.[p.id];
    const horasExigidas = deUsuario ?? p.horasExigidas;
    const elecciones = ctx.usuario.electivasElegidas.filter(e => e.paqueteId === p.id);
    let horasAprobadas = 0;
    let horasEnCurso = 0;
    const electivasSinHoras: Id[] = [];
    const electivas = elecciones.map(e => {
      const catalogo = ctx.cursables.get(e.electivaId);
      const horas = e.horas ?? (catalogo?.clase === 'electiva' ? catalogo.horas : null);
      const estado = ctx.estados.get(e.electivaId)?.estado ?? 'no-cursada';
      if (estado === 'aprobada') {
        if (horas == null) electivasSinHoras.push(e.electivaId);
        else horasAprobadas += horas;
      } else if (estado === 'cursando' || estado === 'regular') {
        horasEnCurso += horas ?? 0;
      }
      return { id: e.electivaId, nombre: nombreDe(ctx, e.electivaId), horas, estado };
    });
    let cumplido: boolean | null;
    if (horasExigidas == null) cumplido = null;
    else if (horasAprobadas >= horasExigidas) cumplido = true;
    else cumplido = electivasSinHoras.length > 0 ? null : false;
    return {
      id: p.id,
      nombre: p.nombre,
      nivel: p.nivel,
      horasExigidas,
      horasExigidasOrigen: deUsuario != null ? 'usuario' : p.horasExigidas != null ? 'plan' : 'no-especificado',
      horasAprobadas,
      horasEnCurso,
      electivasSinHoras,
      cumplido,
      electivas,
    };
  });
}

export function requisitoCumplido(ctx: Contexto, id: Id): boolean {
  return ctx.estadoRequisitos.get(id)?.estado === 'cumplido';
}

export interface ProgresoTitulo {
  id: Id;
  nombre: string;
  tipo: Titulo['tipo'];
  hastaNivel: number | null;
  completo: boolean;
  /** Hay paquetes cuyo cumplimiento no se puede determinar. */
  incierto: boolean;
  materias: { aprobadas: number; total: number };
  faltan: { id: Id; nombre: string; tipo: 'materia' | 'paquete' | 'requisito' }[];
}

export function progresoTitulos(ctx: Contexto, paquetes: ProgresoPaquete[]): ProgresoTitulo[] {
  return ctx.plan.titulos.map(t => {
    const dentro = (nivel: number) => t.hastaNivel === null || nivel <= t.hastaNivel;
    const extras = new Set(t.requisitosExtra ?? []);
    const faltan: ProgresoTitulo['faltan'] = [];

    const materias = ctx.plan.materias.filter(m => dentro(m.nivel) || extras.has(m.id));
    const aprobadas = materias.filter(m => ctx.estados.get(m.id)?.estado === 'aprobada');
    for (const m of materias) if (ctx.estados.get(m.id)?.estado !== 'aprobada') faltan.push({ id: m.id, nombre: m.nombre, tipo: 'materia' });

    let incierto = false;
    for (const p of paquetes.filter(p => dentro(p.nivel) || extras.has(p.id))) {
      if (p.cumplido === null) incierto = true;
      if (p.cumplido !== true) faltan.push({ id: p.id, nombre: p.nombre, tipo: 'paquete' });
    }
    for (const r of ctx.plan.requisitos.filter(r => dentro(r.nivel) || extras.has(r.id))) {
      if (!requisitoCumplido(ctx, r.id)) faltan.push({ id: r.id, nombre: r.nombre, tipo: 'requisito' });
    }
    return {
      id: t.id,
      nombre: t.nombre,
      tipo: t.tipo,
      hastaNivel: t.hastaNivel,
      completo: faltan.length === 0,
      incierto,
      materias: { aprobadas: aprobadas.length, total: materias.length },
      faltan,
    };
  });
}
