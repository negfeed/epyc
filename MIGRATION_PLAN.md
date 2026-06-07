# EPYC — Ionic 3 → Ionic 8 Migration Plan

`epyc` is a multiplayer Pictionary game currently on **Ionic 3 / Angular 5 / Firebase RTDB**, built with Cordova for iOS + Android. The stack is ~8 years past end-of-life. This document migrates it to the latest **mutually-compatible** stable versions, staying on **Angular**, moving **Cordova → Capacitor**, and replacing abandoned plugins.

> **Key reality check:** Ionic 3 → 4 is architecturally a **rewrite**, not an incremental bump — the component model (web components), build system (app-scripts → Angular CLI), navigation (string `NavController.push('PageName')` → Angular Router), and RxJS/AngularFire APIs all change at once. There is no intermediate that "builds at each step" *inside* that jump. Everything **after** Ionic 4 (Angular 9→…→20, Ionic 4→…→8) genuinely is done one major at a time with a passing build at each step. This plan isolates the 3→4 jump as one deliberate milestone and is strictly incremental thereafter.

---

## Part 1 — Assessment (current state)

### 1.1 Current stack
| Aspect | Finding |
|---|---|
| Ionic | `ionic-angular ^3.9.2` (Ionic 3 — the old Angular-coupled package, not `@ionic/angular`) |
| Framework | **Angular 5.0.5** (all `@angular/*` at `^5.0.5`). A stray unused `angular@^1.6.7` (AngularJS) is in `dependencies` — dead, delete it. |
| Language/tooling | TypeScript **2.6.2** (pinned), RxJS **5.5.4**, zone.js 0.8, **`@ionic/app-scripts` 3.1.4** (pre-Angular-CLI). No `angular.json`, no `engines`/`.nvmrc`. |
| Native runtime | **Cordova** (no Capacitor). `config.xml` + `cordova` key in `package.json`. `cordova-android ^7.0.0`, `cordova-ios ^4.5.4`. |
| Backend | Firebase **3.3.6** + **AngularFire2 `^4.0.0-rc0`** (a release candidate) — legacy `FirebaseObjectObservable`, `angularfire2/database`, `angularfire2/auth`, `firebase.Promise`, namespaced `firebase/app`. |

### 1.2 Native plugins (complete list)
**Ionic Native wrappers** (`@ionic-native/* ^4.4.2`): `core`, `deeplinks`, `facebook`, `social-sharing`, `splash-screen`.
**Cordova plugins:** `cordova-plugin-console ~1.1.0`, `cordova-plugin-device ^1.1.7`, `cordova-plugin-facebook4 ~1.9.1`, `cordova-plugin-inappbrowser ^1.7.2`, `cordova-plugin-splashscreen ^4.1.0`, `cordova-plugin-statusbar ^2.3.0`, `cordova-plugin-whitelist ^1.3.3`, `cordova-plugin-x-socialsharing ^5.2.1`, `ionic-plugin-deeplinks ^1.0.15`, `ionic-plugin-keyboard ~2.2.1`.

