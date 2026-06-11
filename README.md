# EPYC

A multiplayer "telephone-Pictionary" game: a secret word travels down a thread,
alternating **draw → guess → draw → guess …** between players, and the results screens
replay how each word mutated.

Two native apps on a **Cloud Firestore** backend, with **Sign in with Apple + Google**:

| | Stack | Location |
|---|---|---|
| **iOS** | Swift / SwiftUI, MVVM | [`ios/`](ios) — see [ios/README.md](ios/README.md) |
| **Android** | Kotlin / Jetpack Compose, MVVM | [`android/`](android) — see [android/README.md](android/README.md) |

- [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md) — design, per-platform architecture, and the
  assessment of the original app this was rewritten from.
- [`firebase/`](firebase) — Firestore security rules + indexes.
- [`tools/`](tools) — golden parity vectors (generated from the original logic) that both
  apps' pure-logic cores assert against, so the ported game logic provably matches.
- [`web/`](web) — `apple-app-site-association` / `assetlinks.json` for invite deep links.

App id: `com.negfeed.epycnative`. Bring your own Firebase config
(`google-services.json` / `GoogleService-Info.plist`) — the committed ones target the
`epyc-native` project.

## History

This started as an Ionic 3 / Angular 5 / Cordova app. That legacy code was removed once
the native rewrite landed; it remains in the git history (and is described in
`MIGRATION_PLAN.md`). The original demo video:

[![EPYC DEMO](https://img.youtube.com/vi/N2DJ9mAKROw/0.jpg)](https://www.youtube.com/watch?v=N2DJ9mAKROw)
