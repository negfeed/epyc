import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonCard,
  IonCardHeader,
  IonItem,
  IonList,
  IonButton,
} from '@ionic/angular/standalone';

import { Auth, AuthUserInfo } from '../../services/auth.service';
import { UserModel, Game } from '../../services/user-model.service';
import { GameModel } from '../../services/game-model.service';
import { GameNavigationController } from '../../services/game-navigation-controller.service';

interface GameLink {
  gameInstanceReference: string;
  join_timestamp_ms: number;
}

@Component({
  selector: 'page-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonItem,
    IonList,
    IonButton,
  ],
})
export class HomePage implements OnInit {
  private auth = inject(Auth);
  private userModel = inject(UserModel);
  private gameModel = inject(GameModel);
  private gameNavigationController = inject(GameNavigationController);

  gameLinks: Observable<Array<GameLink>>;
  userName: string;
  userPhotoUrl: string;

  constructor() {
    const authUserInfo: AuthUserInfo = this.auth.getUserInfo();
    this.userName = authUserInfo.displayName;
    this.userPhotoUrl = authUserInfo.photoURL;
    this.gameLinks = this.userModel.queryLastFewGames(authUserInfo.uid).pipe(
      map((gameList: Game[]) => {
        const gameLinks: Array<GameLink> = [];
        gameList.forEach((game: Game) => {
          gameLinks.push({
            gameInstanceReference: game.$key,
            join_timestamp_ms: game.join_timestamp_ms,
          });
        });
        return gameLinks;
      }),
    );
  }

  ngOnInit() {
    console.log('ngOnInit HomePage');
    const authUserInfo: AuthUserInfo = this.auth.getUserInfo();
    this.userModel.checkIn(authUserInfo.uid);
  }

  doNewGame() {
    const gameKey: string = this.gameModel.createInstance();
    this.gameNavigationController.navigateToGame(gameKey);
  }

  goToGame(gameKey: string) {
    this.gameNavigationController.navigateToGame(gameKey);
  }

}
