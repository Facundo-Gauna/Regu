// Estudiante de ejemplo para probar Regu sin cargar datos propios (ingresó en 2024; situación al 23/11/2026).
// Se usa solo en memoria: nunca pisa los datos guardados.

import type { Cursada, DatosMateriaUsuario, DatosUsuario, Fecha, IntentoFinal } from '../motor/tipos.ts';

const FIN_1C = (c: number): Fecha => `${c}-07-03`;
const FIN_2C = (c: number): Fecha => `${c}-11-27`;

function cur(ciclo: number, cuatrimestre: Cursada['cuatrimestre'], resultado: Cursada['resultado']): Cursada {
  const fin = resultado === 'cursando' ? undefined : cuatrimestre === '1C' ? FIN_1C(ciclo) : FIN_2C(ciclo);
  return { id: `${ciclo}-${cuatrimestre}`, ciclo, cuatrimestre, resultado, ...(fin ? { fechaResultado: fin } : {}) };
}

/** Aprobada por final: cursada regular y final rendido. */
function porFinal(materiaId: string, ciclo: number, cuatrimestre: Cursada['cuatrimestre'], fecha: Fecha, nota: number, antes: IntentoFinal[] = []): DatosMateriaUsuario {
  return { materiaId, cursadas: [cur(ciclo, cuatrimestre, 'regular')], finales: [...antes, { fecha, resultado: 'aprobado', nota }] };
}

/** Aprobada con aprobación directa. */
function directa(materiaId: string, ciclo: number, cuatrimestre: Cursada['cuatrimestre'], fecha: Fecha, nota: number, registrada = true): DatosMateriaUsuario {
  return {
    materiaId,
    cursadas: [{ ...cur(ciclo, cuatrimestre, 'aprobada-directa'), fechaResultado: fecha }],
    finales: [],
    aprobacion: { forma: 'directa', nota, fecha, registradaEnMesa: registrada },
  };
}

function regular(materiaId: string, ciclo: number, cuatrimestre: Cursada['cuatrimestre'], finales: IntentoFinal[] = []): DatosMateriaUsuario {
  return { materiaId, cursadas: [cur(ciclo, cuatrimestre, 'regular')], finales };
}

function cursando(materiaId: string, ciclo: number, cuatrimestre: Cursada['cuatrimestre']): DatosMateriaUsuario {
  return { materiaId, cursadas: [cur(ciclo, cuatrimestre, 'cursando')], finales: [] };
}

/** Una cursada en curso con algunas notas ya cargadas. */
function conNotas(base: DatosMateriaUsuario, evaluaciones: NonNullable<Cursada['evaluaciones']>): DatosMateriaUsuario {
  return { ...base, cursadas: base.cursadas.map(c => ({ ...c, evaluaciones })) };
}

const insuf = (fecha: Fecha, nota: number): IntentoFinal => ({ fecha, resultado: 'insuficiente', nota });

export function datosEjemplo(planId = 'utn-frvm-isi-2023', calendarioId = 'utn-frvm-2026-27'): DatosUsuario {
  return {
    perfil: { planId, calendarioId, anioIngreso: 2024 },
    materias: [
      // 1.er nivel: aprobado
      porFinal('analisis-matematico-1', 2024, '1C', '2025-02-18', 7, [insuf('2024-07-24', 4)]),
      directa('algebra-geometria-analitica', 2024, '1C', '2024-07-05', 8),
      porFinal('fisica-1', 2024, '2C', '2025-03-10', 6),
      directa('ingles-1', 2024, 'anual', '2024-12-02', 9),
      porFinal('logica-estructuras-discretas', 2024, '2C', '2024-12-12', 8),
      porFinal('algoritmos-estructuras-datos', 2024, 'anual', '2025-02-20', 7),
      directa('arquitectura-computadoras', 2024, '2C', '2024-11-29', 8),
      porFinal('sistemas-procesos-negocio', 2024, 'anual', '2025-02-25', 7),
      // 2.º nivel
      regular('analisis-matematico-2', 2025, '1C', [insuf('2025-07-23', 3), insuf('2025-12-11', 4)]),
      conNotas(cursando('fisica-2', 2026, '2C'), [
        { id: 'f2-p1', nombre: 'Parcial 1', tipo: 'parcial', nota: 8, fecha: '2026-09-22' },
        { id: 'f2-p2', nombre: 'Parcial 2', tipo: 'parcial', nota: 6, fecha: '2026-11-03' },
        { id: 'f2-tp1', nombre: 'TP de laboratorio', tipo: 'tp', nota: 9 },
        { id: 'f2-tp2', nombre: 'TP 2', tipo: 'tp', nota: null },
      ]),
      directa('ingenieria-sociedad', 2025, '1C', '2025-07-04', 9),
      directa('ingles-2', 2025, 'anual', '2025-12-01', 8),
      regular('sintaxis-semantica-lenguajes', 2025, '2C'),
      porFinal('paradigmas-programacion', 2025, '2C', '2026-02-19', 8),
      regular('sistemas-operativos', 2026, '1C', [insuf('2026-07-22', 5)]),
      regular('analisis-sistemas-informacion', 2025, 'anual'),
      // 3.er nivel (2026)
      cursando('probabilidad-estadistica', 2026, '2C'),
      directa('economia', 2026, '1C', '2026-07-03', 8, false),
      regular('bases-datos', 2026, '1C'),
      regular('desarrollo-software', 2026, '1C'),
      cursando('comunicacion-datos', 2026, '2C'),
      cursando('diseno-sistemas-informacion', 2026, 'anual'),
    ],
    electivasElegidas: [],
    requisitos: [],
  };
}
