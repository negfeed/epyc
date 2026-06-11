# EPYC — Native Rewrite Migration Plan

> Two separate native apps — **iOS (Swift / SwiftUI)** and **Android (Kotlin / Jetpack Compose)** — replacing the legacy Ionic 3 / Angular 5 / Cordova app, on a modernized **Cloud Firestore** backend with **Sign in with Apple + Google** auth.
>
> This is the **highest-effort** modernization path. The risk section says so plainly: it is more expensive to build *and* to maintain than either a Flutter rewrite or an in-place Ionic/Capacitor upgrade.

> **Note:** the legacy Ionic/Cordova code (`src/`, `config.xml`, `resources/`, …) referenced throughout this document has since been **removed** now that the native apps are in place. Those `src/…` links describe the original implementation and resolve against the repository's **git history**.

---

## 1. What EPYC is

EPYC is a multiplayer "telephone-Pictionary" game (`com.negfeed.epyc`). A host creates a game; friends join via a shared link. On start, each player is assigned a **thread** seeded with a secret word. Threads alternate **draw → guess → draw → guess …** as turns rotate between players; the final screens replay how each word mutated down its chain.

The legacy app is ~8 years old: **Ionic 3.9.2 · Angular 5.0.5 · TypeScript 2.6 · RxJS 5 · Cordova · AngularFire 4 / Firebase 3 · Paper.js 0.11**. It is effectively unmaintainable on the current toolchain.

---

## 2. Read-only assessment of the current app

### 2.1 Features, screens & routes

Ionic 3 uses imperative `NavController` navigation with lazy `@IonicPage()` modules (no Angular Router). Nine screens:

| # | Screen | Source | Responsibility |
|---|---|---|---|
| 1 | Login | `src/pages/login` | Facebook OAuth; splash hide; deep-link bootstrap |
| 2 | Home | `src/pages/home` | Profile (name/photo), last 3 games, **New Game** |
| 3 | Waiting Room | `src/pages/waiting-room` | Join / leave / watch, share invite, host **Start** |
| 4 | Draw | `src/pages/draw` | Draw the word; recording canvas; **5 s countdown** submit |
| 5 | Guess | `src/pages/guess` | Replay previous drawing; type guess (submit gated on replay-finished + non-empty) |
| 6 | Wait Turn | `src/pages/wait-turn` | Per-step progress within the player's current thread |
| 7 | Wait Game to End | `src/pages/wait-game-to-end` | All-threads progress bars |
| 8 | Game Results | `src/pages/game-results` | List of threads in a finished game |
| 9 | Thread Results | `src/pages/thread-results` | Playback chain: word → drawing → guess → … |

**Custom components:** `recording-drawing-canvas`, `replaying-drawing-canvas`, `drawing-control-bar`, abstract `drawing-canvas` (`src/components/...`).

### 2.2 User flows

```
Login ──(Facebook OAuth)──▶ Home
  Home ──New Game──▶ create game ──▶ Waiting Room
  Home ──recent game──▶ Waiting Room (or live game via state-routing)
Waiting Room ──host Start──▶ game STARTED ──▶ state-driven routing:
    your turn to draw  ──▶ Draw  ──▶ (countdown) atom DONE
    your turn to guess ──▶ Guess ──▶ (submit) atom DONE
    waiting on a peer  ──▶ Wait Turn
    all your atoms done──▶ Wait Game to End
    game complete      ──▶ Game Results ──▶ Thread Results
Invite link (https://…/game/:gameKey) ──▶ Waiting Room (auto-join)
```

The single most important runtime concept: **a central observer watches the game document and pushes the correct screen for the current state** (`game-navigation-controller.ts`). Both native apps reproduce this as a state-driven router.

### 2.3 Native capabilities → native API mapping

