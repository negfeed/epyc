import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';

import { WaitingRoomPage } from '../waiting-room/waiting-room';

import { Auth } from '../../providers/auth/auth';
import { AppModel, AppModelInterface } from '../../providers/app-model/app-model';
import { GameModel } from '../../providers/game-model/game-model';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(
    private navCtrl: NavController,
    private auth: Auth,
    private appModel: AppModel,
    private gameModel: GameModel) {
      auth.getUserInfo().then((authUserInfo) => {
        appModel.loadInstance(authUserInfo.uid)
            .subscribe((appInstanceInterface: AppModelInterface) => {
              // TODO: What should we do on app instance changes?
              console.log(appInstanceInterface);
            });
      })
  }

  doNewGame() {
    this.gameModel.createInstance().then((gameKey) => {
      this.navCtrl.push(WaitingRoomPage, {gameKey: gameKey});
    })
  }
}
