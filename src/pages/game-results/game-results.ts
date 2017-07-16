import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';

@Component({
  selector: 'page-game-results',
  templateUrl: 'game-results.html',
})
export class GameResultsPage {

  constructor(private navCtrl: NavController, private navParams: NavParams) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad GameResults');
  }

}