| Cordova plugin / web API | Capability | iOS native | Android native |
|---|---|---|---|
| `cordova-plugin-facebook4` | Social login | **Replaced** → `AuthenticationServices` (Sign in with Apple) + `GoogleSignIn` → Firebase credential | **Replaced** → Credential Manager / `play-services-auth` (Google) → Firebase credential |
| `cordova-plugin-x-socialsharing` | Share invite | `UIActivityViewController` (SwiftUI `ShareLink`) | `Intent.ACTION_SEND` + `createChooser` |
| `ionic-plugin-deeplinks` | Invite links | Universal Links (`apple-app-site-association`, Associated Domains) + custom scheme `epyc://` | App Links (`<intent-filter android:autoVerify>` + `assetlinks.json`) |
| `cordova-plugin-splashscreen` | Launch screen | `LaunchScreen` storyboard / SwiftUI splash | Core `SplashScreen` API |
| `cordova-plugin-statusbar` | Status bar style | `preferredStatusBarStyle` / Info.plist | `WindowInsetsControllerCompat` |
| `cordova-plugin-device` / `-console` | Diagnostics | `OSLog` | `Logcat` |
| `cordova-plugin-inappbrowser` | (declared, unused) | `SFSafariViewController` if needed | Custom Tabs if needed |
| `ionic-plugin-keyboard` | (declared, unused) | system | system |
| Touch events + `<canvas>` + Paper.js | Multi-touch vector drawing | SwiftUI `Canvas` + `DragGesture` (Core Graphics) | Compose `Canvas` + `pointerInput` |
| `localStorage` / IndexedDB / SW | — none used for app data — | n/a | n/a |

No push notifications, analytics, or crash reporting exist today. The service worker is present but disabled.

### 2.4 Backend / API contracts (current)

Firebase **Realtime Database** project `epyc-9f15f`. No REST, no GraphQL — all I/O is via the Firebase SDK with realtime listeners. Trees:

```
/users/{uid}
    last_checkin_timestamp_ms
    games/{gameId}/join_timestamp_ms
/games/{gameId}
    creation_timestamp_ms, state (1..4), creator
    users/{uid}: { uid, displayName, photoURL, joined }
    usersOrder: [uid, …]
    threads[]: { word, gameAtoms[]: { type, drawingRef, guess, state, authorUid } }
/drawings/{drawingId}
    drawingEvents[]: point | erase | undo | redo  (timestamp, pathName, point{x,y} normalized 0..1)
```

Enums: `GameState {CREATED=1, STARTED=2, ABANDONED=3, FINISHED=4}`, `GameAtomType {DRAWING=1, GUESS=2}`, `GameAtomState {NOT_STARTED=1, STARTED=2, DONE=3}`.

### 2.5 Auth (current)

`src/providers/auth/auth.ts`: Facebook login (`public_profile`,`email`) → `FacebookAuthProvider.credential` → Firebase `signInWithCredential`. `AuthUserInfo = { uid, displayName, photoURL }` (photo from `providerData[0]`). Firebase SDK owns token storage/refresh.

### 2.6 Business logic to port (wire-sensitive — must match exactly)

From `src/providers/game-model/game-model.ts`:

- **Thread construction:** one thread per player; each thread has `playerCount + 1` atoms, alternating `DRAWING` (even index) / `GUESS` (odd index); word drawn from `src/providers/words/words.ts` (121 English words).
- **Turn rotation (pure):**
  - `atomPlayerIndex(thread, atom, n) = (thread − atom + n) mod n`
  - `playerAtomAddresses(playerIndex, n)` yields, for `i` in `0…n`: `{ thread: (i + playerIndex) mod n, atom: i }`
  - `getNextAtom(game, uid)`: first non-`DONE` atom along the player's address sequence; `readyToPlay` iff the previous atom in that thread is `DONE`; `allAtomsDone` when the sequence is exhausted.
- **State machine:** `CREATED → STARTED → FINISHED` (`ABANDONED` unused); players shuffled on start.
- **Navigation derivation:** `game-navigation-controller.ts` maps game state → screen (see 2.2).
- **Drawing model (event-sourced):** recording emits `point`/`erase` per finger with a min-move threshold (`MINIMUM_PROCESSING_DISTANCE = 6` px in screen space, compared squared), assigns monotonic finger/path keys, supports `undo`/`redo` (blocked mid-stroke). Replay: normalize timestamps (cap inter-event gap at **1000 ms**), tick every **33 ms**, draw all events with `timestamp ≤ elapsed`, advance progress bar; touch-and-hold fast-forwards 5×. Stroke widths: draw `0.01 × side`, erase `0.03 × side`, `round` caps; smoothing via Paper.js `path.smooth()` (Catmull-Rom). Coordinates stored normalized `0..1`.

