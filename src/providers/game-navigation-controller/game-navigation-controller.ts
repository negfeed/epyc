import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import { Subject } from 'rxjs/Subject';

import { GameModel, GameModelInterface, GameUser, GameState } from '../../providers/game-model/game-model';

@Injectable()
export class GameNavigationController {

  private ngUnsubscribe: Subject<void> = null;
  private isSubscribed: boolean = false;

  constructor(private gameModel: GameModel) {}
  
  public navigateToGame(user, gameKey) {
    this.observeAndNavigateToNextPage(user, gameKey, null);
  }

  public observeAndNavigateToNextPage(user, gameKey, sourcePage) {
    // Unsubscribe any previous subscriptions.

    // Observe game, and navigate to the next page.
    this.ngUnsubscribe = new Subject<void>();
    this.isSubscribed = true;
    this.gameModel.loadInstance(gameKey)
        .takeUntil(this.ngUnsubscribe)
        .subscribe((gameInstance: GameModelInterface) => {
          
        });
  }

  public cancelObserveAndNavigateToNextPage() {
    // Unsubscribe on navigating away.
  }

  public leaveGame() {
    // Unsubscribe any previous subscription.
    // Pop back to root view.
  }
}
