import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';

import {
  GameModel,
  GameAtom,
  AtomAddress,
  GameAtomState,
} from '../../services/game-model.service';
import { DrawingModel } from '../../services/drawing-model.service';
import { Auth, AuthUserInfo } from '../../services/auth.service';
import { GameNavigationController } from '../../services/game-navigation-controller.service';
import { DrawingController } from '../../services/drawing-controller.service';
import { GameParams } from '../../services/game-params.service';
import { RecordingDrawingCanvas } from '../../components/recording-drawing-canvas/recording-drawing-canvas';
import { DrawingControlBarComponent } from '../../components/drawing-control-bar/drawing-control-bar';

@Component({
  selector: 'page-draw',
  templateUrl: 'draw.page.html',
  providers: [DrawingController],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    RecordingDrawingCanvas,
    DrawingControlBarComponent,
  ],
})
export class DrawPage implements OnInit {
  private readonly COUNTDOWN_IN_SECONDS: number = 5;
  private readonly COUNTDOWN_STEP_IN_SECONDS: number = 1;
  private readonly MILLISECONDS_IN_SECOND: number = 1000;

  private route = inject(ActivatedRoute);
  private gameModel = inject(GameModel);
  private drawingModel = inject(DrawingModel);
  private auth = inject(Auth);
  private gameNavCtrl = inject(GameNavigationController);
  private gameParams = inject(GameParams);

  private gameKey: string;
  private atomAddress: AtomAddress;
  private atomKey: string;
  word: string;
  drawingKey = '';
  private ngUnsubscribe: Subject<void> = null;
  countdownInProgress = false;
  countdownValue: number = this.COUNTDOWN_IN_SECONDS;
  private somethingIsDrawn = false;

  constructor() {
    console.log('Hello DrawPage');
    this.gameKey = this.route.snapshot.paramMap.get('gameKey');
    this.atomAddress = this.gameParams.get<AtomAddress>('atomAddress');
    this.atomKey = this.gameModel.getAtomKey(this.gameKey, this.atomAddress);
    this.word = this.gameParams.get<string>('word');
  }

  ionViewDidEnter() {
    console.log('ionViewDidEnter DrawPage');
    this.ngUnsubscribe = new Subject<void>();
    this.gameModel
      .loadAtom(this.atomKey)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((gameAtom: GameAtom) => {
        if (gameAtom && gameAtom.drawingRef) {
          this.drawingKey = gameAtom.drawingRef;
        } else {
          this.gameModel.upsertAtom(this.atomKey, { drawingRef: this.drawingModel.createInstance() });
        }
      });
    this.gameModel.upsertAtom(this.atomKey, { state: GameAtomState.STARTED });
    this.gameNavCtrl.observeAndNavigateToNextPage(this.gameKey, 'DrawPage');
  }

  next() {
    if (!this.canSubmit()) return;
    if (this.countdownInProgress) {
      this.countdownInProgress = false;
    } else {
      this.countdownInProgress = true;
      this.countdownValue = this.COUNTDOWN_IN_SECONDS;
      setTimeout(
        () => this.handleCountdown(),
        this.COUNTDOWN_STEP_IN_SECONDS * this.MILLISECONDS_IN_SECOND,
      );
    }
  }

  private handleCountdown() {
    if (!this.countdownInProgress) return;
    this.countdownValue -= this.COUNTDOWN_STEP_IN_SECONDS;
    if (this.countdownValue <= 0) {
      console.log('Moving away from drawing page.');
      const authUserInfo: AuthUserInfo = this.auth.getUserInfo();
      this.gameModel.upsertAtom(this.atomKey, {
        state: GameAtomState.DONE,
        authorUid: authUserInfo.uid,
      });
    } else {
      setTimeout(
        () => this.handleCountdown(),
        this.COUNTDOWN_STEP_IN_SECONDS * this.MILLISECONDS_IN_SECOND,
      );
    }
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave DrawPage');
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.countdownInProgress = false;
    this.gameNavCtrl.cancelObserveAndNavigateToNextPage();
  }

  ngOnInit(): void {
    console.log('ngOnInit DrawPage');
  }

  onSomethingIsDrawn(somethingIsDrawn: boolean) {
    this.somethingIsDrawn = somethingIsDrawn;
  }

  canSubmit() {
    return this.somethingIsDrawn;
  }

  backButtonAction() {
    this.gameNavCtrl.leaveGame();
  }
}