### 2.7 Assets & localization

Minimal assets: `src/assets/img/robot.png`, favicon; source app icon/splash under `resources/` (reusable to generate native icon sets). **No i18n** — all strings are hard-coded English; the 121-word list is English-only.

---

## 3. Target backend — Cloud Firestore (shared contract for both apps)

The RTDB trees are re-modeled to Firestore. The legacy app **observes the whole game object** (the navigation controller reacts to any state change), and it wrote individual atoms by RTDB path. To preserve both properties in Firestore — a single-document game listener *and* granular, non-clobbering per-atom writes — the small `threads`/`gameAtoms` structures are kept **nested inside the game document as index-keyed maps** (Firestore dotted-path updates work on map keys, e.g. `threads.0.gameAtoms.2.state`, but not on array indices). Only the potentially large **drawing-event streams** become a subcollection (avoiding the 1 MiB doc cap and enabling incremental replay loads).

```
users/{uid}                  { displayName, photoURL, lastCheckinMs }
games/{gameId}               { createdAtMs, state, creatorUid,
                               players:   [uid],          // array-contains → "my games"
                               usersOrder:[uid],
                               users:   { uid: { displayName, photoURL, joined } },
                               threads: {                 // map keyed by "0","1",… (decoded to ordered array)
                                 "0": { word,
                                        gameAtoms: { "0": { type, state, drawingRef, guess, authorUid }, … } },
                                 … } }
drawings/{drawingId}         { createdAtMs, authorUid }
drawings/{drawingId}/events/{seq}  { type, ts, pathName, x, y }   // x,y ∈ [0,1]
```

- The `EpycCore` / `:core` domain models use **ordered arrays** (`threads: [GameThread]`, `gameAtoms: [GameAtom]`); the repository layer maps the index-keyed Firestore maps ↔ those arrays (sort by integer key). The pure logic never sees the wire shape.
- **Atom writes** use dotted field paths (`threads.{i}.gameAtoms.{j}.{field}`), so two players finishing different atoms never clobber each other — matching the legacy per-path RTDB writes.
- **Recent games** query: `games where players array-contains uid order by createdAtMs desc limit 3` (replaces the `/users/{uid}/games` index tree). Requires the composite index in `firebase/firestore.indexes.json`.
- **Enums** keep their integer values so the ported logic is identical across TS/Swift/Kotlin.
- **Security rules** (`firebase/firestore.rules`): authenticated users may read a game (invite links let watchers see the lobby); members (uid in `players`) may update it, and a non-member may add only themselves to `players` (join). Per-atom `authorUid` integrity is enforced client-side via the turn engine, as in the legacy app (the old app had no server-side validation of this). Drawing event writes are restricted to the drawing's `authorUid`. Deploy with the Firebase CLI.

See `firebase/` for `firestore.rules`, `firestore.indexes.json`, and `firebase.json`.

---

## 4. Target auth

Firebase Auth; Facebook removed entirely.

- **iOS:** Sign in with Apple (`AuthenticationServices` → `OAuthProvider("apple.com")` Firebase credential) **and** Google (`GoogleSignIn`).
- **Android:** Google via Credential Manager / `play-services-auth` → Firebase credential. (Apple-on-Android is omittable; addable later via a Firebase OAuth provider flow if required.)
- First sign-in upserts `users/{uid}` with `displayName`/`photoURL` from the provider.
- App Store compliance: offering a third-party login **requires** Sign in with Apple — satisfied on iOS.

> Consequence (see risks): new auth + new backend means **no carry-over** of existing Facebook users, games, or drawings. This is a deliberate clean break.

---

## 5. iOS app — `/ios`

