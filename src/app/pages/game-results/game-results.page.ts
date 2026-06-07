import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonContent,
  IonList,
  IonItem,
} from '@ionic/angular/standalone';

import {
  GameModel,
  GameModelInterface,
  GameThread,
} from '../../services/game-model.service';
import { GameNavigationController } from '../../services/game-navigation-controller.service';
import { GameParams } from '../../services/game-params.service';

@Component({
  selector: 'page-game-results',
  templateUrl: 'game-results.page.html',
  styleUrls: ['game-results.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonContent,
    IonList,
    IonItem,
  ],
})
export class GameResultsPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private gameModel = inject(GameModel);
  private gameNavCtrl = inject(GameNavigationController);
  private gameParams = inject(GameParams);

  private gameKey = '';
  private ngUnsubscribe: Subject<void> = null;
  private gameInstance: GameModelInterface = null;
  words: Observable<Array<string>> = null;

  constructor() {
    this.gameKey = this.route.snapshot.paramMap.get('gameKey');
  }

  ngOnInit() {
    console.log('ngOnInit GameResults');
    this.ngUnsubscribe = new Subject<void>();
    const gameInstanceObservable = this.gameModel
      .loadInstance(this.gameKey)
      .pipe(takeUntil(this.ngUnsubscribe));
    gameInstanceObservable.subscribe((gameInstance: GameModelInterface) => {
      this.gameInstance = gameInstance;
    });
    this.words = gameInstanceObservable.pipe(
      map((gameInstance: GameModelInterface) => {
        const words = new Array<string>();
        gameInstance.threads.forEach((gameThread: GameThread) => {
          words.push(this.capitalizeFirstLetter(gameThread.word));
        });
        return words;
      }),
    );
  }

  itemSelected(threadIndex: number) {
    this.gameParams.set({ gameInstance: this.gameInstance, threadIndex });
    this.router.navigateByUrl(`/game/${this.gameKey}/results/${threadIndex}`);
  }

  goHome() {
    this.router.navigateByUrl('/home');
  }

  ngOnDestroy() {
    console.log('ngOnDestroy GameResults');
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private capitalizeFirstLetter(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  backButtonAction() {
    this.gameNavCtrl.leaveGame();
  }
}
