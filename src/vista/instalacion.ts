// Guía para instalar Regu como app. Cada navegador móvil lo hace distinto,
// así que el texto depende del navegador. Función pura: no toca window.

export interface EntornoInstalacion {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  /** Chrome y compañía avisan con `beforeinstallprompt` que pueden instalar con un botón. */
  puedeInstalarConBoton: boolean;
}

export type GuiaInstalacion =
  | { tipo: 'boton' }
  | { tipo: 'pasos'; pasos: string };

export function esMovil(e: EntornoInstalacion): boolean {
  return /android|iphone|ipad|ipod/i.test(e.userAgent) || (e.platform === 'MacIntel' && e.maxTouchPoints > 1);
}

/** `null` si no es un celular o tablet: en la compu no se recomienda nada. */
export function guiaInstalacion(e: EntornoInstalacion): GuiaInstalacion | null {
  if (!esMovil(e)) return null;
  const ua = e.userAgent;
  if (/android/i.test(ua)) {
    if (e.puedeInstalarConBoton) return { tipo: 'boton' };
    if (/firefox/i.test(ua)) return { tipo: 'pasos', pasos: 'Tocá el menú ⋮ y elegí «Instalar».' };
    if (/samsungbrowser/i.test(ua)) return { tipo: 'pasos', pasos: 'Tocá el menú ☰ y elegí «Agregar a pantalla de inicio».' };
    return { tipo: 'pasos', pasos: 'Tocá el menú ⋮ y elegí «Instalar app» o «Agregar a la pantalla de inicio».' };
  }
  if (/crios|fxios|edgios|opios/i.test(ua)) {
    return { tipo: 'pasos', pasos: 'Tocá Compartir (o el menú ⋯) y elegí «Agregar a inicio». Si no aparece, abrí Regu en Safari.' };
  }
  return { tipo: 'pasos', pasos: 'Tocá Compartir (el cuadrado con la flecha hacia arriba) y elegí «Agregar a inicio».' };
}
