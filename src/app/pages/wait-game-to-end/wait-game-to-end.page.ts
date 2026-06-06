import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonIcon,
} from '@ionic/angular/standalone';

import { GameNavigationController } from '../../services/game-navigation-controller.service';
import {
  GameModel,
  GameModelInterface,
  GameThread,
  GameAtomState,
} from '../../services/game-model.service';

interface DisplayThread {
  threadNumber: number;
  completedStepsCount: number;
  totalStepsCount: number;
}

interface DisplayThreads {
  [index: number]: DisplayThread;
}

@Component({
  selector: 'page-wait-game-to-end',
  templateUrl: 'wait-game-to-end.page.html',
  styleUrls: ['wait-game-to-end.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonIcon,
  ],
})
export class WaitGameToEndPage {
  private route = inject(ActivatedRoute);
  private gameNavCtrl = inject(GameNavigationController);
  private gameModel = inject(GameModel);

  private gameKey: string;
  private ngUnsubscribe: Subject<void> = null;
  threads: Observable<DisplayThreads> = null;

  constructor() {
    this.gameKey = this.route.snapshot.paramMap.get('gameKey');
  }

  ionViewDidEnter() {
    console.log('ionViewDidEnter WaitGameToEndPage');
    this.ngUnsubscribe = new Subject<void>();
    const gameInstanceObservable = this.gameModel
      .loadInstance(this.gameKey)
      .pipe(takeUntil(this.ngUnsubscribe));
    this.threads = gameInstanceObservable.pipe(
      map((gameInstance: GameModelInterface) => {
        const threads: Array<DisplayThread> = [];
        for (let index = 0; index < gameInstance.threads.length; ++index) {
          const gameThread: GameThread = gameInstance.threads[index];
          let completedStepsCount = 0;
          for (let atomIndex = 0; atomIndex < gameThread.gameAtoms.length; ++atomIndex) {
            if (gameThread.gameAtoms[atomIndex].state === GameAtomState.DONE) completedStepsCount++;
          }
          threads.push({
            threadNumber: index + 1,
            completedStepsCount,
            totalStepsCount: gameThread.gameAtoms.length,
          });
        }
        return threads;
      }),
    );
    this.gameNavCtrl.observeAndNavigateToNextPage(this.gameKey, 'WaitGameToEndPage');
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave WaitGameToEndPage');
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.gameNavCtrl.cancelObserveAndNavigateToNextPage();
  }

  backButtonAction() {
    this.gameNavCtrl.leaveGame();
  }
}
