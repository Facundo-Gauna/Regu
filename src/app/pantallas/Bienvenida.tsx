import { useState } from 'preact/hooks';
import { Aviso, Boton, Campo, Icono, Logo } from '../componentes.tsx';
import { referencia } from '../modelo.ts';
import { crearPerfil, entrarModoEjemplo } from '../store.ts';
import { ImportarBackup } from './Ajustes.tsx';

export function Bienvenida() {
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [error, setError] = useState('');
  if (!referencia.ok) return null;
  const { plan, calendario } = referencia;

  const empezar = (e: Event) => {
    e.preventDefault();
    const n = Number(anio);
    if (!Number.isInteger(n) || n < 1990 || n > 2200) return setError('Indicá un año válido (por ejemplo, 2026)');
    crearPerfil(plan.id, calendario.id, n);
    location.hash = '#/plan';
  };

  return (
    <main class="bienvenida">
      <div class="bienvenida__marca">
        <Logo alto={44} />
        <p class="bienvenida__lema">Tu cursada en la UTN FRVM, en un solo lugar.</p>
      </div>

      <ul class="bienvenida__puntos">
        <li><Icono nombre="candado-abierto" /> Qué podés cursar y qué podés rendir, según el plan y la Ordenanza 1549</li>
        <li><Icono nombre="calendario" /> Turnos de final, inscripciones y cierres con las 48 h hábiles</li>
        <li><Icono nombre="descargar" /> Todo queda en tu celular: sin cuentas y sin conexión</li>
      </ul>

      <form class="tarjeta formulario" onSubmit={empezar}>
        <div>
          <strong>{plan.carrera.nombre}</strong>
          <span class="fila__detalle"> · Plan {plan.anioPlan}</span>
        </div>
        <Campo etiqueta="¿En qué año ingresaste?" ayuda="El año de ingreso no cuenta para mantener la condición de estudiante regular">
          <input type="number" inputMode="numeric" value={anio} min={1990} max={2200} onInput={e => setAnio(e.currentTarget.value)} required />
        </Campo>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Boton type="submit" variante="primario">Empezar</Boton>
      </form>

      <div class="bienvenida__otras">
        <Boton variante="secundario" onClick={entrarModoEjemplo}>Probar con datos de ejemplo</Boton>
        <ImportarBackup reemplaza={false} />
      </div>

      <p class="bienvenida__legal">
        Proyecto independiente. <strong>No es una aplicación oficial de la UTN</strong> ni de la Facultad Regional Villa María.
      </p>
    </main>
  );
}
