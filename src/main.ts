import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { addIcons } from 'ionicons';
import {
  menu,
  pause,
  play,
  arrowUndoOutline,
  arrowRedoOutline,
  checkboxOutline,
  squareOutline,
  logoGoogle,
  logoApple,
} from 'ionicons/icons';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';

// Register the icon glyphs used across the app. The template names on the left
// keep the legacy Ionic 3 names so the migrated markup keeps working.
addIcons({
  menu,
  pause,
  play,
  undo: arrowUndoOutline,
  redo: arrowRedoOutline,
  'checkbox-outline': checkboxOutline,
  'square-outline': squareOutline,
  'logo-google': logoGoogle,
  'logo-apple': logoApple,
});

// Dev-only switch to point at the local Firebase emulators (Auth + Firestore)
// instead of the real cloud project. Enabled by adding ?emu=1 to the URL once;
// the choice is persisted in localStorage so it survives the auth redirect
// round-trip. Never affects production.
function resolveUseEmulators(): boolean {
  if (environment.production) return false;
  try {
    if (new URLSearchParams(self.location.search).has('emu')) {
      localStorage.setItem('epyc-use-emulators', '1');
    }
    return localStorage.getItem('epyc-use-emulators') === '1';
  } catch {
    return false;
  }
}
const useEmulators = resolveUseEmulators();

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    // Auth is provided before Firestore so that Firestore captures an
    // auth-aware credentials provider and attaches the user's token to requests.
    provideAuth(() => {
      const auth = getAuth();
      if (useEmulators) {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      }
      return auth;
    }),
    provideFirestore(() => {
      const firestore = getFirestore();
      if (useEmulators) {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }
      return firestore;
    }),
    provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          }),
  ],
});
