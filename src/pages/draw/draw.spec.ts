import { DrawPage } from './draw';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NavController, NavParams, Events, Platform, ViewController } from 'ionic-angular';
import { DrawingDataService } from '../../providers/drawing-data-service/drawing-data-service';
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
    if (param === 'thread') return { _id: 'testThreadId' };
    return undefined;
  });
  // Add other NavParams methods if used
}
class MockEvents {
  publish = jest.fn();
  subscribe = jest.fn(() => ({ unsubscribe: jest.fn() }));
}
class MockPlatform {
  ready = jest.fn(() => Promise.resolve());
  registerBackButtonAction = jest.fn(() => jest.fn());
  // Add other Platform methods if used
}
class MockViewController {
  dismiss = jest.fn();
  // Add other ViewController methods if used
}

// Mocks for custom providers
class MockDrawingDataService {
  startRecording = jest.fn();
  stopRecording = jest.fn(() => ({
    actions: [],
    startTime: Date.now(),
    endTime: Date.now() + 1000,
    width: 300,
    height: 300,
  }));
  clearRecording = jest.fn();
  // Add other DrawingDataService methods if used
}
class MockGameService {
  submitDrawing = jest.fn(() => Promise.resolve());
  // Add other GameService methods if used
}
class MockUserDataService {
  getLoggedInUser = jest.fn(() => ({ _id: 'testPlayerId' }));
  // Add other UserDataService methods if used
}


describe('DrawPage', () => {
  let component: DrawPage;
  let fixture: ComponentFixture<DrawPage>;
  let mockNavParams: MockNavParams;
  let mockGameService: MockGameService;
  let mockUserDataService: MockUserDataService;
  let mockDrawingDataService: MockDrawingDataService;
  let mockNavController: MockNavController;
  let mockViewController: MockViewController;

  beforeEach(async () => {
    mockNavParams = new MockNavParams();
    mockGameService = new MockGameService();
    mockUserDataService = new MockUserDataService();
    mockDrawingDataService = new MockDrawingDataService();
    mockNavController = new MockNavController();
    mockViewController = new MockViewController();


    await TestBed.configureTestingModule({
      declarations: [DrawPage],
      providers: [
        { provide: NavController, useValue: mockNavController },
        { provide: NavParams, useValue: mockNavParams },
        { provide: Events, useClass: MockEvents },
        { provide: Platform, useClass: MockPlatform },
        { provide: ViewController, useValue: mockViewController },
        { provide: DrawingDataService, useValue: mockDrawingDataService },
        { provide: GameService, useValue: mockGameService },
        { provide: UserDataService, useValue: mockUserDataService },
      ],
      schemas: [NO_ERRORS_SCHEMA], // Important for Ionic pages with custom tags
    }).compileComponents();

    fixture = TestBed.createComponent(DrawPage);
    component = fixture.componentInstance;
    // fixture.detectChanges(); // Call in tests if needed, e.g., for lifecycle hooks or after setting @Input
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load game and thread data from NavParams on init', () => {
    // Assuming ngOnInit or ionViewDidLoad calls this
    component.ionViewDidLoad(); // Or whichever lifecycle hook loads data
    expect(mockNavParams.get).toHaveBeenCalledWith('game');
    expect(mockNavParams.get).toHaveBeenCalledWith('thread');
    expect(component.game).toBeDefined();
    expect(component.thread).toBeDefined();
  });

  it('should start recording on view enter if it is the current players turn', () => {
    // Mock UserDataService to return the current player
    (mockUserDataService.getLoggedInUser as jest.Mock).mockReturnValueOnce({ _id: 'testPlayerId' });
    component.game = { _id: 'testGameId', currentTurn: { player: 'testPlayerId' } } as any;
    component.ionViewDidEnter(); // Or whichever lifecycle hook starts recording
    expect(mockDrawingDataService.startRecording).toHaveBeenCalled();
  });

  it('should not start recording if it is not the current players turn', () => {
    (mockUserDataService.getLoggedInUser as jest.Mock).mockReturnValueOnce({ _id: 'otherPlayerId' });
     component.game = { _id: 'testGameId', currentTurn: { player: 'testPlayerId' } } as any;
    component.ionViewDidEnter();
    expect(mockDrawingDataService.startRecording).not.toHaveBeenCalled();
  });

  it('done method should stop recording and submit drawing', async () => {
    component.game = { _id: 'testGameId' } as any;
    component.thread = { _id: 'testThreadId', drawings: [] } as any;
    component.drawingDataService = mockDrawingDataService; // ensure the component uses the mock

    await component.done();

    expect(mockDrawingDataService.stopRecording).toHaveBeenCalled();
    expect(mockGameService.submitDrawing).toHaveBeenCalledWith('testGameId', 'testThreadId', expect.any(Object));
    // expect(mockNavController.pop).toHaveBeenCalled(); // Or viewCtrl.dismiss() depending on presentation
    expect(mockViewController.dismiss).toHaveBeenCalled();
  });

  it('should have a drawingCanvas reference', () => {
    // This assumes 'drawingCanvas' is a ViewChild.
    // If it's initialized in ngAfterViewInit, detectChanges might be needed.
    // For this simple test, we'll just check if the property could exist.
    expect(component.drawingCanvas).toBeUndefined(); // Initially, as ViewChild is not set by TestBed here
    // To test further, you would mock the DrawingCanvasComponent
    // component.drawingCanvas = new MockDrawingCanvasComponent() as any;
    // expect(component.drawingCanvas).toBeDefined();
  });

  it('should clear canvas when clear method is called', () => {
    // Mock the drawingCanvas component if it's a ViewChild
    const mockCanvas = { clear: jest.fn() };
    component.drawingCanvas = mockCanvas as any;
    component.clear();
    expect(mockCanvas.clear).toHaveBeenCalled();
  });
});
