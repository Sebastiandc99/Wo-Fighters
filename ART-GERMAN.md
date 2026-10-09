# Germán: arte y audio

El personaje toma como referencia el diseño provisto: inspector de Seguridad
e Higiene robusto, casco blanco, camisa amarilla de manga corta, pantalón azul,
botas, radio en el cinturón y anteojos colgados. Las poses miran a la derecha
y el motor las refleja para el otro lado. No incluyen marcas corporativas.

## Archivos

- `assets/german-atlas-v1.webp`: 16 poses, cuadrícula 4 × 4 con celdas de 270 px.
  Orden: espera, puño, patada, impacto; cadena, barrida, marcha A/B;
  agachado, defensa, salto, aterrizaje; gancho, derribo, patada aérea y defensa baja.
- `assets/german-signals-v1.webp`: STOP A/B, saludo con casco y victoria;
  cuatro celdas horizontales de 270 px.
- `assets/german-portrait-v1.webp`: retrato transparente de selección y torre,
  512 × 800 px, derivado de la pose de saludo.
- `assets/german-chain.svg` y `assets/german-stop.svg`: insignias de la ficha.
- `assets/wo-safetyChain-v1.wav`: lanzamiento e impacto de cadena, 0,82 s.
- `assets/wo-safetySuper-v1.wav`: sirena de dos tonos, anticipación e impacto,
  3,25 s. Ambos sonidos son originales, mono a 22.050 Hz.

Las dos hojas se generaron con fondo transparente y estilo arcade pixel art,
manteniendo identidad, indumentaria y proporciones de la referencia. El
empaquetador extrae las siluetas, usa una escala común por hoja y alinea los pies
en y=260 sin recortar extremidades ni la cadena:

```sh
node scripts/build-german-assets.cjs combat.png signals.png
python3 scripts/build-german-audio.py
```

La cadena del poder se dibuja además como eslabones rojos/blancos, con extensión,
retracción y tres vueltas helicoidales sobre el rival durante los 3 s de
inmovilización. Las vueltas pasan por detrás y delante de su silueta. La
cinemática usa las poses STOP, cartel octogonal en la mano, sirena, balizas,
señales y un cerco helicoidal que se cierra y remata al tensarse.
Todos los efectos se rigen por el reloj de combate y se detienen al pausar.

## Verificación

`tests/german.test.cjs` comprueba atributos, selección, los siete pisos,
los ocho cuerpos en ambos sentidos, defensa/salto/evasión, energía, alcance,
daño único, inmovilización, pausa, súper de ambos jugadores, CPU, táctil,
sprites móviles y limpieza tras K.O. o regreso al menú. Las capturas del motor
se revisaron con Canvas real para comprobar poses, cadena, súper y final de torre.
La suite actual de Wo Fighters terminó con 123 pruebas aprobadas, incluyendo
inmovilización exacta, golpes posteriores y música de los ocho súper.
