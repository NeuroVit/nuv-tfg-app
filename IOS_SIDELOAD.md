# Neurovit iOS Sideload (Free Apple ID)

## Fixed project constraints
- Bundle ID stays `com.neurovit.desktop`.
- Do not hand-edit `src-tauri/gen/apple/app.xcodeproj/project.pbxproj`.
- Do not hand-edit `src-tauri/gen/apple/app_iOS/Info.plist`.
- Do not skip code signing.

## Backend/deeplink config used
- `VITE_MOBILE_BACKEND_MODE=railway`
- `VITE_MOBILE_API_URL_RAILWAY=https://web-production-b34f68.up.railway.app/api`
- `VITE_API_URL_RAILWAY=https://web-production-b34f68.up.railway.app/api`
- `VITE_MOBILE_DEEP_LINK_SCHEME=neurovit`
- `VITE_GOOGLE_CLIENT_ID=<configured iOS client>`

## One-time setup
1. Apple ID added in Xcode.
2. iPhone Developer Mode enabled.
3. In Xcode project `src-tauri/gen/apple/app.xcodeproj`:
- Target: `app_iOS`
- Signing: `Automatically manage signing = ON`
- Team: personal free team
- Bundle Identifier: `com.neurovit.desktop`

## Install/reinstall workflow (works for first install and weekly re-sign)
1. From repo app dir:
```bash
cd /Users/careexpand/Desktop/Neurovit/nuv-tfg-app
npm run build
```
2. Start Tauri iOS build and open Xcode from CLI:
```bash
npx tauri ios build --debug --target aarch64 --open
```
3. Keep that terminal running (required by Tauri Xcode script).
4. In opened Xcode:
- Select run destination: physical iPhone.
- Target: `app_iOS`.
- `Product > Run`.
5. Wait for install to finish on device.
6. If iPhone shows untrusted developer:
- iPhone `Settings > General > VPN & Device Management` -> trust your Apple ID.

## 7-day renewal (free Apple ID expiry)
1. Reconnect iPhone to Mac.
2. Repeat full install/reinstall workflow above.
3. Launch app once while connected.
4. Unplug and verify app opens from Home Screen.

## If build fails with `PhaseScriptExecution ... nonzero exit code`
1. Open issue details and check for:
- `failed to read CLI options`
- `failed to build WebSocket client`
2. Fix:
- Close Xcode.
- Re-run:
```bash
npx tauri ios build --debug --target aarch64 --open
```
- Keep terminal alive, then Run from Xcode.

## Post-install verification (unplugged)
1. App launches from Home Screen.
2. Login page loads (no white screen).
3. Email/password login works against Railway.
4. Google Sign-In flow returns via `neurovit://` and session is created.
5. At least one Railway-backed list view loads data.
