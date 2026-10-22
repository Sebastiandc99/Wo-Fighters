# Matías: sonidos reales y reproducibles

Todas estas grabaciones están publicadas bajo CC0 1.0 Universal. Se consultó su licencia el 18 de octubre de 2026.

| Capa | Grabación y autor | Fuente |
| --- | --- | --- |
| Viento | Wind blowing and howling in a plastic bottle, in the desert of Chile — felix.blume | https://freesound.org/people/felix.blume/sounds/147512/ |
| Hojas | Leaves By The Store — Leo_Da_Slowly_Movin | https://freesound.org/people/Leo_Da_Slowly_Movin/sounds/613428/ |
| Papel | rustling paper.wav — keweldog | https://freesound.org/people/keweldog/sounds/181774/ |
| Envoltorios | Crumpling Plastic — OwlStorm | https://freesound.org/people/OwlStorm/sounds/151216/ |
| Botellas | Plastic Bottle falling — WarcakeStudios | https://freesound.org/people/WarcakeStudios/sounds/173597/ |
| Latas | Empty can falling — Rvgerxini | https://freesound.org/people/Rvgerxini/sounds/455130/ |

Se descargaron las preescuchas públicas de alta calidad. Viento: extracto de 8 a 18 s, convertido a mono PCM 16 kHz. Hojas: extracto de 5 a 11 s, igual conversión. Los demás archivos se conservan como preescuchas MP3. `scripts/build-matias-audio.py` mezcla recortes con fundidos y filtrado; no usa osciladores ni tonos de caricatura. El golpe final usa el sonido de caída existente del juego. El grito reutiliza un recorte breve de la interpretación humana CC0 documentada en README.md, sin efectos de fuego.

La descarga horizontal usa `wo-residues-v2.mp3` (1,65 s) y `wo-residuesImpact-v2.mp3` (0,48 s), reconstruibles con `scripts/build-matias-wave-audio.py`. Superpone las mismas grabaciones reales: viento y roce continuo de hojas, papel y plástico, más traqueteos irregulares de botellas y latas durante el recorrido. La mezcla usa compresión suave y fundidos; el juego conserva el sonido hasta que termina la cola visual y aplica una salida corta al detenerlo.

El especial **Lluvia de Lagartijas** usa `wo-lizardRain-v1.mp3` (4,15 s) y `wo-lizardBite-v1.mp3` (0,19 s), reconstruibles con `scripts/build-matias-lizard-audio.py`. Las mismas grabaciones CC0 de viento, hojas, papel y plástico forman pequeños desplazamientos de aire, roce de patas sobre ropa y ataques secos breves. Son foley, sin rugidos ni sonidos mágicos. La reacción humana reutiliza `wo-environmentalCry-v1.mp3`; los archivos del torbellino anterior quedan como históricos.
