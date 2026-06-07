import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonApp,
  IonRouterOutlet,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonMenuToggle,
  MenuController,
} from '@ionic/angular/standalone';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';

import { Auth } from './services/auth.service';

interface MenuPage {
  title: string;
  url: string;
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [
    CommonModule,
    IonApp,
    IonRouterOutlet,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonMenuToggle,
  ],
})
export class AppComponent {
  private auth = inject(Auth);
  private router = inject(Router);
  private menuCtrl = inject(MenuController);

  authenticatedPages: MenuPage[] = [{ title: 'Home', url: '/home' }];
  anonymousPages: MenuPage[] = [{ title: 'Login', url: '/login' }];

  constructor() {
    // Toggle the side menus based on auth state. Routing/guarding is handled by
    // the auth guard on the routes — the app component must NOT imperatively
    // redirect here, or it would clobber deep links (e.g. a shared game URL).
    this.auth.getSignedIn().subscribe((signedIn: boolean) => {
      this.menuCtrl.enable(signedIn, 'authenticated');
      this.menuCtrl.enable(!signedIn, 'anonymous');
    });
    this.initializeApp();
  }

  private initializeApp() {
    // Hide the native splash screen (no-op on the web).
    SplashScreen.hide().catch(() => undefined);

    // Native deep links: epyc://.../game/:gameKey or a universal link. On the
    // web the Angular router handles /game/:gameKey/... directly.
    App.addListener('appUrlOpen', (event) => {
      const match = event.url.match(/\/game\/([^/?#]+)/);
      if (match && match[1]) {
        this.router.navigateByUrl(`/game/${match[1]}/waiting-room`);
      }
    });

    // Hardware back button: exit when there is nowhere to go back to.
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  }

  openPage(page: MenuPage) {
    this.router.navigateByUrl(page.url);
  }

  logout() {
    this.auth.doLogout().then(
      () => this.router.navigateByUrl('/login'),
      (error) => console.log('logout error: ' + error),
    );
  }
}
