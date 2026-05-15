# Aplicación Neurovit (Tauri + React)

Proyecto Tauri v2 con frontend React/Vite.

## Comandos base

```bash
npm run dev
npm run tauri:dev
npm run build
npm run tauri:build
```

## Google mobile auth (local + Railway)

Para poder probar deeplink en local y también contra Railway, usa estos env vars en `.env`:

```bash
VITE_BACKEND_MODE=auto              # auto | local | railway
VITE_API_URL_LOCAL=http://localhost:8080/api
VITE_API_URL_RAILWAY=https://web-production-b34f68.up.railway.app/api

VITE_MOBILE_BACKEND_MODE=auto       # auto | local | railway
VITE_MOBILE_API_URL_LOCAL=http://localhost:8080/api
VITE_MOBILE_API_URL_RAILWAY=https://web-production-b34f68.up.railway.app/api
VITE_TAURI_MOBILE_GOOGLE_DEBUG=false # true para activar timeline debug en login móvil
```

Cómo funciona:

- `auto`: en `dev` usa local; en build no-dev prioriza Railway.
- `local`: fuerza backend local.
- `railway`: fuerza backend Railway.

Notas:

- Android emulator convierte `localhost` a `10.0.2.2` automáticamente en el flujo de Google mobile start.
- Reinicia la app después de cambiar `.env`.

## Comandos móviles

```bash
# Diagnóstico rápido del entorno
npm run mobile:check

# iOS
npm run mobile:ios:init
npm run mobile:ios:dev

# Android
npm run mobile:android:init
npm run mobile:android:dev
```

## Estado actual del proyecto (móvil)

- iOS: inicializado (`src-tauri/gen/apple` existe).
- Android: pendiente de inicializar (se crea con `npm run mobile:android:init` cuando el SDK esté configurado).

## Setup iOS (macOS)

1. Instala/abre Xcode una vez y acepta licencias.
2. Instala CocoaPods:

```bash
brew install cocoapods
```

3. Instala targets Rust de iOS:

```bash
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim
```

4. Si el simulador no responde, reinicia servicios:

```bash
killall Simulator || true
sudo killall -9 com.apple.CoreSimulator.CoreSimulatorService || true
open -a Simulator
```

5. Lanza la app:

```bash
npm run mobile:ios:dev
```

## Setup Android (macOS)

1. Instala Android Studio.
2. Desde SDK Manager instala:
- Android SDK Platform
- Android SDK Platform-Tools
- Android SDK Build-Tools
- Android SDK Command-line Tools
- NDK (Side by side)
- Android Emulator

3. Añade variables a `~/.zshrc`:

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

5. Instala targets Rust de Android:

```bash
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

6. Inicializa Android en Tauri y ejecuta:

```bash
npm run mobile:android:init
npm run mobile:android:dev
```

## Primer flujo recomendado de trabajo móvil

1. Ejecuta `npm run mobile:check`.
2. Levanta `npm run mobile:ios:dev` para iterar rápido.
3. Cuando Android esté listo, valida también con `npm run mobile:android:dev`.
4. Haz los cambios UI/lógica en `src/` y, si necesitas nativo, en `src-tauri/`.
