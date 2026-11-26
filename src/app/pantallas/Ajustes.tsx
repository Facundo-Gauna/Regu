import { useState } from 'preact/hooks';
import type { DatosUsuario } from '../../motor/index.ts';
import * as A from '../../datos/acciones.ts';
import { crearBackup, leerBackupTexto, serializarBackup } from '../../datos/backup.ts';
import { fechaLocal } from '../../datos/hoy.ts';
import { fechaCorta } from '../../vista/formato.ts';
import { TEMAS } from '../../vista/temas.ts';
import { Aviso, Boton, Campo, Icono, Seccion } from '../componentes.tsx';
import { useInstalacion } from '../instalacion.ts';
import { referencia, type Modelo } from '../modelo.ts';
import { actualizar, borrarTodo, guardarPrefs, pedirProteccion, reemplazarDatos, salirModoEjemplo, useStore } from '../store.ts';

function descargar(nombre: string, texto: string): void {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Importación de un backup: valida, muestra el resultado y pide confirmación antes de reemplazar los datos. */
export function ImportarBackup({ onListo, reemplaza = true }: { onListo?: () => void; reemplaza?: boolean }) {
  const [resultado, setResultado] = useState<{ nombre: string; r: ReturnType<typeof leerBackupTexto> } | null>(null);
  const plan = referencia.ok ? referencia.plan : undefined;

  const elegir = async (e: Event) => {
    // currentTarget vale null después de un await: se guarda antes.
    const entrada = e.currentTarget as HTMLInputElement;
    const archivo = entrada.files?.[0];
    if (!archivo) return;
    setResultado({ nombre: archivo.name, r: leerBackupTexto(await archivo.text(), plan) });
    entrada.value = ''; // permite volver a elegir el mismo archivo
  };

  return (
    <div class="importar">
      <label class="boton boton--secundario">
        <Icono nombre="subir" /> Elegir archivo de backup
        <input type="file" accept="application/json,.json" class="oculto" onChange={elegir} />
      </label>
      {resultado && !resultado.r.ok && (
        <Aviso tipo="error" titulo={`No se pudo importar «${resultado.nombre}»`}>
          <ul class="razones">{resultado.r.errores.slice(0, 8).map(t => <li key={t}>{t}</li>)}</ul>
          {resultado.r.errores.length > 8 && `y ${resultado.r.errores.length - 8} errores más`}
        </Aviso>
      )}
      {resultado?.r.ok && (
        <Aviso tipo={resultado.r.avisos.length ? 'alerta' : 'ok'} titulo={`«${resultado.nombre}» es válido`}>
          {resultado.r.datos.materias.length} materias con datos, {resultado.r.datos.electivasElegidas.length} electivas elegidas.
          {resultado.r.avisos.length > 0 && <ul class="razones">{resultado.r.avisos.slice(0, 6).map(t => <li key={t}>{t}</li>)}</ul>}
          <div class="botonera">
            <Boton
              variante="primario"
              chico
              onClick={() => {
                if (resultado.r.ok) reemplazarDatos(resultado.r.datos);
                setResultado(null);
                onListo?.();
              }}
            >
              {reemplaza ? 'Reemplazar mis datos' : 'Importar'}
            </Boton>
            <Boton chico variante="texto" onClick={() => setResultado(null)}>Cancelar</Boton>
          </div>
        </Aviso>
      )}
    </div>
  );
}

export function Ajustes({ m }: { m: Modelo }) {
  const s = useStore();
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const instalacion = useInstalacion();
  const [exportado, setExportado] = useState('');
  const ejemplo = s.modo === 'ejemplo';


  const exportar = () => {
    const ahora = new Date();
    const nombre = `regu-backup-${m.hoy}.json`;
    descargar(nombre, serializarBackup(crearBackup(m.datos, ahora)));
    guardarPrefs({ ultimoBackup: ahora.toISOString() });
    setExportado(nombre);
  };

  const compartir = async () => {
    const ahora = new Date();
    const archivo = new File([serializarBackup(crearBackup(m.datos, ahora))], `regu-backup-${m.hoy}.json`, { type: 'application/json' });
    try {
      await navigator.share({ files: [archivo], title: 'Backup de Regu' });
      guardarPrefs({ ultimoBackup: ahora.toISOString() });
    } catch {
      /* el usuario canceló */
    }
  };
  const puedeCompartir = typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([''], 'x.json', { type: 'application/json' })] });

  const avisosReferencia = referencia.ok ? referencia.avisos : [];

  return (
    <div class="pagina">
      <h1 class="pagina__titulo">Ajustes</h1>

      <Seccion titulo="Tu carrera">
        <div class="tarjeta">
          <strong>{m.plan.carrera.nombre}</strong>
          <span class="fila__detalle">Plan {m.plan.anioPlan} · {m.plan.institucion.facultad}</span>
        </div>
        <Campo etiqueta="Año de ingreso" ayuda="El ciclo de ingreso no cuenta para la condición de estudiante regular">
          <input type="number" inputMode="numeric" value={m.datos.perfil.anioIngreso} min={1990} max={2200} onChange={e => { const n = Number(e.currentTarget.value); if (Number.isInteger(n) && n >= 1990 && n <= 2200) actualizar(d => A.fijarAnioIngreso(d, n)); }} />
        </Campo>
      </Seccion>

      <Seccion titulo="Apariencia">
        <fieldset class="temas">
          <legend class="campo__etiqueta">Tema</legend>
          {TEMAS.map(x => {
            const activo = (s.prefs.tema ?? 'auto') === x.clave;
            return (
              <label key={x.clave} class={`segmentado__opcion${activo ? ' segmentado__opcion--activa' : ''}`}>
                <input type="radio" name="tema" value={x.clave} checked={activo} onChange={() => guardarPrefs({ tema: x.clave })} />
                <span class="temas__muestra" aria-hidden="true">{x.muestra.map((c, i) => <span key={i} style={{ background: c }} />)}</span>
                <span>{x.nombre}</span>
              </label>
            );
          })}
        </fieldset>
      </Seccion>

      <Seccion titulo="Fecha de hoy">
        <p class="seccion__texto">Simulá otro día para ver, por ejemplo, qué vas a poder rendir en diciembre.</p>
        <Campo etiqueta="Simular fecha" ayuda={s.prefs.fechaSimulada ? `Hoy real: ${fechaCorta(s.hoyReal)}` : 'Usando la fecha real'}>
          <input type="date" value={s.prefs.fechaSimulada ?? ''} onInput={e => guardarPrefs({ fechaSimulada: e.currentTarget.value || null })} />
        </Campo>
        {s.prefs.fechaSimulada && <Boton chico onClick={() => guardarPrefs({ fechaSimulada: null })}>Volver a la fecha real</Boton>}
      </Seccion>

      {!ejemplo && (
        <Seccion titulo="Tus datos">
          {!s.persistente && (
            <Aviso tipo="alerta" titulo="Este navegador no guarda datos">
              Todo se pierde al cerrar la app. Exportá un backup seguido, o abrí Regu en una ventana normal.
            </Aviso>
          )}
          <p class="seccion__texto">
            Todo queda en este dispositivo; solo sale lo que vos mandás desde «Contanos». {s.prefs.ultimoBackup ? `Último backup: ${fechaCorta(fechaLocal(new Date(s.prefs.ultimoBackup)))}.` : 'Todavía no hiciste un backup.'}
          </p>
          <div class="botonera">
            <Boton variante="primario" onClick={exportar}><Icono nombre="descargar" /> Exportar backup</Boton>
            {puedeCompartir && <Boton onClick={() => void compartir()}>Compartir backup</Boton>}
          </div>
          {exportado && <Aviso tipo="ok">Se descargó {exportado}. Guardalo en un lugar seguro (Drive, mail, otra carpeta).</Aviso>}
          <ImportarBackup />
          <Campo etiqueta="Recordarme el backup cada (días)">
            <input type="number" inputMode="numeric" min={1} max={365} value={s.prefs.recordatorioBackupDias ?? 14} onChange={e => { const n = Number(e.currentTarget.value); if (Number.isInteger(n) && n >= 1) guardarPrefs({ recordatorioBackupDias: n }); }} />
          </Campo>
          {s.persistente && (
            <p class="fila__detalle">
              Almacenamiento protegido: {s.almacenamientoProtegido === null ? 'sin consultar' : s.almacenamientoProtegido ? 'sí (el navegador no lo borra si falta espacio)' : 'no (el navegador podría borrarlo si falta espacio)'}{' '}
              {s.almacenamientoProtegido !== true && <button type="button" class="enlace-boton" onClick={() => void pedirProteccion()}>Pedir protección</button>}
            </p>
          )}
          <div class="zona-peligro">
            {!confirmarBorrado ? (
              <Boton variante="peligro" chico onClick={() => setConfirmarBorrado(true)}><Icono nombre="borrar" tam={16} /> Borrar todos mis datos</Boton>
            ) : (
              <Aviso tipo="error" titulo="¿Borrar todo?" accion={<div class="botonera"><Boton chico variante="peligro" onClick={() => { void borrarTodo(); setConfirmarBorrado(false); }}>Sí, borrar</Boton><Boton chico onClick={() => setConfirmarBorrado(false)}>Cancelar</Boton></div>}>
                Se borran tus cursadas, finales y elecciones de este dispositivo. Esto no se puede deshacer salvo que tengas un backup.
              </Aviso>
            )}
          </div>
        </Seccion>
      )}

      {instalacion && (
        <Seccion titulo="Instalar Regu">
          {instalacion.guia.tipo === 'boton'
            ? <Boton variante="primario" onClick={instalacion.instalar}><Icono nombre="instalar" /> Instalar en este dispositivo</Boton>
            : <p class="seccion__texto">{instalacion.guia.pasos} Se abre como una app, sin conexión.</p>}
        </Seccion>
      )}

      <Seccion titulo="Datos de referencia">
        <div class="tarjeta">
          <span class="fila__detalle">Plan: versión {m.plan.versionDatos} · Calendario: versión {m.calendario.versionDatos}</span>
          <span class="fila__detalle">Transcriptos a mano de documentos de la facultad. Si ves un error, avisá o corregilo en la materia.</span>
          {avisosReferencia.length > 0 && (
            <details>
              <summary>Ver las {avisosReferencia.length} notas de la transcripción</summary>
              <ul class="razones razones--chico">{avisosReferencia.map(a => <li key={a}>{a}</li>)}</ul>
            </details>
          )}
        </div>
      </Seccion>

      <Seccion titulo="Acerca de Regu">
        <p class="seccion__texto">
          Regu es un proyecto independiente, hecho por un estudiante. <strong>No es una aplicación oficial de la UTN</strong> ni está afiliada a la Facultad Regional Villa María. Los cálculos siguen la Ordenanza 1549 y las planificaciones de cátedra, pero la fuente de verdad siempre es autogestión.
        </p>
      </Seccion>
    </div>
  );
}

export type { DatosUsuario };
