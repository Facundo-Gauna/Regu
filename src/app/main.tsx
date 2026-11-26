import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App.tsx';
import { iniciar, registrarActualizacion } from './store.ts';
import './estilos.css';
import './instalacion.ts';

// ?ejemplo=1 abre la app con un estudiante de ejemplo, solo en memoria (no toca lo guardado).
const ejemplo = new URLSearchParams(location.search).get('ejemplo') === '1';

render(<App />, document.getElementById('app')!);
void iniciar({ ejemplo });

// Service worker: la actualización la decide el usuario, para no cambiar el plan en medio de una sesión.
if (!ejemplo) {
  const actualizarSw = registerSW({
    onNeedRefresh() {
      registrarActualizacion(() => void actualizarSw(true));
    },
  });
}
