# Neurovit Android Sideload (APK debug por USB)

## Restricciones fijas del proyecto
- El Application ID se mantiene en `com.neurovit.desktop`.
- No cambies el esquema deeplink (`neurovit`) ni el callback `neurovit://auth/google/callback`.
- No omitas firma de código: usa al menos build `debug` (APK firmado con debug keystore).

## Configuracion de backend/deeplink utilizada
- `VITE_MOBILE_BACKEND_MODE=railway`
- `VITE_MOBILE_API_URL_RAILWAY=https://web-production-b34f68.up.railway.app/api`
- `VITE_API_URL_RAILWAY=https://web-production-b34f68.up.railway.app/api`
- `VITE_MOBILE_DEEP_LINK_SCHEME=neurovit`
- `VITE_GOOGLE_CLIENT_ID=<cliente Google configurado>`

## Configuracion inicial (una sola vez)
1. Instala Android Studio.
2. En SDK Manager instala:
- Android SDK Platform
- Android SDK Platform-Tools
- Android SDK Build-Tools
- Android SDK Command-line Tools
- NDK (Side by side)
3. Configura variables en `~/.zshrc`:
```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 $ANDROID_HOME/ndk | tail -n 1)"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```
4. Recarga shell:
```bash
source ~/.zshrc
```
5. Instala targets Rust Android:
```bash
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```
6. En el telefono Android:
- Activa `Opciones de desarrollador`.
- Activa `Depuracion USB`.
7. Conecta el telefono por USB y acepta huella RSA cuando aparezca.
8. Verifica dispositivo:
```bash
adb devices
```
9. Desde el repo de la app, valida entorno:
```bash
cd /Users/javier/Documents/nuv-tfg-app
npm run mobile:check
```
10. Si faltara el proyecto Android, inicializalo:
```bash
npm run mobile:android:init
```

## Flujo de instalacion/reinstalacion (misma receta para primera instalacion y actualizaciones)
1. Desde el directorio del repositorio:
```bash
cd /Users/javier/Documents/nuv-tfg-app
npm run build
```
2. Compila APK debug Android:
```bash
npx tauri android build --debug
```
3. Instala en el telefono por ADB:
```bash
adb install -r src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk
```
4. Abre la app en el telefono desde el launcher.

## Alternativa rapida (compilar + instalar en un paso)
```bash
cd /Users/javier/Documents/nuv-tfg-app
npm run mobile:android:run
```

## Si la instalacion falla
1. Si `adb devices` muestra `unauthorized`:
- Desbloquea el telefono.
- Acepta el dialogo de depuracion USB.
- Repite `adb devices`.
2. Si aparece `INSTALL_FAILED_VERSION_DOWNGRADE`:
- Desinstala y reinstala:
```bash
adb uninstall com.neurovit.desktop
adb install src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk
```
3. Si no encuentras el APK:
```bash
find src-tauri/gen/android/app/build/outputs/apk -name "*.apk" -print
```
4. Si Google login abre navegador pero no vuelve a la app:
- Verifica `VITE_MOBILE_DEEP_LINK_SCHEME=neurovit`.
- Verifica en `AndroidManifest.xml` que exista `scheme=neurovit`, `host=auth`, `pathPrefix=/google/callback`.
- Recompila e instala de nuevo.

## Verificacion posterior a la instalacion
1. La app abre desde la pantalla de inicio.
2. Carga la pantalla de login (sin pantalla en blanco).
3. Login con email/contrasena funciona contra Railway.
4. Flujo Google Sign-In vuelve por `neurovit://auth/google/callback` y crea sesion.
5. Al menos una vista conectada a Railway carga datos.
