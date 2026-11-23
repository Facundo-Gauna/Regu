import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearContexto } from '../src/motor/contexto.ts';
import { progresoPaquetes, progresoTitulos } from '../src/motor/progreso.ts';
import { estudianteRegular } from '../src/motor/regularidad.ts';
import { evaluar } from '../src/motor/index.ts';
import { aprobada, calendario, nivelesAprobados, plan, regular, usuario } from './ayuda.ts';

test('paquete de electivas sin horas exigidas: no especificado', () => {
  const c = crearContexto(plan, calendario, usuario([]), '2026-11-23');
  const p = progresoPaquetes(c).find(p => p.id === 'electivas-nivel-3')!;
  assert.equal(p.horasExigidas, null);
  assert.equal(p.horasExigidasOrigen, 'no-especificado');
  assert.equal(p.cumplido, null);
});

test('el usuario elige electivas e imputa horas; puede cargar las horas exigidas', () => {
  const c = crearContexto(
    plan,
    calendario,
    usuario([aprobada('testing-software', '2028-12-10'), regular('reingenieria-procesos-negocio', 2028, '2C')], {
      electivasElegidas: [
        { electivaId: 'testing-software', paqueteId: 'electivas-nivel-3', horas: 48 },
        { electivaId: 'reingenieria-procesos-negocio', paqueteId: 'electivas-nivel-3', horas: 48 },
      ],
      horasPaquetes: { 'electivas-nivel-3': 96 },
    }),
    '2028-12-20',
  );
  const p = progresoPaquetes(c).find(p => p.id === 'electivas-nivel-3')!;
  assert.equal(p.horasExigidasOrigen, 'usuario');
  assert.equal(p.horasAprobadas, 48);
  assert.equal(p.horasEnCurso, 48);
  assert.equal(p.cumplido, false);
});

test('electiva aprobada sin horas conocidas: cumplimiento incierto', () => {
  const c = crearContexto(
    plan,
    calendario,
    usuario([aprobada('testing-software', '2028-12-10')], {
      electivasElegidas: [{ electivaId: 'testing-software', paqueteId: 'electivas-nivel-3' }],
      horasPaquetes: { 'electivas-nivel-3': 96 },
    }),
    '2028-12-20',
  );
  const p = progresoPaquetes(c).find(p => p.id === 'electivas-nivel-3')!;
  assert.equal(p.cumplido, null);
  assert.deepEqual(p.electivasSinHoras, ['testing-software']);
});

test('título intermedio: todo hasta 4.º nivel, paquetes y habilitación', () => {
  const datos = nivelesAprobados([1, 2, 3, 4]);
  const c = crearContexto(plan, calendario, usuario(datos), '2026-01-10');
  const titulos = progresoTitulos(c, progresoPaquetes(c));
  const intermedio = titulos.find(t => t.tipo === 'intermedio')!;
  assert.equal(intermedio.materias.aprobadas, intermedio.materias.total);
  assert.equal(intermedio.completo, false);
  assert.deepEqual(intermedio.faltan.map(f => f.id).sort(), ['electivas-nivel-3', 'electivas-nivel-4', 'habilitacion-profesional']);
  assert.equal(intermedio.incierto, true);
  const final = titulos.find(t => t.tipo === 'final')!;
  assert.equal(final.materias.total, plan.materias.length);
});

test('estudiante regular: ciclo de ingreso y el siguiente no se computan', () => {
  const c = crearContexto(plan, calendario, usuario([], { perfil: { planId: plan.id, calendarioId: calendario.id, anioIngreso: 2026 } }), '2026-11-23');
  assert.equal(estudianteRegular(c).regular, true);
});

test('escenario 11: con 1 aprobada en el ciclo anterior → no regular; se recupera con 2 en el actual', () => {
  const perfil = { planId: plan.id, calendarioId: calendario.id, anioIngreso: 2024 };
  const unaEn2026 = [aprobada('analisis-matematico-1', '2026-07-22')];
  const enCiclo2027 = crearContexto(plan, calendario, usuario(unaEn2026, { perfil }), '2027-04-01');
  const r = estudianteRegular(enCiclo2027);
  assert.equal(r.aprobadasCicloAnterior, 1);
  assert.equal(r.regular, false);
  assert.equal(r.faltanEsteCiclo, 2);

  const dosEn2027 = [...unaEn2026, aprobada('fisica-1', '2027-05-10'), aprobada('algebra-geometria-analitica', '2027-07-21')];
  const recuperado = estudianteRegular(crearContexto(plan, calendario, usuario(dosEn2027, { perfil }), '2027-08-01'));
  assert.equal(recuperado.regular, true);
});

test('las equivalencias no cuentan para la regularidad', () => {
  const perfil = { planId: plan.id, calendarioId: calendario.id, anioIngreso: 2024 };
  const datos = [aprobada('analisis-matematico-1', '2026-07-22', 7, 'equivalencia'), aprobada('fisica-1', '2026-08-05', 7, 'equivalencia')];
  const r = estudianteRegular(crearContexto(plan, calendario, usuario(datos, { perfil }), '2027-04-01'));
  assert.equal(r.aprobadasCicloAnterior, 0);
});

test('correcciones del usuario sobre el plan', () => {
  const datos = usuario([], {
    correccionesPlan: [{ ref: 'comunicacion-datos', campo: 'correlativas.cursar.regularizadas', valor: ['fisica-1'], motivo: 'Confirmado en autogestión' }],
  });
  const c = crearContexto(plan, calendario, datos, '2026-11-23');
  const cd = c.cursables.get('comunicacion-datos')!;
  assert.deepEqual(cd.correlativas.cursar.regularizadas, ['fisica-1']);
  // El plan original no se modifica
  assert.deepEqual(plan.materias.find(m => m.id === 'comunicacion-datos')!.correlativas.cursar.regularizadas, []);
});

test('evaluar(): resumen completo de un estudiante de 1.er año (hoy)', () => {
  const datos = usuario([
    aprobada('algebra-geometria-analitica', '2026-07-03', 8, 'directa'),
    regular('analisis-matematico-1', 2026, '1C'),
    { materiaId: 'ingles-1', cursadas: [{ id: 'x', ciclo: 2026, cuatrimestre: 'anual', resultado: 'cursando' }], finales: [] },
  ]);
  const r = evaluar(plan, calendario, datos, '2026-11-23');
  assert.equal(r.ciclo, 2026);
  assert.equal(r.materias.length, plan.materias.length + plan.electivas.length);
  const am2 = r.materias.find(m => m.id === 'analisis-matematico-2')!;
  assert.equal(am2.cursar.puede, true);
  assert.equal(am2.inicia, '1C');
  assert.equal(r.materias.find(m => m.id === 'analisis-matematico-1')!.rendir.puede, true);
  assert.equal(r.calendario.proximoPeriodoExamen?.id, '2026-12-a');
  assert.equal(r.calendario.proximaInscripcionCursado, undefined); // el calendario no trae 2027
  assert.equal(r.estudianteRegular.regular, true);
});

test('rendimiento: evaluar el plan completo tarda menos de 50 ms', () => {
  const datos = usuario(nivelesAprobados([1, 2, 3]));
  evaluar(plan, calendario, datos, '2026-11-23'); // calentamiento
  const t0 = performance.now();
  evaluar(plan, calendario, datos, '2026-11-23');
  assert.ok(performance.now() - t0 < 50);
});
