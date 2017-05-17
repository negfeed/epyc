import { Injectable } from '@angular/core';
import { AngularFireDatabase, FirebaseObjectObservable } from 'angularfire2/database';
import { Observable } from 'rxjs/Observable';
import * as firebase from 'firebase/app';

import { Auth } from '../auth/auth';

export enum  GameState {
  // The game's initial state is CREATED. The game should still be joinable in this state.
  CREATED = 1,

  // The game has started. The game no longer can be joined in this state.
  STARTED = 2,

  // The game is abandoned.
  ABANDONED = 3,

  // The game was finished.
  FINISHED = 4,
}

export interface GameUser {
  uid?: string;
  displayName?: string;
  photoURL?: string;
  joined?: boolean;
}

export interface GameUsers {
  [index: string]: GameUser;
}

export interface GameModelInterface {
  $key?: string;
  $value?: ( number | string | boolean );

  // The creation time (milliseconds since the beginning of 1970).
  creation_timestamp_ms: number;

  // The game state.
  state: GameState;

  // The UID of the user who created the game.
  creator: string;

  // A map from UID to a GameUser interface that contains information about the user.
  users?: GameUsers;
}

@Injectable()
export class GameModel {

  private readonly INSTANCES_PATH: string = "/games";

  constructor(private angularFireDatabase: AngularFireDatabase, private auth: Auth) {}

  public createInstance(): Promise<string> {
    return this.auth.getUserInfo().then((authUserInfo) => {
      let users = {}
      let gameUser: GameUser = {
        uid: authUserInfo.uid,
        displayName: authUserInfo.displayName,
        photoURL: authUserInfo.photoURL,
        joined: true
      }
      users[authUserInfo.uid] = gameUser;
      var gameInstance: GameModelInterface = {
        state: GameState.CREATED,
        creator: authUserInfo.uid,
        creation_timestamp_ms: Date.now(),
        users: users
      };
      return this.angularFireDatabase.list(this.INSTANCES_PATH).push(gameInstance).key;
    })
  }

  private _loadInstance(key: string): FirebaseObjectObservable<GameModelInterface> {
    return this.angularFireDatabase.object(this.INSTANCES_PATH + '/' + key);
  }

  public loadInstance(key: string): Observable<GameModelInterface> {
    return this._loadInstance(key);
  }

  public updateState(key: string, state: GameState): firebase.Promise<void> {
    let gameInstance = this._loadInstance(key);
    return gameInstance.update({
      state: state
    });
  }

  private _loadUser(gameKey: string, userKey: string): FirebaseObjectObservable<GameModelInterface> {
    return this.angularFireDatabase.object(this.INSTANCES_PATH + `/${gameKey}/users/${userKey}`);
  }

  public upsertGameUser(gameKey: string, userKey: string, gameUser: GameUser): firebase.Promise<void> {
    let user = this._loadUser(gameKey, userKey);
    return user.update(gameUser);
  }
}