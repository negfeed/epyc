import { Component, ViewChild } from '@angular/core';
import { Nav, Platform, NavController, MenuController } from 'ionic-angular';
import { SplashScreen } from '@ionic-native/splash-screen';

import { LoginPage } from '../pages/login/login';
import { HomePage } from '../pages/home/home';

import { Auth } from '../providers/auth/auth';


@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: NavController;
  rootPage = LoginPage;
  authenticatedPages: Array<{title: string, component: any}>;
  anonymousPages: Array<{title: string, component: any}>;

  constructor(
    platform: Platform, 
    private auth: Auth, 
    private splashScreen: SplashScreen,
    private menuCtrl: MenuController) {

    this.authenticatedPages = [
      { title: 'Home', component: HomePage }
    ];
    this.anonymousPages = [
      { title: 'Login', component: LoginPage }
    ];
    this.auth.getSignedIn().subscribe((signedIn: boolean) => {
      if (signedIn) {
        this.menuCtrl.enable(true, 'authenticated');
      } else {
        this.menuCtrl.enable(true, 'anonymous');
        this.nav.setRoot(LoginPage);
      }
    });
    platform.ready().then(() => this.onPlatformReady());
  }

  private onPlatformReady() {
    this.auth.getLoginStatus().then(
      () => this.handleGetLoginStatusResponse(),
      (error) => this.handleGetLoginStatusError(error)
    );
  }

  private handleGetLoginStatusResponse() {
    this.nav.setRoot(HomePage);
    setTimeout(() => { this.splashScreen.hide(); }, 100);
  }

  private handleGetLoginStatusError(error) {
    console.log('error: ' + error)
    setTimeout(() => { this.splashScreen.hide(); }, 100);
  }

  openPage(p: any) {
    // Get the <ion-nav> by id
    this.nav.setRoot(p.component);
  }

  logout() {
    this.auth.doLogout();
  }
}
