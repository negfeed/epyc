import { Component } from '@angular/core';
import { IonicPage } from 'ionic-angular';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

import { Auth, AuthUserInfo } from '../../providers/auth/auth';
import { UserModel, Game } from '../../providers/user-model/user-model';
import { GameModel } from '../../providers/game-model/game-model';
import { GameNavigationController } from '../../providers/game-navigation-controller/game-navigation-controller';

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
      private auth: Auth,
      private userModel: UserModel,
      private gameModel: GameModel,
      private gameNavigationController: GameNavigationController) {
    let authUserInfo: AuthUserInfo = this.auth.getUserInfo();
    this.gameLinks = this.userModel.queryLastFewGames(authUserInfo.uid)
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
    this.userModel.checkIn(authUserInfo.uid);
  }

  doNewGame() {
    let gameKey: string = this.gameModel.createInstance();
    this.gameNavigationController.navigateToGame(gameKey);
  }

  goToGame(gameKey: string) {
    this.gameNavigationController.navigateToGame(gameKey);
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave HomePage');
  }
}
