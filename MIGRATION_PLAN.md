# EPYC → Flutter Migration Plan

> A faithful greenfield Flutter rewrite of **EPYC**, a multiplayer "Eat Poop You Cat" /
> telephone-pictionary game. The current app is **Ionic 3 / Angular 5 / Cordova** on
> **Firebase Realtime Database** with **Facebook-only** auth — a toolchain that is years out of
> support. Almost no source carries over; the value is in porting the *behavioral contract*
> (game turn/thread math, drawing capture+replay format, screen flow), not the code.

## Build status (implemented)

The rewrite is implemented and builds on both platforms (package id
**`com.negfeed.epycflutter`**). `flutter analyze` is clean and all 20 tests pass;
the Android debug APK and the iOS simulator app both build, and the iOS app was
launched on a simulator. Two notes vs. the original plan below: (1) Google + Apple
auth is done via `firebase_auth`'s built-in `signInWithProvider` rather than the
`google_sign_in` / `sign_in_with_apple` plugins (fewer native deps, resolves a
`web` version conflict); (2) min iOS is **15.0** (required by the Firebase Swift
packages). See [`flutter/README.md`](flutter/README.md) to run it.

## Locked decisions

| Area | Decision | Consequence |
|---|---|---|
| **Auth** | Drop Facebook → **Google + Sign in with Apple** via `firebase_auth` | Existing Facebook-based UIDs will not carry over (accepted) |
| **Backend** | **Migrate to Cloud Firestore** (not a 1:1 RTDB reuse) | Schema is re-modeled; existing games/users are not migrated |
| **State management** | **Riverpod** | Stream-first; maps cleanly onto the Firebase-stream → derived-nav state machine |

---

## 1. Feature, screen & flow inventory

The app is a stream-driven state machine: a single subscription to the game object decides which
screen to show as the game progresses (`game-navigation-controller.ts:52-124`).

### End-to-end flow
1. **Login** (Facebook today) → **Home**.
2. **Home** — greeting, "Last Few Games", **New Game** → creates a game and enters the **Waiting Room**.
3. **Waiting Room** — players **Join/Leave**, host **Shares** an invite link and **Starts**. On start, joined users are shuffled (Fisher-Yates) and threads are built.
4. **Per-turn loop**, auto-routed by the navigation controller per player:
   - **Wait Turn** — previous player in this thread hasn't finished yet.
   - **Draw** — draw the given word (5s "Next" countdown), produces a drawing.
   - **Guess** — type a guess while the previous player's drawing replays.
5. **Wait Game To End** — this player finished all their atoms; watch thread progress.
6. **Game Results** — one word per thread (tap a word) → **Thread Results** — the robot's word card followed by every drawing/guess in sequence.

### Screens / routes (8 lazy pages)
| Screen | Purpose | From → To |
|---|---|---|
| Login | Auth button | root → Home |
| Home | Greeting, recent games, New Game | Login / deep link → Waiting Room |
| Waiting Room | Joined/Watching lists; Share/Start/Join/Leave | Home or deep link `/game/:gameKey` → nav controller |
| Wait Turn | Thread progress, status icons | nav controller → Draw/Guess |
| Draw | Recording canvas + word + Next(5s) | nav controller (DRAWING atom ready) |
| Guess | Text input + Submit + drawing replay | nav controller (GUESS atom ready) |
| Wait Game To End | "Thread N: x of y done" | nav controller (player done) → Results |
| Game Results | One word per thread, tappable | nav controller (game done) → Thread Results |
| Thread Results | Robot word card + sequential atoms | Game Results |

### Business logic to port carefully (pure functions, `src/providers/game-model/game-model.ts`)
- **Thread/atom layout** (`buildEmptyThread` :138-150) — N players → N threads, each with **N+1 atoms** alternating DRAWING(even)/GUESS(odd), all `NOT_STARTED`; each thread seeded with a random word.
- **Turn rotation** (`playerAtomAddresses` :201-211) — player *p*: `threadIndex = (i + p) % N`, `atomIndex = i`, for `i` in `0..N`.
- **Reverse owner** (`atomPlayerIndex` :197-199) — `(threadIndex − atomIndex + N) % N`.
- **Next atom + readiness** (`getNextAtom` :213-244) — first non-DONE atom in the player's sequence; `readyToPlay` only if first atom or the previous atom in that thread is DONE.
- **Game done** (`game-navigation-controller.ts:41-50`) — every thread's *last* atom is DONE.

These get ported as **pure Dart with golden unit tests** (N = 2, 3, 4) before any UI is built.

---

## 2. Native capabilities → Flutter packages

