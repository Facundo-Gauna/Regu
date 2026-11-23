// Geometría de los conectores del mapa del plan: un camino curvo entre dos tarjetas.
// Las tarjetas se dibujan por encima de las líneas, así que los caminos solo "emergen" en los espacios entre ellas.

export interface Caja {
  izq: number;
  der: number;
  arriba: number;
  abajo: number;
}

const MARGEN = 2;
/** Cuánto sobresale la curva cuando las dos tarjetas están en la misma columna. */
const LAZO = 26;

const medioY = (c: Caja) => (c.arriba + c.abajo) / 2;
const r = (n: number) => Math.round(n * 10) / 10;

/**
 * Camino SVG desde `origen` hacia `destino` (la flecha queda en el destino).
 * - destino a la derecha: sale por el costado derecho y entra por el izquierdo;
 * - destino a la izquierda: al revés;
 * - misma columna: sale y entra por el costado derecho, con un lazo hacia afuera.
 * `anclas` fija la altura de salida (y1) y de llegada (y2); por defecto, el centro de cada tarjeta.
 */
export function trazar(origen: Caja, destino: Caja, anclas: { y1?: number; y2?: number } = {}): string {
  const y1 = anclas.y1 ?? medioY(origen);
  const y2 = anclas.y2 ?? medioY(destino);
  if (origen.der <= destino.izq - MARGEN) {
    const x1 = origen.der;
    const x2 = destino.izq;
    const dx = Math.max(24, (x2 - x1) / 2);
    return `M${r(x1)} ${r(y1)}C${r(x1 + dx)} ${r(y1)} ${r(x2 - dx)} ${r(y2)} ${r(x2)} ${r(y2)}`;
  }
  if (destino.der <= origen.izq - MARGEN) {
    const x1 = origen.izq;
    const x2 = destino.der;
    const dx = Math.max(24, (x1 - x2) / 2);
    return `M${r(x1)} ${r(y1)}C${r(x1 - dx)} ${r(y1)} ${r(x2 + dx)} ${r(y2)} ${r(x2)} ${r(y2)}`;
  }
  const x1 = origen.der;
  const x2 = destino.der;
  return `M${r(x1)} ${r(y1)}C${r(x1 + LAZO)} ${r(y1)} ${r(x2 + LAZO)} ${r(y2)} ${r(x2)} ${r(y2)}`;
}

/**
 * Alturas donde engancha cada camino en el costado de la tarjeta elegida, repartidas en su alto en el orden de las tarjetas
 * de las que vienen (o a las que van), para que no se amontonen en un solo punto ni se crucen sin necesidad.
 */
export function repartirAnclas(caja: Caja, alturasDeLosOtros: number[]): number[] {
  const n = alturasDeLosOtros.length;
  const orden = alturasDeLosOtros.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const alto = caja.abajo - caja.arriba;
  const res = new Array<number>(n).fill(0);
  orden.forEach(({ i }, lugar) => {
    res[i] = caja.arriba + (alto * (lugar + 1)) / (n + 1);
  });
  return res;
}
