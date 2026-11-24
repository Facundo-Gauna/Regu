import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBackup, leerBackup, leerBackupTexto, serializarBackup, usuarioVacio } from '../src/datos/backup.ts';
import { AlmacenMemoria } from '../src/datos/almacen.ts';
import { fechaLocal } from '../src/datos/hoy.ts';
import { datosEjemplo } from '../src/datos/ejemplo.ts';
import * as A from '../src/datos/acciones.ts';
import { evaluar } from '../src/motor/index.ts';
import { calendario, plan } from './ayuda.ts';

/** Datos ricos: cubre todas las secciones del backup. */
function datosCompletos() {
  let d = datosEjemplo();
  d = A.elegirElectiva(d, { electivaId: 'testing-software', paqueteId: 'electivas-nivel-3', horas: 48 });
  d = A.fijarHorasPaquete(d, 'electivas-nivel-3', 96);
  d = A.fijarRequisito(d, { requisitoId: 'habilitacion-profesional', estado: 'en-curso', horasCumplidas: 10 });
  d = A.fijarCorreccion(d, 'fisica-2', { estado: 'regular', motivo: 'La cátedra me dio la regularidad', fecha: '2026-11-20' });
  d = A.guardarCuatrimestre(d, { id: '2027-1c', ciclo: 2027, cuatrimestre: '1C', inicio: '2027-03-15', fin: '2027-07-02', inscripcion: { desde: '2027-03-01', hasta: '2027-03-26' } });
  d = A.guardarPeriodoExamen(d, { id: '2027-07-a', tipo: 'turno', desde: '2027-07-19', hasta: '2027-07-23', inscripcionDesde: '2027-07-12' });
  d = A.guardarCiclo(d, { id: 2027, inicio: '2027-03-15', fin: '2028-03-10' });
  d.correccionesPlan = [{ ref: 'comunicacion-datos', campo: 'regimen', valor: '1C', motivo: 'Confirmado' }];
  return d;
}

// ---------- Backup ----------

test('H8: exportar → importar deja todo igual (ida y vuelta)', () => {
  const original = datosCompletos();
  const texto = serializarBackup(crearBackup(original, new Date('2026-11-23T20:00:00Z')));
  const r = leerBackupTexto(texto, plan);
  assert.ok(r.ok, r.ok ? '' : r.errores.join('\n'));
  assert.deepEqual(r.datos, original);
  assert.deepEqual(r.avisos, []);
});

test('H8: exportar → borrar → importar en un almacén nuevo', async () => {
  const almacen = new AlmacenMemoria(datosCompletos());
  const texto = serializarBackup(crearBackup((await almacen.cargarUsuario())!));
  await almacen.borrarUsuario();
  assert.equal(await almacen.cargarUsuario(), null);
  const r = leerBackupTexto(texto, plan);
  assert.ok(r.ok);
  await almacen.guardarUsuario(r.datos);
  assert.deepEqual(await almacen.cargarUsuario(), datosCompletos());
});

test('importar: las listas que faltan se completan con [] y el motor no se rompe', () => {
  const r = leerBackup({ app: 'regu', schemaVersion: 1, exportado: 'x', datos: { perfil: { planId: plan.id, calendarioId: calendario.id, anioIngreso: 2026 } } });
  assert.ok(r.ok);
  assert.deepEqual(r.datos.materias, []);
  assert.deepEqual(r.datos.electivasElegidas, []);
  assert.deepEqual(r.datos.requisitos, []);
  evaluar(plan, calendario, r.datos, '2026-11-23'); // no lanza
});

test('importar: una materia sin cursadas ni finales también se normaliza', () => {
  const r = leerBackup({ app: 'regu', schemaVersion: 1, datos: { perfil: { planId: 'p', calendarioId: 'c', anioIngreso: 2026 }, materias: [{ materiaId: 'fisica-1' }] } });
  assert.ok(r.ok);
  assert.deepEqual(r.datos.materias, [{ materiaId: 'fisica-1', cursadas: [], finales: [] }]);
});

