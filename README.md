# Neurovit · Application (`nuv-tfg-app`)

React and TypeScript interface for Neurovit / NeuralStock, an inventory and sales management application with organization-based access. The same frontend runs in a browser and in a Tauri 2 shell for desktop, iOS, and Android.

## Project ecosystem

| Repository | Responsibility |
| --- | --- |
| **nuv-tfg-app** (this repository) | User interface, API client, session state, and native shell |
| [nuv-tfg-rs](../nuv-tfg-rs) | Spring Boot API, business rules, authentication, and database migrations |
| [nuv-tfg-infra](../nuv-tfg-infra) | MySQL and optional Ollama for local development |

The application needs the backend for business operations. Start **infrastructure → backend → frontend**. Google authentication, email delivery, AI reports, and Stripe billing depend on backend integration settings.

## Features and screens

| Area | What the application provides |
| --- | --- |
| Sign-in and onboarding | Password registration/login, Google authentication, organization creation/joining, onboarding checklist, and required password-change flow |
| Dashboard | Inventory and business summaries, movement/revenue/product charts, and time-range comparisons |
| Products and categories | Catalog management, SKU and pricing fields, stock thresholds, stock adjustments, product deletion, and category maintenance |
| Bundles | Product-bundle creation, editing, details, and removal |
| Suppliers and orders | Supplier lists/details, archive/restore, purchase orders, sending, receipt, and cancellation |
| Customers and sales | Customer management, direct/bundle sale entry, discounts, and sale details |
| Inventory and alerts | Movement history, filtering/pagination, stock-alert summaries, and resolution workflows |
| Analytics | Separate overview, sales/profitability, inventory, prices/bundles, and supplier screens |
| Reports | Inventory, sales, alerts, customers, and stock movements; report details and AI-analysis status; daily/weekly/monthly schedules |
| Tasks and notifications | Task creation, assignment, priorities and status, plus notification read/unread tracking |
| Settings | Profile, organization, users, general preferences, security, subscription billing, and in-app documentation |
| Shared interface | Responsive navigation, reusable dialogs/tables/charts, theme support, toasts, and timezone-aware formatting |

The backend enforces organization and role permissions (`ADMIN`, `MANAGER`, `VIEWER`). Session-aware routing handles authentication, organization onboarding, and required password changes.

## Technology

- React **19**, TypeScript **5.7**, Vite **6**, React Router **7**.
- Tailwind CSS **4**, Radix/shadcn-style UI components, Recharts, and TanStack Table.
- Zustand stores, Axios, React Hook Form, and Zod.
- Tauri **2** with Rust, native opener/deep-link plugins, and mobile Google credential commands.
- Vitest, Testing Library, jsdom, and ESLint.

## Run in a browser

Prerequisites: Node.js **20** (the CI version), npm (the manifest specifies **10.8.2**), and a running backend. Rust and native SDKs are only needed for Tauri.

From this repository:

```bash
npm ci
cp .env.example .env
```

For local web development, set these values in `.env`:

```dotenv
VITE_BACKEND_MODE=local
VITE_API_URL_LOCAL=http://localhost:8080/api
```

Then start Vite:

```bash
npm run dev
```

Open **http://localhost:5173**. Register an account and complete organization onboarding. If using an invitation that requires a password change, the app redirects to security settings.

