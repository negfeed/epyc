# EPYC — Flutter rewrite

A faithful Flutter rewrite of the EPYC telephone-pictionary game. The original
Ionic 3 / Angular 5 app stays intact in the parent repo for reference. See
[`../MIGRATION_PLAN.md`](../MIGRATION_PLAN.md) for the full assessment.

- **Package / bundle id:** `com.negfeed.epycflutter` (iOS + Android)
- **Backend:** Cloud Firestore  ·  **Auth:** Google + Sign in with Apple (via
  `firebase_auth`'s `signInWithProvider` — no extra sign-in plugins)
- **State:** Riverpod  ·  **Routing:** go_router  ·  **Min iOS:** 15.0
- Native `android/` and `ios/` projects are generated and configured.

## Layout
```
lib/
  main.dart                      Firebase init (graceful) + ProviderScope
  src/
    app.dart                     MaterialApp.router + theme (+ Firebase-setup fallback screen)
    models/                      enums, game (Game/Thread/Atom/AtomAddress), drawing_event, app_user
    logic/                       words, game_turn (turn math), game_navigation (state machine) — PURE, unit-tested
    services/
      auth/auth_repository.dart        Google/Apple → firebase_auth signInWithProvider
      firestore/                       game_repository, user_repository, drawing_repository
    providers/providers.dart     all Riverpod providers
    routing/                     router (auth redirect), routes, leave_game
    drawing/                     recording + replaying pads, painter (Catmull-Rom), stroke, mode
    features/                    login, home, waiting_room, wait_turn, draw, guess,
                                 wait_game_to_end, results, game_host_screen (reactive state machine)
test/                           game_turn_test, game_navigation_test, smoke_test  (all pass)
firestore.rules                 security rules
```

`GameHostScreen` (route `/game/:gameId`) is the Flutter equivalent of the
original `GameNavigationController`: it watches the live game document, derives
the navigation target with the pure `GameNavigation.deriveTarget(game, uid)`,
and renders the matching screen — the screens swap automatically as the game
advances in Firestore.

## Run it

The app is already wired to the Firebase project **`epyc-flutter`**: both apps are
registered (`com.negfeed.epycflutter`), Firestore (nam5) + security rules are
deployed, `lib/firebase_options.dart` / `GoogleService-Info.plist` /
`google-services.json` are generated, and `main.dart` initializes from them. The
app launches to the **Login screen** (verified on the iOS simulator).

The only remaining step is enabling the sign-in providers (these need OAuth /
Apple-Developer setup that can't be scripted):

1. **Google** — Firebase console → Authentication → Sign-in method → enable
   Google. This auto-creates the OAuth client; then re-run `flutterfire configure`
   so `GoogleService-Info.plist` picks up the `REVERSED_CLIENT_ID`.
2. **Apple** — enable Apple in the console, add a Services ID + key in your Apple
   Developer account, and add the "Sign in with Apple" capability in Xcode.

```bash
cd flutter
flutter pub get
flutter run                 # booted iOS simulator or an Android device
```

(Config secrets — `firebase_options.dart`, the plist, `google-services.json`,
`.firebaserc`, `firebase.json` — are git-ignored; re-run `flutterfire configure`
on a fresh clone.)

### Build commands
```bash
flutter analyze             # clean
flutter test                # 20 tests pass
flutter build apk --debug   # → build/app/outputs/flutter-apk/app-debug.apk
flutter build ios --simulator   # → build/ios/iphonesimulator/Runner.app
flutter build ipa           # device release (needs an Apple signing team)
```

### Notes
- **Auth providers:** Apple sign-in needs the "Sign in with Apple" capability in
  Xcode and the provider enabled in Firebase. Google sign-in via
  `signInWithProvider` uses the system web auth flow (the reversed-client-id URL
  scheme is added by `flutterfire configure`).
- **Deep-link invites** (`/game/:gameId`): hosting `apple-app-site-association` +
  `assetlinks.json` and wiring `app_links` into go_router is a follow-up; Share
  currently sends a plain link.
- **Icons / splash:** uncomment the `flutter_native_splash` /
  `flutter_launcher_icons` blocks in `pubspec.yaml` (art in `../resources`).
- The Podfile carries a small `post_install` deployment-target bump; the Firebase
  plugins are consumed via Swift Package Manager.
