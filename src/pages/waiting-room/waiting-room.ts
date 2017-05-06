import { Component } from '@angular/core';
import { NavParams } from 'ionic-angular';
import { Observable } from 'rxjs/Observable';

import { GameModel, GameModelInterface } from '../../providers/game-model/game-model';

@Component({
  selector: 'waiting-room-login',
  templateUrl: 'waiting-room.html'
})
export class WaitingRoomPage {

  private gameKey = '';
  private gameInstance: Observable<GameModelInterface> = null;

  constructor(
    navParams: NavParams,
    gameModel: GameModel) {
      this.gameKey = navParams.get('gameKey');
      this.gameInstance = gameModel.loadInstance(this.gameKey);
    }
}
