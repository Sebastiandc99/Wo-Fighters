# Torre del Torneo

La presentación del modo solo reutiliza `campaign.opponents` y `campaign.index`.
Se conserva el sorteo único del roster actual, con seis rivales diferentes del jugador.
`campaign.defeated` registra los combates completos ganados, independientemente de los rounds.

La primera presentación dura 3,85 segundos: vista completa, acercamiento al piso superior,
recorrido continuo de los seis pisos y detención en el primer rival. Entre victorias,
la cámara asciende desde el piso anterior. La final dura 3,45 segundos. Al completar
la torre, se presenta al campeón antes de volver al formulario habitual del ranking.

Enter, Espacio, Start de un mando, el botón Continuar o un toque permiten acelerar las
presentaciones posteriores. Conservan 0,3 segundos de desplazamiento y una pausa visible
antes del fundido. La primera presentación de cada torneo se reproduce completa.
El menú cancela la torre. Cambiar de pestaña pausa cámara y música.

## Recursos

- `assets/tournament-tower-v1.webp`: base industrial propia, derivada de la imagen del
  usuario mediante la herramienta integrada de generación de imágenes. Se quitaron
  letras, números, retratos y símbolos de otros juegos. Los seis paneles se dibujan
  con los retratos existentes y el orden real del torneo.
- `assets/tournament-tower-v1.mp3`: música adjunta del usuario, convertida de M4A a MP3
  para reproducción mediante el reproductor Web Audio existente. Se precarga durante
  la selección y baja el volumen durante los últimos 0,35 segundos de la torre.
- No se incorporaron recursos de Mortal Kombat. El vídeo indicado no se pudo recuperar;
  el recorrido sigue la descripción explícita del prompt.

Prompt de la imagen (herramienta integrada): conservar torre industrial amarilla,
cielo nocturno tormentoso, luces naranjas, tuberías, pasarelas, niebla y trofeo; quitar
retratos, nombres, números, letras, logotipos y banderas de personajes; seis pantallas
vacías alineadas en vista frontal para superponer los retratos reales del juego.

## Verificación

`node --test tests/tournament-tower.test.cjs` verifica los siete jugadores, orden fijo,
seis dificultades existentes, avance sólo entre combates completos, puntaje acumulado,
cámara continua, KO, final, campeón, derrota, menú, mute/fundido, móvil y controles de skip.
Las pruebas existentes de personajes esperan ahora que termine la nueva presentación.
No se cambian físicas, golpes, daños, poderes, dificultad, IA ni el servicio del ranking.
