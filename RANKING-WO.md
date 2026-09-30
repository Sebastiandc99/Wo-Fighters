# Ranking público de Wo Fighters

El juego guarda nombre, puntaje, modo, personaje e identificador de partida en `public.wo_scores` del proyecto Supabase existente KPFighter. Conserva el mismo formulario, ranking histórico y orden por puntaje que KP Fighters. La ruta de ranking de KP Fighters no se modifica.

Configuración de base de datos: `supabase/wo-ranking.sql`, aplicada mediante la migración `wo_public_ranking`. La tabla acepta los siete personajes y puntajes enteros de 0 a 1.000.000. RLS habilitado: el rol público puede leer y agregar resultados; no puede editarlos, borrarlos ni alterar la fecha del servidor. El cliente usa solo una clave pública.

Los reintentos usan el mismo identificador con `resolution=ignore-duplicates` para evitar duplicar una partida que se guardó antes de una interrupción de red. Lectura paginada de 100 registros, con un registro adicional para detectar la página siguiente. Orden estable por puntaje descendente, fecha ascendente e identificador ascendente.

Verificación: inserción de los siete personajes con el rol `anon`, revertida al terminar; lectura y permisos públicos comprobados. Recuperado el resultado real visible en la captura: Seba, J. Linares, 171.817 puntos, torneo individual. Pruebas del formulario, reintentos, los siete personajes y paginación completa.
