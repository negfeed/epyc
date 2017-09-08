import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams, Navbar } from 'ionic-angular';

import { GameNavigationController } from '../../providers/game-navigation-controller/game-navigation-controller';

@IonicPage()
@Component({
  selector: 'wait-turn',
  templateUrl: 'wait-turn.html'
})
export class WaitTurnPage {

  private gameKey: string;

  @ViewChild(Navbar) navbar: Navbar

  constructor(
      navParams: NavParams,
      private gameNavCtrl: GameNavigationController) {
    this.gameKey = navParams.get('gameKey');
  }

  ionViewDidEnter() {
    console.log('ionViewDidEnter WaitTurnPage');
    this.navbar.backButtonClick = () => this.backButtonAction();
    this.gameNavCtrl.observeAndNavigateToNextPage(this.gameKey, 'WaitTurnPage');
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave WaitTurnPage');
    this.gameNavCtrl.cancelObserveAndNavigateToNextPage();
  }

  private backButtonAction() {
    this.gameNavCtrl.leaveGame();
  }
}
