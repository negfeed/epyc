import { Component } from '@angular/core';
import { IonicPage, NavController } from 'ionic-angular';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

import { Auth, AuthUserInfo } from '../../providers/auth/auth';
import { AppModel, Game } from '../../providers/app-model/app-model';
import { GameModel } from '../../providers/game-model/game-model';

interface GameLink {
  gameInstanceReference: string,
  join_timestamp_ms: number
}

@IonicPage()
@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  private gameLinks: Observable<Array<GameLink>>;

  constructor(
      private navCtrl: NavController,
      private auth: Auth,
      private appModel: AppModel,
      private gameModel: GameModel) {
    let authUserInfo: AuthUserInfo = this.auth.getUserInfo();
    this.gameLinks = this.appModel.queryLastFewGames(authUserInfo.uid)
        .map((gameList: Game[]) => {
          let gameLinks: Array<GameLink> = [];
          gameList.forEach((game: Game) => {
            gameLinks.push({ gameInstanceReference: game.$key, join_timestamp_ms: game.join_timestamp_ms });
          })
          return gameLinks;
        });
  }

  ionViewDidEnter() {
    console.log('ionViewDidEnter HomePage');
    let authUserInfo: AuthUserInfo = this.auth.getUserInfo();
    this.appModel.checkIn(authUserInfo.uid);
  }

  doNewGame() {
    let gameKey: string = this.gameModel.createInstance();
    this.navCtrl.push('WaitingRoomPage', { gameKey: gameKey });
  }

  goToGame(gameInstanceReference: string) {
    this.navCtrl.push('WaitingRoomPage', { gameKey: gameInstanceReference });
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave HomePage');
  }
}
