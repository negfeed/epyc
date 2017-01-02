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
  rootPage = HomePage;

  constructor(platform: Platform, private auth: Auth) {
    platform.ready().then(() => this.onPlatformReady());
  }

  private onPlatformReady() {
    this.auth.getLoginStatus().then(
      (response) => this.handleGetLoginStatusResponse(response),
      (error) => this.handleGetLoginStatusError(error)
    );
  }

  private handleGetLoginStatusResponse(response) {
    console.log('login response: ' + response);
    if (response != 'connected') {
      this.nav.push(LoginPage);
    }
    Splashscreen.hide();
  }

  private handleGetLoginStatusError(error) {
    console.log('error: ' + error)
  }
}
