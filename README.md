# Wo Fighters

Juego arcade para navegador, inspirado en la dinámica de KP Fighter y creado como proyecto independiente.

## Juego

- Ángel: **Carga Suspendida** (L / botón Poder, 30% de barra, daño base 23) y **Gancho Maestro** (abajo + L / abajo + Poder, 100%, daño base 34).
- Primitivo: **Descarga Express** (L / Poder, 30%, daño base 22) y **Lanzamiento de Contenedor** (abajo + L / abajo + Poder, 100%, daño base 35).
- El especial reproduce una secuencia cinematográfica, detiene los controles de ambos personajes y aplica el impacto al final.
- Torneo individual, dos jugadores locales, tres escenarios, controles de teclado y pantalla táctil, cámara, música, voces de rounds y KO.
- La resistencia altera el daño final igual que en la base original. Online y ranking de KP Fighter no se conectan a este juego.
- Cada luchador tiene 16 poses laterales: espera, golpes, poder, barrida, pasos de marcha, agacharse, defensa, salto, aterrizaje, uppercut, patada aérea y giro. Usan las mismas transiciones y mezcla de animaciones de KP Fighter.
- Selección con el fondo original de KP Fighter, recuadros y vista previa transparente. Se elige con clic o flechas; pasar el mouse o enfocar con Tab no cambia la elección.
- Poses revisadas a partir de las referencias originales de Ángel y Primitivo.

## Verificación

`node --test tests/worley.test.cjs tests/physics-parity.test.cjs` prueba poderes con dibujo por fotograma, controles de teclado y táctiles para ambos jugadores, cinemáticas de la CPU, cambio de ronda y selección. Las pruebas heredadas de KP Fighter incluyen personajes y ranking que no forman parte de este juego.

GitHub Pages: https://sebastiandc99.github.io/Worley-Fighters/

Motor de referencia: `Sebastiandc99/KPFighter@7272d498a80a738c1c16ebcb026f052625dcfb4e`. Se conservan gravedad, aceleración, frenado, colisiones, tiempos de ataque y reacción. Ángel usa la movilidad de Jairo y Primitivo la de Sergio; mantienen sus poderes y atributos de daño propios.
