import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluar, ConsultaCalendario, aplicarCalendarioUsuario } from '../src/motor/index.ts';
import { datosEjemplo } from '../src/datos/ejemplo.ts';
import * as A from '../src/datos/acciones.ts';
import { presentarMateria } from '../src/vista/estados.ts';
import { agrupar, contarPorFiltro, cumpleFiltro, listarItems, nivelActual } from '../src/vista/materias.ts';
import { construirCursada, cursadasPorCerrar, finDeCursada } from '../src/vista/cierres.ts';
import { modeloInicio, proximoCuatrimestre } from '../src/vista/inicio.ts';
import { columnasPlan, relaciones, relacionadas } from '../src/vista/mapa.ts';
import { agruparPorMes, construirAgenda } from '../src/vista/agenda.ts';
import { calcularPromedios } from '../src/vista/promedios.ts';
import { calendario, plan, usuario } from './ayuda.ts';

const cal = new ConsultaCalendario(calendario);

// ---------- Estados y filtros ----------

test('presentación: cada estado tiene etiqueta e ícono (no solo color)', () => {
  const r = evaluar(plan, calendario, datosEjemplo(), '2026-11-23');
  const p = (id: string) => presentarMateria(r.materias.find(m => m.id === id)!);
  assert.deepEqual([p('analisis-matematico-1').clave, p('analisis-matematico-1').etiqueta], ['aprobada', 'Aprobada · 7']);
  assert.equal(p('economia').clave, 'aprobada-pendiente');
  assert.equal(p('bases-datos').clave, 'regular');
  assert.equal(p('fisica-2').clave, 'cursando');
  for (const m of r.materias) {
    const x = presentarMateria(m);
    assert.ok(x.etiqueta && x.icono, m.id);
  }
});

test('un ingresante: habilitadas = las 8 de 1.er nivel + Ingeniería y Sociedad (sin correlativas en el plan); las electivas sin confirmar no', () => {
  const r = evaluar(plan, calendario, usuario([]), '2026-02-20');
  const items = listarItems(r, plan);
  const habilitadas = items.filter(i => cumpleFiltro(i, 'habilitadas'));
  assert.equal(habilitadas.length, 9);
  assert.deepEqual(habilitadas.filter(i => i.nivel !== 1).map(i => i.id), ['ingenieria-sociedad']);
  // Las electivas tienen correlativas vacías ("puede cursar") pero con datos sin confirmar: se excluyen
  const electivasPuedenCursar = items.filter(i => i.clase === 'electiva' && i.resumen.cursar.puede);
  assert.ok(electivasPuedenCursar.length > 0);
  assert.ok(electivasPuedenCursar.every(i => !cumpleFiltro(i, 'habilitadas')));
  assert.ok(electivasPuedenCursar.every(i => i.sinConfirmar.length > 0));
});

test('filtros y conteos sobre el estudiante de ejemplo', () => {
  const r = evaluar(plan, calendario, datosEjemplo(), '2026-11-23');
  const items = listarItems(r, plan);
  const n = contarPorFiltro(items);
  assert.equal(n.aprobadas, items.filter(i => i.resumen.estado.estado === 'aprobada').length);
  assert.deepEqual(
    { cursando: n.cursando, regulares: n.regulares, rendir: n.rendir, aprobadas: n.aprobadas, habilitadas: n.habilitadas },
    { cursando: 4, regulares: 6, rendir: 6, aprobadas: 12, habilitadas: 2 },
  );
  assert.deepEqual(items.filter(i => cumpleFiltro(i, 'habilitadas')).map(i => i.id).sort(), ['analisis-numerico', 'legislacion']);
  // Las que se pueden rendir son regulares
  for (const i of items.filter(i => cumpleFiltro(i, 'rendir'))) assert.equal(i.resumen.estado.estado, 'regular');
});

test('agrupar: por nivel, electivas aparte al final, con búsqueda sin acentos', () => {
  const items = listarItems(evaluar(plan, calendario, datosEjemplo(), '2026-11-23'), plan);
  const grupos = agrupar(items, 'todas');
  assert.deepEqual(grupos.map(g => g.clave), ['nivel-1', 'nivel-2', 'nivel-3', 'nivel-4', 'nivel-5', 'electivas']);
  const hallados = agrupar(items, 'todas', 'ANÁLISIS');
  assert.deepEqual(hallados.flatMap(g => g.items.map(i => i.id)).sort(), ['analisis-matematico-1', 'analisis-matematico-2', 'analisis-numerico', 'analisis-sistemas-informacion']);
  assert.deepEqual(agrupar(items, 'aprobadas').find(g => g.clave === 'electivas'), undefined);
});

