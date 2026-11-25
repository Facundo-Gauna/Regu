import { useEffect, useState } from 'preact/hooks';
import { fechaCorta } from '../vista/formato.ts';
import { enlaces, parseRuta, pestaña, type Ruta } from '../vista/rutas.ts';
import { Aviso, Boton, Icono, Logo, type NombreIconoUi } from './componentes.tsx';
import { referencia, useModelo } from './modelo.ts';
import { BotonAyuda } from './ayuda.tsx';
import { Ajustes } from './pantallas/Ajustes.tsx';
import { Bienvenida } from './pantallas/Bienvenida.tsx';
import { Calendario } from './pantallas/Calendario.tsx';
import { Cargar } from './pantallas/Cargar.tsx';
import { Finales } from './pantallas/Finales.tsx';
import { Inicio } from './pantallas/Inicio.tsx';
import { Materia } from './pantallas/Materia.tsx';
import { Materias } from './pantallas/Materias.tsx';
import { Mas } from './pantallas/Mas.tsx';
import { Plan } from './pantallas/Plan.tsx';
import { Progreso } from './pantallas/Progreso.tsx';
import { aplicarActualizacionApp, descartarActualizacion, guardarPrefs, salirModoEjemplo, useStore } from './store.ts';

function useRuta(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(() => parseRuta(location.hash));
  useEffect(() => {
    const alCambiar = () => setRuta(parseRuta(location.hash));
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);
  return ruta;
}

const PESTAÑAS: { clave: ReturnType<typeof pestaña>; href: string; icono: NombreIconoUi; etiqueta: string }[] = [
  { clave: 'inicio', href: enlaces.inicio(), icono: 'inicio', etiqueta: 'Inicio' },
  { clave: 'materias', href: enlaces.materias(), icono: 'materias', etiqueta: 'Materias' },
  { clave: 'plan', href: enlaces.plan(), icono: 'plan', etiqueta: 'Plan' },
  { clave: 'finales', href: enlaces.finales(), icono: 'finales', etiqueta: 'Finales' },
  { clave: 'mas', href: enlaces.mas(), icono: 'mas', etiqueta: 'Más' },
];

const TITULOS: Record<Ruta['nombre'], string> = {
  inicio: 'Inicio', materias: 'Materias', materia: 'Materia', plan: 'Plan', finales: 'Finales', calendario: 'Calendario', progreso: 'Progreso', ajustes: 'Ajustes', mas: 'Más', cargar: 'Cargar nota',
};

export function App() {
  const s = useStore();
  const ruta = useRuta();
  const m = useModelo();

  // Tema
  useEffect(() => {
    const t = s.prefs.tema ?? 'auto';
    if (t === 'auto') delete document.documentElement.dataset['tema'];
    else document.documentElement.dataset['tema'] = t;
    // La barra del sistema acompaña al encabezado del tema
    const cromo = getComputedStyle(document.documentElement).getPropertyValue('--cromo').trim();
    if (cromo) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cromo);
  }, [s.prefs.tema]);

  // Cada pantalla arranca arriba y actualiza el título de la pestaña
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = ruta.nombre === 'inicio' ? 'Regu' : `${TITULOS[ruta.nombre]} · Regu`;
  }, [ruta]);

  if (!referencia.ok) {
    return (
      <main class="pantalla-error">
        <Logo alto={32} />
        <Aviso tipo="error" titulo="Los datos del plan no son válidos">
          Regu no puede calcular con datos inconsistentes. Esto es un error de la app, no tuyo.
          <ul class="razones">{referencia.errores.slice(0, 10).map(e => <li key={e}>{e}</li>)}</ul>
        </Aviso>
      </main>
    );
  }
  if (s.cargando) {
    return (
      <main class="pantalla-carga" aria-busy="true">
        <Logo alto={40} />
      </main>
    );
  }
  if (s.errorCarga) {
    return (
      <main class="pantalla-error">
        <Logo alto={32} />
        <Aviso tipo="error" titulo="No se pudieron leer tus datos guardados">
          Los datos siguen en el dispositivo y no se tocaron. Pasá el error al desarrollador o restaurá un backup.
          <p class="fila__detalle">{s.errorCarga}</p>
        </Aviso>
      </main>
    );
  }
  if (!s.datos || !m) return <Bienvenida />;

  const activa = pestaña(ruta);

  return (
    <div class="app">
      <header class="cabecera">
        <a href={enlaces.inicio()} class="cabecera__logo" aria-label="Regu, ir al inicio"><Logo alto={24} /></a>
        <span class="cabecera__titulo">{TITULOS[ruta.nombre]}</span>
        {m.simulada && <span class="cabecera__modo cabecera__modo--fecha">Fecha simulada</span>}
        {s.modo === 'ejemplo' && <span class="cabecera__modo">Ejemplo</span>}
        <BotonAyuda key={ruta.nombre} ruta={ruta.nombre} />
      </header>

      <nav class="nav" aria-label="Secciones">
        <a class="nav__logo" href={enlaces.inicio()} aria-label="Regu"><Logo alto={26} /></a>
        {PESTAÑAS.map(p => (
          <a key={p.clave} href={p.href} class={`nav__item${activa === p.clave ? ' nav__item--activo' : ''}`} aria-current={activa === p.clave ? 'page' : undefined}>
            <Icono nombre={p.icono} tam={22} />
            <span>{p.etiqueta}</span>
          </a>
        ))}
        <BotonAyuda key={ruta.nombre} ruta={ruta.nombre} texto="Ayuda" clase="nav__item nav__ayuda" />
      </nav>

      <main class="contenido">
        {s.modo === 'ejemplo' && (
          <div class="franja-ejemplo" role="status">
            <span>Datos de ejemplo: nada se guarda</span>
            <button type="button" class="enlace-boton" onClick={() => void salirModoEjemplo()}>Salir</button>
          </div>
        )}
        {m.simulada && (
          <div class="franja-ejemplo franja-fecha" role="status">
            <span>Fecha simulada: {fechaCorta(m.hoy)}. Todo se calcula para ese día.</span>
            <button type="button" class="enlace-boton" onClick={() => guardarPrefs({ fechaSimulada: null })}>Volver a hoy</button>
          </div>
        )}
        {s.errorGuardado && <Aviso tipo="error" titulo="No se pudieron guardar los cambios">{s.errorGuardado}. Exportá un backup desde Ajustes.</Aviso>}
        {s.actualizacionDisponible && (
          <Aviso tipo="info" titulo="Hay una versión nueva de Regu" accion={<div class="botonera"><Boton chico variante="primario" onClick={aplicarActualizacionApp}>Actualizar</Boton><Boton chico variante="texto" onClick={descartarActualizacion}>Después</Boton></div>}>
            Tus datos no se tocan.
          </Aviso>
        )}
        {ruta.nombre === 'inicio' && <Inicio m={m} />}
        {ruta.nombre === 'materias' && <Materias m={m} filtro={ruta.filtro} />}
        {ruta.nombre === 'materia' && <Materia m={m} id={ruta.id} />}
        {ruta.nombre === 'plan' && <Plan m={m} inicial={ruta.seleccion} />}
        {ruta.nombre === 'finales' && <Finales m={m} />}
        {ruta.nombre === 'calendario' && <Calendario m={m} />}
        {ruta.nombre === 'progreso' && <Progreso m={m} />}
        {ruta.nombre === 'ajustes' && <Ajustes m={m} />}
        {ruta.nombre === 'mas' && <Mas />}
        {ruta.nombre === 'cargar' && <Cargar key={`${ruta.materiaId}-${ruta.parte}`} m={m} materiaId={ruta.materiaId} parte={ruta.parte} />}
      </main>
    </div>
  );
}
