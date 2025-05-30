import { GameModel, PlayerModel, ThreadModel, TurnModel } from './game-model'; // Assuming these are exported

describe('GameModel', () => {
  let gameModel: GameModel;
  const initialGameData = {
    _id: 'game123',
    name: 'Test Game',
    createdBy: 'userCreator',
    status: 'open',
    players: [{ _id: 'player1', name: 'Player One', score: 0, lastActivity: new Date() }],
    threads: [],
    maxPlayers: 4,
    rounds: 3,
    currentRound: 1,
    gameType: 'standard',
    password: '',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };

  beforeEach(() => {
    // GameModel might be instantiated with data from a backend
    gameModel = new GameModel(initialGameData);
  });

  it('should create an instance of GameModel and initialize properties', () => {
    expect(gameModel).toBeTruthy();
    expect(gameModel._id).toEqual(initialGameData._id);
    expect(gameModel.name).toEqual(initialGameData.name);
    expect(gameModel.status).toEqual(initialGameData.status);
    expect(gameModel.players.length).toBe(1);
    expect(gameModel.players[0]._id).toEqual('player1');
    expect(gameModel.maxPlayers).toEqual(initialGameData.maxPlayers);
  });

  it('addPlayer method should add a player to the game', () => {
    const newPlayer: PlayerModel = { _id: 'player2', name: 'Player Two', score: 0, lastActivity: new Date() };
    gameModel.addPlayer(newPlayer);
    expect(gameModel.players.length).toBe(2);
    expect(gameModel.players.find(p => p._id === 'player2')).toBeDefined();
  });

  it('addPlayer method should not add a player if game is full', () => {
    gameModel.maxPlayers = 1; // Set max players to current number
    const newPlayer: PlayerModel = { _id: 'player2', name: 'Player Two', score: 0, lastActivity: new Date() };
    gameModel.addPlayer(newPlayer); // Try to add another
    expect(gameModel.players.length).toBe(1); // Should remain 1
  });

  it('removePlayer method should remove a player from the game', () => {
    gameModel.removePlayer('player1');
    expect(gameModel.players.length).toBe(0);
    expect(gameModel.players.find(p => p._id === 'player1')).toBeUndefined();
  });

  it('getPlayer method should retrieve a player by ID', () => {
    const player = gameModel.getPlayer('player1');
    expect(player).toBeDefined();
    expect(player?._id).toEqual('player1');
  });

  it('start method should change game status to active and create threads', () => {
    gameModel.start();
    expect(gameModel.status).toEqual('active');
    expect(gameModel.threads.length).toBe(gameModel.players.length); // One thread per player
    gameModel.threads.forEach(thread => {
      expect(thread.firstPlayer).toBeDefined();
    });
  });

  it('nextTurn method should advance the turn or round', () => {
    gameModel.start(); // Game must be active with turns
    const initialTurnPlayer = gameModel.currentTurn?.player;
    const initialTurnTask = gameModel.currentTurn?.task;

    gameModel.nextTurn();

    // This is a complex method, so a simple check:
    // Either the player or task or round should change.
    const turnChanged = gameModel.currentTurn?.player !== initialTurnPlayer ||
                        gameModel.currentTurn?.task !== initialTurnTask ||
                        gameModel.currentRound !== initialGameData.currentRound;
    expect(turnChanged).toBe(true);
    // More detailed tests would require specific scenarios for turn progression.
  });

  it('end method should change game status to finished and determine winner', () => {
    gameModel.players = [
      { _id: 'player1', name: 'Player One', score: 100, lastActivity: new Date() },
      { _id: 'player2', name: 'Player Two', score: 200, lastActivity: new Date() },
    ];
    gameModel.start(); // Must be active to end
    gameModel.end();

    expect(gameModel.status).toEqual('finished');
    expect(gameModel.winner).toBeDefined();
    expect(gameModel.winner?._id).toEqual('player2'); // Player with highest score
  });

  it('isPlayerTurn method should correctly identify if it is a given players turn', () => {
    gameModel.start(); // Initialize turns
    if (gameModel.currentTurn) {
      gameModel.currentTurn.player = 'player1';
      expect(gameModel.isPlayerTurn('player1')).toBe(true);
      expect(gameModel.isPlayerTurn('player2')).toBe(false);
    } else {
      fail('currentTurn was not initialized by gameModel.start()');
    }
  });

  it('getCurrentThreadForPlayer method should return the correct thread', () => {
    gameModel.start(); // Initialize threads and turns
    if (gameModel.threads.length > 0 && gameModel.currentTurn) {
      gameModel.currentTurn.player = gameModel.threads[0].firstPlayer; // Assume first player of first thread
      const currentThread = gameModel.getCurrentThreadForPlayer(gameModel.currentTurn.player);
      expect(currentThread).toBeDefined();
      expect(currentThread?._id).toEqual(gameModel.threads[0]._id);
    } else {
      // This might happen if there are no players/threads, or if currentTurn is not set.
      // Depending on the desired behavior, adjust the expectation.
      expect(gameModel.threads.length > 0 && gameModel.currentTurn).toBe(true); // Fail if no threads/turn
    }
  });

  // Test for static fromJson method if it exists (common for models)
  it('static fromJson method should create a GameModel instance from plain object', () => {
    const gameObj = {
      _id: 'game456', name: 'JSON Game', createdBy: 'jsonUser', status: 'open',
      players: [{ _id: 'pA', name: 'Player A', score: 10, lastActivity: new Date().toISOString() }],
      threads: [], maxPlayers: 2, rounds: 1, currentRound: 1, gameType: 'short', password: null,
      created: new Date().toISOString(), updated: new Date().toISOString(),
      // ensure all required fields for constructor are present
    };
    const modelInstance = GameModel.fromJson(gameObj);
    expect(modelInstance).toBeInstanceOf(GameModel);
    expect(modelInstance.name).toEqual('JSON Game');
    expect(modelInstance.players[0]._id).toEqual('pA');
  });
});
