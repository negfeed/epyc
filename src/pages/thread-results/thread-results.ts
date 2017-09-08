import { Component } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';

import { GameModelInterface, GameThread, GameAtom, GameAtomType } from '../../providers/game-model/game-model';

interface DisplayGameAtom {
  isDrawing: boolean,
  isGuess: boolean,
  drawingRef?: string;
  guess?: string;
  authorDisplayName: string;
  authorPhotoURL: string;
}

@IonicPage()
@Component({
  selector: 'page-thread-results',
  templateUrl: 'thread-results.html',
})
export class ThreadResultsPage {

  private word: string = null;
  private atoms: Array<DisplayGameAtom> = null;

  constructor(navParams: NavParams) {
    let gameInstance: GameModelInterface = navParams.get('gameInstance');
    let threadIndex: number = navParams.get('threadIndex');
    let gameThread = gameInstance.threads[threadIndex];
    this.word = gameThread.word;
    this.atoms = [];
    gameThread.gameAtoms.forEach((gameAtom: GameAtom) => {
      this.atoms.push({
        isDrawing: gameAtom.type == GameAtomType.DRAWING,
        isGuess: gameAtom.type == GameAtomType.GUESS,
        guess: gameAtom.guess,
        drawingRef: gameAtom.drawingRef,
        authorDisplayName: gameInstance.users[gameAtom.authorUid].displayName,
        authorPhotoURL: gameInstance.users[gameAtom.authorUid].photoURL
      });
    });
  }
}