// ---------- Cierres de cursada ----------

test('fin de cursada: del calendario; las anuales terminan con el 2C; sin calendario es null', () => {
  assert.deepEqual(finDeCursada(cal, 2026, '1C'), { fecha: '2026-07-03', estimada: false });
  assert.deepEqual(finDeCursada(cal, 2026, '2C'), { fecha: '2026-11-27', estimada: false });
  assert.deepEqual(finDeCursada(cal, 2026, 'anual'), { fecha: '2026-11-27', estimada: false });
  assert.equal(finDeCursada(cal, 2027, '1C'), null);
});

test('construir cursada: toma la fecha de cierre del calendario o la pide', () => {
  assert.deepEqual(construirCursada(cal, { ciclo: 2026, cuatrimestre: '1C', resultado: 'regular' }), {
    cursada: { ciclo: 2026, cuatrimestre: '1C', resultado: 'regular', fechaResultado: '2026-07-03' },
  });
  // "cursando" no necesita fecha de cierre
  assert.deepEqual(construirCursada(cal, { ciclo: 2027, cuatrimestre: '1C', resultado: 'cursando' }), { cursada: { ciclo: 2027, cuatrimestre: '1C', resultado: 'cursando' } });
  // ciclo sin calendario: pide la fecha
  const sinFecha = construirCursada(cal, { ciclo: 2027, cuatrimestre: '1C', resultado: 'regular' });
  assert.ok('error' in sinFecha);
  assert.match(sinFecha.error, /indicá la fecha de cierre/);
  // …y con la fecha del usuario funciona
  assert.ok('cursada' in construirCursada(cal, { ciclo: 2027, cuatrimestre: '1C', resultado: 'regular', fechaResultado: '2027-07-02' }));
  assert.ok('error' in construirCursada(cal, { ciclo: 12, cuatrimestre: '1C', resultado: 'regular' }));
});

test('sin fecha de cierre los aplazos viejos se contarían mal: la cursada creada siempre tiene fechaResultado', () => {
  let d = usuario([]);
  const r = construirCursada(cal, { ciclo: 2026, cuatrimestre: '1C', resultado: 'regular' });
  assert.ok('cursada' in r);
  d = A.agregarCursada(d, 'analisis-matematico-1', r.cursada);
  d = A.agregarFinal(d, 'analisis-matematico-1', { fecha: '2026-07-22', resultado: 'insuficiente', nota: 4 });
  const e = evaluar(plan, calendario, d, '2026-08-01').materias.find(m => m.id === 'analisis-matematico-1')!.estado;
  assert.equal(e.estado, 'regular');
  assert.equal(e.aplazos, 1);
});

test('cursadas por cerrar: aparecen cuando termina el cuatrimestre', () => {
  const d = datosEjemplo();
  assert.deepEqual(cursadasPorCerrar(d, cal, '2026-11-26'), []);
  const hoy = cursadasPorCerrar(d, cal, '2026-11-27');
  assert.deepEqual(hoy.map(c => c.materiaId).sort(), ['comunicacion-datos', 'diseno-sistemas-informacion', 'fisica-2', 'probabilidad-estadistica']);
  // Al cerrar una, deja de aparecer
  const resuelto = A.agregarCursada(d, 'fisica-2', { ciclo: 2026, cuatrimestre: '2C', resultado: 'regular', fechaResultado: '2026-11-27' });
  assert.equal(cursadasPorCerrar(resuelto, cal, '2026-11-28').some(c => c.materiaId === 'fisica-2'), false);
});

// ---------- Inicio ----------

test('próximo cuatrimestre: el siguiente del calendario, o una estimación si el calendario no llega', () => {
  const durante2C = proximoCuatrimestre(cal, '2026-11-23')!;
  assert.deepEqual([durante2C.ciclo, durante2C.cuatrimestre, durante2C.estimado], [2027, '1C', true]);
  assert.equal(durante2C.inicio, '2027-03-16'); // 1C 2026 (16/3) + 1 año
  assert.deepEqual(durante2C.ventana, { desde: '2027-03-02', hasta: '2027-03-30', estimada: true });

  const durante1C = proximoCuatrimestre(cal, '2026-05-01')!;
  assert.deepEqual([durante1C.ciclo, durante1C.cuatrimestre, durante1C.estimado], [2026, '2C', false]);
  assert.equal(durante1C.inicio, '2026-08-10');

  // Con el cursado 2027 cargado por el usuario, deja de ser estimado
  const fusion = new ConsultaCalendario(aplicarCalendarioUsuario(calendario, {
    cuatrimestres: [{ id: '2027-1c', ciclo: 2027, cuatrimestre: '1C', inicio: '2027-03-15', fin: '2027-07-02', inscripcion: { desde: '2027-03-01', hasta: '2027-03-26' } }],
  }));
  const cargado = proximoCuatrimestre(fusion, '2026-11-23')!;
  assert.equal(cargado.estimado, false);
  assert.deepEqual(cargado.ventana, { desde: '2027-03-01', hasta: '2027-03-26', estimada: false });
});

