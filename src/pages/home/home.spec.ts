import { HomePage } from './home';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NavController, Events, PopoverController, Platform } from 'ionic-angular';
import { GameService } from '../../providers/game-service/game-service';
import { UserDataService } from '../../providers/user-data-service/user-data-service';

// Mocks for Ionic services
class MockNavController {
  push = jest.fn();
  setRoot = jest.fn();
}
class MockEvents {
  publish = jest.fn();
  subscribe = jest.fn((event, callback) => ({ unsubscribe: jest.fn() }));
  unsubscribe = jest.fn();
}
class MockPopoverController {
  create = jest.fn(() => ({
    present: jest.fn(),
    onDidDismiss: jest.fn((callback) => callback()), // Simulate immediate dismiss
  }));
}
class MockPlatform {
  ready = jest.fn(() => Promise.resolve());
  // Add other Platform methods if used
}

// Mocks for custom providers
class MockGameService {
  getGames = jest.fn(() => Promise.resolve([])); // Default to empty array
  createGame = jest.fn((gameName) => Promise.resolve({ _id: 'newGameId', name: gameName, players: [], status: 'open' }));
  joinGame = jest.fn((gameId) => Promise.resolve({ _id: gameId, players: [{_id: 'testUserId'}], status: 'active' }));
}
class MockUserDataService {
  getLoggedInUser = jest.fn(() => ({ _id: 'testUserId', name: 'Test User' }));
  logout = jest.fn(() => Promise.resolve());
}

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let mockNavController: MockNavController;
  let mockEvents: MockEvents;
  let mockPopoverController: MockPopoverController;
  let mockGameService: MockGameService;
  let mockUserDataService: MockUserDataService;

  beforeEach(async () => {
    mockNavController = new MockNavController();
    mockEvents = new MockEvents();
    mockPopoverController = new MockPopoverController();
    mockGameService = new MockGameService();
    mockUserDataService = new MockUserDataService();

    await TestBed.configureTestingModule({
      declarations: [HomePage],
      providers: [
        { provide: NavController, useValue: mockNavController },
        { provide: Events, useValue: mockEvents },
        { provide: PopoverController, useValue: mockPopoverController },
        { provide: Platform, useClass: MockPlatform },
        { provide: GameService, useValue: mockGameService },
        { provide: UserDataService, useValue: mockUserDataService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    // fixture.detectChanges(); // Call in tests if needed
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load user and games on view enter', async () => {
    await component.ionViewDidEnter(); // Or ionViewWillEnter / ngOnInit
    expect(mockUserDataService.getLoggedInUser).toHaveBeenCalled();
    expect(mockGameService.getGames).toHaveBeenCalled();
    expect(component.loggedInUser).toBeDefined();
    expect(component.openGames).toBeDefined();
    expect(component.activeGames).toBeDefined();
    expect(component.finishedGames).toBeDefined();
  });

  it('createGame method should call GameService and navigate to WaitingRoomPage', async () => {
    component.newGameName = 'My New Game';
    await component.createGame();
    expect(mockGameService.createGame).toHaveBeenCalledWith('My New Game');
    expect(mockNavController.push).toHaveBeenCalledWith('WaitingRoomPage', { game: expect.any(Object) });
  });

  it('joinGame method should call GameService and navigate to WaitingRoomPage or game page', async () => {
    const testGame = { _id: 'gameToJoin', name: 'Joinable Game', players: [], status: 'open' };
    (mockGameService.joinGame as jest.Mock).mockResolvedValueOnce(
        { ...testGame, status: 'active', players: [{_id: 'testUserId'}] }
    ); // Simulate game becoming active

    await component.joinGame(testGame as any);

    expect(mockGameService.joinGame).toHaveBeenCalledWith('gameToJoin');
    // Logic for navigation might differ based on game status after joining
    // expect(mockNavController.push).toHaveBeenCalledWith('WaitingRoomPage', { game: expect.any(Object) });
    // OR if game becomes active and player is in it:
    // expect(mockNavController.push).toHaveBeenCalledWith(expect.any(Function)); // Navigating to game specific page
    expect(mockNavController.push).toHaveBeenCalled(); // General check that navigation happened
  });

  it('viewGame method should navigate to appropriate page based on game status and player turn', () => {
    const gamePlayerIsCurrent = {
        _id: 'activeGame1', status: 'active', players: [{_id: 'testUserId'}],
        currentTurn: { player: 'testUserId', task: 'draw' }
    };
    component.loggedInUser = { _id: 'testUserId'} as any;

    component.viewGame(gamePlayerIsCurrent as any);
    expect(mockNavController.push).toHaveBeenCalledWith('DrawPage', { game: gamePlayerIsCurrent, thread: expect.anything() });

    const gamePlayerIsNotCurrent = {
        _id: 'activeGame2', status: 'active', players: [{_id: 'testUserId'}],
        currentTurn: { player: 'otherPlayerId', task: 'guess' }
    };
    component.viewGame(gamePlayerIsNotCurrent as any);
    expect(mockNavController.push).toHaveBeenCalledWith('WaitTurnPage', { game: gamePlayerIsNotCurrent });

     const finishedGame = { _id: 'finishedGame1', status: 'finished', players: [] };
     component.viewGame(finishedGame as any);
     expect(mockNavController.push).toHaveBeenCalledWith('GameResultsPage', { game: finishedGame });
  });

  it('logout method should call UserDataService and navigate to LoginPage', async () => {
    await component.logout();
    expect(mockUserDataService.logout).toHaveBeenCalled();
    expect(mockNavController.setRoot).toHaveBeenCalledWith('LoginPage');
  });

  it('should subscribe to game update events on init and unsubscribe on destroy', () => {
    component.ionViewWillLoad(); // Or ngOnInit
    expect(mockEvents.subscribe).toHaveBeenCalledWith('game:updated', expect.any(Function));
    expect(mockEvents.subscribe).toHaveBeenCalledWith('game:created', expect.any(Function));
    expect(mockEvents.subscribe).toHaveBeenCalledWith('user:login', expect.any(Function));
    expect(mockEvents.subscribe).toHaveBeenCalledWith('user:logout', expect.any(Function));


    component.ionViewWillUnload(); // Or ngOnDestroy
    expect(mockEvents.unsubscribe).toHaveBeenCalledWith('game:updated', expect.any(Function));
    expect(mockEvents.unsubscribe).toHaveBeenCalledWith('game:created', expect.any(Function));
    expect(mockEvents.unsubscribe).toHaveBeenCalledWith('user:login', expect.any(Function));
    expect(mockEvents.unsubscribe).toHaveBeenCalledWith('user:logout', expect.any(Function));
  });

  it('presentUserOptionsPopover method should create and present a popover', () => {
    const mockEvent = {};
    component.presentUserOptionsPopover(mockEvent);
    expect(mockPopoverController.create).toHaveBeenCalledWith('UserOptionsPopover', {user: component.loggedInUser});
    expect(mockPopoverController.create().present).toHaveBeenCalledWith({ ev: mockEvent });
  });
});
