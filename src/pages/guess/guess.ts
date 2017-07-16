import { Component } from '@angular/core';
import { NavParams, NavController } from 'ionic-angular';

import { GameModel } from '../../providers/game-model/game-model';

@Component({
  selector: 'page-guess',
  templateUrl: 'guess.html'
})
export class GuessPage {

  private gameAtomKey: string;
  private drawingKey: string;
  private guess: string = '';
  private drawingFinished: boolean = false;
  
  constructor(navParams: NavParams, private gameModel: GameModel, private navCtrl: NavController) {
    console.log("Hello DrawPage");
    this.gameAtomKey = navParams.get('gameAtomKey');
    this.drawingKey = navParams.get('drawingKey');
  }

  private canSubmit() {
    return this.guess.trim() != '' && this.drawingFinished;
  }

  submit() {
    if (this.canSubmit()) {
      this.gameModel.upsertAtom(this.gameAtomKey, {guess: this.guess, done: true});
      this.navCtrl.pop();
    }
  }
}