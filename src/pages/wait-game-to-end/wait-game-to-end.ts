import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Navbar } from 'ionic-angular';
import { Subject } from 'rxjs/Subject';

import { GameModel, GameModelInterface, GameThread } from '../../providers/game-model/game-model';
import { GameNavigationController } from '../../providers/game-navigation-controller/game-navigation-controller';

@IonicPage()
@Component({
  selector: 'page-wait-game-to-end',
  templateUrl: 'wait-game-to-end.html',
})
export class WaitGameToEndPage {

  private gameKey: string;
  private ngUnsubscribe: Subject<void> = null;

  @ViewChild(Navbar) navbar: Navbar

  constructor(
      private navCtrl: NavController, 
      private navParams: NavParams,
      private gameModel: GameModel,
      private gameNavCtrl: GameNavigationController) {
    this.gameKey = navParams.get('gameKey');
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad WaitGameToEndPage');
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
            this.navCtrl.push('GameResultsPage', { gameKey: this.gameKey });
            console.log('Game is done!!')
          }
        });
    this.navbar.backButtonClick = () => this.backButtonAction();
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave WaitGameToEndPage');
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private backButtonAction() {
    this.gameNavCtrl.leaveGame();
  }
}
