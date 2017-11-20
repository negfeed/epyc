import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams, Navbar } from 'ionic-angular';

import { GameModel, AtomAddress, GameAtomState } from '../../providers/game-model/game-model';
import { Auth, AuthUserInfo } from '../../providers/auth/auth';
import { GameNavigationController } from '../../providers/game-navigation-controller/game-navigation-controller';

@IonicPage()
@Component({
  selector: 'page-guess',
  templateUrl: 'guess.html'
})
export class GuessPage {

  private gameKey: string;
  private atomAddress: AtomAddress;
  private atomKey: string;
  private drawingKey: string;
  private guess: string = '';
  private drawingFinished: boolean = false;
  
  @ViewChild(Navbar) navbar: Navbar

  constructor(
      navParams: NavParams,
      private gameModel: GameModel,
      private auth: Auth,
      private gameNavCtrl: GameNavigationController) {
    console.log("Hello DrawPage");
    this.gameKey = navParams.get('gameKey');
    this.atomAddress = navParams.get('atomAddress');
    this.atomKey = this.gameModel.getAtomKey(this.gameKey, this.atomAddress);
    this.drawingKey = navParams.get('drawingKey');
  }

  ionViewDidEnter() {
    this.navbar.backButtonClick = () => this.backButtonAction();
    this.gameNavCtrl.observeAndNavigateToNextPage(this.gameKey, 'GuessPage');
    this.gameModel.upsertAtom(this.atomKey, { state: GameAtomState.STARTED });
  }

  private canSubmit() {
    return this.guess.trim() != '' && this.drawingFinished;
  }

  submit() {
    if (this.canSubmit()) {
      let authUserInfo: AuthUserInfo = this.auth.getUserInfo();
      this.gameModel.upsertAtom(this.atomKey, { guess: this.guess, state: GameAtomState.DONE, authorUid: authUserInfo.uid });
    }
  }

  private backButtonAction() {
    this.gameNavCtrl.leaveGame();
  }

  ionViewWillLeave() {
    this.gameNavCtrl.cancelObserveAndNavigateToNextPage();
  }
}