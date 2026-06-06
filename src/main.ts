import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideDatabase, getDatabase } from '@angular/fire/database';
import { provideAuth, getAuth } from '@angular/fire/auth';
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

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideDatabase(() => getDatabase()),
    provideAuth(() => getAuth()),
  ],
});
