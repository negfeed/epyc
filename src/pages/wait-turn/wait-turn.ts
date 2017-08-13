import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams, NavController, Navbar } from 'ionic-angular';
import 'rxjs/add/operator/takeUntil';
import { Subject } from 'rxjs/Subject';

import { GameModel, GameModelInterface, AtomAddress, GameThread, GameAtom, GameAtomType } from '../../providers/game-model/game-model';
import { Auth, AuthUserInfo } from '../../providers/auth/auth';
import { GameNavigationController } from '../../providers/game-navigation-controller/game-navigation-controller';

@IonicPage()
@Component({
  selector: 'wait-turn',
  templateUrl: 'wait-turn.html'
})
export class WaitTurnPage {

  private gameKey: string;
  private ngUnsubscribe: Subject<void> = null;

  @ViewChild(Navbar) navbar: Navbar

  constructor(
      navParams: NavParams,
      private gameModel: GameModel,
      private auth: Auth,
      private nav: NavController,
      private gameNavCtrl: GameNavigationController) {
    this.gameKey = navParams.get('gameKey');
  }

  ionViewDidEnter() {
    console.log('ionViewDidEnter WaitTurnPage');
    this.ngUnsubscribe = new Subject<void>();
    this.gameModel.loadInstance(this.gameKey)
      .takeUntil(this.ngUnsubscribe)
      .subscribe((gameInstance: GameModelInterface) => {
        let authUserInfo: AuthUserInfo = this.auth.getUserInfo();
        let playersCount = gameInstance.usersOrder.length;
        let playerIndex = gameInstance.usersOrder.indexOf(authUserInfo.uid);
        let playerAtomsIterator = GameModel.playerAtoms(playerIndex, playersCount);
        var nextAtomAddressToPlay: AtomAddress = null;
        while (true) {
          let next = playerAtomsIterator.next()
          if (next.done)
            break;
          let atomAddress: AtomAddress = next.value;
          let gameThread: GameThread = gameInstance.threads[atomAddress.threadIndex];
          let gameAtom: GameAtom = gameThread.gameAtoms[atomAddress.atomIndex];
          let previousGameAtom: GameAtom = null;
          if (atomAddress.atomIndex > 0) {
            previousGameAtom = gameThread.gameAtoms[atomAddress.atomIndex - 1];
          }
          if (!gameAtom.done) {
            if (!previousGameAtom || previousGameAtom.done) {
              nextAtomAddressToPlay = atomAddress;
              break;
            } else {
              return;
            }
          }
        }
        if (nextAtomAddressToPlay == null) {
          this.nav.push('WaitGameToEndPage', { gameKey: this.gameKey });
        } else {
          let gameThread: GameThread = gameInstance.threads[nextAtomAddressToPlay.threadIndex];
          let gameAtom: GameAtom = gameThread.gameAtoms[nextAtomAddressToPlay.atomIndex];
          let previousGameAtom: GameAtom = null;
          if (nextAtomAddressToPlay.atomIndex > 0) {
            previousGameAtom = gameThread.gameAtoms[nextAtomAddressToPlay.atomIndex - 1];
          }

          if (gameAtom.type == GameAtomType.DRAWING) {
            let word: string = null;
            if (nextAtomAddressToPlay.atomIndex == 0) {
              word = gameThread.word;
            } else {
              word = previousGameAtom.guess;
            }
            this.nav.push(
              'DrawPage',
              {
                gameAtomKey: this.gameModel.getAtomKey(this.gameKey, nextAtomAddressToPlay),
                word: word
              });
          } else if (gameAtom.type == GameAtomType.GUESS) {
            if (previousGameAtom == null) {
              console.log("Error: previous game atom is expected for word guesses.")
            }
            this.nav.push(
              'GuessPage', 
              { 
                gameAtomKey: this.gameModel.getAtomKey(this.gameKey, nextAtomAddressToPlay),
                drawingKey: previousGameAtom.drawingRef 
              });
          } else {
            console.log("Error: Unrecognized atom type: " + gameAtom.type)
          }
        }
      });
    this.navbar.backButtonClick = () => this.backButtonAction();
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave WaitTurnPage');
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private backButtonAction() {
    this.gameNavCtrl.leaveGame();
  }
}
