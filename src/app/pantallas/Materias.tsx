import { useState } from 'preact/hooks';
import { FILTROS, agrupar, contarPorFiltro, type Filtro } from '../../vista/materias.ts';
import { enlaces } from '../../vista/rutas.ts';
import { FilaMateria, Vacio } from '../componentes.tsx';
import type { Modelo } from '../modelo.ts';

export function Materias({ m, filtro }: { m: Modelo; filtro: Filtro }) {
  const [busqueda, setBusqueda] = useState('');
  const conteo = contarPorFiltro(m.items);
  const grupos = agrupar(m.items, filtro, busqueda);

  return (
    <div class="pagina">
      <h1 class="pagina__titulo">Materias</h1>
      <input class="busqueda" type="search" placeholder="Buscar materia" aria-label="Buscar materia" value={busqueda} onInput={e => setBusqueda(e.currentTarget.value)} />
      <div class="chips" role="tablist" aria-label="Filtrar materias">
        {FILTROS.map(f => (
          <a key={f.clave} role="tab" aria-selected={f.clave === filtro} class={`chip${f.clave === filtro ? ' chip--activo' : ''}`} href={enlaces.materias(f.clave)}>
            {f.etiqueta} <span class="chip__n">{conteo[f.clave]}</span>
          </a>
        ))}
      </div>

      {grupos.length === 0 && (
        <Vacio icono="materias" titulo="No hay materias para mostrar">
          {busqueda ? 'Probá con otra búsqueda.' : filtro === 'todas' ? 'El plan no tiene materias.' : 'Ninguna materia cumple este filtro todavía.'}
        </Vacio>
      )}

      {grupos.map(g => (
        <section key={g.clave} class="seccion">
          <div class="seccion__cab">
            <h2 class="seccion__titulo">{g.titulo}</h2>
            <span class="seccion__n">{g.items.length}</span>
          </div>
          {g.clave === 'electivas' && (
            <p class="seccion__texto">Correlativas y horas sin confirmar: no figuran como habilitadas.</p>
          )}
          <ul class="lista">
            {g.items.map(i => (
              <li key={i.id}>
                <FilaMateria item={i} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
