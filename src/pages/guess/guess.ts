import { Component } from '@angular/core';
import { NavParams } from 'ionic-angular';

@Component({
  selector: 'page-guess',
  templateUrl: 'guess.html'
})
export class GuessPage {

  private gameAtomKey: string;
  private drawingKey: string;
  
  constructor(navParams: NavParams) {
    console.log("Hello DrawPage");
    this.gameAtomKey = navParams.get('gameAtomKey');
    this.drawingKey = navParams.get('drawingKey');
  }
}