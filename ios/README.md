# EPYC — iOS (Swift / SwiftUI)

Native rewrite of the EPYC drawing game. MVVM + a state-driven router; Cloud Firestore
backend; Sign in with Apple + Google. See `../MIGRATION_PLAN.md` for the full design.

## Layout
- `EpycCore/` — pure, dependency-free domain logic (models, `TurnEngine`, `DrawingGeometry`, `Words`, navigation) with unit tests. **No Firebase import.**
- `Epyc/` — the SwiftUI app: `App/` (entry, router, DI), `Core/` (auth, Firestore repositories), `Drawing/` (engine + canvases), `Features/<Screen>/` (View + ViewModel).
- `project.yml` — XcodeGen project definition (source of truth).

## Prerequisites
- Xcode 16+ (built with Xcode 26.3 / Swift 6.2).
- A Firebase project with **Firestore** + **Auth** (Apple + Google providers enabled).
- Replace the placeholder `Epyc/GoogleService-Info.plist` with the real one, and set the
  `REVERSED_CLIENT_ID` URL scheme in `Epyc/Info.plist`.
- Sign in with Apple needs a paid Apple Developer account (capability + key).

## Build & run
```bash
# (re)generate the Xcode project from project.yml
brew install xcodegen        # once
cd ios && xcodegen

# resolve packages + build for the simulator
xcodebuild -project Epyc.xcodeproj -scheme Epyc \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  build CODE_SIGNING_ALLOWED=NO
```
Or just open `Epyc.xcodeproj` in Xcode and run.

## Tests (verified, run offline)
```bash
cd ios/EpycCore && swift test
```
Asserts the turn engine + drawing geometry against the shared golden vectors in
`../../tools/golden` (generated from the original TypeScript). 11 tests.