test('inicio: qué conviene hacer ahora (ejemplo, 23/11/2026)', () => {
  const datos = datosEjemplo();
  const resumen = evaluar(plan, calendario, datos, '2026-11-23');
  const m = modeloInicio(resumen, datos, plan, cal, '2026-11-23');
  assert.equal(m.vacio, false);
  assert.equal(m.ciclo, 2026);
  assert.equal(m.proximoPeriodo?.id, '2026-12-a');
  assert.deepEqual(m.inscripcionesFinal, []);
  assert.deepEqual(m.pendientesMesa.map(i => i.id), ['economia']);
  assert.ok(m.rendir.some(i => i.id === 'bases-datos'));
  // Las que se pueden cursar en el 1C 2027 son obligatorias, habilitadas y que arrancan en 1C (o anuales)
  assert.ok(m.paraCursar.length > 0);
  assert.ok(m.paraCursar.every(i => i.clase === 'materia' && i.resumen.inicia === '1C' && i.resumen.cursar.puede));
  assert.ok(m.paraCursar.some(i => i.id === 'analisis-numerico'));
  assert.ok(m.regular.regular);
  // La excepción de correlativas vence en marzo de 2028: todavía no entra en el aviso de 120 días
  assert.equal(m.riesgos.length, 0);
});

test('inicio: avisos de riesgo (3 aplazos y excepción por vencer)', () => {
  let d = datosEjemplo();
  for (const fecha of ['2026-07-22', '2026-08-05']) d = A.agregarFinal(d, 'sistemas-operativos', { fecha, resultado: 'insuficiente', nota: 3 });
  const r = evaluar(plan, calendario, d, '2027-12-01');
  const m = modeloInicio(r, d, plan, cal, '2027-12-01');
  const so = m.riesgos.find(x => x.id === 'sistemas-operativos');
  assert.equal(so?.gravedad, 'urgente');
  assert.match(so!.texto, /3 de 4 aplazos/);
  // 1/12/2027: faltan ~102 días para el 12/3/2028
  assert.ok(m.riesgos.some(x => /Sin correlativas para rendir solo hasta/.test(x.texto)));
});

test('inicio: usuario sin datos', () => {
  const d = usuario([]);
  const m = modeloInicio(evaluar(plan, calendario, d, '2026-11-23'), d, plan, cal, '2026-11-23');
  assert.equal(m.vacio, true);
  assert.equal(m.cantidades.aprobadas, 0);
  assert.equal(m.rendir.length, 0);
});

// ---------- Mapa ----------

test('mapa: una columna por nivel con todas las obligatorias', () => {
  const cols = columnasPlan(evaluar(plan, calendario, usuario([]), '2026-11-23'), plan);
  assert.deepEqual(cols.map(c => c.nivel), [1, 2, 3, 4, 5]);
  assert.equal(cols.reduce((s, c) => s + c.items.length, 0), plan.materias.length);
});

test('mapa: relaciones directas e inversas', () => {
  const r = relaciones(plan, 'paradigmas-programacion');
  assert.deepEqual(r.requiere.regularizadas.sort(), ['algoritmos-estructuras-datos', 'logica-estructuras-discretas']);
  assert.ok(r.desbloqueaCursar.includes('desarrollo-software'));
  assert.ok(r.desbloqueaCursar.includes('diseno-sistemas-informacion'));
  assert.ok(r.desbloqueaRendir.includes('desarrollo-software'));

  assert.equal(relaciones(plan, 'proyecto-final').requiereParaRendir, 'todas');
  // Física I: es correlativa de Física II y de Comunicaciones de Datos
  const f1 = relaciones(plan, 'fisica-1').desbloqueaCursar;
  assert.ok(f1.includes('fisica-2') && f1.includes('comunicacion-datos'));

  const rel = relacionadas(plan, 'analisis-matematico-2');
  assert.equal(rel.get('analisis-matematico-1'), 'requisito');
  assert.equal(rel.get('analisis-numerico'), 'desbloquea');
  assert.equal(rel.has('analisis-matematico-2'), false);
});

