// Los temas que se pueden elegir. Los colores completos están en estilos.css; acá, las tres muestras de cada uno.

export const TEMAS = [
  { clave: 'auto', nombre: 'Automático', muestra: ['#f7f4ef', '#1a1a1a', '#161310'] },
  { clave: 'claro', nombre: 'Claro', muestra: ['#1a1a1a', '#f7f4ef', '#f5a800'] },
  { clave: 'oscuro', nombre: 'Oscuro', muestra: ['#1a1a1a', '#211d19', '#f5a800'] },
  { clave: 'utn', nombre: 'UTN', muestra: ['#ffc21a', '#fffaec', '#1a1a1a'] },
  { clave: 'atardecer', nombre: 'Atardecer', muestra: ['#5a1736', '#fff4f1', '#ff9478'] },
  { clave: 'violeta', nombre: 'Violeta', muestra: ['#2b1850', '#211a2f', '#bb97ff'] },
  { clave: 'oceano', nombre: 'Océano', muestra: ['#08313f', '#122029', '#46d3c2'] },
] as const;

export type Tema = (typeof TEMAS)[number]['clave'];
