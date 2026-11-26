import { useEffect, useState } from 'preact/hooks';
import { guiaInstalacion, type GuiaInstalacion } from '../vista/instalacion.ts';

type EventoInstalacion = Event & { prompt: () => Promise<void> };

// El evento se dispara una sola vez, a veces antes de que se monte cualquier pantalla: se guarda acá.
let evento: EventoInstalacion | null = null;
const oyentes = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    evento = e as EventoInstalacion;
    oyentes.forEach(f => f());
  });
  window.addEventListener('appinstalled', () => {
    evento = null;
    oyentes.forEach(f => f());
  });
}

export function estaInstalada(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Qué mostrar para instalar Regu, o `null` si ya está instalada o no hay forma de hacerlo. */
export function useInstalacion(): { guia: GuiaInstalacion; movil: boolean; instalar: () => void } | null {
  const [, refrescar] = useState(0);
  useEffect(() => {
    const f = () => refrescar(n => n + 1);
    oyentes.add(f);
    return () => { oyentes.delete(f); };
  }, []);
  if (estaInstalada()) return null;
  const guia = guiaInstalacion({ userAgent: navigator.userAgent, platform: navigator.platform, maxTouchPoints: navigator.maxTouchPoints, puedeInstalarConBoton: evento !== null });
  // En la compu solo hay algo para ofrecer si el navegador sabe instalar con un botón (Ajustes).
  if (!guia && !evento) return null;
  return { guia: guia ?? { tipo: 'boton' }, movil: guia !== null, instalar: () => { void evento?.prompt(); } };
}