**Architecture: MVVM + a state-driven router.** SwiftUI views observe `@MainActor` `ObservableObject` view-models; view-models call repositories; repositories own Firestore. Pure domain logic lives in a **dependency-free local Swift package `EpycCore`** (no Firebase import) so it is unit-testable offline and shareable across targets.

```
ios/
  EpycCore/                         # local SwiftPM package — pure, tested, no Firebase
    Package.swift
    Sources/EpycCore/
      Models.swift                  # Game, Thread, Atom, GameUser, DrawingEvent + enums (Codable)
      TurnEngine.swift              # atomPlayerIndex / playerAtomAddresses / getNextAtom / buildThreads
      DrawingGeometry.swift         # normalize, Catmull-Rom smoothing, replay timeline math
      Words.swift                   # 121-word list
      Navigation.swift              # GameState → Destination (ports nav controller)
    Tests/EpycCoreTests/
      TurnEngineTests.swift         # asserts against golden vectors (parity with TS)
      DrawingGeometryTests.swift
  Epyc.xcodeproj
  Epyc/
    EpycApp.swift                   # @main; FirebaseApp.configure(); RootView(router)
    Info.plist, Epyc.entitlements   # Apple Sign In + Associated Domains
    GoogleService-Info.plist        # PLACEHOLDER — user supplies real file
    App/
      AppRouter.swift               # ObservableObject; subscribes to game, publishes Destination
      RootView.swift                # auth gate → Login or main NavigationStack
      DIContainer.swift
    Core/
      Auth/AuthService.swift        # Apple + Google → Firebase
      Firebase/Firestore+Codables.swift, FirestoreRefs.swift
      Repositories/
        GameRepository.swift        # AsyncStream listeners + writes
        DrawingRepository.swift
        UserRepository.swift
    Drawing/
      DrawingEngine.swift           # ObservableObject; record/replay using EpycCore geometry
      RecordingCanvasView.swift     # Canvas + DragGesture → normalized events
      ReplayCanvasView.swift        # 33 ms timeline; progress bar; hold-to-FF
      DrawingControlBar.swift       # draw/erase, undo, redo
    Features/                       # one folder per screen: <Name>View.swift + <Name>ViewModel.swift
      Login/  Home/  WaitingRoom/  Draw/  Guess/
      WaitTurn/  WaitGameToEnd/  GameResults/  ThreadResults/
    Resources/Assets.xcassets       # app icon + accent
```

- **Networking/models:** Firebase iOS SDK via SwiftPM (`FirebaseFirestore`, `FirebaseAuth`) + `GoogleSignIn`. Models are `Codable` structs in `EpycCore`; repositories map Firestore snapshots → `AsyncStream` consumed by view-models.
- **Concurrency:** async/await throughout; listeners bridged via `AsyncStream`; UI mutations on `@MainActor`.

---

## 6. Android app — `/android`

**Architecture: MVVM + Navigation-Compose, mirroring iOS.** Composable screens collect `StateFlow` from `ViewModel`s; view-models call repositories; repositories own Firestore via `callbackFlow`. Pure domain logic lives in a **dependency-free `:core` JVM module** with JUnit tests (the Kotlin twin of `EpycCore`).

```
android/
  settings.gradle.kts, build.gradle.kts, gradle.properties
  gradle/wrapper/ (gradle-wrapper.properties), gradlew, gradlew.bat
  core/                              # pure Kotlin/JVM — tested, no Android/Firebase deps
    build.gradle.kts
    src/main/kotlin/com/negfeed/epyc/core/
      Models.kt  TurnEngine.kt  DrawingGeometry.kt  Words.kt  Navigation.kt
    src/test/kotlin/com/negfeed/epyc/core/
      TurnEngineTest.kt              # asserts against the same golden vectors
      DrawingGeometryTest.kt
  app/
    build.gradle.kts, google-services.json (PLACEHOLDER), proguard-rules.pro
    src/main/AndroidManifest.xml     # App Links intent-filter, INTERNET
    src/main/kotlin/com/negfeed/epyc/
      EpycApplication.kt  MainActivity.kt  AppContainer.kt   # manual DI + CompositionLocal
      auth/AuthRepository.kt         # Google (Credential Manager) → Firebase
      data/FirestoreRefs.kt, GameMapping.kt, Repositories.kt   # callbackFlow listeners + DTO↔domain
      drawing/DrawingEngine.kt, Canvases.kt   # engine + RecordingCanvas/ReplayCanvas/DrawingControlBar
      ui/theme/Theme.kt
      ui/navigation/Navigation.kt, AppNavHost.kt   # routes + state-driven ObserveGameNavigation
      ui/screens/<Name>Screen.kt + <Name>ViewModel.kt   # 9 screens
    src/main/res/  (adaptive launcher icon, strings.xml, themes.xml)
```