// ---------- Agenda ----------

test('agenda: incluye cursado, turnos, inscripciones y estimaciones, ordenados', () => {
  const items = construirAgenda(cal, '2026-11-01', '2027-03-31');
  const tipos = new Set(items.map(i => i.tipo));
  for (const t of ['cursado', 'turno', 'inscripcion-final', 'evento']) assert.ok(tipos.has(t as never), t);
  assert.deepEqual(items.map(i => i.desde), [...items.map(i => i.desde)].sort());
  const inscFinal = items.find(i => i.clave === 'insc-final-2026-12-a')!;
  assert.equal(inscFinal.desde, '2026-12-09');
  assert.equal(inscFinal.hasta, '2026-12-16'); // cierra 48 h hábiles antes del último examen (18/12)
  // Sin ventana, lo que ya empezó se agrupa en su mes de inicio…
  assert.equal(agruparPorMes(items)[0]!.titulo, 'agosto 2026');
  // …con ventana, lo que está en curso aparece en el primer mes visible, con sus fechas reales
  const meses = agruparPorMes(items, '2026-11-01');
  assert.equal(meses[0]!.titulo, 'noviembre 2026');
  assert.ok(meses[0]!.items.some(i => i.clave === 'cursado-2026-2c' && i.desde === '2026-08-10'));
  assert.ok(meses.length >= 5);
});

test('agenda: la inscripción a cursado se marca como estimada hasta que el usuario la confirma', () => {
  const sin = construirAgenda(cal, '2026-07-01', '2026-08-31').find(i => i.clave === 'insc-cursado-2026-2c')!;
  assert.equal(sin.estimado, true);
  const confirmada = new ConsultaCalendario(aplicarCalendarioUsuario(calendario, {
    cuatrimestres: [{ id: '2026-2c', ciclo: 2026, cuatrimestre: '2C', inicio: '2026-08-10', fin: '2026-11-27', inscripcion: { desde: '2026-07-20', hasta: '2026-08-21' } }],
  }));
  const con = construirAgenda(confirmada, '2026-07-01', '2026-08-31').find(i => i.clave === 'insc-cursado-2026-2c')!;
  assert.equal(con.estimado, false);
  assert.equal(con.desde, '2026-07-20');
});

// ---------- Promedios ----------

test('promedios: con y sin aplazos', () => {
  const d = datosEjemplo();
  const p = calcularPromedios(evaluar(plan, calendario, d, '2026-11-23'), d);
  assert.ok(p.sinAplazos! > 6 && p.sinAplazos! < 10);
  assert.ok(p.conAplazos! < p.sinAplazos!);
  assert.equal(p.aplazos, 4); // AM1 (4), AM2 (3, 4), SO (5)
  assert.equal(p.aprobadasSinNota, 0);
  assert.equal(calcularPromedios(evaluar(plan, calendario, usuario([]), '2026-11-23'), usuario([])).sinAplazos, null);
});

// ---------- Conectores del mapa ----------

test('conectores: de izquierda a derecha, de derecha a izquierda y dentro de la misma columna', async () => {
  const { trazar } = await import('../src/vista/conectores.ts');
  const a = { izq: 0, der: 150, arriba: 0, abajo: 80 }; // centro y = 40
  const b = { izq: 180, der: 330, arriba: 100, abajo: 180 }; // centro y = 140
  // Hacia la derecha: sale por el costado derecho de a (150) y entra por el izquierdo de b (180)
  assert.equal(trazar(a, b), 'M150 40C174 40 156 140 180 140');
  // Hacia la izquierda: sale por el costado izquierdo de b (180) y entra por el derecho de a (150)
  assert.match(trazar(b, a), /^M180 140C/);
  assert.match(trazar(b, a), / 150 40$/);
  // Misma columna: sale y entra por el costado derecho
  const c = { izq: 0, der: 150, arriba: 100, abajo: 180 };
  assert.match(trazar(a, c), /^M150 40C176 40 176 140 150 140$/);
  // Sin números inválidos
  assert.doesNotMatch(trazar(a, b), /NaN|undefined/);
});

