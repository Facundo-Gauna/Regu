import { useRef, useState } from 'preact/hooks';
import {
  MENSAJE_MAX, TIPOS, armarEnvio, contextoDesde, resumirNavegador, textoParaCompartir, validarMensaje,
} from '../../vista/feedback.ts';
import type { Ruta } from '../../vista/rutas.ts';
import { borrarBorrador, guardarBorrador, leerBorrador, type Borrador } from '../borrador.ts';
import { Aviso, Boton, Campo, Segmentado } from '../componentes.tsx';
import type { Modelo } from '../modelo.ts';
import { useStore } from '../store.ts';

type Estado = 'editando' | 'enviando' | 'enviado' | 'error' | 'tope';

const URL_ENVIO: string = import.meta.env['VITE_FEEDBACK_URL'] ?? '/api/feedback';

export function Contanos({ m, ruta }: { m: Modelo; ruta: Extract<Ruta, { nombre: 'contanos' }> }) {
  const s = useStore();
  const delAviso = contextoDesde(ruta, id => [...m.plan.materias, ...m.plan.electivas].find(x => x.id === id)?.nombre);
  const nuevo = (): Borrador => ({ tipo: delAviso ? 'regla' : 'otro', mensaje: '', incluirTecnico: true });
  const [borrador, setBorrador] = useState<Borrador>(() => leerBorrador() ?? nuevo());
  // Manda el aviso desde donde se llega ahora; si se llega desde Más, el del borrador
  const contexto = delAviso ?? borrador.contexto;
  const [estado, setEstado] = useState<Estado>('editando');
  const [error, setError] = useState<string>();
  const [copia, setCopia] = useState<'copiado' | 'a-mano'>();
  const [trampa, setTrampa] = useState('');
  const enviando = useRef(false);

  const tecnico = {
    version: __VERSION__,
    pantalla: contexto ? 'Aviso sin confirmar' : 'Más',
    navegador: resumirNavegador(navigator.userAgent),
    tema: s.prefs.tema ?? 'auto',
  };
  const armar = () => armarEnvio({
    tipo: borrador.tipo, mensaje: borrador.mensaje, incluirTecnico: borrador.incluirTecnico, tecnico, trampa,
    ...(contexto ? { contexto } : {}),
  });

  const cambiar = (cambios: Partial<Borrador>) => {
    const b = { ...borrador, contexto, ...cambios };
    setBorrador(b);
    guardarBorrador(b);
    setError(undefined);
    setCopia(undefined);
  };

  const enviar = async (e: Event) => {
    e.preventDefault();
    if (enviando.current) return;
    const problema = validarMensaje(borrador.mensaje);
    if (problema) return setError(problema);
    enviando.current = true;
    setEstado('enviando');
    setCopia(undefined);
    let resultado: Estado = 'error';
    try {
      const r = await fetch(URL_ENVIO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(armar()),
        signal: AbortSignal.timeout(15_000),
      });
      // Solo 201 vale: un hosting sin la función puede responder 200 con la propia app
      if (r.status === 201) resultado = 'enviado';
      else if (r.status === 429) resultado = 'tope';
    } catch {
      // sin conexión o se agotó el tiempo: queda como error
    }
    if (resultado === 'enviado') borrarBorrador();
    enviando.current = false;
    setEstado(resultado);
  };

  const copiar = async () => {
    try {
      // El navegador puede no contestar nunca (permiso sin resolver): sin límite, el botón no haría nada
      await Promise.race([
        navigator.clipboard.writeText(textoParaCompartir(armar())),
        new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('sin respuesta')), 1500)),
      ]);
      setCopia('copiado');
    } catch {
      setCopia('a-mano');
    }
  };

  const compartir = async () => {
    try {
      await navigator.share({ text: textoParaCompartir(armar()) });
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError')) setCopia('a-mano'); // cancelar no es un error
    }
  };

  if (estado === 'enviado') {
    return (
      <div class="pagina contanos">
        <h1 class="pagina__titulo">Contanos</h1>
        <Aviso tipo="ok" titulo="¡Gracias! Lo vamos a leer." />
        <div class="botonera">
          <Boton onClick={() => { setBorrador(nuevo()); setEstado('editando'); }}>Escribir otro</Boton>
        </div>
      </div>
    );
  }

  const largo = borrador.mensaje.trim().length;
  const fallo = estado === 'error' || estado === 'tope';
  const vistaTecnica: [string, string][] = [['Versión', tecnico.version], ['Pantalla', tecnico.pantalla], ['Navegador', tecnico.navegador], ['Tema', tecnico.tema]];

  return (
    <div class="pagina contanos">
      <h1 class="pagina__titulo">Contanos</h1>
      <form class="formulario" onSubmit={enviar} noValidate>
        <Segmentado nombre="tipo" etiqueta="¿Qué querés contarnos?" valor={borrador.tipo} opciones={TIPOS.map(t => ({ valor: t.clave, etiqueta: t.texto }))} onCambio={tipo => cambiar({ tipo })} />
        {contexto && (
          <p class="seccion__texto">Sobre: «{contexto.titulo}»{contexto.materia ? ` · ${contexto.materia}` : ''}</p>
        )}
        <Campo etiqueta="Tu mensaje" ayuda="Si querés que te respondamos, dejá tu mail o WhatsApp en el mensaje." error={error}>
          <textarea rows={6} placeholder="Escribí acá…" value={borrador.mensaje} onInput={e => cambiar({ mensaje: e.currentTarget.value })} />
        </Campo>
        {largo > MENSAJE_MAX - 200 && <p class="nota-ayuda" role="status">{largo} de {MENSAJE_MAX} caracteres</p>}
        <div>
          <label class="casilla">
            <input type="checkbox" checked={borrador.incluirTecnico} onChange={e => cambiar({ incluirTecnico: e.currentTarget.checked })} />
            <span>Incluir datos técnicos</span>
          </label>
          {borrador.incluirTecnico && (
            <details class="plegable">
              <summary>Ver qué se manda</summary>
              <div class="plegable__cuerpo">
                <ul class="razones">{vistaTecnica.map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
                <p class="nota-ayuda">Tus notas y materias no se mandan.</p>
              </div>
            </details>
          )}
        </div>
        <div class="trampa" aria-hidden="true">
          <input type="text" name="sitio_web" tabIndex={-1} autocomplete="off" value={trampa} onInput={e => setTrampa(e.currentTarget.value)} />
        </div>
        <p class="nota-ayuda">Lo que escribas, incluido tu contacto si lo dejás, le llega a quien hace Regu.</p>
        {estado === 'error' && <Aviso tipo="error" titulo="No se pudo enviar. Queda guardado: probá de nuevo cuando tengas internet" />}
        {estado === 'tope' && <Aviso tipo="alerta" titulo="Mandaste varios seguidos. Probá en un rato." />}
        <div class="botonera">
          <Boton type="submit" variante="primario" disabled={estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Enviar'}</Boton>
          {fallo && <Boton onClick={copiar}>{copia === 'copiado' ? 'Copiado' : 'Copiar'}</Boton>}
          {fallo && typeof navigator.share === 'function' && <Boton onClick={compartir}>Compartir</Boton>}
        </div>
        {copia === 'a-mano' && (
          <Campo etiqueta="Seleccioná y copiá el texto">
            <textarea readOnly rows={8} value={textoParaCompartir(armar())} onFocus={e => e.currentTarget.select()} />
          </Campo>
        )}
      </form>
    </div>
  );
}
