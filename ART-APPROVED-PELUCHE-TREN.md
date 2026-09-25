# Arte aprobado — Peluche y Tren Valencia

Integración del rostro de Peluche aprobado por el usuario y convertido a pixel art de 16 bits; Valencia conserva el rostro aprobado con piel más morena. Generación y edición con ImageGen integrado. Las fotos de referencia no se incluyen en el repositorio.

## Archivos finales

- `assets/peluche-presentation-v3.webp`: retrato aprobado, brazos cruzados; también usado en miniatura.
- `assets/peluche-atlas-v2.webp`: 16 poses con identidad revisada, celdas 270 × 270.
- `assets/peluche-special-v2.webp`: lanzamiento y orden de colado.
- `assets/tren-presentation-v3.webp`: presentación con tono aprobado.
- `assets/tren-atlas-v2.webp`: 16 poses con tono de piel actualizado.

Empaquetado con los scripts `pack-presentation.cjs`, `pack-fighter-atlas.cjs` y `pack-peluche-special.cjs`. La opción `--pixel` usa muestreo nearest-neighbor y WebP sin pérdida para conservar bordes y colores. Se mantiene escala común en el atlas, anclaje de pies y mapas de poses; no se modifican tamaños de combate, física, poderes ni balance.

## Prompts de adaptación

### pelucheAtlas2

Use case: identity-preserve. EDIT image 1, a production 4x4 sprite atlas, updating only character identity and pixel-art finish to match image 2. Identity reference image 2 is the USER-APPROVED Peluche in 16-bit pixel art. Match this exact adult man's full rounded cheeks and jaw, broad rounded nose, full closed lips, dark eyes, swept black hair, sparse chin/jaw stubble and warm moreno brown skin. NO small hooked nose, NO childish anime face, NO exaggerated angry brows, NO crisp thick goatee. Same short sturdy build, navy work jacket with bright yellow shoulders/chest, silver reflective stripes, navy work pants, brown safety boots. True 16-bit arcade pixel clusters, stepped contours, limited color ramps, no smooth painted face. Use this approved face consistently across every pose and exposed hands. Preserve ALL 16 existing poses, their order, orientation, spacing, frame centers and relative scale. All combat poses face RIGHT toward opponent. Row1: standing guard, forward punch, horizontal high kick, recoiling hit. Row2: wind-up arm back for concrete throw, low sweeping kick, walking step, alternate walking step. Row3: crouch guard, rising uppercut, airborne diagonal kick, backward-leaning forward kick. Row4: forearm block, tucked forward roll head downward, midair jump knees bent, lying knocked down on back. Exactly FOUR columns FOUR rows, equal square cells, 16 isolated FULL BODY figures, each fully inside its own cell with generous transparent margins, consistent size of head and limbs. No pose changes, no adding or removing poses, no rearranging cells, no overlapping figures. Actual alpha transparent background, no shadows or glows or floor or scenery, no text, no labels, no effects. Output square atlas.

### pelucheSpecial2

Use case: identity-preserve. EDIT image 1, TWO full-body special-move sprites. Identity reference image 2 is the USER-APPROVED Peluche in 16-bit pixel art. Match this exact adult man's full rounded cheeks and jaw, broad rounded nose, full closed lips, dark eyes, swept black hair, sparse chin/jaw stubble and warm moreno brown skin. NO small hooked nose, NO childish anime face, NO exaggerated angry brows, NO crisp thick goatee. Same short sturdy build, navy work jacket with bright yellow shoulders/chest, silver reflective stripes, navy work pants, brown safety boots. True 16-bit arcade pixel clusters, stepped contours, limited color ramps, no smooth painted face. Use this approved face consistently across every pose and exposed hands. Keep image 1 EXACT poses, orientation and outfit: LEFT stance facing right with right arm extended and open palm after throwing concrete, other arm back. RIGHT facing right pointing index finger straight toward opponent to command concrete pour, other hand at hip. Update both faces and skin to identity image 2. Two columns, one row, same physical body scale and boots baseline, ample transparent space between sprites and all around. Every boot, hand and hair strand fully within its cell. True transparent background, no glow, no shadows, no scenery, no projectiles, no captions. Only the two pixel-art figures.

### trenAtlas2

Use case: identity-preserve. Precisely EDIT existing 4x4 game sprite atlas image 1. Image 2 is approved skin-tone reference for same man Tren Valencia. Change ONLY the exposed skin tone in ALL 16 sprites: face, ears, neck and hands must match image 2's deeper warm medium-brown MORENO complexion. Keep image 1's exact face identity, eyeglasses, smile, black hair, raised conical straw hat, yellow work shirt with navy collar/cuffs, silver stripes, navy trousers and safety boots. Preserve true 16-bit pixel art, every pose's geometry, position, order, relative scale, complete hat and hands and boots, exactly 4 columns x 4 rows, no rearrangement. Row4 last figure has BOTH arms raised toward sky: retain exactly. Do not change clothing colors or darken the whole atlas. 16 isolated figures on actual alpha transparency. No backdrop, no glow, no effects or text. Only a consistent skin-tone edit, not a redesign.

