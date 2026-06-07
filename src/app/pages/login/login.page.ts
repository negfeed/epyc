import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonButton,
  IonIcon,
  NavController,
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
export class LoginPage implements OnInit {
  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  private toastCtrl = inject(ToastController);
  private auth = inject(Auth);

  ngOnInit() {
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
    // Return to wherever the user was headed before being sent to login
    // (e.g. a shared game URL), defaulting to home. navigateRoot resets the
    // Ionic page stack so the login page is removed from the stack/view.
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
    this.navCtrl.navigateRoot(returnUrl);
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
