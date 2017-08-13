import { Component } from '@angular/core';
import { IonicPage, NavController, ToastController } from 'ionic-angular';

import { Auth } from '../../providers/auth/auth';

@IonicPage()
@Component({
  selector: 'page-login',
  templateUrl: 'login.html'
})
export class LoginPage {

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private auth: Auth) {}

  ionViewDidLoad() {
    console.log('Hello Login Page');
  }

  doFacebookLogin() {
    console.log('Start facebook login ...');
    this.auth.doLogin().then(
      () => this.handleSuccessfulFacebookLogin(),
      (error) => this.handleFailedFacebookLogin(error) 
    );
  }

  private handleSuccessfulFacebookLogin() {
    this.navCtrl.setRoot('HomePage');
  }

  private handleFailedFacebookLogin(error) {
    console.log('error: ' + error);
    let toast = this.toastCtrl.create({
      message: error,
      duration: 3000,
      position: 'middle'
    });
    toast.present();
  }
}