test('conectores: los caminos que llegan a una tarjeta se reparten en su costado, en el orden de origen', async () => {
  const { repartirAnclas, trazar } = await import('../src/vista/conectores.ts');
  const caja = { izq: 200, der: 350, arriba: 100, abajo: 220 }; // alto 120
  // tres caminos que vienen de alturas 300, 50 y 180 → quedan en el costado en orden: 50 arriba, 180 al medio, 300 abajo
  const anclas = repartirAnclas(caja, [300, 50, 180]);
  assert.deepEqual(anclas, [190, 130, 160]);
  assert.deepEqual(repartirAnclas(caja, [10]), [160]); // uno solo: al medio
  assert.deepEqual(repartirAnclas(caja, []), []);
  // el ancla se usa como altura de llegada
  const origen = { izq: 0, der: 150, arriba: 0, abajo: 80 };
  assert.match(trazar(origen, caja, { y2: 130 }), / 200 130$/);
});

// ---------- Veredicto ----------

test('veredicto: cada situación da una respuesta corta y sin contradicciones', async () => {
  const { veredictoCursar, veredictoRendir } = await import('../src/vista/veredicto.ts');
  const r = evaluar(plan, calendario, datosEjemplo(), '2026-11-23');
  const de = (id: string) => r.materias.find(m => m.id === id)!;

  // Bases de Datos: regular, puede rendir gracias a la excepción del ciclo siguiente
  const bd = veredictoRendir(de('bases-datos'));
  assert.equal(bd.puede, true);
  assert.equal(bd.titulo, 'Sí, podés rendirla');
  assert.match(bd.detalle ?? '', /vale hasta el 12\/03\/2028 \(fecha estimada\)/);
  assert.equal(veredictoCursar(de('bases-datos')).titulo, 'Ya la cursaste');

  // Aprobada con aprobación directa sin registrar
  const eco = veredictoRendir(de('economia'));
  assert.equal(eco.titulo, 'Ya está aprobada');
  assert.match(eco.detalle ?? '', /mesa/);
  assert.equal(veredictoCursar(de('analisis-matematico-1')).titulo, 'Ya la aprobaste');

  // Bloqueada: no puede cursar ni rendir
  const ics = de('ingenieria-calidad-software');
  assert.deepEqual([veredictoCursar(ics).puede, veredictoCursar(ics).icono], [false, 'candado']);
  assert.equal(veredictoRendir(ics).detalle, 'Primero tenés que regularizarla.');

  // Habilitada
  assert.equal(veredictoCursar(de('analisis-numerico')).titulo, 'Sí, podés cursarla');
  // Cursando
  assert.equal(veredictoCursar(de('fisica-2')).titulo, 'La estás cursando');
  assert.equal(veredictoRendir(de('fisica-2')).puede, false);

  // Nunca un "Sí" para rendir sin que el motor lo diga
  for (const m of r.materias) assert.equal(veredictoRendir(m).puede === true, m.rendir.puede && m.estado.estado === 'regular', m.id);
});

test('copy: lo que falta se dice como acción, en singular o plural, sin repetir la lista larga', async () => {
  const { detalleCorto } = await import('../src/vista/estados.ts');
  const r = evaluar(plan, calendario, datosEjemplo(), '2026-11-23');
  const de = (id: string) => r.materias.find(m => m.id === id)!;
  // Ing. y Calidad de Software: le falta regularizar Diseño y aprobar Sintaxis, pero el detalle corto no copia la lista
  assert.equal(detalleCorto(de('ingenieria-calidad-software')), 'Te faltan 2 correlativas');
  // Redes de Datos: solo le falta regularizar Comunicaciones de Datos
  assert.equal(detalleCorto(de('redes-datos')), 'Te falta regularizar Comunicaciones de Datos');
  // El motor ya no usa "(aprobada)": se leía como estado
  const txt = de('ingenieria-calidad-software').cursar.razones.join(' ');
  assert.match(txt, /falta regularizar/);
  assert.match(txt, /falta aprobar/);
  assert.doesNotMatch(txt, /\((aprobada|regular)\)/);
});

// ---------- Camino y resultado de la cursada ----------

