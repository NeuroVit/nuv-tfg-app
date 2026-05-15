# Neurovit iOS Sideload (Apple ID gratuito)

## Restricciones fijas del proyecto
- El Bundle ID se mantiene en `com.neurovit.desktop`.
- No edites manualmente `src-tauri/gen/apple/app.xcodeproj/project.pbxproj`.
- No edites manualmente `src-tauri/gen/apple/app_iOS/Info.plist`.
- No omitas la firma de código.

## Configuración de backend/deeplink utilizada
- `VITE_MOBILE_BACKEND_MODE=railway`
- `VITE_MOBILE_API_URL_RAILWAY=https://web-production-b34f68.up.railway.app/api`
- `VITE_API_URL_RAILWAY=https://web-production-b34f68.up.railway.app/api`
- `VITE_MOBILE_DEEP_LINK_SCHEME=neurovit`
- `VITE_GOOGLE_CLIENT_ID=<cliente iOS configurado>`

## Configuración inicial (una sola vez)
1. Apple ID agregado en Xcode.
2. Modo Desarrollador del iPhone habilitado.
3. En el proyecto de Xcode `src-tauri/gen/apple/app.xcodeproj`:
- Target: `app_iOS`
- Signing: `Automatically manage signing = ON`
- Team: equipo personal gratuito
- Bundle Identifier: `com.neurovit.desktop`

## Flujo de instalación/reinstalación (sirve para primera instalación y re-firma semanal)
1. Desde el directorio del repositorio de la app:
```bash
cd /Users/careexpand/Desktop/Neurovit/nuv-tfg-app
npm run build
```
2. Inicia la compilación iOS de Tauri y abre Xcode desde CLI:
```bash
npx tauri ios build --debug --target aarch64 --open
```
3. Mantén esa terminal abierta (es necesario para el script de Xcode de Tauri).
4. En Xcode abierto:
- Selecciona destino de ejecución: iPhone físico.
- Target: `app_iOS`.
- `Product > Run`.
5. Espera a que termine la instalación en el dispositivo.
6. Si el iPhone muestra desarrollador no confiable:
- iPhone `Ajustes > General > VPN y gestión de dispositivos` -> confía en tu Apple ID.

## Renovación cada 7 días (caducidad de Apple ID gratuito)
1. Vuelve a conectar el iPhone al Mac.
2. Repite el flujo completo de instalación/reinstalación anterior.
3. Abre la app al menos una vez estando conectado.
4. Desconecta y verifica que la app abre desde la pantalla de inicio.

## Si la compilación falla con `PhaseScriptExecution ... nonzero exit code`
1. Abre los detalles del error y revisa si aparece:
- `failed to read CLI options`
- `failed to build WebSocket client`
2. Solución:
- Cierra Xcode.
- Ejecuta de nuevo:
```bash
npx tauri ios build --debug --target aarch64 --open
```
- Mantén la terminal activa y luego ejecuta Run desde Xcode.

## Verificación posterior a la instalación (desconectado)
1. La app abre desde la pantalla de inicio.
2. Carga la pantalla de login (sin pantalla en blanco).
3. El login con email/contraseña funciona contra Railway.
4. El flujo de Google Sign-In vuelve por `neurovit://` y crea sesión.
5. Al menos una vista de listado conectada a Railway carga datos.
