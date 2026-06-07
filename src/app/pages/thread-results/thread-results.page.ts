import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonItem,
  IonAvatar,
} from '@ionic/angular/standalone';

import {
  GameModelInterface,
  GameThread,
  GameAtom,
  GameAtomType,
} from '../../services/game-model.service';
import { GameParams } from '../../services/game-params.service';
import { ReplayingDrawingCanvas } from '../../components/replaying-drawing-canvas/replaying-drawing-canvas';

interface DisplayGameAtom {
  isDrawing: boolean;
  isGuess: boolean;
  drawingRef?: string;
  guess?: string;
  authorDisplayName: string;
  authorPhotoURL: string;
}

@Component({
  selector: 'page-thread-results',
  templateUrl: 'thread-results.page.html',
  styleUrls: ['thread-results.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonItem,
    IonAvatar,
    ReplayingDrawingCanvas,
  ],
})
export class ThreadResultsPage {
  private route = inject(ActivatedRoute);
  private gameParams = inject(GameParams);

  word: string = null;
  atoms: Array<DisplayGameAtom> = null;

  constructor() {
    const gameInstance: GameModelInterface = this.gameParams.get<GameModelInterface>('gameInstance');
    const threadIndex: number =
      this.gameParams.get<number>('threadIndex') ??
      Number(this.route.snapshot.paramMap.get('threadIndex'));
    const gameThread: GameThread = gameInstance.threads[threadIndex];
    this.word = gameThread.word;
    this.atoms = [];
    gameThread.gameAtoms.forEach((gameAtom: GameAtom) => {
      this.atoms.push({
        isDrawing: gameAtom.type === GameAtomType.DRAWING,
        isGuess: gameAtom.type === GameAtomType.GUESS,
        guess: gameAtom.guess,
        drawingRef: gameAtom.drawingRef,
        authorDisplayName: gameInstance.users[gameAtom.authorUid].displayName,
        authorPhotoURL: gameInstance.users[gameAtom.authorUid].photoURL,
      });
    });
  }
}
