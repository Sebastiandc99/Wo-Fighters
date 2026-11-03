# Darío — Logística de personal

Usa el último diseño aprobado: piel morena, cabello corto negro, barba leve, uniforme amarillo/azul, handy y lector de logística. La presentación conserva el cuerpo robusto con algo de panza. Altura de combate igual a Gabriel (196 unidades; referencia 1,72 m), escala 249, ancho corporal 1,06 frente a 0,94 de Gabriel.

Atributos: daño normal 9, resistencia 102, velocidad 6/10 (262 unidades/s), alcance físico 5/10, recuperación 0,62 s. Se conservan las fórmulas compartidas de daño/resistencia del juego; 22 y 35 son daño base, no porcentajes finales contra cualquier rival.

## Traslado de Personal

Costo 30 %, daño base 22, alcance de contacto 608 (8/10). Seña con la mano, colectivo rojo/anaranjado basado en la foto aportada, 390 unidades de ancho y 720 unidades/s. La carrocería aparece detrás de Darío y la parte delantera avanza hacia el rival. La colisión barre el desplazamiento de cada paso, alcanza distintas alturas, puede cubrirse o esquivarse saltando a tiempo. Impacta una sola vez con empuje 510 y elevación −190. Después del contacto el colectivo sigue cruzando hasta salir de escena; su carrocería y su cola no causan impactos adicionales ni daño fuera del alcance.

## Vuelo Programado

Costo 100 %, daño base 35, alcance inicial 684 (9/10). Cinemática de 3,65 s; Darío lleva el handy a la boca. El avión regional blanco/azul de doble hélice aparece a los 0,55 s, pasa a baja altura y desciende hacia el rival. Su morro alcanza la zona del impacto a los 2,40 s. Golpe único, polvo, humo, destello, escombros y sacudida. La música se pausa y reanuda como en los demás especiales. El rival no puede moverse, saltar o atacar durante la secuencia; la cobertura funciona con la misma reducción a 30 % del daño que los demás súper. Al terminar se libera la reacción, o continúa únicamente el derribo normal y su levantada. Menús, KO y cambio de round limpian la secuencia y el sonido. Dibujar no avanza el tiempo; pausa congela animación y audio.

## Integración

Selección de diez personajes en dos filas de cinco, navegación vertical de cinco posiciones, retrato y medallas de ambos poderes. Torneo de nueve rivales únicos, torre, CPU, controles táctiles y ambos jugadores locales. La novena pelea usa el nivel SUPREMO; los primeros ocho escalones mantienen sus valores previos. Ranking: se admite `dario` en la restricción de personaje y la política de inserción; RLS, límites, permisos y registros previos se conservan. La prueba de inserción anónima se revierte con ROLLBACK.

## Arte

Atlas de dieciséis poses y recorte de presentación generados a partir de la última lámina de Darío. Vehículos generados a partir de las dos fotos del usuario, conservando el colectivo de pasajeros rojo/anaranjado y el turbohélice regional blanco/azul. Transparencia real, pixel art 16 bits, WebP sin pérdida. Archivos: `dario-atlas-v1.webp`, `dario-presentation-v1.webp`, `dario-bus-v1.webp`, `dario-plane-v1.webp`. Empaquetado: `scripts/build-dario-assets.cjs` con las tres imágenes fuente (atlas, presentación y vehículos). Poses del atlas por filas: guardia/puño/patada/reacción; seña/barrida/pasos; agachado/bloqueo/salto/patada aérea; gancho/caído/radio/evasión.

## Audio y procedencia

Se utilizan grabaciones de campo reales, todas CC0 según las páginas originales de Freesound consultadas el 03/11/2026:

- **Mihacappy — bushigh2.wav**: motor MAN/Solaris acelerando. https://freesound.org/people/Mihacappy/sounds/803766/
- **Sclolex — C130TurboPropFlyBy.wav**: pasada real de avión turbohélice. https://freesound.org/people/Sclolex/sounds/239918/
- **pushkin — radio chatter 01.wav**: comunicación de radio. https://freesound.org/people/pushkin/sounds/100416/
- Licencia: https://creativecommons.org/publicdomain/zero/1.0/

Se recortan, filtran, mezclan y funden las grabaciones para mantenerlas breves. No se imita la voz de Darío ni se atribuye una frase concreta a la comunicación. Los impactos combinan las capas originales del proyecto de golpe corporal y metal; no hay sonidos caricaturescos. El golpe del avión se mezcla exactamente a los 2,40 s. Reconstrucción: `python scripts/build-dario-audio.py [directorio-cache]`. Salidas: `wo-personnelBus-v1.mp3` (2,25 s), `wo-personnelBusImpact-v1.mp3` (0,78 s), `wo-flightSuper-v1.mp3` (3,65 s).

## Verificación

`tests/dario.test.cjs` cubre ambas direcciones/jugadores, todas las alturas, daño único, empuje, costo, rango, salto, cobertura, pausa, controles móviles, recuperación, cancelación, posiciones del avión y selección/torneo. Se ejecutan además las pruebas de personajes existentes, ranking, torre, reintento, audio móvil, cameo y rendimiento. Se revisan capturas dibujadas por el motor real con sus sprites y escenarios.

No se prepara, compila, firma ni publica un APK.
