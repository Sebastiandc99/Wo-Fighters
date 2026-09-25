# Peluche — arte y poderes

Creado con la herramienta integrada ImageGen a partir de la referencia adjunta de Peluche. Se conserva el pelo negro, rostro, nariz, perilla corta, ropa azul con amarillo y botas de la referencia.

## Archivos finales

- `assets/peluche-atlas-v1.webp`: 16 poses laterales.
- `assets/peluche-special-v1.webp`: lanzamiento y orden de colado, señalando al rival.
- `assets/peluche-cutout-v1.webp`: retrato de selección sin fondo.
- `assets/concrete-v1.webp`, `assets/concrete-splash-v1.webp`, `assets/concrete-hose-v1.webp`, `assets/concrete-shell-v1.webp`: proyectil, salpicadura, manga y masa endurecida.
- `assets/wo-*-v1.mp3`: nueve efectos originales sintetizados con `scripts/build-wo-audio.py`; seis secuencias de poder y tres impactos comunes. No se usaron grabaciones externas.

Los sprites se empaquetan en celdas de 270 px conservando el canal alfa. Las poses de lanzamiento y señal se extraen por componentes para evitar recortes en los bordes. Los efectos y sonidos se sincronizan con el reloj de la pelea y respetan pausa, silencio y salida al menú.

## Prompts finales

### Atlas

Use case: identity-preserve. Create a production game sprite atlas of PELUCHE, the short stocky civil supervisor from the reference image. Preserve his exact recognizable youthful broad face, small hooked nose of the same size as reference, thick swept-up black hair, short chin goatee and light jaw stubble, dark navy work jacket and pants, fluorescent yellow shoulders/chest and silver reflective bands, tan work boots. No helmet, no sunglasses. High quality 16-bit pixel art matching the reference. EXACT 4 by 4 grid of 16 equal square cells in a square transparent image, each FULL BODY entirely inside its own cell with ample transparent padding, no clipping or neighboring overlap. All poses face RIGHT toward opponent, side/three-quarter profile, never front-facing. Consistent identity, head size and body proportions throughout. Cell order left to right: row1: 0 standing guard, 1 extended forward punch, 2 horizontal high kick, 3 recoiling hit. Row2: 4 torso winding up with one arm back ready to throw concrete, 5 low sweeping kick, 6 step forward walking, 7 alternate walking step. Row3: 8 crouching guard, 9 rising uppercut, 10 aerial kick diagonally downward, 11 backward leaning volley kick. Row4: 12 blocking with forearms, 13 tucked forward combat roll, 14 midair jump knees bent, 15 knocked down on back. Render only the man; no concrete, no effects, no floor, no shadow outside body, no scenery, no captions, no text, no logo, no watermark. True transparent alpha background. Use reference solely for face, hair, clothing and style. Size 2048x2048.

### Elementos de hormigón

Use case: stylized-concept. Production transparent 16-bit pixel-art game prop sprite sheet for a civil construction fighter's concrete powers. Exact 2x2 grid four isolated objects fully inside equal cells, generous transparent padding, no touching neighbors. Top-left a compact irregular lump of FRESH WET CONCRETE, pale grey sticky thick cement with dark aggregate stones, glistening white wet highlights, heavy rounded asymmetrical shape thrown right, a few short trailing drips to left, clearly concrete not rock or energy. Top-right an explosive wet-concrete SPLASH bursting outward, chunky grey and white droplets, irregular splat, transparent gaps. Bottom-left a large concrete pump flexible black ribbed HOSE curling down from upper left to a downward steel nozzle with orange collar, short thick grey concrete flow from nozzle; self-contained complete hose curve (no machine). Bottom-right a large waist-high hardened CONCRETE mound shell with jagged cracks splitting outward, grey angular slabs and pebbles, no person inside. Crisp dark outlines, detailed pixel shading, cool light greys concrete, bright readable highlights. Transparent alpha, NO background, floor, text, logos, labels or people. Square 2048x2048.

### Poses especiales

Use case: identity-preserve. Two full-body special move sprites of Peluche from the reference: same short stocky man, swept-up black hair, broad face, small hooked nose, tiny chin goatee and light jaw stubble, navy workwear with fluorescent yellow shoulder/chest panel and silver reflective bands, tan boots. EXACT 2 equal columns, one row, transparent background. LEFT: facing RIGHT, stable wide fighting stance, torso rotates forward after throwing heavy concrete, right arm fully extended palm open fingers spread, left arm back. RIGHT: facing RIGHT, steps forward commanding concrete pour, arm extended and INDEX FINGER POINTING directly right at the opponent, other hand on hip. Strong readable gesture, exact same face and proportions in both. High-quality16bit pixel art, bold outlines. Whole body fully in each cell with generous padding, no clipping, no extra limbs, no effects, no concrete, no text, no logo, no floor, no shadows, no background. Image 1536x1024. Reference image is for identity and costume only.
