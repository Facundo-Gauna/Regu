import { useState } from 'preact/hooks';
import { AYUDAS } from '../vista/ayuda.ts';
import type { Ruta } from '../vista/rutas.ts';
import { Hoja, Icono } from './componentes.tsx';

/** Botón «?» (o con texto) que abre los pasos de la pantalla. La hoja queda montada: al cerrar, el foco vuelve al botón. */
export function BotonAyuda({ ruta, texto, clase = 'ayuda-boton' }: { ruta: Ruta['nombre']; texto?: string; clase?: string }) {
  const [abierta, setAbierta] = useState(false);
  const ayuda = AYUDAS[ruta];
  if (!ayuda) return null;
  return (
    <>
      <button type="button" class={clase} aria-haspopup="dialog" aria-label={texto ? undefined : `Ayuda: ${ayuda.titulo}`} onClick={() => setAbierta(true)}>
        <Icono nombre="ayuda" tam={22} />
        {texto && <span>{texto}</span>}
      </button>
      <Hoja abierta={abierta} titulo={ayuda.titulo} onCerrar={() => setAbierta(false)}>
        <ol class="pasos-ayuda">
          {ayuda.pasos.map(p => (
            <li key={p.titulo}>
              <strong>{p.titulo}</strong>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
      </Hoja>
    </>
  );
}
