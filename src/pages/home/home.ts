import { Component } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';

import { LoginPage } from '../login/login';

import { Auth } from '../../providers/auth';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private auth: Auth) {}

  doLogout() {
    this.auth.doLogout().then(
      (response) => this.handleSuccessLogout(response),
      (error) => this.handleFailedLogout(error)
    );
  }

  private handleSuccessLogout(response) {
    console.log('logout successful: ' + response)
    this.navCtrl.setRoot(LoginPage)
  }

  private handleFailedLogout(error) {
    console.log('logout error')
    let toast = this.toastCtrl.create({
      message: 'Error logging out',
      duration: 3000,
      position: 'middle'
    });
    toast.present();
  }
}
