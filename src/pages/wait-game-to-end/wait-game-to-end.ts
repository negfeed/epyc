import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams, Navbar } from 'ionic-angular';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

import { GameNavigationController } from '../../providers/game-navigation-controller/game-navigation-controller';
import { GameModel, GameModelInterface, GameThread, GameAtomState } from '../../providers/game-model/game-model';

interface DisplayThread {
  threadNumber: number,
  completedStepsCount: number,
  totalStepsCount: number,
}

interface DisplayThreads {
  [index: number]: DisplayThread;
}

@IonicPage()
@Component({
  selector: 'page-wait-game-to-end',
  templateUrl: 'wait-game-to-end.html',
})
export class WaitGameToEndPage {

  private gameKey: string;
  private ngUnsubscribe: Subject<void> = null;
  private threads: Observable<DisplayThreads> = null;

  @ViewChild(Navbar) navbar: Navbar

  constructor(
      navParams: NavParams,
      private gameNavCtrl: GameNavigationController,
      private gameModel: GameModel) {
    this.gameKey = navParams.get('gameKey');
  }

  ionViewDidEnter() {
    console.log('ionViewDidEnter WaitGameToEndPage');
    this.ngUnsubscribe = new Subject<void>();
    let gameInstanceObservable = this.gameModel.loadInstance(this.gameKey).takeUntil(this.ngUnsubscribe);
    this.threads = gameInstanceObservable.map((gameInstance: GameModelInterface) => {
      let threads: Array<DisplayThread> = [];
      for (let index = 0; index < gameInstance.threads.length; ++index) {
        let gameThread: GameThread = gameInstance.threads[index];
        let completedStepsCount: number = 0;
        for (let atomIndex = 0; atomIndex < gameThread.gameAtoms.length; ++atomIndex) {
          if (gameThread.gameAtoms[atomIndex].state == GameAtomState.DONE) completedStepsCount++;
        }
        threads.push({
          threadNumber: index + 1,
          completedStepsCount: completedStepsCount,
          totalStepsCount: gameThread.gameAtoms.length,
        });
      }
      return threads;
    });
    this.navbar.backButtonClick = () => this.backButtonAction();
    this.gameNavCtrl.observeAndNavigateToNextPage(this.gameKey, 'WaitGameToEndPage');
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave WaitGameToEndPage');
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.gameNavCtrl.cancelObserveAndNavigateToNextPage();
  }

  private backButtonAction() {
    this.gameNavCtrl.leaveGame();
  }
}
