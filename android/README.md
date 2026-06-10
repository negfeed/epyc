# EPYC — Android (Kotlin / Jetpack Compose)

Native rewrite of the EPYC drawing game. MVVM + Navigation-Compose with a state-driven
navigator; Cloud Firestore backend; Google sign-in. See `../MIGRATION_PLAN.md`.

## Layout
- `core/` — pure Kotlin/JVM domain logic (models, `TurnEngine`, `DrawingGeometry`, `Words`, navigation) with JUnit tests. **No Android/Firebase deps.**
- `app/` — the Compose app: `auth/`, `data/` (Firestore repositories + mapping), `drawing/` (engine + canvases), `ui/navigation/`, `ui/screens/<Name>Screen + ViewModel`, `ui/theme/`.

## Prerequisites
- JDK 17+ (Gradle auto-provisions the toolchain via the Foojay resolver).
- Android SDK (platform 35, build-tools 35). Set `local.properties` → `sdk.dir=...` (gitignored).
- A Firebase project with **Firestore** + **Auth** (Google enabled). Replace the
  placeholder `app/google-services.json` with the real one.

## Build & run
```bash
cd android
./gradlew :app:assembleDebug          # builds app/build/outputs/apk/debug/app-debug.apk
# install on a running emulator/device:
./gradlew :app:installDebug
```

## Tests (verified)
```bash
cd android && ./gradlew :core:test
```
Asserts the turn engine + drawing geometry against the shared golden vectors in
`../tools/golden` (generated from the original TypeScript). 10 tests.

The pure `:core` module is JVM-only and tests without the Android SDK; the `:app`
module requires the SDK to compile.
