import { enlaces } from '../../vista/rutas.ts';
import { Icono, type NombreIconoUi } from '../componentes.tsx';

const OPCIONES: { href: string; icono: NombreIconoUi; titulo: string; detalle: string }[] = [
  { href: enlaces.calendario(), icono: 'calendario', titulo: 'Calendario', detalle: 'Cursado, turnos de final e inscripciones' },
  { href: enlaces.progreso(), icono: 'progreso', titulo: 'Progreso', detalle: 'Promedios, títulos, electivas y requisitos' },
  { href: enlaces.ajustes(), icono: 'ajustes', titulo: 'Ajustes', detalle: 'Backup, tema, fecha y datos de referencia' },
];

export function Mas() {
  return (
    <div class="pagina">
      <h1 class="pagina__titulo">Más</h1>
      <ul class="lista">
        {OPCIONES.map(o => (
          <li key={o.href}>
            <a class="fila fila--menu" href={o.href}>
              <Icono nombre={o.icono} tam={24} />
              <span class="fila__principal">
                <span class="fila__nombre">{o.titulo}</span>
                <span class="fila__detalle">{o.detalle}</span>
              </span>
              <Icono nombre="der" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
