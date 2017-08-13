import { Injectable } from '@angular/core';
import { App, NavParams, NavController, AlertController } from 'ionic-angular';
import 'rxjs/add/operator/map';
import { Subject } from 'rxjs/Subject';

import { GameModel, GameModelInterface, GameUser, GameState } from '../../providers/game-model/game-model';
import { Auth, AuthUserInfo } from '../auth/auth';

type GamePageName = 'WaitingRoomPage' | 'WaitTurnPage' | 'DrawPage' | 'GuessPage' | 'WaitGameToEndPage' | 'GameResults';

interface NavigationTarget {
  pageName: GamePageName;
  arguments: any;
}

@Injectable()
export class GameNavigationController {

  private ngUnsubscribe: Subject<void> = null;
  private isSubscribed: boolean = false;

  constructor(
      private gameModel: GameModel,
      private auth: Auth,
      private alertCtrl: AlertController,
      private app: App) {}
  
  public navigateToGame(gameKey: string) {
    this.observeAndNavigateToNextPage(gameKey, null);
  }

  private getPageFromGameState(gameInstance: GameModelInterface): NavigationTarget {
    return null;
  }

  private stopSubscription() {
    if (this.isSubscribed) {
      this.ngUnsubscribe.next();
      this.ngUnsubscribe.complete();
      this.isSubscribed = false;
    }
  }

  public observeAndNavigateToNextPage(gameKey: string, sourcePage: GamePageName) {
    // Unsubscribe any previous subscriptions.
    this.stopSubscription();

    // Observe game, and navigate to the next page.
    this.ngUnsubscribe = new Subject<void>();
    this.isSubscribed = true;
    this.gameModel.loadInstance(gameKey)
        .takeUntil(this.ngUnsubscribe)
        .subscribe((gameInstance: GameModelInterface) => {
          let page = this.getPageFromGameState(gameInstance);
        });
  }

  public cancelObserveAndNavigateToNextPage() {
    // Unsubscribe any previous subscriptions.
    this.stopSubscription();
  }

  public leaveGame() {

    // Confirm the user intention to navigate away.
    let alert = this.alertCtrl.create({
      title: 'Leave Game',
      message: 'Are you sure you want to leave the game?',
      buttons: [
        {
          text: 'Yes, I\'ll return later',
          handler: () => {
            // Unsubscribe any previous subscription.
            this.stopSubscription();

            // Pop back to root view.
            this.app.getActiveNav().popToRoot();
          }
        },
        {
          text: 'No, keep me here',
          handler: () => {}
        }
      ]
    });
    alert.present();
  }
}
