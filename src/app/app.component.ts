import { Component, ViewChild } from '@angular/core';
import { Platform, NavController } from 'ionic-angular';
import { Splashscreen } from 'ionic-native';

import { LoginPage } from '../pages/login/login';
import { HomePage } from '../pages/home/home';

import { Auth } from '../providers/auth';


@Component({
  template: `<ion-nav #epycNav [root]="rootPage"></ion-nav>`
})
export class MyApp {
  @ViewChild('epycNav') nav: NavController;
  rootPage = LoginPage;

  constructor(platform: Platform, private auth: Auth) {
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
    Splashscreen.hide();
  }

  private handleGetLoginStatusError(error) {
    console.log('error: ' + error)
  }
}
