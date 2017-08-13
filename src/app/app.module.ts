import { NgModule } from '@angular/core';
import { IonicApp, IonicModule } from 'ionic-angular';
import { MyApp } from './app.component';
import { Auth } from '../providers/auth/auth';
import { AppModel } from '../providers/app-model/app-model';
import { GameModel } from '../providers/game-model/game-model';
import { DrawingModel } from '../providers/drawing-model/drawing-model';
import { AngularFireModule } from 'angularfire2';
import { AngularFireDatabaseModule } from 'angularfire2/database';
import { AngularFireAuthModule } from 'angularfire2/auth';
import { BrowserModule } from '@angular/platform-browser';
import { Facebook } from '@ionic-native/facebook';
import { SplashScreen } from '@ionic-native/splash-screen';
import { SocialSharing } from '@ionic-native/social-sharing';
import { Deeplinks } from '@ionic-native/deeplinks';
import { Words } from '../providers/words/words'
import { GameNavigationController } from '../providers/game-navigation-controller/game-navigation-controller';

// Must export the config
export const firebaseConfig = {
  apiKey: "AIzaSyADo4umy3bmQIG8nZ6UgJuB9y0iR-WvsUo",
  authDomain: "epyc-9f15f.firebaseapp.com",
  databaseURL: "https://epyc-9f15f.firebaseio.com",
  storageBucket: "epyc-9f15f.appspot.com",
  messagingSenderId: "468473195385"
};

@NgModule({
  declarations: [
    MyApp,
  ],
  imports: [
    IonicModule.forRoot(MyApp),
    AngularFireModule.initializeApp(firebaseConfig, 'epyc'),
    AngularFireDatabaseModule,
    AngularFireAuthModule,
    BrowserModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
  ],
  providers: [
    Auth,
    AppModel,
    DrawingModel,
    GameModel,
    Facebook,
    SplashScreen,
    SocialSharing,
    Deeplinks,
    Words,
    GameNavigationController
  ]
})
export class AppModule {}
