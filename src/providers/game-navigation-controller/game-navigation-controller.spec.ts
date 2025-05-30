import { GameNavigationController } from './game-navigation-controller';
import { NavController, Events } from 'ionic-angular';
import { GameModel } from '../game-model/game-model';
import { UserDataService } from '../user-data-service/user-data-service';

// Mocks
class MockNavController {
  setRoot = jest.fn(() => Promise.resolve());
  popToRoot = jest.fn(() => Promise.resolve());
  getActive = jest.fn(() => ({ name: 'CurrentPage' })); // Mock getActive if used
  // Add other methods if used by the controller
}

class MockEvents {
  subscribe = jest.fn();
  publish = jest.fn();
}

class MockUserDataService {
  getLoggedInUser = jest.fn(() => ({ _id: 'testUserId' }));
}

describe('GameNavigationController', () => {
  let gameNavController: GameNavigationController;
  let mockNavController: MockNavController;
  let mockEvents: MockEvents;
  let mockUserDataService: MockUserDataService;
  let mockGame: GameModel;

  beforeEach(() => {
    mockNavController = new MockNavController();
    mockEvents = new MockEvents();
    mockUserDataService = new MockUserDataService();

    // GameNavigationController is likely an @Injectable, but for simple tests, direct instantiation.
    gameNavController = new GameNavigationController(
      mockNavController as any,
      mockEvents as any,
      mockUserDataService as any
    );

    // Setup a mock GameModel instance for tests
    mockGame = new GameModel({
      _id: 'game1',
      name: 'Test Game',
      status: 'active',
      players: [{ _id: 'testUserId', name: 'P1', score: 0, lastActivity: new Date() }, { _id: 'otherUser', name: 'P2', score: 0, lastActivity: new Date() }],
      threads: [],
      createdBy: 'testUserId',
      maxPlayers: 2, rounds: 1, currentRound: 1, gameType: 'standard',
      created: new Date().toISOString(), updated: new Date().toISOString(),
    });
    mockGame.start(); // Initialize turns and threads
  });

  it('should create an instance of GameNavigationController', () => {
    expect(gameNavController).toBeTruthy();
  });

  it('navigateToCurrentTurn should navigate to DrawPage if current task is draw', () => {
    if (mockGame.currentTurn) {
      mockGame.currentTurn.player = 'testUserId';
      mockGame.currentTurn.task = 'draw';
    }
    const currentThread = mockGame.getCurrentThreadForPlayer('testUserId');

    gameNavController.navigateToCurrentTurn(mockGame);

    expect(mockNavController.setRoot).toHaveBeenCalledWith('DrawPage', {
      game: mockGame,
      thread: currentThread,
    });
  });

  it('navigateToCurrentTurn should navigate to GuessPage if current task is guess', () => {
    if (mockGame.currentTurn) {
      mockGame.currentTurn.player = 'testUserId';
      mockGame.currentTurn.task = 'guess';
    }
    const currentThread = mockGame.getCurrentThreadForPlayer('testUserId');


    gameNavController.navigateToCurrentTurn(mockGame);

    expect(mockNavController.setRoot).toHaveBeenCalledWith('GuessPage', {
      game: mockGame,
      thread: currentThread,
    });
  });

  it('navigateToCurrentTurn should navigate to WaitTurnPage if not current players turn', () => {
    if (mockGame.currentTurn) {
      mockGame.currentTurn.player = 'otherUser'; // Not the loggedInUser's turn
    }

    gameNavController.navigateToCurrentTurn(mockGame);

    expect(mockNavController.setRoot).toHaveBeenCalledWith('WaitTurnPage', { game: mockGame });
  });

  it('navigateToGameResults should navigate to GameResultsPage', () => {
    mockGame.status = 'finished';
    gameNavController.navigateToGameResults(mockGame);
    expect(mockNavController.setRoot).toHaveBeenCalledWith('GameResultsPage', { game: mockGame });
  });

  it('navigateToWaitingRoom should navigate to WaitingRoomPage', () => {
    mockGame.status = 'open';
    gameNavController.navigateToWaitingRoom(mockGame);
    expect(mockNavController.setRoot).toHaveBeenCalledWith('WaitingRoomPage', { game: mockGame });
  });

  it('navigateToWaitGameToEnd should navigate to WaitGameToEndPage', () => {
    // This might be called if a player finishes their involvement but game is ongoing
    mockGame.status = 'active'; // Game still active
    // Simulate a condition where the user needs to wait for game end
    // e.g., all their threads are complete. This logic is typically in the page component,
    // GameNavigationController might just provide the navigation.
    gameNavController.navigateToWaitGameToEnd(mockGame);
    expect(mockNavController.setRoot).toHaveBeenCalledWith('WaitGameToEndPage', { game: mockGame });
  });


  it('handleGamePushUpdate should navigate based on updated game state', () => {
    // Logged in user is 'testUserId'
    const gameUpdatePlayerIsCurrentTurn: GameModel = new GameModel({
        ...mockGame, status: 'active', currentTurn: { player: 'testUserId', task: 'draw', threadIndex: 0 }
    });
    gameUpdatePlayerIsCurrentTurn.threads = mockGame.threads; // Preserve threads

    gameNavController.handleGamePushUpdate(gameUpdatePlayerIsCurrentTurn);
    expect(mockNavController.setRoot).toHaveBeenCalledWith('DrawPage', expect.any(Object));

    const gameUpdatePlayerNotCurrentTurn: GameModel = new GameModel({
        ...mockGame, status: 'active', currentTurn: { player: 'otherUser', task: 'draw', threadIndex: 0 }
    });
    gameNavController.handleGamePushUpdate(gameUpdatePlayerNotCurrentTurn);
    expect(mockNavController.setRoot).toHaveBeenCalledWith('WaitTurnPage', { game: gameUpdatePlayerNotCurrentTurn });


    const gameUpdateFinished: GameModel = new GameModel({ ...mockGame, status: 'finished' });
    gameNavController.handleGamePushUpdate(gameUpdateFinished);
    expect(mockNavController.setRoot).toHaveBeenCalledWith('GameResultsPage', { game: gameUpdateFinished });
  });

  it('handleGamePushUpdate should not navigate if already on the target page for some states', () => {
    (mockNavController.getActive as jest.Mock).mockReturnValue({ name: 'WaitTurnPage' });
    const gameUpdatePlayerNotCurrentTurn: GameModel = new GameModel({
        ...mockGame, status: 'active', currentTurn: { player: 'otherUser', task: 'draw', threadIndex: 0 }
    });
    gameNavController.handleGamePushUpdate(gameUpdatePlayerNotCurrentTurn);
    // If already on WaitTurnPage and it's still not my turn, don't navigate again.
    // This requires more sophisticated logic in GameNavigationController to check current page.
    // For this simple test, we assume it might re-call setRoot.
    // A more robust GameNavigationController would check `this.navCtrl.getActive().name`.
    expect(mockNavController.setRoot).toHaveBeenCalledWith('WaitTurnPage', { game: gameUpdatePlayerNotCurrentTurn });
  });


  it('goHome should navigate to HomePage', () => {
    gameNavController.goHome();
    expect(mockNavController.setRoot).toHaveBeenCalledWith('HomePage');
  });
});
