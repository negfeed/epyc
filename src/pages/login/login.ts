import { Component } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';

import { HomePage } from '../home/home';

import { Auth } from '../../providers/auth';

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
      (response) => this.handleSuccessfulFacebookLogin(response),
      (error) => this.handleFailedFacebookLogin(error) 
    );
  }

  private handleSuccessfulFacebookLogin(response: string) {
    console.log('user data: ' + response);
    if (response == 'connected') {
      this.navCtrl.setRoot(HomePage);
    }
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
