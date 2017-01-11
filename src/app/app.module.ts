import { NgModule } from '@angular/core';
import { IonicApp, IonicModule } from 'ionic-angular';
import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import { LoginPage } from '../pages/login/login';
import { Auth } from '../providers/auth';
import { AngularFireModule, AuthProviders, AuthMethods } from 'angularfire2';

// Must export the config
export const firebaseConfig = {
  apiKey: "AIzaSyDMdMpW7-3bHo66NJlWh0y0Ut-CNKfqce0",
  authDomain: "epyc-20b49.firebaseapp.com",
  databaseURL: "https://epyc-20b49.firebaseio.com",
  storageBucket: "epyc-20b49.appspot.com",
  messagingSenderId: "760173367530"
};

export const firebaseAuthConfig = {
  provider: AuthProviders.Facebook,
  method: AuthMethods.OAuthToken
}

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    LoginPage
  ],
  imports: [
    IonicModule.forRoot(MyApp),
    AngularFireModule.initializeApp(firebaseConfig, firebaseAuthConfig)
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    LoginPage,
  ],
  providers: [
    Auth
  ]
})
export class AppModule {}