test('camino: un paso actual y una sola acción por estado', async () => {
  const { caminoMateria } = await import('../src/vista/camino.ts');
  const r = evaluar(plan, calendario, datosEjemplo(), '2026-11-23');
  const c = (id: string) => caminoMateria(r.materias.find(m => m.id === id)!);
  const estados = (id: string) => c(id).pasos.map(p => p.estado);

  assert.deepEqual(estados('fisica-2'), ['actual', 'pendiente', 'pendiente']); // cursando
  assert.equal(c('fisica-2').accion, 'resultado');
  assert.deepEqual(estados('bases-datos'), ['hecho', 'actual', 'pendiente']); // regular: falta el final
  assert.equal(c('bases-datos').accion, 'final');
  assert.deepEqual(estados('analisis-matematico-1'), ['hecho', 'hecho', 'hecho']); // aprobada por final
  assert.deepEqual(estados('economia'), ['hecho', 'omitido', 'hecho']); // promoción: no hubo final
  assert.equal(c('economia').pasos[1].nota, 'no hizo falta');
  assert.equal(c('analisis-numerico').accion, 'empezar'); // habilitada
  assert.equal(c('ingenieria-calidad-software').accion, 'ninguna'); // bloqueada
  // Nunca más de un paso "actual"
  for (const m of r.materias) assert.ok(caminoMateria(m).pasos.filter(p => p.estado === 'actual').length <= 1, m.id);
});

test('resultado de la cursada: hoy con tope en el fin del cuatrimestre, y se nota enseguida', async () => {
  const { fechaDeCierre, periodoSugerido } = await import('../src/vista/cierres.ts');
  const { declararResultado } = await import('../src/datos/acciones.ts');
  // A mitad de cuatrimestre: hoy. Terminado: el fin. Sin calendario: hoy.
  assert.equal(fechaDeCierre(cal, 2026, '2C', '2026-10-15'), '2026-10-15');
  assert.equal(fechaDeCierre(cal, 2026, '2C', '2026-12-01'), '2026-11-27');
  assert.equal(fechaDeCierre(cal, 2027, '1C', '2027-05-10'), '2027-05-10');
  // Período sugerido para empezar
  assert.deepEqual(periodoSugerido(cal, '1C', '2026-11-23', 2026), { ciclo: 2027, cuatrimestre: '1C' }); // el 1C 2026 ya terminó
  assert.deepEqual(periodoSugerido(cal, '2C', '2026-08-20', 2026), { ciclo: 2026, cuatrimestre: '2C' });
  assert.deepEqual(periodoSugerido(cal, 'anual', '2026-04-01', 2026), { ciclo: 2026, cuatrimestre: 'anual' });

  // La trampa: declarar "regular" el 15/10 (a mitad del 2C) tiene que verse HOY, no el 27/11
  const hoy = '2026-10-15';
  const antes = datosEjemplo();
  const dec = declararResultado(antes, 'fisica-2', { resultado: 'regular', fecha: fechaDeCierre(cal, 2026, '2C', hoy) });
  const estado = (d: typeof antes, id: string) => evaluar(plan, calendario, d, hoy).materias.find(m => m.id === id)!.estado;
  assert.equal(estado(antes, 'fisica-2').estado, 'cursando');
  assert.equal(estado(dec, 'fisica-2').estado, 'regular');
  // Con la fecha de fin del cuatrimestre (como antes) NO se notaba:
  const viejo = declararResultado(antes, 'fisica-2', { resultado: 'regular', fecha: '2026-11-27' });
  assert.equal(estado(viejo, 'fisica-2').estado, 'cursando');

  // Promoción con nota: aprobada y con la nota, enseguida
  const promo = declararResultado(antes, 'fisica-2', { resultado: 'aprobada-directa', nota: 8, fecha: hoy });
  const e = estado(promo, 'fisica-2');
  assert.deepEqual([e.estado, e.forma, e.nota], ['aprobada', 'directa', 8]);
  // Libre: a recursar
  assert.equal(estado(declararResultado(antes, 'fisica-2', { resultado: 'libre', fecha: hoy }), 'fisica-2').estado, 'recursar');
  // Los aplazos se cuentan desde el día del resultado
  let con = declararResultado(antes, 'fisica-2', { resultado: 'regular', fecha: hoy });
  con = A.agregarFinal(con, 'fisica-2', { fecha: '2026-12-11', resultado: 'insuficiente', nota: 3 });
  assert.equal(evaluar(plan, calendario, con, '2026-12-12').materias.find(m => m.id === 'fisica-2')!.estado.aplazos, 1);
  // Sin cursada en curso no hay nada que declarar
  assert.equal(declararResultado(antes, 'bases-datos', { resultado: 'libre', fecha: hoy }), antes);
});

// ---------- Notas de la cursada ----------

const ev = (id: string, nombre: string, nota: number | null, extra: Partial<import('../src/motor/tipos.ts').Evaluacion> = {}) =>
  ({ id, nombre, tipo: 'parcial' as const, nota, ...extra });

