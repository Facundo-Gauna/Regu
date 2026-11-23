import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearContexto } from '../src/motor/contexto.ts';
import { puedeCursar, puedeRendir } from '../src/motor/disponibilidad.ts';
import { aprobada, calendario, nivelesAprobados, plan, regular, usuario } from './ayuda.ts';
import type { DatosMateriaUsuario } from '../src/motor/tipos.ts';

const ctx = (materias: DatosMateriaUsuario[], fecha: string, extra = {}) => crearContexto(plan, calendario, usuario(materias, extra), fecha);

// ---------- Cursar ----------

test('primer año: todo 1.er nivel habilitado, 2.º nivel bloqueado', () => {
  const c = ctx([], '2026-02-20');
  for (const m of plan.materias.filter(m => m.nivel === 1)) assert.equal(puedeCursar(c, m.id).puede, true, m.id);
  const am2 = puedeCursar(c, 'analisis-matematico-2');
  assert.equal(am2.puede, false);
  assert.deepEqual(am2.faltan.map(f => [f.id, f.requerido]), [
    ['analisis-matematico-1', 'regular'],
    ['algebra-geometria-analitica', 'regular'],
  ]);
});

test('correlativa "cursada" se cumple con regular; "aprobada" no', () => {
  const datos = [regular('analisis-matematico-1', 2026, '1C'), regular('algebra-geometria-analitica', 2026, '1C')];
  const c = ctx(datos, '2026-08-01');
  assert.equal(puedeCursar(c, 'analisis-matematico-2').puede, true);
  // Economía pide AM I y AGA aprobadas para cursar
  const eco = puedeCursar(c, 'economia');
  assert.equal(eco.puede, false);
  assert.deepEqual(eco.faltan.map(f => f.requerido), ['aprobada', 'aprobada']);
});

test('estar cursando una correlativa no alcanza', () => {
  const datos = [{ materiaId: 'analisis-matematico-1', cursadas: [{ id: 'x', ciclo: 2026, cuatrimestre: '1C' as const, resultado: 'cursando' as const }], finales: [] }];
  const r = puedeCursar(ctx(datos, '2026-05-01'), 'analisis-matematico-2');
  assert.equal(r.puede, false);
  assert.equal(r.faltan[0]?.estadoActual, 'cursando');
});

test('materia regular: no se puede volver a cursar sin autorización', () => {
  const r = puedeCursar(ctx([regular('fisica-1', 2026, '2C')], '2026-12-01'), 'fisica-1');
  assert.equal(r.puede, false);
  assert.match(r.razones[0]!, /5\.3\.2/);
});

test('excepción de últimas materias (5.3.1): habilita cursar sin correlativas', () => {
  // Todo aprobado o regular salvo 3 materias de 5.º nivel → cantidad <= materias del último nivel (6)
  const pendientes = new Set(['inteligencia-artificial', 'ciencia-datos', 'proyecto-final']);
  const datos = plan.materias.filter(m => !pendientes.has(m.id) && m.id !== 'simulacion').map(m => aprobada(m.id, '2029-12-10'));
  // Simulación (correlativa de IA y Ciencia de Datos) sin cursar
  const r = puedeCursar(ctx(datos, '2030-02-20'), 'inteligencia-artificial');
  assert.equal(r.puede, true);
  assert.match(r.excepcion ?? '', /5\.3\.1/);
  assert.ok(r.advertencias.some(a => /rendir/.test(a)));
});

// ---------- Rendir ----------

test('no se puede rendir sin regularizar', () => {
  const r = puedeRendir(ctx([], '2026-12-10'), 'analisis-matematico-1');
  assert.equal(r.puede, false);
});

test('escenario 6: dentro del ciclo siguiente al cursado no se exigen correlativas para rendir', () => {
  // Bases de Datos regular en 1C 2026; Sintaxis y ASI (correlativas para rendir) solo regulares
  const datos = [
    regular('bases-datos', 2026, '1C'),
    regular('sintaxis-semantica-lenguajes', 2025, '2C'),
    regular('analisis-sistemas-informacion', 2025, 'anual'),
  ];
  const r = puedeRendir(ctx(datos, '2026-12-10'), 'bases-datos');
  assert.equal(r.puede, true);
  assert.equal(r.faltan.length, 2);
  assert.match(r.excepcion ?? '', /7\.2\.2/);
  assert.equal(r.sinCorrelativasHasta, '2028-03-12');
  assert.equal(r.sinCorrelativasHastaEstimado, true); // el ciclo 2027 no está en el calendario
});

