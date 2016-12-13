import { Component } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';
import { Facebook } from 'ionic-native';

import { LoginPage } from '../login/login';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController) {}

  doLogout() {
    Facebook.logout().then(
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
