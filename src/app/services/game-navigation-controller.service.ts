import { Injectable, inject } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular/standalone';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  GameModel,
  GameModelInterface,
  GameState,
  GameThread,
  GameAtom,
  NextAtom,
  GameAtomType,
  GameAtomState,
} from './game-model.service';
import { UserModel } from './user-model.service';
import { Auth } from './auth.service';
import { GameParams } from './game-params.service';

type GamePageName =
  | 'WaitingRoomPage'
  | 'WaitTurnPage'
  | 'DrawPage'
  | 'GuessPage'
  | 'WaitGameToEndPage'
  | 'GameResultsPage';

interface NavigationTarget {
  pageName: GamePageName;
  parameters: any;
}

/**
 * Central game-flow navigator. In Ionic 3 this pushed string-named pages onto
 * the NavController; under Angular it observes the game state and navigates to
 * the matching route, stashing transient params in {@link GameParams}.
 */
@Injectable({ providedIn: 'root' })
export class GameNavigationController {
  private gameModel = inject(GameModel);
  private userModel = inject(UserModel);
  private auth = inject(Auth);
  private alertCtrl = inject(AlertController);
  private navCtrl = inject(NavController);
  private gameParams = inject(GameParams);

  private ngUnsubscribe: Subject<void> = null;
  private isSubscribed = false;

  /** Maps a logical page name + its params to a concrete router URL. */
  private routeFor(pageName: GamePageName, gameKey: string): string {
    switch (pageName) {
      case 'WaitingRoomPage':
        return `/game/${gameKey}/waiting-room`;
      case 'WaitTurnPage':
        return `/game/${gameKey}/wait-turn`;
      case 'DrawPage':
        return `/game/${gameKey}/draw`;
      case 'GuessPage':
        return `/game/${gameKey}/guess`;
      case 'WaitGameToEndPage':
        return `/game/${gameKey}/wait-game-to-end`;
      case 'GameResultsPage':
        return `/game/${gameKey}/results`;
    }
  }

  public navigateToGame(gameKey: string) {
    console.log(`GameNavigationController: Navigating to game ${gameKey}`);
    this.observeAndNavigateToNextPage(gameKey, null);
  }

  private isGameDone(gameInstance: GameModelInterface): boolean {
    let gameDone = true;
    gameInstance.threads.forEach((gameThread: GameThread) => {
      const atomsInThread: number = gameThread.gameAtoms.length;
      if (gameThread.gameAtoms[atomsInThread - 1].state !== GameAtomState.DONE) {
        gameDone = false;
      }
    });
    return gameDone;
  }

  private getNavigationTargetFromGameState(gameInstance: GameModelInterface): NavigationTarget {
    if (gameInstance.state === GameState.CREATED) {
      return {
        pageName: 'WaitingRoomPage',
        parameters: { gameKey: gameInstance.$key },
      };
    } else if (
      gameInstance.state === GameState.STARTED &&
      gameInstance.usersOrder.some((userId) => userId === this.auth.getUserInfo().uid)
    ) {
      if (this.isGameDone(gameInstance)) {
        return {
          pageName: 'GameResultsPage',
          parameters: { gameKey: gameInstance.$key },
        };
      }

      const nextAtom: NextAtom = GameModel.getNextAtom(gameInstance, this.auth.getUserInfo().uid);

      if (nextAtom.allAtomsDone) {
        return {
          pageName: 'WaitGameToEndPage',
          parameters: { gameKey: gameInstance.$key },
        };
      }

      if (!nextAtom.readyToPlay) {
        return {
          pageName: 'WaitTurnPage',
          parameters: { gameKey: gameInstance.$key },
        };
      }

      if (nextAtom.address) {
        const gameThread: GameThread = gameInstance.threads[nextAtom.address.threadIndex];
        const gameAtom: GameAtom = gameThread.gameAtoms[nextAtom.address.atomIndex];
        let previousGameAtom: GameAtom = null;
        if (nextAtom.address.atomIndex > 0) {
          previousGameAtom = gameThread.gameAtoms[nextAtom.address.atomIndex - 1];
        }
        if (gameAtom.type === GameAtomType.DRAWING) {
          let word: string = null;
          if (nextAtom.address.atomIndex === 0) {
            word = gameThread.word;
          } else {
            word = previousGameAtom.guess;
          }
          return {
            pageName: 'DrawPage',
            parameters: {
              gameKey: gameInstance.$key,
              atomAddress: nextAtom.address,
              word,
            },
          };
        } else if (gameAtom.type === GameAtomType.GUESS) {
          if (previousGameAtom == null) {
            console.log('Error: previous game atom is expected for word guesses.');
          }
          return {
            pageName: 'GuessPage',
            parameters: {
              gameKey: gameInstance.$key,
              atomAddress: nextAtom.address,
              drawingKey: previousGameAtom.drawingRef,
            },
          };
        } else {
          console.log('Error: Unrecognized atom type: ' + gameAtom.type);
        }
      }
    }
    console.log('The app should never reach this point.');
    return null;
  }

  private stopSubscription() {
    console.log(`GameNavigationController: stopping game subscription`);
    if (this.isSubscribed) {
      this.ngUnsubscribe.next();
      this.ngUnsubscribe.complete();
      this.isSubscribed = false;
    }
  }

  public observeAndNavigateToNextPage(gameKey: string, sourcePageName: GamePageName) {
    console.log(
      `GameNavigationController: observe and navigate to next ` +
        `page gameKey=${gameKey},sourcePage=${sourcePageName}`,
    );

    // Unsubscribe any previous subscriptions.
    this.stopSubscription();

    // Observe game, and navigate to the next page and unsubscribe.
    this.ngUnsubscribe = new Subject<void>();
    this.isSubscribed = true;
    this.gameModel
      .loadInstance(gameKey)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((gameInstance: GameModelInterface) => {
        // Firestore docData emits undefined until a freshly created game document
        // has been written; ignore those transient empty emissions.
        if (!gameInstance) {
          return;
        }
        const navigationTarget: NavigationTarget =
          this.getNavigationTargetFromGameState(gameInstance);

        // Guard against an unresolved target (would otherwise throw and kill the
        // subscription, leaving the user stuck on the current page).
        if (!navigationTarget) {
          return;
        }

        if (sourcePageName === 'WaitingRoomPage' && sourcePageName !== navigationTarget.pageName) {
          this.userModel.insertJoinGame(this.auth.getUserInfo().uid, gameKey);
        }

        if (navigationTarget.pageName !== sourcePageName) {
          this.stopSubscription();
          // Stash transient parameters then navigate to the matching route.
          // NavController (not plain Router) is used so Ionic emits the
          // ionViewWillEnter/ionViewDidEnter lifecycle events the pages rely on.
          this.gameParams.set(navigationTarget.parameters);
          this.navCtrl.navigateForward(this.routeFor(navigationTarget.pageName, gameKey));
        }
      });
  }

  public cancelObserveAndNavigateToNextPage() {
    // Unsubscribe any previous subscriptions.
    this.stopSubscription();
  }

  public async leaveGame() {
    // Confirm the user intention to navigate away.
    const alert = await this.alertCtrl.create({
      header: 'Leave Game',
      message: 'Are you sure you want to leave the game?',
      buttons: [
        {
          text: "Yes, I'll return later",
          handler: () => {
            // Unsubscribe any previous subscription.
            this.stopSubscription();
            // Pop back to the home (root) view.
            this.navCtrl.navigateRoot('/home');
          },
        },
        {
          text: 'No, keep me here',
          handler: () => {},
        },
      ],
    });
    await alert.present();
  }
}
