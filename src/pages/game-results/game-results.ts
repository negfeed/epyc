import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/takeUntil';

import { GameModel, GameModelInterface, GameThread } from '../../providers/game-model/game-model';

@IonicPage()
@Component({
  selector: 'page-game-results',
  templateUrl: 'game-results.html',
})
export class GameResultsPage {

  private gameKey: string = '';
  private ngUnsubscribe: Subject<void> = null;
  private gameInstance: GameModelInterface = null;
  private words: Observable<Array<string>> = null;

  constructor(
      private navCtrl: NavController,
      private navParams: NavParams,
      private gameModel: GameModel) {
    this.gameKey = navParams.get('gameKey');
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad GameResults');
    this.ngUnsubscribe = new Subject<void>();
    let gameInstanceObservable = this.gameModel.loadInstance(this.gameKey).takeUntil(this.ngUnsubscribe);
    gameInstanceObservable.subscribe((gameInstance: GameModelInterface) => {
      this.gameInstance = gameInstance;
    });
    this.words = gameInstanceObservable.map((gameInstance: GameModelInterface) => {
      let words = new Array<string>();
      gameInstance.threads.forEach((gameThread: GameThread) => {
        words.push(this.capitalizeFirstLetter(gameThread.word));
      });
      return words;
    });
  }

  itemSelected(threadIndex: number) {
    this.navCtrl.push('ThreadResultsPage', { gameInstance: this.gameInstance, threadIndex: threadIndex });
  }

  goHome() {
    this.navCtrl.popToRoot();
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave WaitTurnRoom');
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private capitalizeFirstLetter(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
}
