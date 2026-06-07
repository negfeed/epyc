# EPYC

A multiplayer Pictionary game implemented using **Ionic 8 / Angular 20 / Capacitor 8** and Firebase.

> Originally built on Ionic 3 / Angular 5 / Cordova. See [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md)
> for the full migration plan and execution notes.

## Demo

Below you can find a video demoing this app.
Apologies for the many grammatical, spelling and pronunciation mistakes.
I'm not a native speaker and it was my first screen recording and too much was going on my mind.

[![EPYC DEMO](https://img.youtube.com/vi/N2DJ9mAKROw/0.jpg)](https://www.youtube.com/watch?v=N2DJ9mAKROw)

## Tech stack

- **Ionic** 8 (`@ionic/angular`, standalone components)
- **Angular** 20 (Angular CLI build)
- **Capacitor** 8 (iOS + Android + PWA/web)
- **Firebase** (Realtime Database + Auth) via modular `@angular/fire`
- **paper.js** for the drawing canvas

## Prerequisites

- Node.js 20 LTS (see `.nvmrc`)
- npm 10+
- For native builds: Xcode (iOS) / Android Studio + JDK 17 (Android)

> Installs use `legacy-peer-deps` (configured in `.npmrc`) because `@angular/fire`
> pins Firebase 11 while `@capacitor-firebase/authentication` lists Firebase 12 as
> an optional peer.

## Develop (web / PWA)

```bash
npm install
npm start            # ng serve -> http://localhost:4200
npm run build        # production build into ./www
```

## Test

```bash
npm test             # interactive (Chrome)
npm run test:ci      # headless, single run (ChromeHeadlessCI)
```

## Native (Capacitor)

```bash
npm run build
npx cap sync                 # copy web build + update native projects
npx cap open ios             # build/run in Xcode
npx cap open android         # build/run in Android Studio
```

## Configuration

Firebase config lives in `src/environments/environment.ts` (and
`environment.prod.ts`). The Web App **`appId`** is left blank as a `TODO` — set it
from the Firebase console before shipping. Native Google/Apple sign-in additionally
requires `google-services.json` (Android), `GoogleService-Info.plist` (iOS), the
Apple "Sign in with Apple" capability, and Google OAuth SHA keys.
