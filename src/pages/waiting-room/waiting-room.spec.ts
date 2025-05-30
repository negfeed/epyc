import { WaitingRoomPage } from './waiting-room';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NavController, NavParams, Events, Platform, AlertController, ToastController } from 'ionic-angular';
import { GameService } from '../../providers/game-service/game-service';
import { UserDataService } from '../../providers/user-data-service/user-data-service';
import { ShareService } from '../../providers/share-service/share-service';

// Mocks for Ionic services
class MockNavController {
  setRoot = jest.fn();
  popToRoot = jest.fn();
}
class MockNavParams {
  get = jest.fn((param) => {
    if (param === 'game') return { _id: 'testGameId', name: 'Test Game', status: 'open', players: [], createdBy: 'creatorId' };
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
}
class MockAlertController {
  create = jest.fn(() => ({ present: jest.fn() }));
}
class MockToastController {
  create = jest.fn(() => ({ present: jest.fn() }));
}

// Mocks for custom providers
class MockGameService {
  getGame = jest.fn((gameId) => Promise.resolve({ _id: gameId, name: 'Test Game', status: 'open', players: [] }));
  startGame = jest.fn((gameId) => Promise.resolve({ _id: gameId, status: 'active' }));
  leaveGame = jest.fn((gameId) => Promise.resolve());
}
class MockUserDataService {
  getLoggedInUser = jest.fn(() => ({ _id: 'testUserId', name: 'Test User' }));
}
class MockShareService {
  shareGame = jest.fn();
}

describe('WaitingRoomPage', () => {
  let component: WaitingRoomPage;
  let fixture: ComponentFixture<WaitingRoomPage>;
  let mockNavParams: MockNavParams;
  let mockNavController: MockNavController;
  let mockEvents: MockEvents;
  let mockGameService: MockGameService;
  let mockUserDataService: MockUserDataService;
  let mockShareService: MockShareService;
  let mockAlertController: MockAlertController;
  let mockToastController: MockToastController;

  beforeEach(async () => {
    mockNavParams = new MockNavParams();
    mockNavController = new MockNavController();
    mockEvents = new MockEvents();
    mockGameService = new MockGameService();
    mockUserDataService = new MockUserDataService();
    mockShareService = new MockShareService();
    mockAlertController = new MockAlertController();
    mockToastController = new MockToastController();


    await TestBed.configureTestingModule({
      declarations: [WaitingRoomPage],
      providers: [
        { provide: NavController, useValue: mockNavController },
        { provide: NavParams, useValue: mockNavParams },
        { provide: Events, useValue: mockEvents },
        { provide: Platform, useClass: MockPlatform },
        { provide: AlertController, useValue: mockAlertController },
        { provide: ToastController, useValue: mockToastController },
        { provide: GameService, useValue: mockGameService },
        { provide: UserDataService, useValue: mockUserDataService },
        { provide: ShareService, useValue: mockShareService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(WaitingRoomPage);
    component = fixture.componentInstance;
    // fixture.detectChanges(); // Call in tests if needed
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load game and user data on init', () => {
    component.ionViewDidLoad(); // Or ngOnInit, ionViewWillLoad, etc.
    expect(mockNavParams.get).toHaveBeenCalledWith('game');
    expect(component.game).toBeDefined();
    expect(mockUserDataService.getLoggedInUser).toHaveBeenCalled();
    expect(component.loggedInUser).toBeDefined();
  });

  it('should subscribe to game events on view enter and unsubscribe on leave', () => {
    component.ionViewWillEnter();
    expect(mockEvents.subscribe).toHaveBeenCalledWith('game:playerJoined:' + component.game._id, expect.any(Function));
    expect(mockEvents.subscribe).toHaveBeenCalledWith('game:playerLeft:' + component.game._id, expect.any(Function));
    expect(mockEvents.subscribe).toHaveBeenCalledWith('game:started:' + component.game._id, expect.any(Function));

    component.ionViewWillLeave();
    expect(mockEvents.unsubscribe).toHaveBeenCalledWith('game:playerJoined:' + component.game._id, expect.any(Function));
    expect(mockEvents.unsubscribe).toHaveBeenCalledWith('game:playerLeft:' + component.game._id, expect.any(Function));
    expect(mockEvents.unsubscribe).toHaveBeenCalledWith('game:started:' + component.game._id, expect.any(Function));
  });

  it('isCreator should return true if loggedInUser created the game', () => {
    component.game = { createdBy: 'testUserId' } as any;
    component.loggedInUser = { _id: 'testUserId' } as any;
    expect(component.isCreator()).toBe(true);

    component.loggedInUser = { _id: 'otherUserId' } as any;
    expect(component.isCreator()).toBe(false);
  });

  it('startGame method should call GameService.startGame if user is creator', async () => {
    component.game = { _id: 'testGameId', createdBy: 'testUserId', players: [{}, {}] } as any; // Min 2 players
    component.loggedInUser = { _id: 'testUserId' } as any;
    (mockGameService.startGame as jest.Mock).mockResolvedValueOnce(component.game);


    await component.startGame();
    expect(mockGameService.startGame).toHaveBeenCalledWith('testGameId');
  });

  it('startGame method should show alert if not enough players', async () => {
    component.game = { _id: 'testGameId', createdBy: 'testUserId', players: [{}] } as any; // Only 1 player
    component.loggedInUser = { _id: 'testUserId' } as any;

    await component.startGame();
    expect(mockGameService.startGame).not.toHaveBeenCalled();
    expect(mockAlertController.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Not enough players',
        buttons: ['OK']
    }));
  });


  it('leaveGame method should call GameService.leaveGame and navigate to HomePage', async () => {
    component.game = { _id: 'testGameId' } as any;
    await component.leaveGame();
    expect(mockGameService.leaveGame).toHaveBeenCalledWith('testGameId');
    expect(mockNavController.popToRoot).toHaveBeenCalled();
  });

  it('shareGame method should call ShareService.shareGame', () => {
    component.game = { _id: 'testGameId', name: 'My Game' } as any;
    component.shareGame();
    expect(mockShareService.shareGame).toHaveBeenCalledWith('My Game', 'Come join my game on EPYC!', null, 'http://epyc.com/join/testGameId');
  });

  it('handleGameStarted method should navigate to the correct page based on current users turn', () => {
    const gameDataUserTurnDraw = { _id: 'testGameId', currentTurn: { player: 'testUserId', task: 'draw' }, threads: [{_id: 'thread1', firstPlayer: 'testUserId'}] };
    component.loggedInUser = { _id: 'testUserId' } as any;
    component.handleGameStarted(gameDataUserTurnDraw as any);
    expect(mockNavController.setRoot).toHaveBeenCalledWith('DrawPage', { game: gameDataUserTurnDraw, thread: gameDataUserTurnDraw.threads[0] });

    const gameDataOtherUserTurn = { _id: 'testGameId', currentTurn: { player: 'otherPlayerId', task: 'guess' }, threads: [{_id: 'thread1', firstPlayer: 'testUserId'}] };
    component.handleGameStarted(gameDataOtherUserTurn as any);
    expect(mockNavController.setRoot).toHaveBeenCalledWith('WaitTurnPage', { game: gameDataOtherUserTurn });
  });
});
