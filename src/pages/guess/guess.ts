import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams, NavController, Navbar } from 'ionic-angular';

import { GameModel } from '../../providers/game-model/game-model';
import { Auth, AuthUserInfo } from '../../providers/auth/auth';
import { GameNavigationController } from '../../providers/game-navigation-controller/game-navigation-controller';

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
  
  @ViewChild(Navbar) navbar: Navbar

  constructor(
      navParams: NavParams,
      private gameModel: GameModel,
      private navCtrl: NavController,
      private auth: Auth,
      private gameNavCtrl: GameNavigationController) {
    console.log("Hello DrawPage");
    this.gameAtomKey = navParams.get('gameAtomKey');
    this.drawingKey = navParams.get('drawingKey');
  }

  ionViewDidEnter() {
    this.navbar.backButtonClick = () => this.backButtonAction();    
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

  private backButtonAction() {
    this.gameNavCtrl.leaveGame();
  }
}