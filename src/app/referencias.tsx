// Las notas de referencia de una cursada, a la vista y con un botón para cambiarlas.

import type { Cursada } from '../motor/tipos.ts';
import { MINIMO_PARTE_GENERAL } from '../vista/estructura.ts';
import { formatearNota, type Seguimiento } from '../vista/seguimiento.ts';
import { Boton, Icono, SinConfirmar } from './componentes.tsx';

const ORIGEN: Record<Seguimiento['origenUmbrales'], { texto: string; explicacion?: string }> = {
  general: { texto: 'Regla general, sin confirmar', explicacion: 'Son las notas más comunes (8 y 6), no las de tu cátedra. Buscalas en la planificación y cambialas con «Ajustar».' },
  plantilla: { texto: 'De la plantilla, sin confirmar', explicacion: 'Salen de la plantilla que elegiste, transcripta de la planificación 2026. Confirmalas con tu cátedra.' },
  planificacion: { texto: 'De la planificación de tu cátedra' },
  usuario: { texto: 'Las fijaste vos' },
};

export function Referencias({ cursada, s, materiaId, onAjustar }: { cursada: Cursada; s: Seguimiento; materiaId: string; onAjustar: () => void }) {
  const origen = ORIGEN[s.origenUmbrales];
  const partes = cursada.estructura?.sinMinimo ? 0 : (cursada.estructura?.partes.length ?? 0);
  const minimo = cursada.estructura?.minimoParte;
  const casilla = (clave: 'promocion' | 'regular') => {
    const c = s.criterio?.[clave];
    if (!c) return { nota: s.umbrales[clave], como: '' };
    if (c.cadaInstanciaMin !== undefined && c.promedioMin !== undefined) return { nota: c.promedioMin, como: `de promedio y ${formatearNota(c.cadaInstanciaMin)} en cada nota` };
    return c.cadaInstanciaMin !== undefined ? { nota: c.cadaInstanciaMin, como: 'en cada nota' } : { nota: c.promedioMin!, como: 'de promedio' };
  };
  const promocion = casilla('promocion');
  const regular = casilla('regular');
  return (
    <div class="referencias">
      <div class="referencias__cab">
        <h3>Cómo se aprueba</h3>
        <Boton chico onClick={onAjustar}><Icono nombre="ajustes" tam={16} /> Ajustar</Boton>
      </div>
      <dl class="referencias__valores">
        <div class="t-aprobada"><dt>Promocionar{promocion.como && <small>{promocion.como}</small>}</dt><dd>{formatearNota(promocion.nota)}</dd></div>
        <div class="t-regular"><dt>Regularizar{regular.como && <small>{regular.como}</small>}</dt><dd>{formatearNota(regular.nota)}</dd></div>
        {partes > 1 && <div class="t-bloqueada"><dt>Cada parte</dt><dd>{formatearNota(minimo ?? MINIMO_PARTE_GENERAL)}</dd></div>}
      </dl>
      {origen.explicacion ? (
        <SinConfirmar titulo="Notas sin confirmar" etiqueta={origen.texto} materiaId={materiaId}>
          <p class="seccion__texto">{origen.explicacion}</p>
          {partes > 1 && minimo === undefined && <p class="seccion__texto">El {MINIMO_PARTE_GENERAL} para aprobar cada parte también es un valor por defecto.</p>}
        </SinConfirmar>
      ) : (
        <p class="referencias__origen">{origen.texto}{partes > 1 && minimo === undefined ? ` · cada parte: ${MINIMO_PARTE_GENERAL}, sin confirmar` : ''}</p>
      )}
      <p class="fila__detalle">No es el resultado oficial: lo confirman la cátedra y autogestión.</p>
    </div>
  );
}