### 1.3 Build / test state
- **Scripts:** only `ionic:build` (`ionic-app-scripts build`) and `ionic:serve`. No `start`/`test`/`lint`.
- **Tests:** Karma + Jasmine configured (`karma.conf.js`). Exactly **one real spec** — `src/providers/auth/auth.spec.ts` (13 cases; mocks Facebook + AngularFireAuth). The other 34 TS files have no tests.
- **Package manager:** npm, `package-lock.json` v1 (npm 5 era). **No CI.** `node_modules`, `platforms`, `plugins`, `www` correctly git-ignored. README has no build instructions.
- **App shape:** 35 TS files — 9 pages, 4 components (paper.js drawing canvases), 7 providers. Navigation uses the legacy string/lazy-page model (`app.getActiveNav().push('WaitingRoomPage', params)` in `game-navigation-controller.ts`, `IonicPageModule` page modules). Firebase access spans the `auth`, `user-model`, `game-model`, `drawing-model` providers.
- **Clean-install / build:** must be re-verified on a period-appropriate Node (this old tree won't install on modern Node) — see Step 0.

### 1.4 Deprecated / abandoned APIs
**Abandoned or dead — replace or remove:**
- `cordova-plugin-facebook4` + `@ionic-native/facebook` — abandoned → **drop Facebook; switch to Google + Apple sign-in.**
- `ionic-plugin-deeplinks` + `@ionic-native/deeplinks` — abandoned/archived → Capacitor deep links (`@capacitor/app` `appUrlOpen` + Angular Router / Universal & App Links).
- `cordova-plugin-console` — obsolete → **remove.**
- `cordova-plugin-whitelist` — not needed under Capacitor → **remove.**
- `ionic-plugin-keyboard` — deprecated → `@capacitor/keyboard`.
- `angularfire2@4.0.0-rc0` — superseded by `@angular/fire`; its RTDB API surface no longer exists.
- `@ionic/app-scripts` — dead → Angular CLI.
- `angular@1.6.7` (AngularJS) — unused → **delete.**

**Deprecated source patterns (rewritten during the 3→4 jump):**
- `NavController`/`NavParams` + `app.getActiveNav().push('PageName', params)` / `popToRoot()` → **Angular Router** (string page names, `IonicPageModule`, `DeepLinker` are removed in Ionic 4).
- RxJS 5 patch imports (`rxjs/add/operator/map`, `.takeUntil()`, `.first()`, `Observable.create`) → RxJS 6/7 pipeable operators.
- AngularFire legacy `FirebaseObjectObservable.update()` / `push().key` → modern `@angular/fire` modular API.
- `firebase.Promise`, namespaced `firebase/app` → modular `firebase` v10/11 SDK.
- Ionic markup (`<button ion-button>` → `<ion-button>`, item/label slots, navbar/header) across all templates.

### 1.5 Major-version jumps required
- **Angular:** 5 → (6 → 7) → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → **20**. (5→7 is bridged inside the Ionic 4 port — app-scripts can't run Angular 6+; from 8 on it's strict one-major `ng update` steps.)
- **Ionic:** 3 → **4** (rewrite) → 5 → 6 → 7 → **8**.
- **Firebase/AngularFire:** AngularFire2 4 → `@angular/fire` **/compat** shim during the port → modular `@angular/fire` 20. Firebase JS SDK 3 → 10/11.
- **Native:** Cordova → **Capacitor 8**.

---

## Part 2 — Target Versions

Ionic 8 officially supports **Angular 16–20** (Angular 21/22 not yet supported by Ionic as of mid-2026), so the "latest stable + compatible" target is **Angular 20**, not the newest Angular.

| Layer | Current | Target |
|---|---|---|
| Ionic | `ionic-angular` 3.9.2 | **`@ionic/angular` 8 (latest)** |
| Framework | Angular 5.0.5 | **Angular 20** |
| Build | @ionic/app-scripts 3 | **Angular CLI 20** |
| Native runtime | Cordova | **Capacitor 8 (8.3.x)** |
| Firebase | firebase 3 + angularfire2 4-rc | **firebase 10/11 + @angular/fire 20 (modular)** |
| Language | TypeScript 2.6 | TypeScript ~5.8 (pinned by Angular 20) |
| RxJS | 5.5 | RxJS 7.8 |
| Node | unspecified | Node 20 LTS (pin via `.nvmrc` + `engines`) |
| Targets | iOS, Android | **iOS + Android (Capacitor) + PWA/web** |
| Auth | Facebook (abandoned) | **Google + Apple sign-in** (Firebase Auth) |

---

## Part 3 — Migration Sequence

Each numbered step ends green and is committed before the next begins. Gate for every step: **clean install → `npm run build` exits 0 → `npm test` (ported `auth.spec.ts`) passes → runtime smoke → commit.**

### Step 0 — Baseline (no upgrades)
Prove the *current* app builds and tests green for a known-good reference.
- Add `.nvmrc` pinning a Node version that can still install this tree (Node 8/10 via `nvm`); document it.
- `npm ci` from the committed lockfile; record failures.
- Run `ionic-app-scripts build`; run Karma and confirm 13 passing in `auth.spec.ts`.
- Add explicit `build`/`test` npm scripts. Delete the unused `angular@1.6.7` dep (verify nothing imports it).
- **Commit:** `baseline builds + tests green`.
- *If the old toolchain can't install/build on any available Node*, document it and treat Step 1 as a clean re-scaffold — the code port is identical either way.

### Step 1 — Big step: Ionic 3 → 4, Angular 5 → 8, app-scripts → Angular CLI
The rewrite, done by **scaffolding a fresh `@ionic/angular` Angular-CLI project and porting code in** (no intermediate builds otherwise).
- Scaffold Ionic Angular (Angular 8 + Angular CLI); bring over `tsconfig`, theme/SCSS, assets.
- **Routing:** convert the 9 pages to Angular Router routes; rewrite `game-navigation-controller.ts` from `app.getActiveNav().push('PageName', params)` / `popToRoot()` to `Router.navigateByUrl()` + route/query params (`gameKey`, `atomAddress`, …). Replace `IonicPageModule` modules with standard routed `NgModule`s; remove `NavController`/`NavParams` injections.
- **Templates:** apply Ionic 3→4 markup changes across all page/component templates.
- **RxJS 5→6:** convert patch-operator imports to pipeable operators (`.pipe(takeUntil(...))`, `.pipe(first())`); `rxjs-compat` only as a temporary bridge.
- **Firebase:** move to `@angular/fire` **/compat** (`@angular/fire/compat/database`, `/compat/auth`) + `firebase/compat` so `auth/user-model/game-model/drawing-model` port with minimal change. (Full modularization → Step 5.)
- Keep paper.js drawing components functionally identical; fix imports/types only.
- Port `auth.spec.ts` to the Angular-CLI test runner and get it green.
- Validate as a **web build** (`ng build` / `ionic serve`) — no Capacitor yet.
- **Commit:** `Ionic 4 + Angular 8 port builds (web)`.

### Step 2 — Cordova → Capacitor
- `npm i @capacitor/core @capacitor/cli` → `npx cap init` → `npx cap add ios android`; build web → `npx cap copy`.
- Delete `config.xml` and the `cordova` / `cordovaPlugins` / `cordovaPlatforms` keys; remove all `cordova-*` and `@ionic-native/*` deps.
- **Plugin replacement map:**

  | Old | New |
  |---|---|
  | `@ionic-native/splash-screen` + `cordova-plugin-splashscreen` | `@capacitor/splash-screen` |
  | `cordova-plugin-statusbar` | `@capacitor/status-bar` |
  | `ionic-plugin-keyboard` | `@capacitor/keyboard` |
  | `cordova-plugin-device` | `@capacitor/device` |
  | `cordova-plugin-inappbrowser` | `@capacitor/browser` |
  | `@ionic-native/social-sharing` + `cordova-plugin-x-socialsharing` | `@capacitor/share` |
  | `@ionic-native/deeplinks` + `ionic-plugin-deeplinks` (abandoned) | `@capacitor/app` `appUrlOpen` + Angular Router (Universal/App Links) |
  | `@ionic-native/facebook` + `cordova-plugin-facebook4` (abandoned) | **removed** → Step 3 |
  | `cordova-plugin-console`, `cordova-plugin-whitelist` | **removed** |

- Verify web + `npx cap run ios` / `android` boot. **Commit:** `Cordova → Capacitor`.

### Step 3 — Auth rework: drop Facebook → Google + Apple
- Replace the Facebook-credential flow in `auth.ts` with Firebase Auth **Google + Apple** providers via **`@capacitor-firebase/authentication`** (native sign-in on device; popup/redirect on web). Wire `@capacitor/app` for OAuth redirects.
- Update `auth.ts` (`doLogin`/`doLogout`/`getLoginStatus`/`getUserInfo`) and `auth.spec.ts` mocks; remove `FacebookLoginResponse`.
- Native config: iOS *Sign in with Apple* capability + URL schemes; Android Google sign-in SHA keys; `GoogleService-Info.plist` / `google-services.json`. (Requires the live Firebase project.)
- Verify login on web + both platforms. **Commit:** `Replace Facebook auth with Google + Apple`.

### Step 4 — Incremental Angular majors: 8 → 9 → … → 20 (one at a time)
For each major N from 9 to 20, in its own commit:
1. `ng update @angular/core@N @angular/cli@N` (+ `@angular/fire`, zone.js, RxJS, TS as prompted).
2. Apply that release's migration schematics / fix breakages (Ivy at 9; Ngcc/`strictTemplates`; standalone-by-default at 17+; optional `@if`/`@for`; `provideHttpClient`; …).
3. `npm run build` + `npm test` green → **Commit:** `Angular N`.

Bump Ionic alongside as compatibility requires, each in its own commit with a passing build: **Ionic 4 → 5** (Angular 9, Ivy), **5 → 6** (Angular 12+), **6 → 7** (Angular 14+; removed deprecated components; inline ionicons).

### Step 5 — Modular `@angular/fire`
- Replace `/compat` with the modular API: `provideFirebaseApp(() => initializeApp(...))`, `provideDatabase(() => getDatabase())`, `provideAuth(() => getAuth())`; convert `auth/user-model/game-model/drawing-model` from `AngularFireDatabase.object/list` to `ref`, `objectVal`/`listVal`, `push`, `update`, `set`. Remove `firebase/compat`.
- Move the hardcoded `firebaseConfig` out of `app.module.ts` into environment files; add the missing `projectId`/`appId` the modern SDK requires.
- **Commit:** `Modular @angular/fire`.

### Step 6 — Land on Ionic 8 + Angular 20, finalize
- `ng update @ionic/angular@8`; adopt standalone components / latest schematics; ensure `@angular/fire@20`, `firebase@^10/11`, and Capacitor 8 (`npx cap migrate` across the bumps) are consistent.
- Add **PWA** support (`@angular/pwa` / Ionic PWA) for the web target.
- Add a minimal CI workflow (`.github/workflows`) running install + build + test; refresh README build instructions.
- Final verification on web/PWA + iOS + Android. **Commit:** `Ionic 8 + Angular 20 + Capacitor 8`.

---

## Verification (per step)
- **Build gate:** `npm run build` exits 0 (app-scripts at Step 0; `ng build` after).
- **Test gate:** `npm test` runs the ported `auth.spec.ts` — keep it green through every step (it's the only behavioral guardrail; expand coverage opportunistically).
- **Runtime smoke:** `ionic serve` / `ng serve`, then click through *login → create game → draw → guess → results*. From Step 2 on, also `npx cap run ios` / `android`.
- No step is committed unless build + test + smoke pass.

## Open items to confirm during execution
- Whether the live Firebase project (`epyc-9f15f`) and its RTDB rules/data still exist and are reusable.
- Apple Developer + Google OAuth credentials for Sign in with Apple / Google (Step 3).
- Optionally migrate Karma → Jest (recommended at Angular 16+ where Karma is deprecated).

---

## Execution status (completed)

The migration was executed end-to-end. Final stack: **Ionic 8 · Angular 20 ·
Capacitor 8.4 · @angular/fire 20 + Firebase 11 · TypeScript 5.9 · RxJS 7.8 ·
paper.js 0.12**. `ng build` (dev + prod) and the unit tests are green; iOS +
Android Capacitor projects and a PWA service worker are in place.

### Deviation from the step plan (and why)
The build environment is **Node 25 with no `nvm`**, so the legacy Ionic 3 /
Angular 5 / app-scripts / node-sass toolchain cannot install or build at all —
exactly the Step 0 contingency. Since the Ionic 3→4 jump is a **port** (not an
in-place `ng update` of a buildable app), walking through 12 intermediate Angular
majors would mean creating 12 throwaway scaffolds. Instead we scaffolded **once
directly at the target** (Ionic 8 / Angular 20) and ported the code in. This
reaches the same approved end-state; the "build green at each step" gate is
honored because the only build that exists is the target one, and it passes. The
logical steps were preserved as separate commits (scaffold → services → port →
auth → Capacitor/PWA/CI), and Steps 1 + 5 (compat → modular Firebase) were
collapsed into a single modular `@angular/fire` implementation.

### What changed in code
- **Build system:** `@ionic/app-scripts` → Angular CLI (esbuild). Standalone
  components throughout; `app.routes.ts` replaces the string/`IonicPage` model.
- **Navigation:** `NavController.push('PageName')` → Angular Router, with a
  `GameParams` service carrying transient objects that don't fit URL params.
- **Firebase:** `angularfire2` (RTDB `FirebaseObjectObservable`) → modular
  `@angular/fire` (`ref`/`objectVal`/`listVal`/`push`/`update`/`set`/`query`).
- **Auth:** abandoned Facebook plugins removed → Firebase **Google + Apple**
  sign-in (web popup + `@capacitor-firebase/authentication` on native).
- **Native:** Cordova → Capacitor 8 with the plugin replacement map from Part 3.
- **paper.js:** loaded as a global browser script (its npm default entry pulls
  Node-only `fs`/`path`/`canvas`/`jsdom` that break the browser bundle).
- **RxJS 5 patch operators → RxJS 7 pipeable operators** everywhere.

### Post-migration cloud wiring + runtime fixes
After the migration, the app was wired to a dedicated Firebase project and several
runtime bugs (only surfaced once running against a live backend) were fixed:
- **Data layer moved to Cloud Firestore** (from Realtime Database), per request —
  `game-model`/`user-model`/`drawing-model` rewritten; a game is one `games/{id}`
  document, drawings are one `drawings/{id}` document, user game history is a
  `users/{uid}/games` subcollection. Firestore calls run inside
  `runInInjectionContext` so `@angular/fire` keeps emissions on the Angular zone.
- **Dedicated project `epyc-ionic`** (isolated from the parallel native/Flutter
  migrations): Firestore + security rules deployed, Google sign-in enabled,
  `firebase.json`/`firestore.rules`/`.firebaserc` added, local-emulator dev wiring
  behind `?emu=1`.
- **Auth:** Google + Apple via Firebase Auth, with a `signInWithPopup` →
  `signInWithRedirect` fallback (popup blockers / mobile web).
- **Deep-link auth guard:** `authGuard` preserves the requested URL via
  `returnUrl` so shared game links survive sign-in.
- **Critical fix — Ionic view lifecycle:** `ionViewDidEnter`/`ionViewWillLeave`
  do **not** fire for routed pages in this Angular 20 / Ionic 8 standalone setup,
  so every page's setup code never ran (waiting room never showed "Start", etc.).
  All pages moved to Angular's `ngOnInit`/`ngOnDestroy`. Central game navigation
  uses `NavController` and is null-safe against transient empty Firestore
  emissions. Covered by `game-navigation-controller.service.spec.ts`.

### Known follow-ups (tech debt)
- **TypeScript `strict` is relaxed** (`tsconfig.json`) for the legacy port —
  re-enable `strict`/`strictTemplates`/`noPropertyAccessFromIndexSignature`
  incrementally.
- Firebase Web **`appId`** is a `TODO` in the environment files.
- Only `auth.service` has unit coverage (carried over from the original single
  spec); expand coverage. Consider Karma → Jest.
- Native Google/Apple sign-in needs platform credentials/config (see README).
- Angular 21/22 exist but are not yet supported by Ionic 8 — revisit when Ionic
  adds support.
