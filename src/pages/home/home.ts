import { Component } from '@angular/core';
import { NavController, ToastController } from 'ionic-angular';

import { LoginPage } from '../login/login';
import { WaitingRoomPage } from '../waiting-room/waiting-room';

import { Auth } from '../../providers/auth/auth';
import { AppModel, AppModelInterface } from '../../providers/app-model/app-model';
import { GameModel } from '../../providers/game-model/game-model';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  private displayName = '';
  private photoURL = '';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private auth: Auth,
    private appModel: AppModel,
    private gameModel: GameModel) {
      auth.getUserInfo().then((authUserInfo) => {
        this.displayName = authUserInfo.displayName;
        this.photoURL = authUserInfo.photoURL;
        appModel.loadInstance(authUserInfo.uid)
            .subscribe((appInstanceInterface: AppModelInterface) => {
              // TODO: What should we do on app instance changes?
              console.log(appInstanceInterface);
            });
      })
  }

  doLogout() {
    this.auth.doLogout().then(
      (response) => this.handleSuccessLogout(response),
      (error) => this.handleFailedLogout(error)
    );
  }

  doNewGame() {
    // - Create new game instance.
    const gameKey = this.gameModel.createInstance();
    // - Navigate to game waiting room.
    this.navCtrl.push(WaitingRoomPage, {gameKey: gameKey});
  }

  private handleSuccessLogout(response) {
    console.log('logout successful: ' + response)
    this.navCtrl.setRoot(LoginPage);
  }

  private handleFailedLogout(error) {
    console.log('logout error: ' + error);
    let toast = this.toastCtrl.create({
      message: 'Error logging out',
      duration: 3000,
      position: 'middle'
    });
    toast.present();
  }
}