Read the [backend local-data warning](../nuv-tfg-rs/README.md#local-setup) before using a database you want to preserve: its startup seed/purge behavior affects the data shown here.

## API and environment configuration

See [.env.example](.env.example) and [the Axios client](src/api/client.ts). Vite embeds `VITE_*` values into the client build; keep backend secrets out of them. Restart the dev server after edits, or rebuild packaged applications.

| Variable | Behavior |
| --- | --- |
| `VITE_API_URL` | Explicit web/desktop API URL; takes precedence over mode selection |
| `VITE_API_BASE_URL` | Legacy fallback for the explicit web/desktop URL |
| `VITE_BACKEND_MODE` | `auto`, `local`, or `railway`; default `auto` |
| `VITE_API_URL_LOCAL`, `VITE_API_URL_RAILWAY` | Web/desktop URLs selected by mode |
| `VITE_MOBILE_API_URL` | Explicit Tauri mobile API URL; takes precedence over mobile mode |
| `VITE_MOBILE_BACKEND_MODE` | Mobile selection mode; falls back to the web mode when unset |
| `VITE_MOBILE_API_URL_LOCAL`, `VITE_MOBILE_API_URL_RAILWAY` | Mobile URLs selected by mode |
| `VITE_GOOGLE_CLIENT_ID` | Public Google OAuth client ID for sign-in |
| `VITE_MOBILE_DEEP_LINK_SCHEME` | Mobile OAuth return scheme; example uses `neurovit` |
| `VITE_TAURI_MOBILE_GOOGLE_DEBUG` | Optional mobile Google authentication debug timeline |

In `auto` mode, development prefers the local URL and production builds prefer the Railway URL, falling back to the other configured URL. Explicit `local`/`railway` mode uses its selected URL or `/api`. The client adds `/api` when needed. Vite has **no API proxy configured**, so use an absolute backend URL for separate local frontend/backend servers.

**The example file selects `railway` for mobile.** To develop mobile against your machine, set `VITE_MOBILE_BACKEND_MODE=local` and configure a reachable `VITE_MOBILE_API_URL_LOCAL`. The included Railway URL is a configured project endpoint, not a guarantee of service availability.

The client sends bearer access tokens and cookies, refreshes tokens near expiry or after an eligible 401, and returns to login when refresh fails. Backend CORS and refresh-cookie policy must match the client origin and deployment topology.

## Desktop and mobile

### Desktop

Install Rust/Cargo and the native build tools required by the target operating system. The Rust manifest declares a minimum version of `1.77.2`; use a toolchain compatible with the resolved dependencies.

```bash
npm run tauri:dev
npm run tauri:build
```

Tauri runs the frontend dev/build command automatically. Its dev server uses port **5173**, so do not start a second Vite instance on the same port. Desktop configuration, bundle targets, capabilities, and CSP live in [src-tauri](src-tauri).

### iOS and Android

Both generated projects are already present: `src-tauri/gen/apple` and `src-tauri/gen/android`.

```bash
npm run mobile:check
npm run mobile:ios:dev
npm run mobile:android:dev
```

Run only the command for your target platform after installing its prerequisites:

- **iOS:** macOS, Xcode with command-line tools and accepted licenses, CocoaPods, a simulator or configured device, and the relevant Rust iOS targets.
- **Android:** Android Studio, a compatible JDK, Android SDK/platform/build tools, NDK, an emulator or device, and the relevant Rust Android targets. Configure `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and `NDK_HOME` for the installed SDK/NDK.

```bash
# iOS targets
rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim

# Android targets
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

Initialization scripts (`mobile:ios:init`, `mobile:android:init`) are available when generating native projects is necessary; they are not a prerequisite for every run. See the [iOS installation guide](instalacion-lateral-ios.md) and [Android installation guide](instalacion-lateral-android.md) for device builds and sideloading.

### Mobile networking and Google login

- Android mobile runtime rewrites `localhost` / `127.0.0.1` API hosts to **10.0.2.2**, the Android emulator host address. Physical devices need a reachable LAN or hosted backend URL.
- Google mobile sign-in opens a browser OAuth flow and returns through `neurovit://auth/google/callback`. The Rust shell includes commands to retrieve and verify the returned credential.
- Configure the backend Google client/secret, callback URL, and permitted deep-link prefixes as described in the [backend README](../nuv-tfg-rs/README.md).
- The current Tauri CSP permits configured Railway origins and Google endpoints. Other backend origins, including local HTTP in packaged builds, must be permitted by the native configuration as well as backend CORS; changing `.env` alone may not be sufficient.

## Commands and quality checks

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite development server on port 5173 |
| `npm run build` | TypeScript project build and production web assets in `dist/` |
| `npm run preview` | Preview the built web application |
| `npm run lint` | ESLint checks |
| `npm test` | Vitest watch mode |
| `npm run test:ci` | One test run |
| `npm run test:coverage` | Test run with coverage |
| `npm run tauri:dev` / `npm run tauri:build` | Native desktop development / packaging |
| `npm run mobile:check` | Inspect local mobile prerequisites |
| `npm run mobile:ios:dev` / `npm run mobile:android:dev` | Mobile development |
| `npm run mobile:ios:run` / `npm run mobile:android:run` | Invoke the corresponding Tauri mobile run command |

Tests cover session/profile stores, API-client behavior, v1 payload contracts, date/error utilities, dashboard helpers, and selected page/report smoke scenarios. GitHub Actions runs `npm ci`, lint, tests, and the web build on Node 20. Native builds are separate from that workflow.

## Repository layout

```text
src/
  features/       Domain pages, components, API functions, and types
  components/     Shared application layout, onboarding, and UI primitives
  router/         Route definitions and session/onboarding guards
  api/            Shared Axios client and compatibility API exports
  store/          Authentication, profile, and session stores
  lib/            Formatting, errors, utilities, and mobile Google auth
  types/          Shared/compatibility types and v1 contracts
  test/           Test setup and API contract checks
src-tauri/        Rust shell, capabilities, configuration, and native projects
scripts/          Mobile environment diagnostics
public/           Static assets
```

The frontend is organized around features, with compatibility modules still present in `src/api` and `src/types`. See [folder conventions](docs/architecture/carpetas-por-funcionalidad.md), [frontend rules](docs/architecture/reglas-del-frontend.md), and the [router](src/router/index.tsx) for the actual route map.

## Deployment and troubleshooting

- `npm run build` creates the web artifact. The checked-in [Railway configuration](railway.json) builds it and starts Vite preview on `$PORT`. Configure environment values before the build.
- The app uses browser-history routing. A static host must return `index.html` for client routes such as `/productos` and `/settings/profile`.
- Requests going to port 5173 instead of 8080: set an absolute API URL; the `/api` fallback assumes same-origin hosting.
- Port 5173 already in use: stop the existing dev server before launching Tauri. Vite uses `strictPort`.
- Unexpected backend selection: check explicit URL overrides and the separate mobile mode before changing the web mode.
- Repeated login redirects: check backend reachability, CORS, refresh cookies, and account/membership status.
- Native Google login problems: run `mobile:check`, confirm the callback/deep-link configuration, and optionally enable the mobile Google debug timeline.
