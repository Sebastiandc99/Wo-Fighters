# Wo Fighters

Juego arcade para navegador, inspirado en la dinámica de KP Fighter y creado como proyecto independiente.

## Juego

- Ángel: **Carga Suspendida** (L / botón Poder, 30% de barra, daño base 23) y **Gancho Maestro** (abajo + L / abajo + Poder, 100%, daño base 34).
- Primitivo: **Descarga Express** (L / Poder, 30%, daño base 22) y **Lanzamiento de Contenedor** (abajo + L / abajo + Poder, 100%, daño base 35).
- Peluche: **Hormigonazo** (L / Poder, 30%, daño base 22) y **Colado Masivo** (abajo + L / abajo + Poder, 100%, daño base 34).
- El especial reproduce una secuencia cinematográfica, detiene los controles de ambos personajes y aplica el impacto al final.
- Torneo individual, dos jugadores locales, tres escenarios, controles de teclado y pantalla táctil, cámara, música, voces de rounds y KO.
- La resistencia altera el daño final igual que en la base original. Online y ranking de KP Fighter no se conectan a este juego.
- Cada luchador tiene 16 poses laterales: espera, golpes, poder, barrida, pasos de marcha, agacharse, defensa, salto, aterrizaje, uppercut, patada aérea y giro. Usan las mismas transiciones y mezcla de animaciones de KP Fighter.
- Selección con el fondo original de KP Fighter, recuadros y vista previa transparente. Se elige con clic o flechas; pasar el mouse o enfocar con Tab no cambia la elección.
- Poses revisadas a partir de las referencias originales de Ángel y Primitivo.

## Verificación

`node --test tests/wo.test.cjs tests/peluche.test.cjs tests/physics-parity.test.cjs tests/melee.test.cjs tests/endurance.test.cjs tests/super-show.test.cjs` prueba poderes con dibujo por fotograma, controles de teclado y táctiles para ambos jugadores, cinemáticas de la CPU, cambio de ronda y selección. Las pruebas heredadas de KP Fighter incluyen personajes y ranking que no forman parte de este juego.

GitHub Pages: https://sebastiandc99.github.io/Wo-Fighters/

Motor de referencia: `Sebastiandc99/KPFighter@7272d498a80a738c1c16ebcb026f052625dcfb4e`. Se conservan aceleración, frenado, colisiones y tiempos de ataque. El gancho ahora tiene su propia caída completa, por pedido del usuario. Ángel usa la movilidad de Jairo y Primitivo la de Sergio; mantienen sus poderes y atributos de daño propios.

## Revisión visual

Primitivo es más alto y robusto, pelado debajo del casco y completamente afeitado. Ángel es considerablemente más bajo. Los tamaños de colisión acompañan las nuevas proporciones. Los poderes tienen imágenes transparentes propias: montacargas con ruedas animadas, contenedor con trayectoria de lanzamiento e impacto, carga de vigas y gancho de izaje. La marca corporativa se retiró de los gráficos que la contenían.


## Peluche — supervisor civil

| Atributo | Valor |
| --- | --- |
| Daño normal (escala de atributos de KP) | 9 |
| Resistencia | 110 |
| Velocidad | 5/10; 250 unidades/s |
| Alcance físico | 4/10; 82% del alcance base de cada golpe |
| Recuperación tras ataques | 0,64 s |
| Hormigonazo | 22 de daño base; costo 30%; alcance 7/10 (532 unidades) |
| Colado Masivo | 34 de daño base; costo 100%; alcance 8/10 (608 unidades) |

Las barras de vida permanecen normalizadas al 100%; resistencia 110 reduce el daño recibido con el mismo cálculo del motor. El daño normal conserva la escala proporcional de los golpes de KP. El daño de los poderes es el valor base antes de resistencia y defensa.

Hormigonazo lleva arco suave, gotas, impacto único, retroceso moderado y restos de mezcla visibles. Colado Masivo dura 2,65 segundos: señal, manga, descarga, atrapamiento, endurecimiento y rotura a los 1,90 segundos. No consume barra si el rival está fuera del alcance del súper. Ambos jugadores recuperan el control al terminar.

Ángel y Primitivo también tienen sonidos propios en sus dos poderes: cable/izaje y metal para Ángel, motor/montacargas y golpe de contenedor para Primitivo. Los sonidos se pausan y reanudan junto con las animaciones, y se limpian al salir o cambiar de ronda.

37 pruebas automatizadas cubren los tres personajes, ambos sentidos, defensa/evasión, daño único, alcance, torneo, teclado/táctil, reloj del sonido y paridad de física de Ángel y Primitivo con KP. Prompts y archivos gráficos: [ART-PELUCHE.md](ART-PELUCHE.md).

## Golpes y derribo

Peluche es un poco más bajo que Ángel, tanto en el combate como en la selección. Su escala visual y su cuerpo de colisión se redujeron juntos.

Los puños, patadas y ganchos tienen impactos secos propios, con graves y chasquido breve; el sonido de contacto solamente se reproduce al acertar. Los golpes al aire llevan un soplido corto. Audio original reproducible con `python scripts/build-melee-audio.py`.

Un gancho sin bloquear lanza al rival hacia atrás, lo rota hasta caer de espaldas, mantiene 0,40 s en el suelo y permite levantarse en 0,28 s. Durante el derribo no se puede atacar ni recibir otro golpe; al terminar se recupera el control. Una defensa correcta evita el derribo y un K.O. mantiene al rival caído. `tests/melee.test.cjs` cubre las nueve combinaciones de personajes en ambos sentidos, pausa, bordes, defensa, audio y recuperación con teclado/táctil. La referencia de KP se vuelve a generar desde el motor original usando la tecla de guardia real; el gancho sin bloquear se verifica por separado porque su comportamiento cambió intencionalmente.

## Resistencia y guías de juego

Todos los daños (puños, patadas, ganchos, poderes, súper y daño residual al cubrirse) se multiplican por 0,60, una sola vez antes de la resistencia. Se conserva la barra al 100% y el balance relativo: se necesita aproximadamente un 67% más de daño bruto para vencer. Las rondas duran 90 segundos. Los costos de energía siguen en 30% y 100%.

La selección muestra una ficha lateral con ambos poderes, daño porcentual contra resistencia 100, energía, resistencia, velocidad y fuerza. La pausa incluye controles de teclado y táctiles, ganchos/barridas, poderes y el daño real contra el rival elegido. Los datos se calculan desde los mismos atributos del combate.

## Súper cinematográficos y recarga

Los tres súper suman aura de activación, líneas de velocidad, partículas ascendentes, triple onda expansiva, destello único de impacto y escombros. Ángel ilumina el cable de izaje, Primitivo deja estelas del contenedor y Peluche conserva su descarga y rotura de hormigón. Cada uno mantiene su paleta y objetos reconocibles. El temblor crece antes del golpe y se intensifica al rematar. Los efectos usan el reloj de la pelea: la pausa congela toda la secuencia.

Audio v2 original con graves, subida de tensión, capas de impacto y reverberación breve; se genera con `python scripts/build-wo-audio.py --supers`. El golpe cinematográfico ya no interrumpe el sonido del remate.

La energía se obtiene un 25% más despacio en todas las fuentes: recarga pasiva 2,4 puntos/s, defensa 3 puntos y ganancias por daño multiplicadas por 0,75. Desde los 40 puntos iniciales se necesitan 25 s sin combatir para llegar a 100, frente a 18,75 s antes. Costos y daño permanecen iguales.
