# WO Fighters para Android

APK híbrido con juego incluido. La web de GitHub Pages no cambia.
Android 8.0 o superior, orientación horizontal y aceleración por hardware.

Todos los recursos se copian sin conversiones y se verifican con SHA-256 antes y después de empaquetar. No se descarga ningún recurso en el primer inicio.

El ranking conserva Supabase y wo_scores. Cada resultado se guarda primero de forma persistente en el teléfono. Una cola reintenta al recuperar conexión, al volver a la app y mientras haya conexión. Los reintentos mantienen el identificador y usan ignore-duplicates. Sin conexión muestra puntajes del teléfono. Los fallos del servidor no interrumpen partidas.

El almacenamiento usa SharedPreferences con commits síncronos y firma HMAC-SHA256 mediante una clave no exportable del Android Keystore. El cliente y Supabase validan límites, campos y personajes. Esto detecta alteraciones del archivo local y evita duplicados, pero no demuestra que un puntaje se obtuvo legítimamente: un dispositivo comprometido o cliente modificado puede falsear el juego. La prevención fuerte de trampas requiere verificación de partidas en servidor. No se incluyen claves privadas de Supabase.

Sincroniza mientras la aplicación está abierta. Al abrirla nuevamente retoma la cola. Desinstalar o borrar datos elimina puntuaciones no sincronizadas. Partidas online entre dispositivos quedan para una futura actualización; torneos y dos jugadores locales funcionan sin conexión.

## Compilación y respaldo
La acción Construir APK WO Fighters genera un APK release firmado y verifica todos los recursos.
Artefactos privados:
- WO-Fighters-Android: APK y manifiesto de hashes.
- wo-fighters-signing-backup: clave y contraseña. Guardar este respaldo privado para futuras actualizaciones. No compartir ni subir al repositorio público.

Compilación local: Java 17, SDK 35, Gradle 8.11.1.
Ejecutar python3 android/prepare-assets.py; node --test android/hybrid.test.cjs; gradle -p android assembleRelease.
Definir WO_KEYSTORE y WO_SIGNING_PASSWORD con la identidad de firma original.