- **Networking/models:** Firebase BoM (`firebase-firestore-ktx`, `firebase-auth-ktx`), `androidx.credentials` + `play-services-auth`. Data classes in `:core`; repositories expose cold `Flow`s via `callbackFlow` over snapshot listeners.
- **Concurrency:** Kotlin Coroutines + `Flow`; `viewModelScope`; UI state as `StateFlow`.
- **DI:** manual factories (Hilt optional; kept out to minimize the offline-build surface).

---

## 7. Shared concerns, per platform

| Concern | iOS | Android | How parity is guaranteed |
|---|---|---|---|
| **Models / serialization** | `Codable` structs (`EpycCore`) | data classes (`:core`) | One canonical Firestore field contract (§3); enum integer values preserved |
| **Turn logic** | `EpycCore.TurnEngine` | `:core` `TurnEngine` | **Identical golden test vectors** generated from the original TS run on both |
| **Drawing geometry / replay** | `EpycCore.DrawingGeometry` | `:core` `DrawingGeometry` | Shared event schema + golden-fixture geometry tests |
| **Networking** | Firebase SDK repos → `AsyncStream` | Firebase SDK repos → `Flow` | No custom HTTP; both speak the same Firestore model |
| **Navigation** | `AppRouter` (`EpycCore.Navigation`) | `AppNavHost` (`:core` `Navigation`) | Same `GameState → Destination` function ported to both |

---

## 8. Phased plan (per platform — each phase builds & runs independently)

| Phase | iOS deliverable | Android deliverable | Independent proof |
|---|---|---|---|
| **0 — Scaffold** | Xcode project + `EpycCore` package; app boots to a placeholder | Gradle project + `:core`; app boots to a placeholder | App launches on simulator/emulator |
| **1 — Core + logic** | `EpycCore` models, `TurnEngine`, `DrawingGeometry`, `Words`, `Navigation`; tests green | Same in `:core`; tests green | `swift test` / `./gradlew :core:test` pass against golden vectors |
| **2 — Data + auth + core screens** | `AuthService`, repositories, `AppRouter`; Login, Home, Waiting Room | Same; Login, Home, Waiting Room | Sign in → create → join → start a game end-to-end |
| **3 — Drawing engine** | Recording canvas + control bar + Draw; Replay canvas + Guess | Same in Compose | Draw, persist events, replay them faithfully |
| **4 — Remaining flow** | Wait Turn, Wait Game to End, Game Results, Thread Results | Same | Full game playable start → results |
| **5 — Native integrations** | Universal Links, share sheet, splash, status bar, back handling | App Links, share intent, splash, insets, predictive back | Invite link opens Waiting Room |
| **6 — Polish** | Theming, loading/error/empty states, offline, a11y, icon/splash, store prep | Same | Release-candidate build |

Phases are ordered so each leaves a runnable app; later phases never block earlier ones from compiling.

---

## 9. Honest risk callouts

- **Doubled maintenance, forever.** Two codebases means every feature, bug fix, and dependency bump is done **twice**, with two CI/release pipelines, two store review cycles, and two on-call surfaces. Budget roughly **~2× ongoing engineering cost** versus a single codebase — indefinitely, not just during the rewrite.
- **This is the most expensive option of the three. Ranked plainly:**
  - *In-place Ionic → Capacitor upgrade* — **cheapest**; keeps one codebase and the web/PWA build. But Angular 5 → latest + Ionic 3 → 8 + Cordova → Capacitor is itself a substantial migration, and you remain in a WebView.
  - *Flutter single rewrite* — **middle**; one codebase, near-native drawing via `CustomPainter`, ~half the long-run maintenance of two native apps. The pragmatic "modernize and keep one team" path.
  - *Two native apps (this plan)* — **most expensive** to build **and** to maintain; best per-platform feel and lowest input latency for drawing. Justified mainly if native drawing latency/polish is a hard product requirement, not for parity alone.
