import { Component } from '@angular/core';
import { NavParams, NavController } from 'ionic-angular';

import { GameModel, GameModelInterface, AtomAddress } from '../../providers/game-model/game-model';
import { Auth, AuthUserInfo } from '../../providers/auth/auth';
import { DrawPage } from '../draw/draw';
import { GuessPage } from '../guess/guess';

@Component({
  selector: 'wait-turn',
  templateUrl: 'wait-turn.html'
})
export class WaitTurnPage {

  private gameKey: string;

  constructor(
    navParams: NavParams,
    private gameModel: GameModel,
    private auth: Auth,
    private nav: NavController) {
      this.gameKey = navParams.get('gameKey');
      let gameInstanceObservable = this.gameModel.loadInstance(this.gameKey)
      gameInstanceObservable.subscribe((gameInstance: GameModelInterface) => {
        auth.getUserInfo().then((authUserInfo: AuthUserInfo) => {
          let playersCount = gameInstance.usersOrder.length;
          let playerIndex = gameInstance.usersOrder.indexOf(authUserInfo.uid);
          let playerAtomsIterator = GameModel.playerAtoms(playerIndex, playersCount);
          var nextAtomAddressToPlay: AtomAddress = null;
          while (true) {
            let next = playerAtomsIterator.next()
            if (next.done)
              break;
            let gameThread = gameInstance.threads[next.value.threadIndex];
            let gameAtom = gameThread.gameAtoms[next.value.atomIndex];
            if (!gameAtom.done) {
              nextAtomAddressToPlay = next.value
            }
          }
          if (nextAtomAddressToPlay == null) {
            // TODO: Navigate to the wait game to end view.
          } else {
            let gameThread = gameInstance.threads[nextAtomAddressToPlay.threadIndex];
            if (nextAtomAddressToPlay.atomIndex == 0 || 
                gameThread.gameAtoms[nextAtomAddressToPlay.atomIndex - 1].done) {
              if (nextAtomAddressToPlay.atomIndex % 2 == 0) {
                nav.push(DrawPage);
              } else {
                nav.push(GuessPage);
              }
            }
          }
        });
      });
    }
}