| Current capability | Where used | Flutter replacement | Notes |
|---|---|---|---|
| Facebook login (`cordova-plugin-facebook4`) | `auth.ts:72,115` | **Dropped** → `google_sign_in` + `sign_in_with_apple` → `firebase_auth` | Apple Sign In is mandatory on the App Store once any social login exists |
| AngularFire2 RTDB + Auth | `app.module.ts:20-26` | `firebase_core`, `cloud_firestore`, `firebase_auth` | Backend re-modeled to Firestore |
| Deep links (`ionic-plugin-deeplinks`, `epyc://`, `https://epyc-9f15f.appspot.com/game/:gameKey`) | `app.component.ts:47-53` | `app_links` + native Universal Links / App Links | **No good drop-in for the old hosted-link flow** — needs a verified domain (see risks) |
| Social sharing (`cordova-plugin-x-socialsharing`) | `waiting-room.ts:100-106` | `share_plus` | Direct equivalent |
| Splash screen (`cordova-plugin-splashscreen`) | `app.component.ts:69,74` | `flutter_native_splash` | Reuse `resources/splash.png`, bg `#000080` |
| Status bar (`cordova-plugin-statusbar`) | config | `SystemChrome` (built-in) | — |
| Keyboard / console / whitelist | implicit | built-in | Drop |
| `cordova-plugin-device`, `cordova-plugin-inappbrowser` | declared, **unused** | — | Drop |
| **paper.js 0.11 drawing engine** | `src/components/*` | **No equivalent — custom `CustomPainter` engine** | Highest-risk port (see §4) |

**Capabilities with no clean equivalent:** the **paper.js drawing/replay engine** (rebuilt from
scratch) and the **hosted deep-link invite flow** (replaced by native Universal/App Links + a verified domain).

---

## 3. Backend / API contract & Firestore schema

The contract that must survive is **semantic**, not path-for-path. Firestore re-model:

```
games/{gameId}
  state: int (1=CREATED, 2=STARTED, 3=ABANDONED, 4=FINISHED)
  creator: uid
  creationTimestamp: Timestamp
  usersOrder: [uid, …]          // set at start(), order = play order
  playerCount: int
  users: { uid: { displayName, photoURL, joined: bool } }   // small map field
  threads: [ { word, atoms: [ { type, state, drawingRef?, guess?, authorUid? } ] } ]

users/{uid}                      lastCheckin: Timestamp
users/{uid}/games/{gameId}       joinTimestamp: Timestamp    // "last 3 games" = orderBy desc limit 3

drawings/{drawingId}/events/{autoId}
  seq: int  type: 'point'|'erase'|'undo'|'redo'  timestamp: int  pathName?: string  x?: double  y?: double
  // orderBy('seq') for replay; append via addDoc
```

Enums (from `game-model.ts`): `GameState` 1–4, `GameAtomType` DRAWING=1/GUESS=2, `GameAtomState`
NOT_STARTED=1/STARTED=2/DONE=3.

**Key Firestore adaptation.** RTDB patched a single atom by index path
(`/games/{key}/threads/{t}/gameAtoms/{a}`, `game-model.ts:247`). Firestore can't update an array
element by index, so atom mutations (STARTED → DONE) run inside a **`runTransaction`** that reads
the game doc, mutates `threads[t].atoms[a]`, and writes it back. The whole game doc is tiny (a
handful of players), so this is cheap and preserves the **single-snapshot listening model** that
drives navigation. Drawing events move to an ordered **subcollection** — a natural fit for streamed,
append-only replay.

**Business rules to preserve exactly:** thread/atom layout, turn rotation, next-atom readiness,
game-done — see §1. Security rules must enforce per-atom author writes and "no joins after STARTED".

---

## 4. The drawing engine (the hard part)

Drawings are **vector event time-series**, not raster images — this format is the contract that must
survive so existing-style replays remain faithful (`drawing-model.ts:10-34`):
- `point` / `erase` → `{ timestamp, pathName (finger id), point:{x,y} normalized 0–1 }`
- `undo` / `redo` → `{ timestamp }`

**Recording today** (`recording-drawing-canvas.ts`): multi-touch via a distance-minimizing
finger→`pathName` permutation; emits a point only if Manhattan distance > 6px; draw = thin black,
erase = 3× thick white; paper.js `path.smooth()`; undo/redo stacks.
**Replay today** (`replaying-drawing-canvas.ts`): normalize timestamps (first→0, clamp gaps ≤1000ms),
tick every **33ms (~30fps)**, apply events whose timestamp ≤ playhead; progress bar; touch slows replay.

**Flutter approach:** `Listener` pointer events give per-pointer IDs (→ `pathName`); render with
`CustomPainter`; replace `path.smooth()` with **Catmull-Rom** interpolation; replay driven by a
`Ticker`. Keep coordinates normalized 0–1 so it's resolution-independent and replay matches across devices.

