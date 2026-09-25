# Tren Valencia — arte y electricidad

Atlas generado con ImageGen integrado, usando la imagen adjunta de Tren Valencia como referencia de identidad. Conserva anteojos rectangulares, pelo oscuro, rostro sin barba, uniforme amarillo reflectante, pantalón azul y sombrero cónico elevado. Fondo transparente. El empaquetado conserva el tamaño corporal entre poses, incluidas las manos levantadas del súper.

Archivos: `assets/tren-atlas-v1.webp` (16 celdas de 270 × 270), `assets/tren-cutout-v1.webp` (recorte de la primera pose), `assets/tren-voltaic.svg` y `assets/tren-storm.svg` (insignias vectoriales del menú). Los rayos, ramificaciones, esfera, aura y tormenta se dibujan en Canvas y se sincronizan con el reloj del combate. Sonidos eléctricos originales sintetizados por `scripts/build-tren-audio.py`; no usan grabaciones externas.

## Prompt de generación

Create a production sprite atlas for a 2D arcade fighting game based on the EXACT man Tren Valencia in the reference. Preserve recognizable medium tan clean-shaven face, short black hair and rectangular black eyeglasses. Normal average build adult man, not bulky, not short/chibi. Yellow work shirt with navy collar/cuffs and reflective silver chest and arm stripes; navy work trousers with reflective calf stripes, brown-black safety boots. Woven straw conical hat sits HIGH above eyebrows so entire face remains clearly visible in ALL poses. Crisp detailed pixel-art 16-bit fighting-game style, same character throughout. Transparent background. SQUARE atlas EXACTLY 4 columns by 4 rows, 16 isolated full-body figures, equal cell spacing, no overlap, generous empty margin, identical body scale across poses, soles baseline consistent except airborne poses. All face screen RIGHT, three-quarter face visible. Row 1: (1) idle fighting guard, (2) straight right punch extended, (3) high side kick right, (4) recoiling from hit. Row 2: (5) hands facing each other before chest charging an orb but NO orb drawn, (6) low sweeping kick right, (7) walking right left leg forward, (8) walking right right leg forward. Row 3: (9) low crouch, (10) blocking with forearms, (11) airborne jump knees bent, (12) airborne diagonal kick right. Row 4: (13) upward uppercut right, (14) high forward kick variation, (15) both arms extended horizontally right shooting electricity but NO electricity drawn, (16) cinematic super pose legs apart leaning back BOTH arms raised straight toward sky fingers up, face visible beneath hat. Keep raised hands WITHIN final cell. No captions, no labels, no frames, no grid, no floor, no shadows, no scenery, no electrical effects; only 16 separated transparent character sprites.

## Empaquetado

`NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" node scripts/pack-fighter-atlas.cjs input.png assets/tren-atlas-v1.webp`

Mapa lógico a celdas físicas: `0,1,2,3,4,5,6,7,8,9,10,8,12,11,13,3,14,15,8`. El lanzamiento usa celda 14 y el súper celda 15; los efectos no están pintados en el atlas.
