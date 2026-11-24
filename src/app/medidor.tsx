/** Regla de 0 a 10 con la nota y las marcas que hay que alcanzar. Es un apoyo visual: la nota y el mínimo van en texto. */
export function Medidor({ valor, marcas, tono }: { valor: number | null; marcas: number[]; tono: string }) {
  return (
    <div class={`medidor t-${tono}`} aria-hidden="true">
      <div class="medidor__relleno" style={{ width: `${(valor ?? 0) * 10}%` }} />
      {marcas.map((m, i) => <span key={i} class="medidor__marca" style={{ left: `${m * 10}%` }} />)}
    </div>
  );
}
