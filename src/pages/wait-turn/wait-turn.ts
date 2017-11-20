import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams, Navbar } from 'ionic-angular';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

import { GameModel, GameAtomState, GameModelInterface, NextAtom, GameUser } from '../../providers/game-model/game-model';
import { GameNavigationController } from '../../providers/game-navigation-controller/game-navigation-controller';
import { Auth, AuthUserInfo } from '../../providers/auth/auth';

enum DisplayStepState {
  UNKNOWN = 0,
  NOT_STARTED = 1,
  TURN_TO_PLAY = 2,
  STARTED = 3,
  DONE = 4,
}

interface DisplayStep {
  state: DisplayStepState;
  playerName: string;
  playerPhotoURL: string;
}

interface DisplaySteps {
  [index: number]: DisplayStep;
}

@IonicPage()
@Component({
  selector: 'wait-turn',
  templateUrl: 'wait-turn.html'
})
export class WaitTurnPage {

  private gameKey: string;
  private ngUnsubscribe: Subject<void> = null;
  private threadNumber: number = 3;
  private steps: Observable<DisplaySteps> = null;
  stateEnum = DisplayStepState;
  
  @ViewChild(Navbar) navbar: Navbar

  constructor(
      navParams: NavParams,
      private gameModel: GameModel,
      private gameNavCtrl: GameNavigationController,
      private auth: Auth) {
    this.gameKey = navParams.get('gameKey');
  }

  ionViewDidEnter() {
    console.log('ionViewDidEnter WaitTurnPage');
    this.ngUnsubscribe = new Subject<void>();
    let gameInstanceObservable = this.gameModel.loadInstance(this.gameKey).takeUntil(this.ngUnsubscribe);
    this.steps = gameInstanceObservable.map((gameInstance: GameModelInterface) => {

      // Determine which thread is the user waiting for.
      let nextAtom: NextAtom = GameModel.getNextAtom(gameInstance, this.auth.getUserInfo().uid);
      if (nextAtom.allAtomsDone) {
        console.warn('This should never happen!')
      }
      let threadIndex: number = nextAtom.address.threadIndex
      this.threadNumber = threadIndex + 1;

      // Scan the thread and convert it into display steps.
      let steps: Array<DisplayStep> = [];
      for (let index = 0; index < gameInstance.threads[threadIndex].gameAtoms.length; ++index) {
        let atom = gameInstance.threads[threadIndex].gameAtoms[index];
        let playerIndex: number = GameModel.atomPlayerIndex(
            { threadIndex: threadIndex, atomIndex: index }, 
            gameInstance.usersOrder.length);
        let player: GameUser = gameInstance.users[gameInstance.usersOrder[playerIndex]];
        let state: DisplayStepState = DisplayStepState.UNKNOWN;
        switch (atom.state) {
          case undefined:
          case GameAtomState.NOT_STARTED:
            state = DisplayStepState.NOT_STARTED;
            break;
          case GameAtomState.STARTED:
            state = DisplayStepState.STARTED;
            if (index > 1 && gameInstance.threads[threadIndex].gameAtoms[index - 1].state == GameAtomState.DONE) {
              state = DisplayStepState.TURN_TO_PLAY;
            }
            break;
          case GameAtomState.DONE:
            state = DisplayStepState.DONE;
            break;
        }
        steps.push({
          playerName: player.displayName,
          playerPhotoURL: player.photoURL,
          state: state
        })
      }
      return steps;
    });
    this.navbar.backButtonClick = () => this.backButtonAction();
    this.gameNavCtrl.observeAndNavigateToNextPage(this.gameKey, 'WaitTurnPage');
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave WaitTurnPage');
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.gameNavCtrl.cancelObserveAndNavigateToNextPage();
  }

  private backButtonAction() {
    this.gameNavCtrl.leaveGame();
  }
}
