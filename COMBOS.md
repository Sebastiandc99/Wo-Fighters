# Combos por personaje

Se adaptó la idea de las cadenas predeterminadas de MK3 a los controles de
Wo Fighters. Se mantienen un botón de golpe y uno de patada, con los
modificadores existentes: abajo para gancho/barrida y atrás para volea.

Fuentes consultadas:

- Manual original de MK3 para Super Nintendo, páginas impresas 9–13:
  https://www.videogamemanual.com/snes/Mortal%20Kombat%203%20(USA).pdf
- Secuencias del juego recopiladas en MKWarehouse:
  https://www.mortalkombatwarehouse.com/mk3/combos/

La adaptación usa combinaciones propias; no añade botones de golpes altos
ni bajos. **G = golpe; P = patada; ↓ = abajo; ← = atrás respecto al rival.**
En teclado: J/K para 1P y 7/8 para 2P. En celular: los botones actuales A/B.

| Personaje | Combo | Secuencia | Golpes | Daño contra resistencia 100 | Remate |
| --- | --- | --- | ---: | ---: | --- |
| Ángel | Maniobra de izaje | G → P → ↓G | 3 | 10,2% | Gancho con derribo |
| Ángel | Descarga lateral | P → G → ←P | 3 | 9,0% | Volea y separación |
| Primitivo | Puños de acero | G → G → P | 3 | 10,5% | Patada pesada |
| Primitivo | Descarga pesada | P → G → ↓G | 3 | 12,6% | Gancho pesado |
| Peluche | Compactadora | G → ↓P → P | 3 | 9,9% | Empuje a corta distancia |
| Peluche | Base firme | P → ↓P → G → ↓G | 4 | 13,7% | Gancho tras barrida |
| Tren Valencia | Secuencia de arco | P → P → ←P | 3 | 8,3% | Volea rápida |
| Tren Valencia | Tormenta de golpes | G → P → G → P → ←P | 5 | 11,4% | Alternancia rápida y volea |
| J. Linares | Fase cruzada | G → P → ←P | 3 | 7,9% | Volea técnica |
| J. Linares | Trifásico | P → G → P → ↓G | 4 | 10,9% | Gancho rápido |
| Gabriel | Camino directo | G → G → ↓G | 3 | 8,5% | Gancho de precisión |
| Gabriel | Ruta crítica | P → G → ↓P → ←P | 4 | 10,5% | Barrida y volea |
| Heraldo Fichero | Golpe de obra | G → G → ←P | 3 | 8,8% | Volea con empuje |
| Heraldo Fichero | Remate civil | G → ↓P → G → P | 4 | 11,7% | Patada con empuje |

Los porcentajes son la suma de impactos sin cubrirse, redondeada a una cifra.
La pausa calcula el daño contra la resistencia del rival concreto. Los combos
no gastan energía; los poderes conservan sus costos y daño.

## Criterio de combate

- Cada pulsación aporta exactamente un golpe. Las entradas se pueden marcar
  rápidamente antes de que termine la primera animación, pero el motor sólo
  encadena después de un impacto real sin bloquear.
- Las cadenas usan los golpes, sonidos y poses existentes. La velocidad,
  potencia y avance de los enlaces dependen del personaje: Primitivo es pesado,
  Peluche conserva poco alcance y los eléctricos encadenan más rápido.
- La patada aislada conserva su salto original. Sólo si se introduce una
  continuación válida se acorta ese pequeño salto para aterrizar y enlazar.
  Las patadas aéreas reales conservan su comportamiento.
- Un fallo, un bloqueo correcto, un golpe recibido, saltar o pedir defensa
  cancela la continuación. Agacharse o mantener atrás afecta únicamente a la
  entrada indicada, aunque se suelte la dirección antes de reproducirla.
- Los enlaces reducen el empuje intermedio para permanecer al alcance sin
  teletransportar a nadie. El remate aumenta el empuje o usa el derribo del gancho.
- El último impacto deja 0,32 s de protección al rival y 0,45 s antes de poder
  iniciar otra cadena. La recuperación y la separación permiten defenderse;
  no se enlazan cadenas infinitas contra una esquina.
- La CPU puede ejecutar sus propias cadenas. La probabilidad por apertura en
  los seis niveles del torneo es 0%, 12%, 22%, 36%, 48% y 62%; se mantiene el
  primer rival y se exige confirmar los impactos para continuar.
- Pausa congela entradas, relojes y animaciones. K.O., cinemáticas y nuevas
  rondas limpian las continuaciones pendientes.
- Selección y pausa muestran ambas secuencias. El contador de combate informa
  golpes, daño efectivo y el nombre del combo completado, con la fuente del título.

## Validación

`tests/combos.test.cjs` usa el motor y los controles reales. Comprueba las 14
secuencias contra los siete cuerpos, ambos lados y jugadores; teclado y táctil;
entradas rápidas y espaciadas; modificadores; daño anunciado; pausas; errores;
interrupciones; bloqueos; esquinas; K.O.; balance y CPU progresiva.
La regresión de Wo también conserva la paridad de los golpes aislados de Ángel
y Primitivo con KP, los poderes, el torneo y el rendimiento móvil.

En la suite online heredada hay tres fallos anteriores a esta revisión
(supuestos antiguos sobre K.O., cantidad de personajes y escala de daño).
Se ejecutó la misma suite sobre la versión base y se confirmó que son idénticos.