test('importar: rechaza versiones desconocidas y archivos ajenos', () => {
  const nueva = leerBackup({ app: 'regu', schemaVersion: 3, datos: {} });
  assert.ok(!nueva.ok);
  assert.match(nueva.errores[0]!, /más nueva/);
  assert.ok(!leerBackup({ app: 'regu', schemaVersion: 0, datos: {} }).ok);
  assert.ok(!leerBackup({ app: 'regu', datos: {} }).ok);
  assert.ok(!leerBackup({ app: 'otra-app', schemaVersion: 1, datos: {} }).ok);
  assert.ok(!leerBackup(null).ok);
  assert.ok(!leerBackupTexto('esto no es json').ok);
});

test('importar: datos inválidos se rechazan con la ruta del error', () => {
  const malo = {
    app: 'regu',
    schemaVersion: 1,
    datos: {
      perfil: { planId: 'p', calendarioId: 'c', anioIngreso: 2026 },
      materias: [
        { materiaId: 'fisica-1', cursadas: [{ ciclo: 2026, cuatrimestre: '3C', resultado: 'regular' }], finales: [{ fecha: '2026-02-30', resultado: 'aprobado', nota: 11 }] },
        { materiaId: 'fisica-1' },
      ],
    },
  };
  const r = leerBackup(malo);
  assert.ok(!r.ok);
  const todo = r.errores.join('\n');
  assert.match(todo, /cursadas\[0\]\.cuatrimestre/);
  assert.match(todo, /finales\[0\]\.fecha: fecha inválida/);
  assert.match(todo, /finales\[0\]\.nota/);
  assert.match(todo, /aparece más de una vez/);
});

test('importar: ids que no están en el plan se conservan y se avisan', () => {
  const d = usuarioVacio(plan.id, calendario.id, 2026);
  d.materias.push({ materiaId: 'materia-fantasma', cursadas: [], finales: [{ fecha: '2026-12-10', resultado: 'ausente' }] });
  d.electivasElegidas.push({ electivaId: 'electiva-fantasma', paqueteId: 'paquete-fantasma' });
  const r = leerBackup(crearBackup(d), plan);
  assert.ok(r.ok);
  assert.equal(r.datos.materias.length, 1);
  assert.equal(r.datos.electivasElegidas.length, 1);
  assert.equal(r.avisos.length, 3);
  assert.match(r.avisos.join('\n'), /materia-fantasma/);
});

test('importar: avisa si el backup es de otro plan', () => {
  const r = leerBackup(crearBackup(usuarioVacio('otro-plan', calendario.id, 2026)), plan);
  assert.ok(r.ok);
  assert.match(r.avisos[0]!, /otro-plan/);
});

// ---------- Almacén ----------

test('almacén en memoria: guarda copias independientes', async () => {
  const a = new AlmacenMemoria();
  assert.equal(await a.cargarUsuario(), null);
  const d = usuarioVacio(plan.id, calendario.id, 2026);
  await a.guardarUsuario(d);
  d.perfil.anioIngreso = 1999; // mutar el original no afecta lo guardado
  assert.equal((await a.cargarUsuario())!.perfil.anioIngreso, 2026);
  const leido = (await a.cargarUsuario())!;
  leido.perfil.anioIngreso = 1888; // ni mutar lo leído
  assert.equal((await a.cargarUsuario())!.perfil.anioIngreso, 2026);
  await a.guardarPrefs({ fechaSimulada: '2026-12-01', tema: 'oscuro' });
  assert.deepEqual(await a.cargarPrefs(), { fechaSimulada: '2026-12-01', tema: 'oscuro' });
});

// ---------- Fecha local ----------