- **Drawing parity is the top technical risk.** Paper.js `path.smooth()` (Catmull-Rom) and exact stroke rasterization must be re-implemented in Core Graphics and Compose; output will differ subtly across three renderers, and replay timing must match. Mitigation: shared event schema + golden-fixture geometry tests; accept minor visual deltas.
- **Firestore re-model risk & cost.** The re-model (threads/atoms as nested index-keyed maps; drawing events as a subcollection — §3) changes security rules, pagination, listener fan-out, and **billing** (per-document reads). A long drawing is many small event docs — a single replay can be hundreds of reads; may need batching/caching to control latency and cost. Test with realistic drawings before launch.
- **Clean break / no migration.** Firestore + new auth = **no interop** with the legacy app and **no carry-over** of existing Facebook identities, games, or drawings. Existing accounts are orphaned by design. If continuity is later required, a one-off RTDB→Firestore + identity-linking migration is a separate project.
- **External setup the code cannot self-serve.** A Firebase project (Firestore + Auth), Sign in with Apple (paid Apple Developer membership, Service ID + key), and Google OAuth clients must be configured in the consoles. The `GoogleService-Info.plist` / `google-services.json` committed here are **placeholders**. Universal/App Links need a real domain hosting `apple-app-site-association` / `assetlinks.json`.
- **What has and hasn't been verified.** Verified during this build: (a) both pure-logic cores pass their unit tests against the golden vectors — iOS `swift test` (11 tests) and Android `./gradlew :core:test` (10 tests); (b) **both full apps compile** — iOS `xcodebuild … build` **BUILD SUCCEEDED** (SwiftUI + Firebase, all screens), and Android `./gradlew :app:assembleDebug` produced `app-debug.apk` (Compose + Firebase, all screens). **Not** verified here, and left as user steps: running on a device/simulator, and any on-device auth/Firestore round-trip (needs real Firebase config + Apple/Google OAuth setup). Compilation proves the code is internally consistent, not that the live backend integration is correct end-to-end.

---

## 10. Verification

- **Regenerate golden vectors** (from the original TypeScript): `node tools/gen_golden.js` → `tools/golden/*.json`.
- **iOS core (✅ passing):** `cd ios/EpycCore && swift test` — 11 tests asserting turn rotation + drawing geometry against `tools/golden/*.json`.
- **iOS app (✅ compiles):** `cd ios && xcodegen` (regenerates `Epyc.xcodeproj` from `project.yml`), then `xcodebuild -project Epyc.xcodeproj -scheme Epyc -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build CODE_SIGNING_ALLOWED=NO`. SwiftPM resolves Firebase on first run. Add a real `GoogleService-Info.plist` and run in the Simulator.
- **Android core (✅ passing):** `cd android && ./gradlew :core:test` — 10 tests against the same golden vectors (JVM-only, no Android SDK needed; the Gradle wrapper + Foojay toolchain resolver fetch what they need).
- **Android app (✅ compiles):** `cd android && ./gradlew :app:assembleDebug` (needs the Android SDK; set `local.properties` → `sdk.dir`). Produces `app/build/outputs/apk/debug/app-debug.apk`. Add a real `google-services.json` and `./gradlew :app:installDebug` to run.
- **Cross-platform parity:** both cores load the same `tools/golden/*.json`; identical assertions prove the turn engine and drawing geometry match the legacy logic.
- **End-to-end (manual, needs real Firebase config):** sign in → create game → join on a second device → start → draw → guess → results, observing live Firestore sync.
- **Original app untouched:** `git status` shows only additions under `/ios`, `/android`, `/firebase`, `/tools`, and this file; `src/`, `config.xml`, `resources/` are unchanged.
```
