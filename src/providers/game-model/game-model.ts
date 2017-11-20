import { Injectable } from '@angular/core';
import { AngularFireDatabase, FirebaseObjectObservable } from 'angularfire2/database';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/first';
import * as firebase from 'firebase/app';

import { Auth, AuthUserInfo } from '../auth/auth';
import { Words } from '../words/words';

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

export enum GameAtomState {
  // The player has not started playing the game atom. 
  NOT_STARTED = 1,

  // The player has started playing the game atom.
  STARTED = 2,

  // The player has finished playing the game atom.
  DONE = 3,
}

export interface GameAtom {
  type?: GameAtomType;
  drawingRef?: string;
  guess?: string;
  state?: GameAtomState
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

export interface NextAtom {
  address: AtomAddress;
  readyToPlay: boolean;
  allAtomsDone: boolean;
}

@Injectable()
export class GameModel {

  private readonly INSTANCES_PATH: string = "/games";

  constructor(private angularFireDatabase: AngularFireDatabase, private auth: Auth, private words: Words) {}

  public createInstance(): string {
    let users = {};
    let authUserInfo: AuthUserInfo = this.auth.getUserInfo();
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
        state: GameAtomState.NOT_STARTED
      });
    }
    return {
      word: this.words.getWord(),
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

  public static atomPlayerIndex(atomAddress: AtomAddress, playersCount: number): number {
    return (atomAddress.threadIndex - atomAddress.atomIndex + playersCount) % playersCount
  }

  public static* playerAtomAddresses(playerIndex: number, playersCount: number): IterableIterator<AtomAddress> {
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

  public static getNextAtom(gameInstance: GameModelInterface, userId: string): NextAtom {
    let playersCount = gameInstance.usersOrder.length;
    let playerIndex = gameInstance.usersOrder.indexOf(userId);
    let playerAtomsIterator = GameModel.playerAtomAddresses(playerIndex, playersCount);
    let nextAtomAddressToPlay: AtomAddress = null;
    let allAtomsDone: boolean = false;
    let readyToPlay = false;
    while (true) {
      let next = playerAtomsIterator.next()
      if (next.done) {
        allAtomsDone = true;
        break;
      }
      let atomAddress: AtomAddress = next.value;
      let gameThread: GameThread = gameInstance.threads[atomAddress.threadIndex];
      let gameAtom: GameAtom = gameThread.gameAtoms[atomAddress.atomIndex];

      let previousGameAtom: GameAtom = null;
      if (atomAddress.atomIndex > 0) {
        previousGameAtom = gameThread.gameAtoms[atomAddress.atomIndex - 1];
      }

      if (gameAtom.state != GameAtomState.DONE) {
        nextAtomAddressToPlay = atomAddress;
        if (!previousGameAtom || previousGameAtom.state == GameAtomState.DONE) {
          readyToPlay = true;
        }
        break;
      }
    }
    return { address: nextAtomAddressToPlay, allAtomsDone: allAtomsDone, readyToPlay: readyToPlay };
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