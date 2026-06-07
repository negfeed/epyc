import { TestBed } from '@angular/core/testing';
import { AlertController, NavController } from '@ionic/angular/standalone';
import { Subject } from 'rxjs';

import { GameNavigationController } from './game-navigation-controller.service';
import {
  GameModel,
  GameModelInterface,
  GameState,
  GameAtomType,
  GameAtomState,
} from './game-model.service';
import { Auth } from './auth.service';
import { UserModel } from './user-model.service';
import { GameParams } from './game-params.service';

/**
 * Regression tests for the central game navigator. These guard the bug where a
 * STARTED game must move the player off the waiting room, and where an
 * unresolved/undefined game state must NOT throw and kill the subscription
 * (which previously left the user stuck on the lobby).
 */
describe('GameNavigationController', () => {
  let controller: GameNavigationController;
  let game$: Subject<GameModelInterface>;
  let navCtrl: { navigateForward: jasmine.Spy; navigateRoot: jasmine.Spy };
  let gameParams: GameParams;

  const HOST = 'host-uid';

  beforeEach(() => {
    game$ = new Subject<GameModelInterface>();
    navCtrl = {
      navigateForward: jasmine.createSpy('navigateForward'),
      navigateRoot: jasmine.createSpy('navigateRoot'),
    };

    TestBed.configureTestingModule({
      providers: [
        GameNavigationController,
        GameParams,
        { provide: GameModel, useValue: { loadInstance: () => game$.asObservable() } },
        { provide: Auth, useValue: { getUserInfo: () => ({ uid: HOST, displayName: 'H', photoURL: 'p' }) } },
        { provide: UserModel, useValue: { insertJoinGame: jasmine.createSpy('insertJoinGame') } },
        { provide: NavController, useValue: navCtrl },
        { provide: AlertController, useValue: {} },
      ],
    });

    controller = TestBed.inject(GameNavigationController);
    gameParams = TestBed.inject(GameParams);
  });

  function startedGame(): GameModelInterface {
    return {
      $key: 'g1',
      state: GameState.STARTED,
      creator: HOST,
      creation_timestamp_ms: 1,
      users: { [HOST]: { uid: HOST, joined: true } },
      usersOrder: [HOST],
      threads: [
        {
          word: 'a cat',
          gameAtoms: [
            { type: GameAtomType.DRAWING, state: GameAtomState.NOT_STARTED },
            { type: GameAtomType.GUESS, state: GameAtomState.NOT_STARTED },
          ],
        },
      ],
    };
  }

  it('does not navigate or throw on an undefined emission', () => {
    controller.observeAndNavigateToNextPage('g1', 'WaitingRoomPage');
    expect(() => game$.next(undefined as unknown as GameModelInterface)).not.toThrow();
    expect(navCtrl.navigateForward).not.toHaveBeenCalled();
  });

  it('stays on the waiting room while the game is CREATED', () => {
    controller.observeAndNavigateToNextPage('g1', 'WaitingRoomPage');
    game$.next({
      $key: 'g1',
      state: GameState.CREATED,
      creator: HOST,
      creation_timestamp_ms: 1,
      users: { [HOST]: { uid: HOST, joined: true } },
    });
    expect(navCtrl.navigateForward).not.toHaveBeenCalled();
  });

  it('navigates to the draw page when the game starts', () => {
    controller.observeAndNavigateToNextPage('g1', 'WaitingRoomPage');
    game$.next(startedGame());
    expect(navCtrl.navigateForward).toHaveBeenCalledWith('/game/g1/draw/0/0');
    expect(gameParams.get('word')).toEqual('a cat');
    expect(gameParams.get('atomAddress')).toEqual({ threadIndex: 0, atomIndex: 0 });
  });
});
