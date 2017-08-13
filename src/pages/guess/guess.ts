import { Component } from '@angular/core';
import { IonicPage, NavParams, NavController } from 'ionic-angular';

import { GameModel } from '../../providers/game-model/game-model';
import { Auth, AuthUserInfo } from '../../providers/auth/auth';

@IonicPage()
@Component({
  selector: 'page-guess',
  templateUrl: 'guess.html'
})
export class GuessPage {

  private gameAtomKey: string;
  private drawingKey: string;
  private guess: string = '';
  private drawingFinished: boolean = false;
  
  constructor(
      navParams: NavParams,
      private gameModel: GameModel,
      private navCtrl: NavController,
      private auth: Auth) {
    console.log("Hello DrawPage");
    this.gameAtomKey = navParams.get('gameAtomKey');
    this.drawingKey = navParams.get('drawingKey');
  }

  private canSubmit() {
    return this.guess.trim() != '' && this.drawingFinished;
  }

  submit() {
    if (this.canSubmit()) {
      let authUserInfo: AuthUserInfo = this.auth.getUserInfo();
      this.gameModel.upsertAtom(this.gameAtomKey, { guess: this.guess, done: true, authorUid: authUserInfo.uid })
          .then(() => {
            this.navCtrl.pop();
          });
    }
  }
}