test('seguimiento: promedio, mínima y recuperatorio que reemplaza, sin prometer un resultado', async () => {
  const { seguimientoCursada, UMBRALES_GENERALES, formatearNota, resumenCorto } = await import('../src/vista/seguimiento.ts');
  const c = { evaluaciones: [ev('p1', 'Parcial 1', 8), ev('p2', 'Parcial 2', 6), ev('tp1', 'TP 1', 7, { tipo: 'tp' as const }), ev('tp2', 'TP 2', null, { tipo: 'tp' as const })] };
  const s = seguimientoCursada(c);
  assert.equal(s.conNota, 3);
  assert.equal(s.promedio, 7); // (8+6+7)/3
  assert.deepEqual(s.minima, { nota: 6, nombre: 'Parcial 2' });
  assert.deepEqual(s.pendientes.map(e => e.nombre), ['TP 2']);
  assert.equal(s.umbralesPropios, false); // regla general: se muestra como "sin confirmar"
  assert.deepEqual(s.umbrales, UMBRALES_GENERALES);
  assert.deepEqual([s.enPromocion, s.enRegular, s.debajo.length], [1, 3, 0]);
  assert.deepEqual(s.filas.map(f => f.nivel), ['promocion', 'regular', 'regular', 'pendiente']);
  // No existe ningún campo que afirme el resultado final
  assert.ok(!('promociona' in s) && !('estado' in s));

  // El recuperatorio reemplaza a la evaluación elegida; la original deja de contar
  const con = seguimientoCursada({ evaluaciones: [...c.evaluaciones, ev('rec', 'Recuperatorio P2', 9, { tipo: 'recuperatorio', reemplazaA: 'p2' })] });
  assert.equal(con.promedio, 8); // (8+7+9)/3
  assert.equal(con.minima!.nota, 7);
  assert.equal(con.filas.find(f => f.evaluacion.id === 'p2')!.vigente, false);
  assert.equal(con.filas.find(f => f.evaluacion.id === 'p2')!.reemplazadaPor!.id, 'rec');
  // Un recuperatorio sin nota todavía no reemplaza nada
  const pendiente = seguimientoCursada({ evaluaciones: [...c.evaluaciones, ev('rec', 'Recuperatorio P2', null, { tipo: 'recuperatorio', reemplazaA: 'p2' })] });
  assert.equal(pendiente.promedio, 7);
  // Un recuperatorio que apunta a una evaluación que ya no existe cuenta como una común
  const huerfano = seguimientoCursada({ evaluaciones: [ev('rec', 'Rec', 5, { tipo: 'recuperatorio', reemplazaA: 'borrada' })] });
  assert.equal(huerfano.promedio, 5);

  // Umbrales propios; redondeo al entero más próximo; sin notas
  const propios = seguimientoCursada({ ...c, umbrales: { promocion: 7, regular: 4 } });
  assert.deepEqual([propios.umbralesPropios, propios.enPromocion], [true, 2]);
  assert.equal(seguimientoCursada({ evaluaciones: [ev('a', 'A', 7), ev('b', 'B', 8)] }).promedioRedondeado, 8); // 7,5 → 8
  const vacio = seguimientoCursada({});
  assert.deepEqual([vacio.promedio, vacio.minima, vacio.conNota], [null, null, 0]);
  assert.equal(formatearNota(7.666), '7,67');
  assert.equal(formatearNota(8), '8');
  assert.equal(resumenCorto(c), 'Promedio 7 (3 notas)');
  assert.equal(resumenCorto({}), null);
});

