import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService, AuthUserInfo } from './auth.service';
import { WordsService } from './words.service';

export enum GameState {
  CREATED = 1,
  STARTED = 2,
  ABANDONED = 3,
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
  $value?: ( number | string | boolean );
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
  address: AtomAddress | null;
  readyToPlay: boolean;
  allAtomsDone: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GameModelService {

  private readonly INSTANCES_PATH: string = "/games";

  constructor(
    private db: AngularFireDatabase,
    private auth: AuthService,
    private words: WordsService
  ) {}

  public createInstance(): string {
    let users: GameUsers = {};
    let authUserInfo: AuthUserInfo = this.auth.getUserInfo();
    let gameUser: GameUser = {
      uid: authUserInfo.uid,
      displayName: authUserInfo.displayName,
      photoURL: authUserInfo.photoURL,
      joined: true
    }
    users[authUserInfo.uid] = gameUser;
    var gameInstance: Omit<GameModelInterface, '$key'> = {
      state: GameState.CREATED,
      creator: authUserInfo.uid,
      creation_timestamp_ms: Date.now(),
      users: users
    };
    // push() returns a ThenableReference which has a key property
    return this.db.list(this.INSTANCES_PATH).push(gameInstance).key as string;
  }

  private _loadInstance(key: string) {
    return this.db.object<GameModelInterface>(this.INSTANCES_PATH + '/' + key);
  }

  public loadInstance(key: string): Observable<GameModelInterface | null> {
    return this._loadInstance(key).valueChanges();
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
    gameInstanceObservable.valueChanges().pipe(take(1)).subscribe((gameModel: GameModelInterface | null) => {
      if (!gameModel || !gameModel.users) return;

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

  private _loadUser(gameKey: string, userKey: string) {
    return this.db.object<GameUser>(this.INSTANCES_PATH + `/${gameKey}/users/${userKey}`);
  }

  public upsertGameUser(gameKey: string, userKey: string, gameUser: GameUser): Promise<void> {
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
    if (!gameInstance.usersOrder || !gameInstance.threads) {
        return { address: null, allAtomsDone: false, readyToPlay: false };
    }
    let playersCount = gameInstance.usersOrder.length;
    let playerIndex = gameInstance.usersOrder.indexOf(userId);
    let playerAtomsIterator = GameModelService.playerAtomAddresses(playerIndex, playersCount);
    let nextAtomAddressToPlay: AtomAddress | null = null;
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

      let previousGameAtom: GameAtom | null = null;
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

  private _loadAtom(atomKey: string) {
    return this.db.object<GameAtom>(atomKey);
  }

  public loadAtom(atomKey: string): Observable<GameAtom | null> {
    return this._loadAtom(atomKey).valueChanges();
  }

  public upsertAtom(atomKey: string, gameAtom: GameAtom): Promise<void> {
    let atom = this._loadAtom(atomKey);
    return atom.update(gameAtom);
  }
}