---

## 5. Assets, theming, localization

- **Assets to carry over:** `src/assets/img/robot.png` (Thread Results card); source art
  `resources/icon.png` (1024²) and `resources/splash.png` feed `flutter_launcher_icons` /
  `flutter_native_splash`.
- **Theme** (`src/theme/variables.scss`): primary `#387ef5`, secondary `#32db64`, danger `#f53d3d`;
  splash bg `#000080`. Ionicons (menu / undo / redo) → Material icons.
- **Localization:** none today — single-language **English**, strings hardcoded in templates. Port
  strings inline; optionally seed an `intl` / `.arb` structure for the future.

---

## 6. Project structure & state management

```
flutter/
  pubspec.yaml   firebase_options.dart   lib/main.dart
  lib/src/
    models/      game.dart  game_user.dart  drawing_event.dart  app_user.dart   (freezed + json_serializable)
    logic/       game_turn.dart   game_navigation.dart           (PURE Dart, unit-tested)
    services/
      auth/      auth_repository.dart        (Google/Apple → firebase_auth)
      firestore/ game_repository.dart  user_repository.dart  drawing_repository.dart
    providers/   auth_providers.dart  game_providers.dart       (Riverpod)
    routing/     router.dart                (GoRouter; deep link /game/:id)
    drawing/     drawing_canvas.dart  recording_canvas.dart  replaying_canvas.dart  control_bar.dart  stroke.dart
    features/    login/ home/ waiting_room/ wait_turn/ draw/ guess/ wait_game_to_end/ results/
    theme/       app_theme.dart
  assets/img/robot.png
  test/          game_turn_test.dart  game_navigation_test.dart
```

**Why Riverpod:** the app *is* a Firebase-stream → derived-state machine. A `StreamProvider.family`
over the game doc plus a pure `deriveNavTarget(game, uid)` selector reproduces
`game-navigation-controller` cleanly and testably — and avoids the NavController push-diffing races
the original had.

---

## 7. Phased build plan (each phase independently runnable)

| Phase | Deliverable | Run check |
|---|---|---|
| **0 — Scaffold** | `flutter create` under `/flutter`; deps; `flutterfire configure`; theme + GoRouter skeleton + Login placeholder | `flutter run` → Login placeholder |
| **1 — Models + pure logic** | `game_turn.dart`, `game_navigation.dart` + golden tests (N=2/3/4) | `flutter test` |
| **2 — Auth + Home + Waiting Room** | Google/Apple sign-in, Firestore user repo, create/join/leave, `share_plus`, deep link `/game/:id` | sign in → create game → live waiting room |
| **3 — Drawing engine** | Recording + replaying `CustomPainter`, control bar, Catmull-Rom, 33ms replay (dev harness) | draw → store → replay matches |
| **4 — Game loop** | Draw / Guess / Wait-Turn / Wait-Game-To-End wired to nav state machine + transactional atom writes | full multi-player game playable |
| **5 — Results** | Game Results + Thread Results (robot card + sequential replays) | full lifecycle login → results |
| **6 — Polish** | Launcher icons + native splash (`#000080`), status bar, loading/empty/error states, theme parity | visual parity pass |

> **Scope note:** the initial scaffold task delivers **Phase 0 only**. Phases 1–6 proceed after this plan is reviewed.

---

## 8. Risks & effort

- **Drawing engine — HIGH.** Multi-touch finger-permutation, smoothing parity, and frame-synced
  replay are the bulk of the effort and the main fidelity risk. Budget the most time here.
- **Firestore re-model — MEDIUM.** Array-element atom updates need transactions; listening patterns
  differ from RTDB's single-tree listener. Security rules (per-atom author writes, no late joins) must be right.
- **Deep links — MEDIUM.** Universal Links / App Links need a **verified domain**
  (`apple-app-site-association` + `assetlinks.json` hosted on `epyc-9f15f.appspot.com` or a new
  domain). Firebase Dynamic Links is sunset — use `app_links` + native config.
- **Apple Sign In — LOW/MED.** Mandatory on the App Store when any social login exists; needs Apple
  Developer config + a Services ID.

### Flutter rewrite vs. in-place Ionic upgrade
An **in-place upgrade** (Angular 5 → latest, Ionic 3 → 8, AngularFire) is large but mechanical and
**keeps the working paper.js drawing engine** — the cheaper path if the goal is just "make it build
again." The **Flutter rewrite is larger** (the canvas engine is rebuilt from scratch, backend
re-modeled, auth swapped) but yields a single modern codebase, native performance, and removes the
dead Cordova / Angular 5 stack. The rewrite is the right call **only because a long-term investment
is intended**; for a quick revival, the Ionic upgrade wins.
