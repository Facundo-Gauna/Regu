# Design

Regu es una herramienta personal que se usa de a ratos en el celular. El tono es **cálido y sereno** (app propia, no sistema institucional), con la identidad ámbar y negro inspirada en la FRVM. Los valores exactos viven en `src/app/estilos.css`; si difieren de este texto, manda el código.

## Color

- Ámbar `#F5A800`: solo marca y acción principal (y la pestaña activa, que se marca con relleno ámbar y texto en 800 para que se note sin color).
- Negro `#1A1A1A`: encabezado, navegación y portada, en los dos temas.
- Neutros tibios para fondo, superficie, texto y bordes, con valores propios en claro y oscuro (el oscuro está repetido en dos bloques: tema elegido y preferencia del sistema).
- Estados: verde aprobada, celeste regular, violeta cursando, azul habilitada, gris bloqueada, rojo recursar. Siempre con ícono y texto, nunca solo color.
- Contraste: texto ≥ 4,5:1 y bordes de control ≥ 3:1.

## Tipografía

Montserrat incluida en la app (funciona sin conexión). Títulos de sección en minúscula con inicial mayúscula, peso 800. No se agrega una segunda familia.

## Forma y espacio

- Radio grande (`--radio`, 18px) en tarjetas; `--radio-chico` (12px) en controles; 24px en portadas.
- Más aire entre secciones que dentro de una fila.
- Sin franjas de color a un lado ni barras ámbar en títulos. Sin tarjetas dentro de tarjetas.

## Estado en pantalla

- En listas la insignia lleva el estado y la fila queda neutra.
- El color de fondo se reserva para donde el color es el contenido: mapa del plan, notas y encabezado de materia.

## Detalles

- Una materia aprobada lleva un sello en su encabezado. Es el único adorno.
- La incertidumbre se muestra como «Sin confirmar ⓘ», con la explicación a un toque.

## Movimiento

Pendiente (paso de animaciones). Todo movimiento respeta «reducir movimiento».
