import { Component, ViewChild } from '@angular/core';
import { Platform, NavController } from 'ionic-angular';
import { Splashscreen, Facebook } from 'ionic-native';

import { LoginPage } from '../pages/login/login';
import { HomePage } from '../pages/home/home';


@Component({
  template: `<ion-nav #epycNav [root]="rootPage"></ion-nav>`
})
export class MyApp {
  @ViewChild('epycNav') nav: NavController;
  rootPage = HomePage;

  constructor(platform: Platform) {
    platform.ready().then(() => this.onPlatformReady());
  }

  private onPlatformReady() {
    Facebook.getLoginStatus().then(
      (response) => this.handleGetLoginStatusResponse(response),
      (error) => this.handleGetLoginStatusError(error)
    );
  }

  private handleGetLoginStatusResponse(response) {
    if (response.status == 'connected') {
      let uid = response.authResponse.userID;
      let accessToken = response.authResponse.accessToken;
      console.log('uid: ' + uid + ', accessToken: ' + accessToken);
    } else {
      this.nav.push(LoginPage);
    }
    Splashscreen.hide();
  }

  private handleGetLoginStatusError(error) {
    console.log('error: ' + error)
  }
}
