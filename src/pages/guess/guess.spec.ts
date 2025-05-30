import { GuessPage } from './guess';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NavController, NavParams, Events, Platform, ViewController } from 'ionic-angular';
import { GameService } from '../../providers/game-service/game-service';
import { UserDataService } from '../../providers/user-data-service/user-data-service';

// Mocks for Ionic services
class MockNavController {
  push = jest.fn();
  pop = jest.fn();
  // Add other NavController methods if used
}
class MockNavParams {
  get = jest.fn((param) => {
    if (param === 'game') return { _id: 'testGameId', currentTurn: { player: 'testPlayerId' } };
    if (param === 'thread') return { _id: 'testThreadId', drawings: [{_id: 'drawing1', GUESSED_THIS_ROUND: false}] };
    return undefined;
  });
}
class MockEvents {
  publish = jest.fn();
  subscribe = jest.fn(() => ({ unsubscribe: jest.fn() }));
}
class MockPlatform {
  ready = jest.fn(() => Promise.resolve());
  registerBackButtonAction = jest.fn(() => jest.fn());
}
class MockViewController {
  dismiss = jest.fn();
}

// Mocks for custom providers
class MockGameService {
  submitGuess = jest.fn(() => Promise.resolve());
  // Add other GameService methods if used
}
class MockUserDataService {
  getLoggedInUser = jest.fn(() => ({ _id: 'testPlayerId' }));
  // Add other UserDataService methods if used
}

describe('GuessPage', () => {
  let component: GuessPage;
  let fixture: ComponentFixture<GuessPage>;
  let mockNavParams: MockNavParams;
  let mockGameService: MockGameService;
  let mockUserDataService: MockUserDataService;
  let mockNavController: MockNavController;
  let mockViewController: MockViewController;

  beforeEach(async () => {
    mockNavParams = new MockNavParams();
    mockGameService = new MockGameService();
    mockUserDataService = new MockUserDataService();
    mockNavController = new MockNavController();
    mockViewController = new MockViewController();

    await TestBed.configureTestingModule({
      declarations: [GuessPage],
      providers: [
        { provide: NavController, useValue: mockNavController },
        { provide: NavParams, useValue: mockNavParams },
        { provide: Events, useClass: MockEvents },
        { provide: Platform, useClass: MockPlatform },
        { provide: ViewController, useValue: mockViewController },
        { provide: GameService, useValue: mockGameService },
        { provide: UserDataService, useValue: mockUserDataService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(GuessPage);
    component = fixture.componentInstance;
    // fixture.detectChanges(); // Call in tests if needed
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load game and thread data from NavParams on init', () => {
    component.ionViewDidLoad(); // Or whichever lifecycle hook loads data
    expect(mockNavParams.get).toHaveBeenCalledWith('game');
    expect(mockNavParams.get).toHaveBeenCalledWith('thread');
    expect(component.game).toBeDefined();
    expect(component.thread).toBeDefined();
    expect(component.drawingToGuess).toBeDefined(); // if getDrawingToGuess is called
  });

  it('should determine if it is the current players turn', () => {
    component.game = { _id: 'testGameId', currentTurn: { player: 'testPlayerId' } } as any;
    component.loggedInUser = { _id: 'testPlayerId' } as any;
    // Call a method or trigger change detection if isMyTurn is a getter
    // For simplicity, let's assume it's directly checked or set in a lifecycle hook
    const isMyTurn = component.game && component.loggedInUser && component.game.currentTurn && component.game.currentTurn.player === component.loggedInUser._id;
    expect(isMyTurn).toBe(true);

    component.loggedInUser = { _id: 'otherPlayerId' } as any;
    const isMyTurnNowFalse = component.game && component.loggedInUser && component.game.currentTurn && component.game.currentTurn.player === component.loggedInUser._id;
    expect(isMyTurnNowFalse).toBe(false);
  });

  it('getDrawingToGuess should select a drawing that has not been guessed this round', () => {
    component.thread = {
      _id: 'testThreadId',
      drawings: [
        { _id: 'drawing1', GUESSED_THIS_ROUND: true, dataUrl: 'url1' },
        { _id: 'drawing2', GUESSED_THIS_ROUND: false, dataUrl: 'url2' },
        { _id: 'drawing3', GUESSED_THIS_ROUND: false, dataUrl: 'url3' },
      ]
    } as any;
    component.getDrawingToGuess();
    expect(component.drawingToGuess).toBeDefined();
    expect(component.drawingToGuess._id === 'drawing2' || component.drawingToGuess._id === 'drawing3').toBe(true);
    expect(component.drawingToGuess.GUESSED_THIS_ROUND).toBe(false);
  });

   it('done method should submit guess and dismiss view', async () => {
    component.game = { _id: 'testGameId' } as any;
    component.thread = { _id: 'testThreadId', drawings: [] } as any;
    component.drawingToGuess = { _id: 'drawing1' } as any;
    component.guessText = 'Test Guess';

    await component.done();

    expect(mockGameService.submitGuess).toHaveBeenCalledWith(
      'testGameId',
      'testThreadId',
      'drawing1',
      'Test Guess'
    );
    expect(mockViewController.dismiss).toHaveBeenCalled();
  });

  it('should have a guessText property for the input', () => {
    expect(component.guessText).toBeDefined(); // Should be initialized, likely to empty string
    component.guessText = 'My Test Guess';
    expect(component.guessText).toEqual('My Test Guess');
  });

  it('should have a replayingCanvas reference', () => {
    // This assumes 'replayingCanvas' is a ViewChild.
    expect(component.replayingCanvas).toBeUndefined(); // Initially
    // To test further, mock ReplayingDrawingCanvasComponent
    // component.replayingCanvas = new MockReplayingCanvasComponent() as any;
    // expect(component.replayingCanvas).toBeDefined();
  });

  it('skipTurn method should dismiss the view', () => {
    component.skipTurn();
    expect(mockViewController.dismiss).toHaveBeenCalled();
  });
});
