import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonCard,
  IonItem,
  IonInput,
  IonIcon,
} from '@ionic/angular/standalone';

import { GameModel, AtomAddress, GameAtomState } from '../../services/game-model.service';
import { Auth, AuthUserInfo } from '../../services/auth.service';
import { GameNavigationController } from '../../services/game-navigation-controller.service';
import { GameParams } from '../../services/game-params.service';
import { ReplayingDrawingCanvas } from '../../components/replaying-drawing-canvas/replaying-drawing-canvas';

@Component({
  selector: 'page-guess',
  templateUrl: 'guess.page.html',
  styleUrls: ['guess.page.scss'],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonCard,
    IonItem,
    IonInput,
    IonIcon,
    ReplayingDrawingCanvas,
  ],
})
export class GuessPage {
  private route = inject(ActivatedRoute);
  private gameModel = inject(GameModel);
  private auth = inject(Auth);
  private gameNavCtrl = inject(GameNavigationController);
  private gameParams = inject(GameParams);

  private gameKey: string;
  private atomAddress: AtomAddress;
  private atomKey: string;
  drawingKey: string;
  guess = '';
  drawingFinished = false;

  constructor() {
    console.log('Hello GuessPage');
    this.gameKey = this.route.snapshot.paramMap.get('gameKey');
    this.atomAddress = this.gameParams.get<AtomAddress>('atomAddress');
    this.atomKey = this.gameModel.getAtomKey(this.gameKey, this.atomAddress);
    this.drawingKey = this.gameParams.get<string>('drawingKey');
  }

  ionViewDidEnter() {
    this.gameNavCtrl.observeAndNavigateToNextPage(this.gameKey, 'GuessPage');
    this.gameModel.upsertAtom(this.atomKey, { state: GameAtomState.STARTED });
  }

  canSubmit() {
    return this.guess.trim() !== '' && this.drawingFinished;
  }

  submit() {
    if (this.canSubmit()) {
      const authUserInfo: AuthUserInfo = this.auth.getUserInfo();
      this.gameModel.upsertAtom(this.atomKey, {
        guess: this.guess,
        state: GameAtomState.DONE,
        authorUid: authUserInfo.uid,
      });
    }
  }

  backButtonAction() {
    this.gameNavCtrl.leaveGame();
  }

  ionViewWillLeave() {
    this.gameNavCtrl.cancelObserveAndNavigateToNextPage();
  }
}
