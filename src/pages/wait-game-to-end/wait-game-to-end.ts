import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams, Navbar } from 'ionic-angular';

import { GameNavigationController } from '../../providers/game-navigation-controller/game-navigation-controller';

@IonicPage()
@Component({
  selector: 'page-wait-game-to-end',
  templateUrl: 'wait-game-to-end.html',
})
export class WaitGameToEndPage {

  private gameKey: string;

  @ViewChild(Navbar) navbar: Navbar

  constructor(
      navParams: NavParams,
      private gameNavCtrl: GameNavigationController) {
    this.gameKey = navParams.get('gameKey');
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad WaitGameToEndPage');
    this.navbar.backButtonClick = () => this.backButtonAction();
    this.gameNavCtrl.observeAndNavigateToNextPage(this.gameKey, 'WaitGameToEndPage');
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave WaitGameToEndPage');
    this.gameNavCtrl.cancelObserveAndNavigateToNextPage();
  }

  private backButtonAction() {
    this.gameNavCtrl.leaveGame();
  }
}
