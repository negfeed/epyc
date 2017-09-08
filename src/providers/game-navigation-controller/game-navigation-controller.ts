import { Injectable } from '@angular/core';
import { App, AlertController } from 'ionic-angular';
import 'rxjs/add/operator/map';
import { Subject } from 'rxjs/Subject';

import { GameModel, GameModelInterface, GameState, GameThread, GameAtom, AtomAddress, GameAtomType } from '../../providers/game-model/game-model';
import { UserModel } from '../../providers/user-model/user-model';
import { Auth, AuthUserInfo } from '../auth/auth';

type GamePageName = (
  'WaitingRoomPage' 
  | 'WaitTurnPage' 
  | 'DrawPage' 
  | 'GuessPage' 
  | 'WaitGameToEndPage' 
  | 'GameResultsPage');

interface NavigationTarget {
  pageName: GamePageName;
  parameters: any;
}

interface NextAtom {
  address: AtomAddress;
  allAtomsDone: boolean;
}

@Injectable()
export class GameNavigationController {

  private ngUnsubscribe: Subject<void> = null;
  private isSubscribed: boolean = false;

  constructor(
      private gameModel: GameModel,
      private userModel: UserModel,
      private auth: Auth,
      private alertCtrl: AlertController,
      private app: App) {}
  
  public navigateToGame(gameKey: string) {
    console.log(`GameNavigationController: Navigating to game ${gameKey}`);
    this.observeAndNavigateToNextPage(gameKey, null);
  }

  private isGameDone(gameInstance: GameModelInterface): boolean {
    let gameDone: boolean = true;
    gameInstance.threads.forEach((gameThread: GameThread) => {
      let atomsInThread: number = gameThread.gameAtoms.length;
      if (!gameThread.gameAtoms[atomsInThread - 1].done) {
        gameDone = false;
      }
    });
    return gameDone;
  }

  private getNextAtom(gameInstance: GameModelInterface): NextAtom {
    let authUserInfo: AuthUserInfo = this.auth.getUserInfo();
    let playersCount = gameInstance.usersOrder.length;
    let playerIndex = gameInstance.usersOrder.indexOf(authUserInfo.uid);
    let playerAtomsIterator = GameModel.playerAtoms(playerIndex, playersCount);
    let nextAtomAddressToPlay: AtomAddress = null;
    let allAtomsDone: boolean = false;
    while (true) {
      let next = playerAtomsIterator.next()
      if (next.done) {
        allAtomsDone = true;
        break;
      }
      let atomAddress: AtomAddress = next.value;
      let gameThread: GameThread = gameInstance.threads[atomAddress.threadIndex];
      let gameAtom: GameAtom = gameThread.gameAtoms[atomAddress.atomIndex];

      let previousGameAtom: GameAtom = null;
      if (atomAddress.atomIndex > 0) {
        previousGameAtom = gameThread.gameAtoms[atomAddress.atomIndex - 1];
      }

      if (!gameAtom.done) {
        if (!previousGameAtom || previousGameAtom.done) {
          nextAtomAddressToPlay = atomAddress;
        }
        break;
      }
    }
    return { address: nextAtomAddressToPlay, allAtomsDone: allAtomsDone };
  }

  private getNavigationTargetFromGameState(gameInstance: GameModelInterface): NavigationTarget {
    if (gameInstance.state == GameState.CREATED) {
      return {
        pageName: 'WaitingRoomPage',
        parameters: { gameKey: gameInstance.$key }
      }
    } else if (gameInstance.state == GameState.STARTED &&
               gameInstance.usersOrder.some(userId => userId == this.auth.getUserInfo().uid)) {
      if (this.isGameDone(gameInstance)) {
        return {
          pageName: 'GameResultsPage',
          parameters: { gameKey: gameInstance.$key }
        }
      }

      let nextAtom: NextAtom = this.getNextAtom(gameInstance);

      if (!nextAtom.address && nextAtom.allAtomsDone) {
        return {
          pageName: 'WaitGameToEndPage',
          parameters: { gameKey: gameInstance.$key }
        }
      }

      if (!nextAtom.address && !nextAtom.allAtomsDone) {
        return {
          pageName: 'WaitTurnPage',
          parameters: { gameKey: gameInstance.$key }
        }
      }

      if (nextAtom.address) {
        let gameThread: GameThread = gameInstance.threads[nextAtom.address.threadIndex];
        let gameAtom: GameAtom = gameThread.gameAtoms[nextAtom.address.atomIndex];
        let previousGameAtom: GameAtom = null;
        if (nextAtom.address.atomIndex > 0) {
          previousGameAtom = gameThread.gameAtoms[nextAtom.address.atomIndex - 1];
        }
        if (gameAtom.type == GameAtomType.DRAWING) {
          let word: string = null;
          if (nextAtom.address.atomIndex == 0) {
            word = gameThread.word;
          } else {
            word = previousGameAtom.guess;
          }
          return {
            pageName: 'DrawPage',
            parameters: {
              gameKey: gameInstance.$key,
              atomAddress: nextAtom.address,
              word: word
            }
          }
        } else if (gameAtom.type == GameAtomType.GUESS) {
          if (previousGameAtom == null) {
            console.log("Error: previous game atom is expected for word guesses.")
          }
          return {
            pageName: 'GuessPage', 
            parameters: { 
              gameKey: gameInstance.$key,
              atomAddress: nextAtom.address,
              drawingKey: previousGameAtom.drawingRef 
            }
          }
        } else {
          console.log("Error: Unrecognized atom type: " + gameAtom.type)
        }
      }
    }
    console.log('The app should never reach this point.')
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

    console.log(`GameNavigationController: observe and navigate to next ` +
                `page gameKey=${gameKey},sourcePage=${sourcePageName}`);    

    // Unsubscribe any previous subscriptions.
    this.stopSubscription();

    // Observe game, and navigate to the next page and unsubscribe.
    this.ngUnsubscribe = new Subject<void>();
    this.isSubscribed = true;
    this.gameModel.loadInstance(gameKey)
        .takeUntil(this.ngUnsubscribe)
        .subscribe((gameInstance: GameModelInterface) => {
          console.log(`GameNavigationController: change in game state ...`);
          let navigationTarget: NavigationTarget = this.getNavigationTargetFromGameState(gameInstance);

          if (sourcePageName == 'WaitingRoomPage' && sourcePageName != navigationTarget.pageName) {
            this.userModel.insertJoinGame(this.auth.getUserInfo().uid, gameKey);
          }

          if (navigationTarget.pageName != sourcePageName) {
            this.stopSubscription();
            console.log(`GameNavigationController: Pushing new game page ${navigationTarget.pageName}`);
            this.app.getActiveNav().push(navigationTarget.pageName, navigationTarget.parameters);
          }
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
