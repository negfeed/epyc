import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonAvatar,
  IonIcon,
} from '@ionic/angular/standalone';

import {
  GameModel,
  GameAtomState,
  GameModelInterface,
  NextAtom,
  GameUser,
} from '../../services/game-model.service';
import { GameNavigationController } from '../../services/game-navigation-controller.service';
import { Auth } from '../../services/auth.service';

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

@Component({
  selector: 'page-wait-turn',
  templateUrl: 'wait-turn.page.html',
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonAvatar,
    IonIcon,
  ],
})
export class WaitTurnPage {
  private route = inject(ActivatedRoute);
  private gameModel = inject(GameModel);
  private gameNavCtrl = inject(GameNavigationController);
  private auth = inject(Auth);

  private gameKey: string;
  private ngUnsubscribe: Subject<void> = null;
  threadNumber = 3;
  steps: Observable<DisplaySteps> = null;
  stateEnum = DisplayStepState;

  constructor() {
    this.gameKey = this.route.snapshot.paramMap.get('gameKey');
  }

  ionViewDidEnter() {
    console.log('ionViewDidEnter WaitTurnPage');
    this.ngUnsubscribe = new Subject<void>();
    const gameInstanceObservable = this.gameModel
      .loadInstance(this.gameKey)
      .pipe(takeUntil(this.ngUnsubscribe));
    this.steps = gameInstanceObservable.pipe(
      map((gameInstance: GameModelInterface) => {
        // Determine which thread the user is waiting for.
        const nextAtom: NextAtom = GameModel.getNextAtom(gameInstance, this.auth.getUserInfo().uid);
        if (nextAtom.allAtomsDone) {
          console.warn('This should never happen!');
        }
        const threadIndex: number = nextAtom.address.threadIndex;
        this.threadNumber = threadIndex + 1;

        // Scan the thread and convert it into display steps.
        const steps: Array<DisplayStep> = [];
        for (let index = 0; index < gameInstance.threads[threadIndex].gameAtoms.length; ++index) {
          const atom = gameInstance.threads[threadIndex].gameAtoms[index];
          const playerIndex: number = GameModel.atomPlayerIndex(
            { threadIndex, atomIndex: index },
            gameInstance.usersOrder.length,
          );
          const player: GameUser = gameInstance.users[gameInstance.usersOrder[playerIndex]];
          let state: DisplayStepState = DisplayStepState.UNKNOWN;
          switch (atom.state) {
            case undefined:
            case GameAtomState.NOT_STARTED:
              state = DisplayStepState.NOT_STARTED;
              break;
            case GameAtomState.STARTED:
              state = DisplayStepState.STARTED;
              if (
                index > 1 &&
                gameInstance.threads[threadIndex].gameAtoms[index - 1].state === GameAtomState.DONE
              ) {
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
            state,
          });
        }
        return steps;
      }),
    );
    this.gameNavCtrl.observeAndNavigateToNextPage(this.gameKey, 'WaitTurnPage');
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave WaitTurnPage');
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.gameNavCtrl.cancelObserveAndNavigateToNextPage();
  }

  backButtonAction() {
    this.gameNavCtrl.leaveGame();
  }
}
