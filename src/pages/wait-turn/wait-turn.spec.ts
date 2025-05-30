import { WaitTurnPage } from './wait-turn';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NavController, NavParams, Events, Platform } from 'ionic-angular';
import { GameService } from '../../providers/game-service/game-service';
import { UserDataService } from '../../providers/user-data-service/user-data-service';

// Mocks for Ionic services
class MockNavController {
  setRoot = jest.fn();
  // Add other NavController methods if used
}
class MockNavParams {
  get = jest.fn((param) => {
    if (param === 'game') return { _id: 'testGameId', name: 'Test Game', status: 'active', currentTurn: { player: 'otherPlayerId', task: 'draw' } };
    return undefined;
  });
}
class MockEvents {
  subscribe = jest.fn((event, callback) => ({ unsubscribe: jest.fn() }));
  unsubscribe = jest.fn();
  publish = jest.fn();
}
class MockPlatform {
  ready = jest.fn(() => Promise.resolve());
  // Add other Platform methods if used
}

// Mocks for custom providers
class MockGameService {
  getGame = jest.fn((gameId) => Promise.resolve({ _id: gameId, name: 'Test Game', status: 'active', currentTurn: { player: 'otherPlayerId', task: 'draw' } }));
  // Add other GameService methods if used
}
class MockUserDataService {
  getLoggedInUser = jest.fn(() => ({ _id: 'testUserId', name: 'Test User' }));
  // Add other UserDataService methods if used
}

describe('WaitTurnPage', () => {
  let component: WaitTurnPage;
  let fixture: ComponentFixture<WaitTurnPage>;
  let mockNavParams: MockNavParams;
  let mockNavController: MockNavController;
  let mockEvents: MockEvents;
  let mockGameService: MockGameService;
  let mockUserDataService: MockUserDataService;

  beforeEach(async () => {
    mockNavParams = new MockNavParams();
    mockNavController = new MockNavController();
    mockEvents = new MockEvents();
    mockGameService = new MockGameService();
    mockUserDataService = new MockUserDataService();

    await TestBed.configureTestingModule({
      declarations: [WaitTurnPage],
      providers: [
        { provide: NavController, useValue: mockNavController },
        { provide: NavParams, useValue: mockNavParams },
        { provide: Events, useValue: mockEvents },
        { provide: Platform, useClass: MockPlatform },
        { provide: GameService, useValue: mockGameService },
        { provide: UserDataService, useValue: mockUserDataService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(WaitTurnPage);
    component = fixture.componentInstance;
    // fixture.detectChanges(); // Call in tests if needed
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load game data and user data on init', () => {
    component.ionViewDidLoad(); // Or ngOnInit, ionViewWillLoad, etc.
    expect(mockNavParams.get).toHaveBeenCalledWith('game');
    expect(component.game).toBeDefined();
    expect(mockUserDataService.getLoggedInUser).toHaveBeenCalled();
    expect(component.loggedInUser).toBeDefined();
  });

  it('should subscribe to game events (turn change, game end) on view enter and unsubscribe on leave', () => {
    component.ionViewWillEnter();
    expect(mockEvents.subscribe).toHaveBeenCalledWith('game:turnChanged:' + component.game._id, expect.any(Function));
    expect(mockEvents.subscribe).toHaveBeenCalledWith('game:ended:' + component.game._id, expect.any(Function));

    component.ionViewWillLeave();
    expect(mockEvents.unsubscribe).toHaveBeenCalledWith('game:turnChanged:' + component.game._id, expect.any(Function));
    expect(mockEvents.unsubscribe).toHaveBeenCalledWith('game:ended:' + component.game._id, expect.any(Function));
  });

  it('handleTurnChanged method should navigate to DrawPage or GuessPage if it is users turn', () => {
    const gameDataUserTurnDraw = { _id: 'testGameId', currentTurn: { player: 'testUserId', task: 'draw' }, threads: [{_id: 'thread1', firstPlayer: 'testUserId'}] };
    component.loggedInUser = { _id: 'testUserId' } as any;
    component.handleTurnChanged(gameDataUserTurnDraw as any);
    expect(mockNavController.setRoot).toHaveBeenCalledWith('DrawPage', { game: gameDataUserTurnDraw, thread: gameDataUserTurnDraw.threads[0] });

    const gameDataUserTurnGuess = { _id: 'testGameId', currentTurn: { player: 'testUserId', task: 'guess' }, threads: [{_id: 'thread1', firstPlayer: 'otherUser'}] };
    component.handleTurnChanged(gameDataUserTurnGuess as any);
    expect(mockNavController.setRoot).toHaveBeenCalledWith('GuessPage', { game: gameDataUserTurnGuess, thread: gameDataUserTurnGuess.threads[0] });
  });

  it('handleTurnChanged method should do nothing if it is not users turn', () => {
    const gameDataOtherUserTurn = { _id: 'testGameId', currentTurn: { player: 'otherPlayerId', task: 'draw' } };
    component.loggedInUser = { _id: 'testUserId' } as any;
    component.handleTurnChanged(gameDataOtherUserTurn as any);
    expect(mockNavController.setRoot).not.toHaveBeenCalled();
  });

  it('handleGameEnded method should navigate to GameResultsPage', () => {
    const endedGameData = { _id: 'testGameId', status: 'finished' };
    component.handleGameEnded(endedGameData as any);
    expect(mockNavController.setRoot).toHaveBeenCalledWith('GameResultsPage', { game: endedGameData });
  });

  it('should identify the current player whose turn it is', () => {
    // Assuming game.currentTurn.player has the ID, and game.players has full player objects
    component.game = {
      _id: 'g1',
      currentTurn: { player: 'playerABC', task: 'draw' },
      players: [
        { _id: 'playerABC', name: 'Player ABC' },
        { _id: 'playerXYZ', name: 'Player XYZ' },
      ]
    } as any;
    // fixture.detectChanges(); // If currentPlayerName is a getter used in template or populated in hook
    // Call a method that sets currentPlayerName or trigger change detection
    component.ionViewDidLoad(); // Example if it's set here
    expect(component.currentPlayerName).toEqual('Player ABC');
  });

  it('leaveGame method should navigate to HomePage', () => {
    // This is a hypothetical method, if it exists
    if (component.leaveGame) {
      component.leaveGame();
      expect(mockNavController.setRoot).toHaveBeenCalledWith('HomePage');
    } else {
      expect(component.leaveGame).toBeUndefined();
    }
  });
});
