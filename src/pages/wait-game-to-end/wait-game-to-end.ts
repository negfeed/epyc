import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Subject } from 'rxjs/Subject';

import { GameModel, GameModelInterface, GameThread } from '../../providers/game-model/game-model';
import { GameResultsPage } from '../game-results/game-results';

@Component({
  selector: 'page-wait-game-to-end',
  templateUrl: 'wait-game-to-end.html',
})
export class WaitGameToEnd {

  private gameKey: string;
  private ngUnsubscribe: Subject<void> = null;

  constructor(
      private navCtrl: NavController, 
      private navParams: NavParams,
      private gameModel: GameModel) {
    this.gameKey = navParams.get('gameKey');
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad WaitGameToEnd');
    this.ngUnsubscribe = new Subject<void>();
    this.gameModel.loadInstance(this.gameKey)
        .takeUntil(this.ngUnsubscribe)
        .subscribe((gameInstance: GameModelInterface) => {
          let gameEnded: boolean = true;
          gameInstance.threads.forEach((gameThread: GameThread) => {
            let atomsInThread: number = gameThread.gameAtoms.length;
            if (!gameThread.gameAtoms[atomsInThread - 1].done) {
              gameEnded = false;
            }
          });
          if (gameEnded) {
            this.navCtrl.push(GameResultsPage, { gameKey: this.gameKey });
            console.log('Game is done!!')
          }
        });
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave WaitGameToEnd');
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
