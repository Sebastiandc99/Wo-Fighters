# WO Fighters Android
APK independiente, Android 8 o posterior, pantalla horizontal. Todo el contenido de la versión web de 09/10/2026 está incluido sin reducción ni recompresión. La web de main permanece independiente.

Los resultados se guardan primero en localStorage del WebView y se sincronizan mientras la aplicación está abierta, al recuperar una conexión validada, al volver a la app y con reintentos limitados a 30 segundos. No se consulta el servidor sin conexión. El ranking se muestra inmediatamente desde datos locales y la última copia global. Los reintentos mantienen el ID de partida. No se requiere login.

Validación de datos en cliente y restricciones/RLS en wo_scores; solo lectura e inserción pública, sin modificar resultados existentes. Esto evita duplicados y entradas fuera de límites; el juego offline no puede garantizar que un usuario avanzado no fabrique un resultado. Para antitrampas fuerte, un futuro modo online necesita validación del combate en servidor.

Preparación: python3 android/prepare.py
Pruebas: node --test android/tests/*.test.cjs
Compilación: Gradle 8.11.1 y JDK 17; gradle -p android assembleDebug
Verificación: python3 android/verify-apk.py

Primera versión de distribución privada, firmada con una clave de desarrollo generada por el entorno de compilación. Nunca se publica una clave privada. Antes de distribuir actualizaciones con instalación sobre una versión anterior, configurar una clave de firma permanente mediante secretos de GitHub. No generar otra clave y afirmar que permite actualizar sin reinstalar. Esta entrega no incorpora combate online.

Desinstalar o borrar los datos elimina los puntajes locales pendientes. Los puntajes sincronizados siguen en el ranking global.
