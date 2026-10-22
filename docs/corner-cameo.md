# Aparición de la esquina: «Chicos, no se lastimen»

La referencia es el cameo Toasty! de Mortal Kombat II: una foto entra rápidamente desde la esquina inferior derecha, suena una intervención breve y vuelve a salir mientras la pelea continúa. Dan Forden relató que Ed Boon propuso que su cara apareciera ocasionalmente después de un uppercut; «uno de cada cien» era la idea que recordaba, no una probabilidad del juego verificada aquí.

Fuente primaria: entrevista a Dan Forden por David Craddock, Shacknews, 23/01/2026: https://www.shacknews.com/article/147543/all-gas-no-brakes-dan-forden-on-mortal-kombats-arcade-era
Referencia del usuario: https://www.youtube.com/shorts/Vty1fRzEhiQ

## Adaptación a WO Fighters

- La primera aparición de cada round está garantizada con el primer gancho o remate de combo conectado sin cobertura. También puede salir con golpes comunes. Tras la espera, las probabilidades por golpe válido son: gancho 40 %, remate 25 %, patada 15 % y puño 8 %. Un límite de seis impactos válidos sin aparición evita rachas largas de mala suerte. Los golpes durante la espera no se acumulan. No se activa con golpes fallidos, cubiertos, proyectiles, especiales cinematográficos ni K.O.
- Dura 1,45 s: entrada lateral de 0,12 s, pausa breve y salida de 0,16 s. Hay 14 s de espera entre apariciones.
- La foto tiene 150 px de altura en el escenario de referencia (antes 190 px, aproximadamente 21 % más pequeña). La foto y el globo se dibujan en coordenadas de pantalla, después de la arena y sus sacudidas. El texto exacto es «Chicos, no se lastimen», en dos líneas.
- No cambia daño, recuperación, controles, cámara ni música. La pausa congela imagen y sonido. Menús, nuevo round y especiales cinematográficos limpian el cameo.

## Imagen y audio

Imagen: `assets/corner-cameo-v1.webp`, 512 píxeles de ancho, transparencia real. Se preparó con la herramienta integrada de imágenes a partir de la foto aportada, recortando el fondo y conservando rostro, pelo, barba, expresión y ropa amarilla/azul con apariencia fotográfica. No se utiliza la foto de Dan Forden.

Prompt de edición: “Background extraction of the attached real photograph. Remove only the blue wall and black circular framing; preserve this exact person's identity, facial proportions, skin texture, short dark hair, stubble, expression, natural lighting and yellow work polo with navy collar. One clean, upright, front-facing transparent head-and-shoulders/upper-chest cutout, with natural shoulder edges and a straight bottom crop for a lower-right screen cameo. No illustration, pixel art, 3D, beautification, caricature, circle, text, speech balloon, props or glow.” Se redujo la imagen generada a WebP para el juego.

Audio: `assets/wo-corner-cameo-v1.mp3`, intervención original de 0,73 s extraída del archivo del usuario `videoplayback (1).mp4`, de 0,35 a 1,08 s. Se usa la primera intervención clásica de Toasty!, sin la música ni las repeticiones del montaje. No se generó una voz nueva que imite a la persona; el globo aporta la frase solicitada. El fragmento conserva su voz original, con filtrado leve y fundidos de borde. Procedencia: montaje adjunto del usuario con Dan Forden; no se atribuye licencia CC0. Reconstrucción: `python scripts/build-corner-cameo-audio.py referencia.mp4`.
