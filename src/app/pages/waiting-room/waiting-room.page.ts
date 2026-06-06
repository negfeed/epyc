import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Share } from '@capacitor/share';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonAvatar,
  IonNote,
  IonButton,
} from '@ionic/angular/standalone';

import {
  GameModel,
  GameModelInterface,
  GameUser,
  GameState,
} from '../../services/game-model.service';
import { Auth, AuthUserInfo } from '../../services/auth.service';
import { GameNavigationController } from '../../services/game-navigation-controller.service';

interface DisplayUser {
  name: string;
  photoURL: string;
  joined: boolean;
  host: boolean;
}

interface DisplayUsers {
  [index: number]: DisplayUser;
}

@Component({
  selector: 'page-waiting-room',
  templateUrl: 'waiting-room.page.html',
  styleUrls: ['waiting-room.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonAvatar,
    IonNote,
    IonButton,
  ],
})
export class WaitingRoomPage {
  private route = inject(ActivatedRoute);
  private gameModel = inject(GameModel);
  private auth = inject(Auth);
  private gameNavCtrl = inject(GameNavigationController);

  private gameKey = '';
  isJoinable = true;
  isHost = false;
  isJoined = false;
  joinedUsers: Observable<DisplayUsers> = null;
  watchingUsers: Observable<DisplayUsers> = null;
  private ngUnsubscribe: Subject<void> = null;

  constructor() {
    this.gameKey = this.route.snapshot.paramMap.get('gameKey');
  }

  ionViewDidEnter() {
    console.log('ionViewDidEnter WaitingRoomPage');
    this.ngUnsubscribe = new Subject<void>();
    const gameInstanceObservable = this.gameModel
      .loadInstance(this.gameKey)
      .pipe(takeUntil(this.ngUnsubscribe));
    gameInstanceObservable.subscribe((gameInstance: GameModelInterface) => {
      const authUserInfo: AuthUserInfo = this.auth.getUserInfo();
      if (!(authUserInfo.uid in gameInstance.users)) {
        const gameUser: GameUser = {
          uid: authUserInfo.uid,
          displayName: authUserInfo.displayName,
          photoURL: authUserInfo.photoURL,
          joined: false,
        };
        this.gameModel.upsertGameUser(this.gameKey, authUserInfo.uid, gameUser);
      }
      this.isHost = authUserInfo.uid === gameInstance.creator;
      if (authUserInfo.uid in gameInstance.users) {
        this.isJoined = gameInstance.users[authUserInfo.uid].joined;
      }
      this.isJoinable = gameInstance.state === GameState.CREATED;
    });
    const users = gameInstanceObservable.pipe(
      map((gameInstance: GameModelInterface) => {
        const result = new Array<DisplayUser>();
        for (const uid in gameInstance.users) {
          const gameUser = gameInstance.users[uid];
          result.push({
            name: gameUser.displayName,
            photoURL: gameUser.photoURL,
            joined: gameUser.joined,
            host: uid === gameInstance.creator,
          });
        }
        return result;
      }),
    );
    this.joinedUsers = users.pipe(
      map((displayUsers: DisplayUsers) =>
        Object.keys(displayUsers)
          .map((value) => displayUsers[value])
          .filter((value: DisplayUser) => value.joined),
      ),
    );
    this.watchingUsers = users.pipe(
      map((displayUsers: DisplayUsers) =>
        Object.keys(displayUsers)
          .map((value) => displayUsers[value])
          .filter((value: DisplayUser) => !value.joined),
      ),
    );
    this.gameNavCtrl.observeAndNavigateToNextPage(this.gameKey, 'WaitingRoomPage');
  }

  doShare() {
    Share.share({
      title: 'EPYC game invitation!',
      text: 'Hey, wanna join me for an EPYC game?',
      url: `https://epyc-9f15f.appspot.com/game/${this.gameKey}`,
      dialogTitle: 'Share Game',
    });
  }

  canJoin(): boolean {
    return !this.isJoined && !this.isHost;
  }

  doJoin() {
    const gameUser: GameUser = { joined: true };
    this.gameModel.upsertGameUser(this.gameKey, this.auth.getUserInfo().uid, gameUser);
  }

  canLeave(): boolean {
    return this.isJoined && !this.isHost;
  }

  doLeave() {
    const gameUser: GameUser = { joined: false };
    this.gameModel.upsertGameUser(this.gameKey, this.auth.getUserInfo().uid, gameUser);
  }

  canStart(): boolean {
    return this.isHost;
  }

  doStart() {
    this.gameModel.start(this.gameKey);
  }

  ionViewWillLeave() {
    console.log('ionViewWillLeave WaitingRoom');
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.gameNavCtrl.cancelObserveAndNavigateToNextPage();
  }
}
