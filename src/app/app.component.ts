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
    this.auth.getSignedIn().subscribe((signedIn: boolean) => {
      if (signedIn) {
        this.menuCtrl.enable(true, 'authenticated');
        this.menuCtrl.enable(false, 'anonymous');
      } else {
        this.menuCtrl.enable(true, 'anonymous');
        this.menuCtrl.enable(false, 'authenticated');
        this.router.navigateByUrl('/login');
      }
    });
    this.initializeApp();
  }

  private initializeApp() {
    // Restore the previous session if any, otherwise land on the login page.
    this.auth.getLoginStatus().then(
      () => {
        this.router.navigateByUrl('/home');
        setTimeout(() => SplashScreen.hide(), 100);
      },
      (error) => {
        console.log('error: ' + error);
        setTimeout(() => SplashScreen.hide(), 100);
      },
    );

    // Deep links: epyc://... or https://epyc-9f15f.appspot.com/game/:gameKey
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
