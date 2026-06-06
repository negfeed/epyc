import { Injectable, inject } from '@angular/core';
import { Database, ref, objectVal, push, update } from '@angular/fire/database';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';

import { Auth, AuthUserInfo } from './auth.service';
import { Words } from './words.service';

export enum GameState {
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
  NOT_STARTED = 1,
  STARTED = 2,
  DONE = 3,
}

export interface GameAtom {
  type?: GameAtomType;
  drawingRef?: string;
  guess?: string;
  state?: GameAtomState;
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
  $value?: number | string | boolean;
  creation_timestamp_ms: number;
  state: GameState;
  creator: string;
  users?: GameUsers;
  usersOrder?: UsersUidOrder;
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

@Injectable({ providedIn: 'root' })
export class GameModel {
  private readonly INSTANCES_PATH = '/games';

  private db = inject(Database);
  private auth = inject(Auth);
  private words = inject(Words);

  public createInstance(): string {
    const users: GameUsers = {};
    const authUserInfo: AuthUserInfo = this.auth.getUserInfo();
    const gameUser: GameUser = {
      uid: authUserInfo.uid,
      displayName: authUserInfo.displayName,
      photoURL: authUserInfo.photoURL,
      joined: true,
    };
    users[authUserInfo.uid] = gameUser;
    const gameInstance: GameModelInterface = {
      state: GameState.CREATED,
      creator: authUserInfo.uid,
      creation_timestamp_ms: Date.now(),
      users,
    };
    return push(ref(this.db, this.INSTANCES_PATH), gameInstance).key as string;
  }

  public loadInstance(key: string): Observable<GameModelInterface> {
    return objectVal<GameModelInterface>(ref(this.db, `${this.INSTANCES_PATH}/${key}`), {
      keyField: '$key',
    });
  }

  private buildEmptyThread(playerCount: number): GameThread {
    const gameAtoms: Array<GameAtom> = [];
    for (let index = 0; index < playerCount + 1; index++) {
      gameAtoms.push({
        type: index % 2 === 0 ? GameAtomType.DRAWING : GameAtomType.GUESS,
        state: GameAtomState.NOT_STARTED,
      });
    }
    return {
      word: this.words.getWord(),
      gameAtoms,
    };
  }

  private buildEmptyThreads(playerCount: number): GameThreads {
    const gameThreads: Array<GameThread> = [];
    for (let index = 0; index < playerCount; index++) {
      gameThreads.push(this.buildEmptyThread(playerCount));
    }
    return gameThreads;
  }

  private shuffleUsers(users: Array<string>) {
    const userCount = users.length;
    for (let index = 0; index < users.length; index++) {
      const otherIndex = Math.floor(Math.random() * userCount);
      const tmp = users[index];
      users[index] = users[otherIndex];
      users[otherIndex] = tmp;
    }
  }

  public start(key: string) {
    const instanceRef = ref(this.db, `${this.INSTANCES_PATH}/${key}`);
    objectVal<GameModelInterface>(instanceRef)
      .pipe(first())
      .subscribe((gameModel: GameModelInterface) => {
        const usersUidOrder: Array<string> = [];
        for (const uid in gameModel.users) {
          if (gameModel.users[uid].joined) {
            usersUidOrder.push(uid);
          }
        }
        this.shuffleUsers(usersUidOrder);
        update(instanceRef, {
          state: GameState.STARTED,
          usersOrder: usersUidOrder,
          threads: this.buildEmptyThreads(usersUidOrder.length),
        });
      });
  }

  public upsertGameUser(gameKey: string, userKey: string, gameUser: GameUser): Promise<void> {
    return update(ref(this.db, `${this.INSTANCES_PATH}/${gameKey}/users/${userKey}`), gameUser);
  }

  public static atomPlayerIndex(atomAddress: AtomAddress, playersCount: number): number {
    return (atomAddress.threadIndex - atomAddress.atomIndex + playersCount) % playersCount;
  }

  public static *playerAtomAddresses(
    playerIndex: number,
    playersCount: number,
  ): IterableIterator<AtomAddress> {
    let index = 0;
    while (index < playersCount + 1) {
      const atomAddress: AtomAddress = {
        threadIndex: (index + playerIndex) % playersCount,
        atomIndex: index,
      };
      index++;
      yield atomAddress;
    }
  }

  public static getNextAtom(gameInstance: GameModelInterface, userId: string): NextAtom {
    const playersCount = gameInstance.usersOrder.length;
    const playerIndex = gameInstance.usersOrder.indexOf(userId);
    const playerAtomsIterator = GameModel.playerAtomAddresses(playerIndex, playersCount);
    let nextAtomAddressToPlay: AtomAddress = null;
    let allAtomsDone = false;
    let readyToPlay = false;
    while (true) {
      const next = playerAtomsIterator.next();
      if (next.done) {
        allAtomsDone = true;
        break;
      }
      const atomAddress: AtomAddress = next.value;
      const gameThread: GameThread = gameInstance.threads[atomAddress.threadIndex];
      const gameAtom: GameAtom = gameThread.gameAtoms[atomAddress.atomIndex];

      let previousGameAtom: GameAtom = null;
      if (atomAddress.atomIndex > 0) {
        previousGameAtom = gameThread.gameAtoms[atomAddress.atomIndex - 1];
      }

      if (gameAtom.state !== GameAtomState.DONE) {
        nextAtomAddressToPlay = atomAddress;
        if (!previousGameAtom || previousGameAtom.state === GameAtomState.DONE) {
          readyToPlay = true;
        }
        break;
      }
    }
    return { address: nextAtomAddressToPlay, allAtomsDone, readyToPlay };
  }

  public getAtomKey(gameKey: string, atomAddress: AtomAddress): string {
    return `${this.INSTANCES_PATH}/${gameKey}/threads/${atomAddress.threadIndex}/gameAtoms/${atomAddress.atomIndex}`;
  }

  public loadAtom(atomKey: string): Observable<GameAtom> {
    return objectVal<GameAtom>(ref(this.db, atomKey));
  }

  public upsertAtom(atomKey: string, gameAtom: GameAtom): Promise<void> {
    return update(ref(this.db, atomKey), gameAtom);
  }
}