test('escenario 7: vencida la excepción, se exigen las correlativas', () => {
  const datos = [
    regular('bases-datos', 2026, '1C'),
    regular('sintaxis-semantica-lenguajes', 2025, '2C'),
    aprobada('analisis-sistemas-informacion', '2026-12-15'),
  ];
  const r = puedeRendir(ctx(datos, '2028-07-15'), 'bases-datos');
  assert.equal(r.puede, false);
  assert.deepEqual(r.faltan.map(f => f.id), ['sintaxis-semantica-lenguajes']);
  assert.match(r.razones.join(' '), /venció/);
});

test('con correlativas aprobadas se puede rendir en cualquier momento', () => {
  const datos = [
    regular('bases-datos', 2026, '1C'),
    aprobada('sintaxis-semantica-lenguajes', '2026-02-10'),
    aprobada('analisis-sistemas-informacion', '2026-02-24'),
  ];
  const r = puedeRendir(ctx(datos, '2031-07-20'), 'bases-datos');
  assert.equal(r.puede, true);
  assert.equal(r.excepcion, undefined);
});

test('práctica promocionada: final solo teórico', () => {
  const fis2 = { materiaId: 'fisica-2', cursadas: [{ id: 'x', ciclo: 2027, cuatrimestre: '2C' as const, resultado: 'promocion-practica' as const, fechaResultado: '2027-11-26' }], finales: [] };
  const r = puedeRendir(ctx([fis2], '2027-12-10'), 'fisica-2');
  assert.equal(r.puede, true);
  assert.equal(r.soloTeorico, true);
});

test('Proyecto Final: "TODAS" exige el resto del plan, paquetes y requisitos (salvo la PPS)', () => {
  const datos = [
    ...plan.materias.filter(m => m.id !== 'proyecto-final').map(m => aprobada(m.id, '2030-12-10')),
    regular('proyecto-final', 2030, 'anual'),
  ];
  // Pasado el ciclo siguiente al cursado, para que no aplique la excepción 7.2.2
  const sinPaquetes = puedeRendir(ctx(datos, '2033-07-20'), 'proyecto-final');
  assert.equal(sinPaquetes.puede, false);
  const tipos = sinPaquetes.faltan.map(f => f.id);
  assert.ok(tipos.includes('electivas-nivel-3'));
  assert.ok(tipos.includes('habilitacion-profesional'));
  assert.ok(!tipos.includes('practica-profesional-supervisada'));

  // Con paquetes cumplidos (horas cargadas por el usuario) y la habilitación cumplida
  const elecciones = [
    { electivaId: 'testing-software', paqueteId: 'electivas-nivel-3', horas: 96 },
    { electivaId: 'sistemas-soporte-decisiones', paqueteId: 'electivas-nivel-4', horas: 96 },
    { electivaId: 'seguridad-informatica', paqueteId: 'electivas-nivel-5', horas: 96 },
  ];
  const completo = ctx(
    [...datos, ...elecciones.map(e => aprobada(e.electivaId, '2030-12-11'))],
    '2033-07-20',
    {
      electivasElegidas: elecciones,
      horasPaquetes: { 'electivas-nivel-3': 96, 'electivas-nivel-4': 96, 'electivas-nivel-5': 96 },
      requisitos: [{ requisitoId: 'habilitacion-profesional', estado: 'cumplido' }],
    },
  );
  assert.equal(puedeRendir(completo, 'proyecto-final').puede, true);
});

test('las advertencias de datos a verificar se propagan', () => {
  const r = puedeCursar(ctx([], '2026-02-20'), 'comunicacion-datos');
  assert.ok(r.advertencias.some(a => /verificar/i.test(a)));
});

test('estado de 2.º año armado con niveles aprobados', () => {
  const c = ctx(nivelesAprobados([1, 2]), '2026-02-20');
  assert.equal(puedeCursar(c, 'bases-datos').puede, true);
  assert.equal(puedeCursar(c, 'economia').puede, true);
  assert.equal(puedeCursar(c, 'legislacion').puede, true);
  assert.equal(puedeCursar(c, 'redes-datos').puede, false); // falta Comunicaciones de Datos regular
});
