import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonButton,
  IonIcon,
  ToastController,
} from '@ionic/angular/standalone';

import { Auth, AuthProviderId } from '../../services/auth.service';

@Component({
  selector: 'page-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonButton,
    IonIcon,
  ],
})
export class LoginPage {
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private auth = inject(Auth);

  ionViewDidEnter() {
    console.log('Hello Login Page');
  }

  doLogin(provider: AuthProviderId) {
    console.log(`Start ${provider} login ...`);
    this.auth.doLogin(provider).then(
      () => this.handleSuccessfulLogin(),
      (error) => this.handleFailedLogin(error),
    );
  }

  private handleSuccessfulLogin() {
    this.router.navigateByUrl('/home');
  }

  private async handleFailedLogin(error: unknown) {
    console.log('error: ' + error);
    const toast = await this.toastCtrl.create({
      message: String(error),
      duration: 3000,
      position: 'middle',
    });
    toast.present();
  }
}
