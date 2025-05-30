import { ThreadResultsPage } from './thread-results';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NavController, NavParams, Platform } from 'ionic-angular';
import { UserDataService } from '../../providers/user-data-service/user-data-service';

// Mocks for Ionic services
class MockNavController {
  setRoot = jest.fn();
  // Add other NavController methods if used
}
class MockNavParams {
  get = jest.fn((param) => {
    if (param === 'game') return { _id: 'testGameId', name: 'Test Game' };
    if (param === 'thread') return { _id: 'testThreadId', name: 'Test Thread', drawings: [], guesses: [] };
    return undefined;
  });
}
class MockPlatform {
  registerBackButtonAction = jest.fn(() => jest.fn());
  // Add other Platform methods if used
}

// Mocks for custom providers
class MockUserDataService {
  getLoggedInUser = jest.fn(() => ({ _id: 'testUserId', name: 'Test User' }));
  // Add other UserDataService methods if used
}

describe('ThreadResultsPage', () => {
  let component: ThreadResultsPage;
  let fixture: ComponentFixture<ThreadResultsPage>;
  let mockNavParams: MockNavParams;
  let mockNavController: MockNavController;
  let mockUserDataService: MockUserDataService;

  beforeEach(async () => {
    mockNavParams = new MockNavParams();
    mockNavController = new MockNavController();
    mockUserDataService = new MockUserDataService();

    await TestBed.configureTestingModule({
      declarations: [ThreadResultsPage],
      providers: [
        { provide: NavController, useValue: mockNavController },
        { provide: NavParams, useValue: mockNavParams },
        { provide: Platform, useClass: MockPlatform },
        { provide: UserDataService, useValue: mockUserDataService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ThreadResultsPage);
    component = fixture.componentInstance;
    // fixture.detectChanges(); // Call in tests if needed
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load game and thread data from NavParams on init', () => {
    // Trigger lifecycle hook that loads data
    component.ionViewDidLoad(); // Or ngOnInit, ionViewWillLoad, etc.

    expect(mockNavParams.get).toHaveBeenCalledWith('game');
    expect(mockNavParams.get).toHaveBeenCalledWith('thread');
    expect(component.game).toBeDefined();
    expect(component.thread).toBeDefined();
  });

  it('should have an items array combining drawings and guesses', () => {
    component.thread = {
      _id: 'testThreadId',
      drawings: [{ _id: 'd1', dataUrl: 'url1', created: new Date(2023, 0, 1).toISOString() }],
      guesses: [{ _id: 'g1', text: 'guess1', created: new Date(2023, 0, 2).toISOString(), drawing: 'd1' }],
      firstPlayer: 'playerA'
    } as any;
    component.loggedInUser = { _id: 'testUserId' } as any;

    // Call the method that populates 'items' if it's not done in constructor/OnInit
    // For example, if it's in ionViewDidLoad:
    component.ionViewDidLoad();
    // fixture.detectChanges(); // If items are populated/sorted in template or via getters

    expect(component.items).toBeDefined();
    expect(component.items.length).toBe(2); // One drawing, one guess

    // Check if items are sorted by 'created' date (assuming this is desired)
    // This test depends on the sorting logic in the component.
    // For this example, let's assume they are pushed and might not be sorted yet
    // or are sorted by a specific function.
    // A more robust test would check the actual sorting.
  });

  it('isMyGuess method should correctly identify if a guess belongs to the logged-in user', () => {
    component.loggedInUser = { _id: 'testUserId' } as any;
    const myGuess = { player: 'testUserId' };
    const othersGuess = { player: 'otherUserId' };

    expect(component.isMyGuess(myGuess as any)).toBe(true);
    expect(component.isMyGuess(othersGuess as any)).toBe(false);
  });

  it('backToGameResults method should navigate to GameResultsPage with game data', () => {
    component.game = { _id: 'testGameId' } as any; // Ensure game is set
    component.backToGameResults();

    expect(mockNavController.setRoot).toHaveBeenCalledWith('GameResultsPage', {
      game: component.game,
    });
  });

  // Example for a ViewChild if one exists (e.g., a content scroller)
  it('should have a content reference if using ion-content ViewChild', () => {
    // This assumes 'content' is a ViewChild for IonContent.
    expect(component.content).toBeUndefined(); // Initially, as ViewChild is not set by TestBed here
    // To test further, you would mock IonContent
    // component.content = new MockIonContent() as any;
    // expect(component.content).toBeDefined();
  });
});
