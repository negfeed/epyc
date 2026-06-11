/// Ported verbatim from `src/providers/game-model/game-model.ts`.
///
/// The integer values are part of the persisted Firestore contract — do not
/// renumber them.
library;

enum GameState {
  /// Initial state. The game is still joinable.
  created(1),

  /// The game has started. No more joins allowed.
  started(2),

  /// The game was abandoned.
  abandoned(3),

  /// The game finished.
  finished(4);

  const GameState(this.value);
  final int value;

  static GameState fromValue(int v) =>
      GameState.values.firstWhere((e) => e.value == v);
}

enum GameAtomType {
  drawing(1),
  guess(2);

  const GameAtomType(this.value);
  final int value;

  static GameAtomType fromValue(int v) =>
      GameAtomType.values.firstWhere((e) => e.value == v);
}

enum GameAtomState {
  /// The player has not started playing the game atom.
  notStarted(1),

  /// The player has started playing the game atom.
  started(2),

  /// The player has finished playing the game atom.
  done(3);

  const GameAtomState(this.value);
  final int value;

  static GameAtomState fromValue(int v) =>
      GameAtomState.values.firstWhere((e) => e.value == v);
}
