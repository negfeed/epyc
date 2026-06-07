import { Injectable, EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  docData,
  setDoc,
  updateDoc,
  getDoc,
  runTransaction,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

/**
 * Game state persisted in Cloud Firestore.
 *
 * A game is a single document under the `games` collection. Its `threads`
 * (each with a nested `gameAtoms` array) and `users` map live inside that one
 * document — games are small (a handful of players), so this avoids the read
 * fan-out of subcollections. Atom mutations use a transaction because several
 * players update different atoms of the same document concurrently.
 */
@Injectable({ providedIn: 'root' })
export class GameModel {
  private readonly COLLECTION = 'games';

  private db = inject(Firestore);
  private auth = inject(Auth);
  private words = inject(Words);
  private injector = inject(EnvironmentInjector);

  /**
   * Runs a Firebase call within the environment injection context. Service
   * methods are invoked from component lifecycle hooks / event handlers (outside
   * an injection context), and @angular/fire only schedules its observables on
   * the Angular zone when called inside one. Without this, snapshot callbacks
   * fire outside NgZone and downstream navigation/CD never runs.
   */
  private run<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  public createInstance(): string {
    // doc() with no id generates a client-side id without writing, so we can
    // return the key synchronously (matching the old RTDB push().key contract).
    const ref = doc(collection(this.db, this.COLLECTION));
    const authUserInfo: AuthUserInfo = this.auth.getUserInfo();
    const gameUser: GameUser = {
      uid: authUserInfo.uid,
      displayName: authUserInfo.displayName,
      photoURL: authUserInfo.photoURL,
      joined: true,
    };
    const gameInstance: GameModelInterface = {
      state: GameState.CREATED,
      creator: authUserInfo.uid,
      creation_timestamp_ms: Date.now(),
      users: { [authUserInfo.uid]: gameUser },
    };
    this.run(() => setDoc(ref, gameInstance));
    return ref.id;
  }

  public loadInstance(key: string): Observable<GameModelInterface> {
    return this.run(
      () =>
        docData(doc(this.db, this.COLLECTION, key), {
          idField: '$key',
        }) as Observable<GameModelInterface>,
    );
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
    const instanceRef = doc(this.db, this.COLLECTION, key);
    this.run(() => getDoc(instanceRef)).then((snapshot) => {
      const gameModel = snapshot.data() as GameModelInterface;
      const usersUidOrder: Array<string> = [];
      for (const uid in gameModel.users) {
        if (gameModel.users[uid].joined) {
          usersUidOrder.push(uid);
        }
      }
      this.shuffleUsers(usersUidOrder);
      this.run(() =>
        updateDoc(instanceRef, {
          state: GameState.STARTED,
          usersOrder: usersUidOrder,
          threads: this.buildEmptyThreads(usersUidOrder.length),
        }),
      );
    });
  }

  public upsertGameUser(gameKey: string, userKey: string, gameUser: GameUser): Promise<void> {
    // Deep-merge into users.<uid> without clobbering sibling users or fields.
    return this.run(() =>
      setDoc(doc(this.db, this.COLLECTION, gameKey), { users: { [userKey]: gameUser } }, { merge: true }),
    );
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

  /** Streams a single atom by deriving it from the game document. */
  public loadAtom(gameKey: string, atomAddress: AtomAddress): Observable<GameAtom> {
    return this.loadInstance(gameKey).pipe(
      map((game) => game?.threads?.[atomAddress.threadIndex]?.gameAtoms?.[atomAddress.atomIndex]),
    );
  }

  /**
   * Merges a partial atom update into the nested threads array. Firestore can't
   * address an array element by index, so we read-modify-write the threads array
   * inside a transaction to stay safe against concurrent atom updates.
   */
  public upsertAtom(
    gameKey: string,
    atomAddress: AtomAddress,
    gameAtom: GameAtom,
  ): Promise<void> {
    const ref = doc(this.db, this.COLLECTION, gameKey);
    return this.run(() =>
      runTransaction(this.db, async (tx) => {
        const snapshot = await tx.get(ref);
        const game = snapshot.data() as GameModelInterface;
        if (!game || !game.threads) {
          return;
        }
        const existing = game.threads[atomAddress.threadIndex].gameAtoms[atomAddress.atomIndex];
        game.threads[atomAddress.threadIndex].gameAtoms[atomAddress.atomIndex] = {
          ...existing,
          ...gameAtom,
        };
        tx.update(ref, { threads: game.threads });
      }),
    );
  }
}
