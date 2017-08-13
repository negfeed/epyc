import { Component, OnInit, ViewChild } from '@angular/core';
import { IonicPage, NavParams, NavController, Navbar } from 'ionic-angular';
import 'rxjs/add/operator/takeUntil';
import { Subject } from 'rxjs/Subject';

import { GameModel, GameAtom } from '../../providers/game-model/game-model';
import { DrawingModel } from '../../providers/drawing-model/drawing-model';
import { Auth, AuthUserInfo } from '../../providers/auth/auth';
import { GameNavigationController } from '../../providers/game-navigation-controller/game-navigation-controller';

@IonicPage()
@Component({
  selector: 'page-draw',
  templateUrl: 'draw.html'
})
export class DrawPage implements OnInit {

  private readonly COUNTDOWN_IN_SECONDS: number = 5;
  private readonly COUNTDOWN_STEP_IN_SECONDS: number = 1;
  private readonly MILLISECONDS_IN_SECOND: number = 1000;

  private gameAtomKey: string;
  word: string;
  drawingKey: string = '';
  private ngUnsubscribe: Subject<void> = null;
  countdownInProgress: boolean = false;
  countdownValue: number = this.COUNTDOWN_IN_SECONDS;
  private somethingIsDrawn = false;

  @ViewChild(Navbar) navbar: Navbar

  constructor(
      navParams: NavParams, 
      private gameModel: GameModel, 
      private drawingModel: DrawingModel,
      private auth: Auth,
      private nav: NavController,
      private gameNavCtrl: GameNavigationController) {
    console.log("Hello DrawPage");
    this.gameAtomKey = navParams.get('gameAtomKey');
    this.word = navParams.get('word');
  }

  ionViewDidEnter() {
    console.log('ionViewDidEnter DrawPage')
    this.ngUnsubscribe = new Subject<void>();
    this.gameModel.loadAtom(this.gameAtomKey)
        .takeUntil(this.ngUnsubscribe)
        .subscribe((gameAtom: GameAtom) => {
      if (gameAtom.drawingRef) {
        this.drawingKey = gameAtom.drawingRef;
      } else {
        this.gameModel.upsertAtom(this.gameAtomKey, {drawingRef: this.drawingModel.createInstance()})
      }
    });
    this.navbar.backButtonClick = () => this.backButtonAction();
  }

  next() {
    if (!this.canSubmit()) return;
    if (this.countdownInProgress) {
      this.countdownInProgress = false;
    } else {
      this.countdownInProgress = true;
      this.countdownValue = this.COUNTDOWN_IN_SECONDS;
      setTimeout(() => this.handleCountdown(), this.COUNTDOWN_STEP_IN_SECONDS * this.MILLISECONDS_IN_SECOND);
    }
  }

  private handleCountdown() {
    if (!this.countdownInProgress) return;
    this.countdownValue -= this.COUNTDOWN_STEP_IN_SECONDS;
    if (this.countdownValue <= 0) {
      console.log('Moving away from drawing page.');
      let authUserInfo: AuthUserInfo = this.auth.getUserInfo();
      this.gameModel.upsertAtom(this.gameAtomKey, {done: true, authorUid: authUserInfo.uid}).then(() => {
        this.nav.pop();
      });
    } else {
      setTimeout(() => this.handleCountdown(), this.COUNTDOWN_STEP_IN_SECONDS * this.MILLISECONDS_IN_SECOND);
    }
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave DrawPage')
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.countdownInProgress = false;
  }

  ngOnInit(): void {
    console.log("ngOnInit DrawPage");
  }

  onSomethingIsDrawn(somethingIsDrawn: boolean) {
    this.somethingIsDrawn = somethingIsDrawn;
  }

  private canSubmit() {
    return this.somethingIsDrawn;
  }

  private backButtonAction() {
    this.gameNavCtrl.leaveGame();
  }
}
