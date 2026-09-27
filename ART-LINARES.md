# J. Linares — 27/09/2026

Se incorpora como quinto personaje jugable en Wo Fighters (torneo individual y dos jugadores locales), con retrato de selección y 16 poses propias.

| Atributo | Valor de referencia |
| --- | --- |
| Altura | 1,75 m; misma altura que Tren Valencia |
| Contextura | Delgada; piel morena clara |
| Daño normal | 8 |
| Resistencia | 90 |
| Velocidad | 8/10 |
| Alcance físico | 6/10, misma base que Valencia |
| Recuperación | 0,54 s |
| Cable de Alta Tensión | Daño 23, costo 30%, alcance 8/10 |
| Descarga de Transformador | Daño 34, costo 100%, alcance 9/10 |

Los daños pasan por DAMAGE_SCALE=.70 y la resistencia del rival, igual que los demás personajes. No se modifica la duración global de los rounds. El alcance 8/10 corresponde a 608 unidades y 9/10 a 684, igual que Valencia.

El cable permanece anclado a la mano, se extiende y retrae, y su punta eléctrica comprueba colisión barrida. Solo puede causar un impacto; admite bloqueo, salto y evasión. Se activa con Poder. Abajo + Poder con barra llena activa la secuencia del transformador: carga, arcos entre bushings, descarga al rival a los 2,05 s, electrocución y caída. La secuencia dura 3,1 s y bloquea ataques y desplazamiento; respeta pausa y limpieza al salir.

## Arte

Generado con la herramienta integrada de imágenes, usando las dos referencias provistas por el usuario; no se publican las imágenes fuente. Se conserva gorra amarilla, rostro, ropa amarilla/azul y cable en cintura. El transformador conserva radiadores, bushings y conservador cilíndrico lateral superior.

Prompts utilizados: hoja transparente 4×4 de 16 poses laterales mirando a la derecha, misma escala corporal en cada celda; retrato transparente de cintura hacia arriba saludando con la gorra, sin texto ni fondo; transformación de la referencia real a un objeto transparente pixel art de transformador gris con los elementos mencionados. Empaquetado y conversión a WebP con los scripts del proyecto. Los efectos eléctricos y el cable se animan en Canvas; sonidos originales sintetizados por `scripts/build-linares-audio.py`.

## Validación

68 pruebas enfocadas aprobadas: nuevo personaje, ambos poderes en ambas direcciones, rivales de distintos tamaños, costos y alcance, guardia/salto/evasión, CPU, pausa, controles locales, móvil, selección, torneo, física, sonidos y ranking. Se renderizan escenas con Canvas real para inspeccionar poses, latigazo y especial. La suite heredada de KP contiene fallos preexistentes que también se reproducen en el commit base abd5252.
