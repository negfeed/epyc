import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {

  constructor(
    private router: Router,
    private toastCtrl: ToastController,
    private auth: AuthService
  ) { }

  ngOnInit() {
    console.log('Login Page Initialized');
  }

  doFacebookLogin() {
    console.log('Start facebook login ...');
    this.auth.doLogin().then(
      () => this.handleSuccessfulFacebookLogin(),
      (error) => this.handleFailedFacebookLogin(error)
    );
  }

  private handleSuccessfulFacebookLogin() {
    this.router.navigate(['/home'], { replaceUrl: true });
  }

  private async handleFailedFacebookLogin(error: any) {
    console.log('error: ' + error);
    const toast = await this.toastCtrl.create({
      message: 'Login failed: ' + (error.message || error),
      duration: 3000,
      position: 'middle'
    });
    await toast.present();
  }
}
