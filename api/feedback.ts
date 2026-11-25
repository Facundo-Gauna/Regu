// Función de Vercel: POST /api/feedback. Recibe lo que se manda desde «Contanos» y crea un issue en un repo privado.
// Sin imports locales a propósito: así no depende de cómo Vercel resuelva archivos .ts de otras carpetas.
// El token vive solo acá (variables de entorno). El contenido del mensaje no se escribe en los logs.

export const LIMITES = { mensajeMin: 10, mensajeMax: 2000, contextoMax: 200, cuerpoMax: 8192, porHora: 5 };

export const ETIQUETAS = {
  error: 'Algo anda mal',
  regla: 'Una regla o dato está mal',
  idea: 'Una idea',
  otro: 'Otra cosa',
} as const;
type Tipo = keyof typeof ETIQUETAS;

const CLAVES_TECNICO = ['version', 'pantalla', 'navegador', 'tema'] as const;
const CLAVES_CONTEXTO = ['titulo', 'materia'] as const;
const NOMBRES: Record<string, string> = { version: 'Versión', pantalla: 'Pantalla', navegador: 'Navegador', tema: 'Tema', titulo: 'Sobre', materia: 'Materia' };

export interface Entorno { GITHUB_TOKEN?: string | undefined; FEEDBACK_REPO?: string | undefined; ORIGENES_PERMITIDOS?: string | undefined }

export interface EnvioValido {
  tipo: Tipo;
  mensaje: string;
  tecnico?: Record<string, string>;
  contexto?: { desde: 'regla'; titulo: string; materia?: string };
  sitio_web: string;
}

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Solo las claves conocidas, solo texto, recortado. */
function elegir(x: unknown, claves: readonly string[]): Record<string, string> {
  const r: Record<string, string> = {};
  if (!esObjeto(x)) return r;
  for (const k of claves) {
    const v = x[k];
    if (typeof v === 'string' && v) r[k] = v.slice(0, LIMITES.contextoMax);
  }
  return r;
}

export function validarEnvio(x: unknown): EnvioValido | null {
  if (!esObjeto(x)) return null;
  const { tipo, mensaje } = x;
  if (typeof tipo !== 'string' || !Object.hasOwn(ETIQUETAS, tipo) || typeof mensaje !== 'string') return null;
  const texto = mensaje.trim();
  if (texto.length < LIMITES.mensajeMin || texto.length > LIMITES.mensajeMax) return null;
  const tecnico = elegir(x['tecnico'], CLAVES_TECNICO);
  const ctx = elegir(x['contexto'], CLAVES_CONTEXTO);
  return {
    tipo: tipo as Tipo,
    mensaje: texto,
    ...(Object.keys(tecnico).length ? { tecnico } : {}),
    ...(ctx['titulo'] ? { contexto: { desde: 'regla' as const, titulo: ctx['titulo'], ...(ctx['materia'] ? { materia: ctx['materia'] } : {}) } } : {}),
    sitio_web: '',
  };
}

/** Cerca de bloque de código más larga que cualquier corrida de comillas invertidas del texto: no se puede «salir» de ella. */
export function cerca(texto: string): string {
  const mayor = Math.max(0, ...(texto.match(/`+/g) ?? []).map(c => c.length));
  return '`'.repeat(Math.max(3, mayor + 1));
}

/** Texto seguro para una celda de tabla: una línea, sin formato y sin mencionar a nadie. */
export function celda(v: string): string {
  return v
    .replace(/\s+/g, ' ')
    .slice(0, LIMITES.contextoMax)
    .replace(/[\\`*_[\]<>|]/g, '\\$&')
    .replace(/@/g, '@​');
}

export function armarIssue(e: EnvioValido): { title: string; body: string; labels: string[] } {
  const inicio = Array.from(e.mensaje.replace(/\s+/g, ' ')).slice(0, 60).join('');
  const marca = cerca(e.mensaje);
  const datos: [string, unknown][] = [...Object.entries(e.contexto ?? {}), ...Object.entries(e.tecnico ?? {})];
  const filas = datos.filter(([k]) => k !== 'desde').map(([k, v]) => `| ${NOMBRES[k] ?? celda(k)} | ${celda(String(v))} |`);
  return {
    title: `[${ETIQUETAS[e.tipo]}] ${inicio}`,
    body: [`${marca}text`, e.mensaje, marca, ...(filas.length ? ['', '| Dato | Valor |', '|---|---|', ...filas] : [])].join('\n'),
    labels: [e.tipo],
  };
}

/** Tope en memoria. Es aproximado: Vercel puede tener varias copias de la función. */
export function crearLimitador(max: number, ventanaMs: number, ahora: () => number = Date.now): (clave: string) => boolean {
  const usos = new Map<string, number[]>();
  return clave => {
    const t = ahora();
    for (const [k, v] of usos) if (v.every(u => t - u >= ventanaMs)) usos.delete(k);
    const recientes = (usos.get(clave) ?? []).filter(u => t - u < ventanaMs);
    const permitido = recientes.length < max;
    if (permitido) recientes.push(t);
    usos.set(clave, recientes);
    return permitido;
  };
}

const responder = (status: number, cuerpo: { ok: true } | { error: string }) => Response.json(cuerpo, { status });

export async function manejar(req: Request, entorno: Entorno, deps: { fetch: typeof fetch; limitar: (clave: string) => boolean }): Promise<Response> {
  if (req.method !== 'POST') return responder(405, { error: 'Método no permitido' });
  const origenes = (entorno.ORIGENES_PERMITIDOS ?? '').split(',').map(o => o.trim().replace(/\/+$/, '')).filter(Boolean);
  const origen = req.headers.get('origin');
  if (!origen || !origenes.includes(origen)) return responder(403, { error: 'Origen no permitido' });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconocida';
  if (!deps.limitar(ip)) return responder(429, { error: 'Demasiados envíos' });

  const texto = await req.text();
  if (new TextEncoder().encode(texto).length >= LIMITES.cuerpoMax) return responder(400, { error: 'Demasiado largo' });
  let dato: unknown;
  try {
    dato = JSON.parse(texto);
  } catch {
    return responder(400, { error: 'No es JSON' });
  }
  // Campo trampa: se le dice que sí al bot y no se crea nada
  if (esObjeto(dato) && dato['sitio_web']) return responder(201, { ok: true });
  const envio = validarEnvio(dato);
  if (!envio) return responder(400, { error: 'Datos inválidos' });
  const { GITHUB_TOKEN: token, FEEDBACK_REPO: repo } = entorno;
  if (!token || !repo) {
    console.error('feedback: faltan GITHUB_TOKEN o FEEDBACK_REPO');
    return responder(500, { error: 'Falta configuración' });
  }
  try {
    const r = await deps.fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'regu-feedback',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(armarIssue(envio)),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      console.error(`feedback: GitHub respondió ${r.status}`);
      return responder(502, { error: 'No se pudo guardar' });
    }
  } catch {
    console.error('feedback: no se pudo llegar a GitHub');
    return responder(502, { error: 'No se pudo guardar' });
  }
  return responder(201, { ok: true });
}

const limitar = crearLimitador(LIMITES.porHora, 3_600_000);

export function POST(request: Request): Promise<Response> {
  return manejar(request, process.env, { fetch, limitar });
}
