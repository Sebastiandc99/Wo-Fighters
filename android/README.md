# WO Fighters Android

Bundled offline game; rankings synchronize when online. Original image/audio bytes remain identical.

## Permanent signed releases

The private signing backup is kept outside this public repository. Never commit its keystore, password or publisher token. The installed debug 1.0.0 requires one uninstall before installing permanent release 1.1.0. Later signed releases can update in place, retaining local data.

For each release keep applicationId `com.sebastiandc.wofighters`, increase versionCode and versionName in app/build.gradle, prepare assets and run tests. Push android-hybrid to build the unsigned release in Actions. Download and extract the artifact (unsigned APK and official apksigner.jar), extract the private backup to a separate directory, then run:

```sh
python3 android/sign-publish.py /absolute/release /absolute/private-backup /absolute/output
```

This signs with the same permanent key, verifies every original asset, uploads the APK to its immutable public URL, verifies its SHA-256 from that URL and only then advances latest.json. The update notice checks in the background when online, appears only on the title screen, and opens the trusted download in the browser. Android asks the player to install. The APK does not install itself silently.

Do not publish an unsigned APK or generate a replacement key. Keep the private backup safe: losing it prevents future updates to this installed application.
