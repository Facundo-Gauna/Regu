// «Contanos»: qué se manda y cómo se ve. Puro (se prueba en Node). Nunca incluye notas ni materias cargadas:
// solo lo que la persona escribe, el contexto del aviso desde donde llegó y, si quiere, datos técnicos.

export type TipoFeedback = 'error' | 'regla' | 'idea' | 'otro';

export const TIPOS: readonly { clave: TipoFeedback; texto: string }[] = [
  { clave: 'error', texto: 'Algo anda mal' },
  { clave: 'regla', texto: 'Una regla o dato está mal' },
  { clave: 'idea', texto: 'Una idea' },
  { clave: 'otro', texto: 'Otra cosa' },
];

// Los mismos límites que api/feedback.ts (un test los compara)
export const MENSAJE_MIN = 10;
export const MENSAJE_MAX = 2000;
export const CONTEXTO_MAX = 200;

export interface DatosTecnicos { version: string; pantalla: string; navegador: string; tema: string }
export interface ContextoFeedback { desde: 'regla'; titulo: string; materia?: string }
export interface EnvioFeedback {
  tipo: TipoFeedback;
  mensaje: string;
  tecnico?: DatosTecnicos;
  contexto?: ContextoFeedback;
  /** Campo trampa: una persona no lo ve; si llega con algo, lo escribió un bot. */
  sitio_web: string;
}

export function validarMensaje(mensaje: string): string | null {
  const largo = mensaje.trim().length;
  if (largo < MENSAJE_MIN) return `Escribí al menos ${MENSAJE_MIN} caracteres.`;
  if (largo > MENSAJE_MAX) return `El mensaje no puede pasar de ${MENSAJE_MAX} caracteres.`;
  return null;
}

export function armarEnvio(f: { tipo: TipoFeedback; mensaje: string; incluirTecnico: boolean; tecnico: DatosTecnicos; contexto?: ContextoFeedback; trampa?: string }): EnvioFeedback {
  return {
    tipo: f.tipo,
    mensaje: f.mensaje.trim(),
    ...(f.incluirTecnico ? { tecnico: f.tecnico } : {}),
    ...(f.contexto ? { contexto: f.contexto } : {}),
    sitio_web: f.trampa ?? '',
  };
}

export function textoParaCompartir(e: EnvioFeedback): string {
  const datos: [string, string | undefined][] = [
    ['Sobre', e.contexto?.titulo],
    ['Materia', e.contexto?.materia],
    ['Versión', e.tecnico?.version],
    ['Pantalla', e.tecnico?.pantalla],
    ['Navegador', e.tecnico?.navegador],
    ['Tema', e.tecnico?.tema],
  ];
  const tipo = TIPOS.find(t => t.clave === e.tipo)?.texto ?? e.tipo;
  const lineas = datos.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
  return [`Regu · ${tipo}`, '', e.mensaje, ...(lineas.length ? ['', ...lineas] : [])].join('\n');
}

/** «Firefox 140 · Android»: alcanza para reproducir un problema sin mandar el user agent entero. */
export function resumirNavegador(ua: string): string {
  // El orden importa: Edge y Chrome también dicen «Safari», y Edge dice «Chrome»
  const navegadores: [string, RegExp][] = [
    ['Edge', /Edg\w*\/(\d+)/],
    ['Samsung Internet', /SamsungBrowser\/(\d+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/(\d+)/],
    ['Chrome', /(?:Chrome|CriOS)\/(\d+)/],
    ['Safari', /Version\/(\d+).*Safari/],
  ];
  const sistemas: [string, RegExp][] = [['Android', /Android/], ['iOS', /iPhone|iPad|iPod/], ['Windows', /Windows/], ['macOS', /Mac OS X/], ['Linux', /Linux/]];
  let navegador: string | undefined;
  for (const [nombre, patron] of navegadores) {
    const version = patron.exec(ua)?.[1];
    if (version) { navegador = `${nombre} ${version}`; break; }
  }
  const sistema = sistemas.find(([, patron]) => patron.test(ua))?.[0];
  return [navegador, sistema].filter(Boolean).join(' · ') || 'Desconocido';
}

export function contextoDesde(p: { desde?: string | undefined; titulo?: string | undefined; materiaId?: string | undefined }, nombreMateria: (id: string) => string | undefined): ContextoFeedback | undefined {
  if (p.desde !== 'regla' || !p.titulo) return undefined;
  const materia = p.materiaId ? nombreMateria(p.materiaId) : undefined;
  return { desde: 'regla', titulo: p.titulo.slice(0, CONTEXTO_MAX), ...(materia ? { materia } : {}) };
}
