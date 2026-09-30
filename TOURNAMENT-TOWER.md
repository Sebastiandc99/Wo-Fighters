# Torre del Torneo

La torre ocupa toda la pantalla y está centrada, sin panel lateral ni números junto a
los retratos. El anuncio del siguiente combate aparece abajo al finalizar el recorrido.

La presentación del modo solo reutiliza `campaign.opponents` y `campaign.index`.
Se conserva el sorteo único del roster actual, con seis rivales diferentes del jugador.
`campaign.defeated` registra los combates completos ganados, independientemente de los rounds.

La primera presentación dura 7,46 segundos: vista completa, acercamiento al piso superior,
recorrido continuo de los seis pisos y detención en el primer rival. Entre victorias,
la cámara asciende desde el piso anterior; estas presentaciones duran 5,48 segundos.
El recorrido usa un factor de tiempo de 1,8. Tras completar el resaltado, el rival
permanece visible dos segundos completos antes del fundido hacia la pelea. La final dura 6,47 segundos. Al completar
la torre, se presenta al campeón antes de volver al formulario habitual del ranking.

Los nombres, títulos, anuncio VS y controles usan la tipografía local `KP Display`
(Bangers), con contorno, sombra, detalles dorados y una franja de fondo degradada.
El nombre del siguiente rival es mayor y el encabezado muestra las vidas disponibles.
Se conservan la torre centrada y las fichas sin números al lado de los retratos.

## Dificultad y vida extra

El primer rival usa exactamente el nivel NORMAL existente. Los cinco siguientes
reaccionan antes, bloquean mejor, presionan más y usan poderes con más frecuencia.
La velocidad y el uso de poderes aumentan con saltos cada vez mayores. La curva
está separada de la dificultad habitual de 2 jugadores.

| Rival | Reacción base (s) | Defensa | Velocidad CPU | Uso de poderes |
| --- | ---: | ---: | ---: | ---: |
| 1 | 0,23 | 49% | 0,87× | 29% |
| 2 | 0,18 | 63% | 0,92× | 37% |
| 3 | 0,135 | 75% | 0,99× | 47% |
| 4 | 0,095 | 85% | 1,08× | 59% |
| 5 | 0,065 | 93% | 1,19× | 73% |
| 6 | 0,04 | 98% | 1,32× | 89% |

Cada torneo empieza con dos vidas: la inicial y una sola oportunidad adicional.
Perder un round no consume esa oportunidad. Tras la primera derrota de un combate
completo aparece «TE QUEDA 1 VIDA», con opciones de continuar con el mismo personaje
o elegir otro. Ambas vuelven al rival actual con salud y rounds reiniciados,
conservando puntaje, escenario, rivales derrotados y orden de la torre. Se puede
volver atrás desde la selección sin gastar la oportunidad. Elegir al rival actual
permite un duelo espejo; no se altera el sorteo de enemigos durante la continuación.
El reintento muestra brevemente ese piso y respeta la pausa de dos segundos sobre
el enemigo. La siguiente derrota termina el torneo y permite registrar el puntaje.

Enter, Espacio, Start de un mando, el botón Continuar o un toque permiten acelerar las
presentaciones posteriores. Conservan 0,3 segundos de desplazamiento y los dos segundos sobre el rival
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

`node --test tests/tournament-tower.test.cjs tests/tournament-continue.test.cjs`
verifica los siete jugadores, orden fijo, curva de dificultad y decisiones reales
de la CPU, avance sólo entre combates completos, vida extra, cambio de personaje,
reintento del mismo rival, puntaje acumulado, cámara continua, KO, final, campeón,
derrota definitiva, menú, mute/fundido, móvil y controles de skip.
Las pruebas existentes de personajes esperan ahora que termine la nueva presentación.
Los golpes y daños conservan sus valores; se ajusta la presión de la IA del torneo.