test('notas: las acciones las conservan al volver a guardar la cursada y al declarar el resultado', async () => {
  const { declararResultado } = await import('../src/datos/acciones.ts');
  let d = datosEjemplo();
  const cursadaId = '2026-2C';
  d = A.guardarEvaluacion(d, 'probabilidad-estadistica', cursadaId, ev('p1', 'Parcial 1', 8));
  d = A.guardarEvaluacion(d, 'probabilidad-estadistica', cursadaId, ev('p2', 'Parcial 2', 5));
  d = A.guardarEvaluacion(d, 'probabilidad-estadistica', cursadaId, ev('rec', 'Recuperatorio', 7, { tipo: 'recuperatorio', reemplazaA: 'p2' }));
  d = A.fijarUmbrales(d, 'probabilidad-estadistica', cursadaId, { promocion: 8, regular: 6 });
  const cursada = () => d.materias.find(m => m.materiaId === 'probabilidad-estadistica')!.cursadas.find(c => c.id === cursadaId)!;
  assert.equal(cursada().evaluaciones!.length, 3);
  // Editar: mismo id, nueva nota
  d = A.guardarEvaluacion(d, 'probabilidad-estadistica', cursadaId, ev('p2', 'Parcial 2', 6));
  assert.equal(cursada().evaluaciones!.length, 3);
  assert.equal(cursada().evaluaciones!.find(e => e.id === 'p2')!.nota, 6);

  // Declarar el resultado reemplaza la cursada: las notas y los umbrales tienen que sobrevivir
  const regular = declararResultado(d, 'probabilidad-estadistica', { resultado: 'regular', fecha: '2026-10-15' });
  const despues = regular.materias.find(m => m.materiaId === 'probabilidad-estadistica')!.cursadas.find(c => c.id === cursadaId)!;
  assert.equal(despues.resultado, 'regular');
  assert.equal(despues.evaluaciones!.length, 3);
  assert.deepEqual(despues.umbrales, { promocion: 8, regular: 6 });

  // Borrar la evaluación original: el recuperatorio queda como una común (sin reemplazaA)
  d = A.quitarEvaluacion(d, 'probabilidad-estadistica', cursadaId, 'p2');
  assert.equal(cursada().evaluaciones!.find(e => e.id === 'rec')!.reemplazaA, undefined);
  d = A.quitarEvaluacion(d, 'probabilidad-estadistica', cursadaId, 'p1');
  d = A.quitarEvaluacion(d, 'probabilidad-estadistica', cursadaId, 'rec');
  assert.equal(cursada().evaluaciones, undefined);
  d = A.fijarUmbrales(d, 'probabilidad-estadistica', cursadaId, null);
  assert.equal(cursada().umbrales, undefined);
  // Una cursada inexistente no rompe nada
  assert.equal(A.guardarEvaluacion(d, 'probabilidad-estadistica', 'no-existe', ev('x', 'X', 7)), d);
});

test('lista de materias: una cursada en curso con notas muestra el promedio', async () => {
  const { detalleCorto } = await import('../src/vista/estados.ts');
  const r = evaluar(plan, calendario, datosEjemplo(), '2026-11-23');
  const de = (id: string) => r.materias.find(m => m.id === id)!;
  assert.equal(detalleCorto(de('fisica-2')), 'Ciclo 2026 · Promedio 7,67 (3 notas)'); // 8, 6 y 9; el TP 2 no tiene nota
  assert.equal(detalleCorto(de('probabilidad-estadistica')), 'Ciclo 2026'); // sin notas: igual que antes
});

// ---------- Próxima acción de Inicio y año actual en Materias ----------

const inicioDe = (datos: ReturnType<typeof datosEjemplo>, hoy: string) => modeloInicio(evaluar(plan, calendario, datos, hoy), datos, plan, cal, hoy);

test('próxima acción: avisa que la inscripción a finales abre pronto', () => {
  const p = inicioDe(datosEjemplo(), '2026-11-24').proxima;
  assert.equal(p?.tipo, 'finales-pronto');
  assert.match(p!.titulo, /15 días/);
});

test('próxima acción: con la inscripción a finales abierta, es inscribirse', () => {
  const d = datosEjemplo();
  for (const m of d.materias) m.cursadas = m.cursadas.filter(c => c.resultado !== 'cursando'); // sin cursadas por cerrar
  assert.equal(inicioDe(d, '2026-12-09').proxima?.tipo, 'finales-abierta');
});

test('próxima acción: a mitad de cuatrimestre es cargar las notas', () => {
  assert.equal(inicioDe(datosEjemplo(), '2026-10-15').proxima?.tipo, 'cargar-notas');
});

test('próxima acción: no compite con «¿Cómo te fue?» ni aparece sin datos', () => {
  const cerrando = inicioDe(datosEjemplo(), '2026-12-01');
  assert.ok(cerrando.porCerrar.length > 0);
  assert.equal(cerrando.proxima, null);
  assert.equal(inicioDe(usuario([]), '2026-10-15').proxima, null);
});

test('año actual: el que tiene más materias cursando; sin ninguna, el primero con algo pendiente', () => {
  const items = (datos: ReturnType<typeof datosEjemplo>) => listarItems(evaluar(plan, calendario, datos, '2026-10-15'), plan);
  assert.equal(nivelActual(items(datosEjemplo())), 3);
  assert.equal(nivelActual(items(usuario([]))), 1);
});
