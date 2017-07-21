import { NgModule } from '@angular/core';
import { IonicApp, IonicModule } from 'ionic-angular';
import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import { LoginPage } from '../pages/login/login';
import { WaitingRoomPage } from '../pages/waiting-room/waiting-room';
import { WaitTurnPage } from '../pages/wait-turn/wait-turn';
import { WaitGameToEnd } from '../pages/wait-game-to-end/wait-game-to-end';
import { DrawPage } from '../pages/draw/draw';
import { GuessPage } from '../pages/guess/guess';
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
import { DrawingCanvas } from '../components/drawing-canvas/drawing-canvas';
import { RecordingDrawingCanvas } from '../components/recording-drawing-canvas/recording-drawing-canvas';
import { ReplayingDrawingCanvas } from '../components/replaying-drawing-canvas/replaying-drawing-canvas';
import { GameResultsPage } from '../pages/game-results/game-results';
import { ThreadResultsPage } from '../pages/thread-results/thread-results';
import { Words } from '../providers/words/words'

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
    HomePage,
    LoginPage,
    WaitingRoomPage,
    WaitTurnPage,
    WaitGameToEnd,
    DrawPage,
    GuessPage,
    DrawingCanvas,
    RecordingDrawingCanvas,
    ReplayingDrawingCanvas,
    GameResultsPage,
    ThreadResultsPage
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
    HomePage,
    LoginPage,
    WaitingRoomPage,
    WaitTurnPage,
    WaitGameToEnd,
    DrawPage,
    GuessPage,
    GameResultsPage,
    ThreadResultsPage
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
    Words
  ]
})
export class AppModule {}