test('hoy: se arma con la fecha local, no con la UTC (pasadas las 21:00 en Argentina)', () => {
  const antes = process.env['TZ'];
  process.env['TZ'] = 'America/Argentina/Cordoba';
  try {
    const d = new Date('2026-11-24T01:30:00Z'); // 22:30 del 23/11 en Córdoba
    assert.equal(d.toISOString().slice(0, 10), '2026-11-24'); // lo que daría el atajo incorrecto
    assert.equal(fechaLocal(d), '2026-11-23');
    assert.equal(fechaLocal(new Date(2026, 0, 5, 0, 5)), '2026-01-05');
    assert.equal(fechaLocal(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
  } finally {
    if (antes === undefined) delete process.env['TZ'];
    else process.env['TZ'] = antes;
  }
});

// ---------- Acciones ----------

test('acciones: no mutan el original y limpian materias vacías', () => {
  const base = usuarioVacio(plan.id, calendario.id, 2026);
  const con = A.agregarCursada(base, 'fisica-1', { ciclo: 2026, cuatrimestre: '2C', resultado: 'cursando' });
  assert.equal(base.materias.length, 0);
  assert.equal(con.materias[0]!.cursadas[0]!.id, '2026-2C');
  const sin = A.quitarCursada(con, 'fisica-1', '2026-2C');
  assert.equal(sin.materias.length, 0);
});

test('acciones: una cursada del mismo ciclo y cuatrimestre se reemplaza; el historial queda ordenado', () => {
  let d = usuarioVacio(plan.id, calendario.id, 2024);
  d = A.agregarCursada(d, 'fisica-1', { ciclo: 2025, cuatrimestre: '2C', resultado: 'cursando' });
  d = A.agregarCursada(d, 'fisica-1', { ciclo: 2024, cuatrimestre: '2C', resultado: 'libre', fechaResultado: '2024-11-29' });
  d = A.agregarCursada(d, 'fisica-1', { ciclo: 2025, cuatrimestre: '2C', resultado: 'regular', fechaResultado: '2025-11-28' });
  assert.deepEqual(d.materias[0]!.cursadas.map(c => [c.id, c.resultado]), [['2024-2C', 'libre'], ['2025-2C', 'regular']]);
});

test('acciones: finales, aprobación, corrección, electivas y calendario', () => {
  let d = usuarioVacio(plan.id, calendario.id, 2026);
  d = A.agregarFinal(d, 'fisica-1', { fecha: '2026-12-11', resultado: 'insuficiente', nota: 3 });
  d = A.agregarFinal(d, 'fisica-1', { fecha: '2026-07-22', resultado: 'ausente' });
  assert.deepEqual(d.materias[0]!.finales.map(f => f.fecha), ['2026-07-22', '2026-12-11']);
  d = A.quitarFinal(d, 'fisica-1', 0);
  assert.equal(d.materias[0]!.finales.length, 1);

  d = A.fijarAprobacion(d, 'fisica-1', { forma: 'final', nota: 6, fecha: '2027-02-17' });
  assert.equal(d.materias[0]!.aprobacion?.nota, 6);
  d = A.fijarAprobacion(d, 'fisica-1', null);
  assert.equal(d.materias[0]!.aprobacion, undefined);

  d = A.elegirElectiva(d, { electivaId: 'testing-software', paqueteId: 'electivas-nivel-3' });
  d = A.elegirElectiva(d, { electivaId: 'testing-software', paqueteId: 'electivas-nivel-4', horas: 30 });
  assert.deepEqual(d.electivasElegidas, [{ electivaId: 'testing-software', paqueteId: 'electivas-nivel-4', horas: 30 }]);
  d = A.fijarHorasPaquete(d, 'electivas-nivel-4', 100);
  assert.equal(d.horasPaquetes?.['electivas-nivel-4'], 100);
  d = A.fijarHorasPaquete(d, 'electivas-nivel-4', null);
  assert.equal(d.horasPaquetes, undefined);

  d = A.guardarCuatrimestre(d, { id: '2027-1c', ciclo: 2027, cuatrimestre: '1C', inicio: '2027-03-15', fin: '2027-07-02' });
  assert.equal(d.calendario?.cuatrimestres?.length, 1);
  d = A.quitarCuatrimestre(d, '2027-1c');
  assert.equal(d.calendario, undefined);
});

// ---------- Ejemplo ----------

test('el estudiante de ejemplo es coherente con el plan y da resultados sensatos', () => {
  const d = datosEjemplo();
  const ids = new Set([...plan.materias.map(m => m.id), ...plan.electivas.map(e => e.id)]);
  for (const m of d.materias) assert.ok(ids.has(m.materiaId), m.materiaId);
  const leido = leerBackup(crearBackup(d), plan);
  assert.ok(leido.ok && leido.avisos.length === 0);

  const r = evaluar(plan, calendario, d, '2026-11-23');
  const por = (id: string) => r.materias.find(m => m.id === id)!;
  assert.equal(por('analisis-matematico-1').estado.estado, 'aprobada');
  assert.equal(por('economia').estado.pendienteRegistrarMesa, true);
  assert.equal(por('analisis-matematico-2').estado.aplazos, 2);
  assert.equal(por('fisica-2').estado.estado, 'cursando');
  // Bases de Datos: regular, con las correlativas para rendir solo regulares → puede rendir por la excepción del ciclo siguiente
  assert.equal(por('bases-datos').rendir.puede, true);
  assert.match(por('bases-datos').rendir.excepcion ?? '', /7\.2\.2/);
  // Las materias del ejemplo no violan las correlativas de cursado: cada una pudo cursarse
  assert.equal(por('algoritmos-estructuras-datos').cursar.puede, false); // ya aprobada
  assert.equal(r.estudianteRegular.regular, true);
});

// ---------- Notas de la cursada en el backup ----------

test('las notas y los umbrales sobreviven al backup, al almacén y a una recarga (no se descartan al normalizar)', async () => {
  let d = datosEjemplo();
  d = A.guardarEvaluacion(d, 'fisica-2', '2026-2C', { id: 'p1', nombre: 'Parcial 1', tipo: 'parcial', nota: 8, fecha: '2026-09-20' });
  d = A.guardarEvaluacion(d, 'fisica-2', '2026-2C', { id: 'tp1', nombre: 'TP 1', tipo: 'tp', nota: null });
  d = A.guardarEvaluacion(d, 'fisica-2', '2026-2C', { id: 'rec', nombre: 'Recuperatorio', tipo: 'recuperatorio', nota: 7.5, reemplazaA: 'p1' });
  d = A.fijarUmbrales(d, 'fisica-2', '2026-2C', { promocion: 7, regular: 5 });
  const r = leerBackupTexto(serializarBackup(crearBackup(d)), plan);
  assert.ok(r.ok, r.ok ? '' : r.errores.join('\n'));
  assert.deepEqual(r.datos, d);

  const almacen = new AlmacenMemoria(d);
  assert.deepEqual(await almacen.cargarUsuario(), d);
});

test('importar: una evaluación con nota fuera de rango o tipo inválido se rechaza', () => {
  const mal = {
    app: 'regu', schemaVersion: 1,
    datos: { perfil: { planId: 'p', calendarioId: 'c', anioIngreso: 2026 }, materias: [{ materiaId: 'fisica-1', cursadas: [{ ciclo: 2026, cuatrimestre: '2C', resultado: 'cursando', evaluaciones: [
      { id: 'a', nombre: 'P1', tipo: 'parcial', nota: 11 },
      { id: 'b', nombre: 'P2', tipo: 'examen-raro', nota: 5 },
    ], umbrales: { promocion: 12, regular: 6 } }] }] },
  };
  const r = leerBackup(mal);
  assert.ok(!r.ok);
  const todo = r.errores.join('\n');
  assert.match(todo, /evaluaciones\[0\]\.nota/);
  assert.match(todo, /evaluaciones\[1\]\.tipo/);
  assert.match(todo, /umbrales\.promocion/);
});
