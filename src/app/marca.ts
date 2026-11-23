// Marca de Regu: la palabra "regu" dibujada con trazos geométricos gruesos (sin depender de ninguna tipografía),
// en el estilo de la UTN FRVM: ámbar #F5A800 sobre negro #1a1a1a. No usa el logo ni el asterisco de la UTN.
// Lo comparten el componente <Logo>, el favicon y los íconos de la PWA (herramientas/generar-iconos.mjs).

export const COLOR_AMBAR = '#F5A800';
export const COLOR_NEGRO = '#1a1a1a';

/** Grosor del trazo. */
export const GROSOR = 15;

/** Cada letra en su propio espacio de 60 de ancho; la base está en y=62 y la altura de x en y=22. */
export const LETRAS: { d: string; x: number }[] = [
  { x: 0, d: 'M10 62V22M10 40Q12 22 33 22' }, // r
  { x: 38, d: 'M10 42H50A20 20 0 1 0 44.1 56.1' }, // e
  { x: 106, d: 'M30 22A20 20 0 1 0 30 62A20 20 0 1 0 30 22M50 22V76C50 90 40 96 28 96C20 96 14 93 10 88' }, // g
  { x: 172, d: 'M10 22V42A20 20 0 0 0 50 42M50 22V62' }, // u
];

/** Caja que ocupa la palabra (con el grosor incluido). */
export const CAJA = { x: 2.5, y: 14.5, ancho: 227.5, alto: 89 };

export const VIEWBOX_PALABRA = `${CAJA.x - 2} ${CAJA.y - 2} ${CAJA.ancho + 4} ${CAJA.alto + 4}`;

/** SVG de la palabra, para incrustar como texto (íconos y favicon). */
export function trazosSvg(color: string): string {
  return LETRAS.map(l => `<path transform="translate(${l.x} 0)" d="${l.d}" fill="none" stroke="${color}" stroke-width="${GROSOR}"/>`).join('');
}

/**
 * Ícono cuadrado: fondo ámbar con la palabra en negro.
 * `margen` es la fracción del lado que se deja libre alrededor (más grande para los íconos "maskable").
 */
export function svgIcono(lado: number, margen: number, redondeo: number): string {
  const util = lado * (1 - margen * 2);
  const escala = util / CAJA.ancho;
  const alto = CAJA.alto * escala;
  const tx = (lado - util) / 2 - CAJA.x * escala;
  const ty = (lado - alto) / 2 - CAJA.y * escala;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}">
<rect width="${lado}" height="${lado}" rx="${lado * redondeo}" fill="${COLOR_AMBAR}"/>
<g transform="translate(${tx} ${ty}) scale(${escala})" stroke-linecap="butt" stroke-linejoin="round">${trazosSvg(COLOR_NEGRO)}</g>
</svg>`;
}
