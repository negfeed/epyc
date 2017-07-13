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

export interface UsersUidOrder extends Array<string> {}

export enum GameAtomType {
  DRAWING = 1,
  GUESS = 2,
}

export interface GameAtom {
  type?: GameAtomType;
  drawingRef?: string;
  guess?: string;
  done?: boolean;
  authorUid?: string;
}

export interface GameAtoms extends Array<GameAtom> {}

export interface GameThread {
  word: string;
  gameAtoms: GameAtoms;
}

export interface GameThreads extends Array<GameThread> {}

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

  // The order of the joined users in the game.
  usersOrder?: UsersUidOrder;

  // The game threads.
  threads?: GameThreads;
}

export interface AtomAddress {
  threadIndex: number;
  atomIndex: number;
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

  private buildEmptyThread(playerCount: number): GameThread {
    let gameAtoms: Array<GameAtom> = [];
    for (var index = 0; index < playerCount + 1; index++) {
      gameAtoms.push({
        type: (index % 2) == 0 ? GameAtomType.DRAWING: GameAtomType.GUESS,
        done: false
      });
    }
    return {
      word: 'duck',
      gameAtoms: gameAtoms
    }
  }

  private buildEmptyThreads(playerCount: number): GameThreads {
    let gameThreads: Array<GameThread> = [];
    for (var index = 0; index < playerCount; index++) {
      gameThreads.push(this.buildEmptyThread(playerCount))
    }
    return gameThreads;
  }

  private shuffleUsers(users: Array<string>) {
    let userCount = users.length;
    for (var index = 0; index < users.length; index++) {
      var otherIndex = Math.floor(Math.random() * userCount);
      var tmp = users[index];
      users[index] = users[otherIndex];
      users[otherIndex] = tmp;
    }
  }

  public start(key: string) {
    let gameInstanceObservable = this._loadInstance(key);
    gameInstanceObservable.first().subscribe((gameModel: GameModelInterface) => {
      let usersUidOrder: Array<string> = [];
      for (var uid in gameModel.users) {
        if (gameModel.users[uid].joined) {
          usersUidOrder.push(uid);
        }
      }
      this.shuffleUsers(usersUidOrder)
      gameInstanceObservable.update({
        state: GameState.STARTED,
        usersOrder: usersUidOrder,
        threads: this.buildEmptyThreads(usersUidOrder.length),
      });
    })
  }

  private _loadUser(gameKey: string, userKey: string): FirebaseObjectObservable<GameModelInterface> {
    return this.angularFireDatabase.object(this.INSTANCES_PATH + `/${gameKey}/users/${userKey}`);
  }

  public upsertGameUser(gameKey: string, userKey: string, gameUser: GameUser): firebase.Promise<void> {
    let user = this._loadUser(gameKey, userKey);
    return user.update(gameUser);
  }

  public static playerIndex(atomAddress: AtomAddress, playersCount: number): number {
    return (atomAddress.threadIndex - atomAddress.atomIndex) % playersCount
  }

  public static* playerAtoms(playerIndex: number, playersCount: number): IterableIterator<AtomAddress> {
    let index = 0;
    while (index < playersCount + 1) {
      let atomAddress: AtomAddress = {
        threadIndex: (index + playerIndex) % playersCount,
        atomIndex: index,
      }
      index++;
      yield atomAddress;
    }
  }

  public getAtomKey(gameKey: string, atomAddress: AtomAddress): string {
    return this.INSTANCES_PATH + `/${gameKey}/threads/${atomAddress.threadIndex}/gameAtoms/${atomAddress.atomIndex}`;
  }

  private _loadAtom(atomKey: string): FirebaseObjectObservable<GameAtom> {
    return this.angularFireDatabase.object(atomKey);
  }

  public loadAtom(atomKey: string): Observable<GameAtom> {
    return this._loadAtom(atomKey);
  }

  public upsertAtom(atomKey: string, gameAtom: GameAtom): firebase.Promise<void> {
    let atom = this._loadAtom(atomKey);
    return atom.update(gameAtom);
  }
}