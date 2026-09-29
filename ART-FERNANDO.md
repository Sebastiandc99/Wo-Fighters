# Fernando — Wo Fighters

Ingeniero civil según la referencia del usuario: 1,75m, piel blanca, delgado con algo de panza, lentes oscuros, cabello y barba castaños, ropa amarilla/azul, botines y paquetes de cigarrillos en la cintura.

## Arte

Generado con la herramienta integrada de imágenes. Assets finales: `assets/fernando-atlas-v1.webp` (20 poses, 4×5 celdas de270 px,1080×1350), `assets/fernando-portrait-v1.webp` (altura 780 px), y dos insignias SVG basadas en los efectos dibujados por el motor. Poses9 y19 son guardias dedicadas de pie y agachado.

Empaquetado reproducible con `scripts/pack-fernando-atlas.cjs`, escala única desde el primer sprite y nearest-neighbor sin pérdidas. El atlas mantiene el orden de las20 poses del prompt.

### Prompt del atlas
Production fighting-game sprite sheet on genuinely transparent background. Input image is ONLY Fernando identity/outfit reference. Exactly TWENTY separate full-body sprites in a strict 4 columns x 5 rows evenly spaced grid. Same adult man in all cells: WHITE fair skin, short brown hair, neatly trimmed brown beard and moustache, dark sunglasses, slim-average physique with small protruding belly, yellow work shirt with navy collar/cuffs and silver reflective waist stripe, navy cargo trousers with silver reflective bands near ankles, brown safety boots, several small red-and-white cigarette packs secured to belt. A short white cigarette with a red ember extends from mouth in every pose; no floating smoke/effects. NO hat or headset. Chunky crisp arcade 16-bit pixel art, strong dark outlines. All figures face RIGHT, consistent head/body scale across twenty poses, no clipping. Exact row-major pose order: row1 ready idle stance, straight punch, high side kick, recoiling hit; row2 hand grabbing belt pack preparing power, low sweeping kick, walking stride A, walking stride B; row3 low crouching stance, STANDING GUARD both forearms close together protecting face and upper chest fists above eyes (visibly different from idle), jumping knees bent, crouched compact roll preparation; row4 rising uppercut, airborne downward-diagonal kick, high volley kick, knocked down falling horizontally; row5 fully extended throwing hand releasing cigarettes, bent forward both hands throwing lit cigarettes toward ground for super, low defensive stance, DEEP CROUCHING GUARD knees bent both forearms covering face fists together. Standing guard MUST visibly cover face with both forearms, not fists spread. Every sprite a single connected silhouette, substantial transparent gaps, all limbs entirely inside cells. No text, no frames, no background or ground, no particles, no thrown projectiles or fire outside silhouette. Preserve likeness and slight belly from reference.

### Prompt del retrato
Production character-selection portrait for Wo Fighters. Attached poster is Fernando identity/outfit reference. Isolated FULL BODY man in confident ready fighting stance, facing slightly right, one hand near belt cigarette packs, other raised fist. White fair skin, short brown hair, neatly trimmed brown beard/moustache, dark sunglasses, slim-average with a modest belly, yellow work shirt/navy collar and cuffs, reflective silver waist stripe, navy cargo pants with silver lower-leg bands, brown safety boots. Several red-white cigarette packs attached to waist belt, short lit white cigarette in mouth and a subtle curl of smoke attached at ember. Match face in reference. Crisp arcade 16-bit pixel art with detailed chunky pixels and dark outlines. Full body boots fully visible, generous transparent margins, genuinely transparent background. No words, letters, logos, other people, border, poster elements or scenery. No hat or headset.

## Juego

Normal 9; resistencia 98; velocidad6/10; alcance físico5/10; recuperación del común0,60 s. Movimiento y cuerpo delgado con algo de panza; altura igual a Linares. Golpes conservan su recuperación normal según agilidad.

Lluvia de Cigarrillos cuesta30%, inicia en0,14 s y lanza3 cigarrillos consecutivos separados por0,13 s:7+7+7=21 de daño base. Alcance532 (7/10); humo, brasa visible y chispas. Colisión barrida en ambas direcciones; cada cigarrillo golpea una sola vez. Se puede bloquear, saltar y evadir. El daño real usa la escala general0,70 y la resistencia del rival.

Incendio de Obra cuesta100%, alcance608 (8/10), duración2,85 s. Enciende una tarima y madera, propaga fuego, humo y brasas horizontalmente, impacta una sola vez en 1,85 s por33 de daño base y termina con retroceso/derribo. La secuencia bloquea los controles y comparte la pausa del motor.

## Audio original

`scripts/build-fernando-audio.py` genera los3 audios originales (ruido de combustión filtrado, crepitar irregular de brasas, aire/llamas y explosión). `assets/wo-cigarettes-v1.mp3` dura1,15 s; `assets/wo-emberImpact-v1.mp3`,0,46 s; `assets/wo-fireSuper-v1.mp3`,2,85 s, con explosión en 1,85 s. El volumen de fuego del súper es1,05 y el del común/brasas1,0. Las voces usan el reloj de simulación, pausa y limpieza existentes.

## Validación

Pruebas específicas de Fernando: atributos, selección y torneo de6 rivales; coste, alcance y daño total; impactos individuales en todos los personajes y ambas direcciones; bloqueo/salto; súper y recuperación de controles; pausa; guardias; 2P táctil; CPU; dibujo determinista; KO y limpieza de audio. Regresión de Wo, Gabriel, Linares, Valencia, Peluche, supers, controles y rendimiento móvil. Renders reales de Canvas inspeccionados: reposo, cigarrillos, propagación del fuego, explosión y guardia.

