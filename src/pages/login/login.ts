import { Component } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { Facebook, FacebookLoginResponse } from 'ionic-native';

import { HomePage } from '../home/home';

@Component({
  selector: 'page-login',
  templateUrl: 'login.html'
})
export class LoginPage {

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController) {}

  ionViewDidLoad() {
    console.log('Hello Login Page');
  }

  doFacebookLogin() {
    console.log('Start facebook login ...');
    Facebook.login(['public_profile']).then(
      (response: FacebookLoginResponse) => this.handleSuccessfulFacebookLogin(response),
      (error) => this.handleFailedFacebookLogin(error)
    );
  }

  private handleSuccessfulFacebookLogin(response: FacebookLoginResponse) {
    console.log('user data: ' + response);
    this.navCtrl.setRoot(HomePage);
  }

  private handleFailedFacebookLogin(error) {
    console.log('error: ' + error.errorMessage);
    let toast = this.toastCtrl.create({
      message: error.errorMessage,
      duration: 3000,
      position: 'middle'
    });
    toast.present();
  }
}
