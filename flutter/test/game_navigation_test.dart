import 'package:epyc/src/logic/game_navigation.dart';
import 'package:epyc/src/models/enums.dart';
import 'package:epyc/src/models/game.dart';
import 'package:flutter_test/flutter_test.dart';

Game baseStarted(int n, {required List<List<GameAtomState>> states}) {
  final order = List.generate(n, (i) => 'p$i');
  final threads = List.generate(
    n,
    (t) => GameThread(
      word: 'thread$t-word',
      atoms: List.generate(
        n + 1,
        (i) => GameAtom(
          type: i.isEven ? GameAtomType.drawing : GameAtomType.guess,
          state: states[t][i],
          guess: i.isOdd ? 'guess-$t-$i' : null,
          drawingRef: i.isEven ? 'draw-$t-$i' : null,
        ),
      ),
    ),
  );
  return Game(
    id: 'g',
    state: GameState.started,
    creator: 'p0',
    creationTimestampMs: 0,
    users: {for (final u in order) u: GameUser(uid: u, joined: true)},
    usersOrder: order,
    threads: threads,
  );
}

List<List<GameAtomState>> uniform(int n, GameAtomState s) =>
    List.generate(n, (_) => List.generate(n + 1, (_) => s));

void main() {
  test('CREATED → WaitingRoom', () {
    const g = Game(
      id: 'g',
      state: GameState.created,
      creator: 'p0',
      creationTimestampMs: 0,
      users: {'p0': GameUser(uid: 'p0', joined: true)},
    );
    expect(GameNavigation.deriveTarget(g, 'p0'), isA<WaitingRoomTarget>());
  });

  test('fresh started game → Draw the thread word at (p,0)', () {
    final g = baseStarted(3, states: uniform(3, GameAtomState.notStarted));
    final target = GameNavigation.deriveTarget(g, 'p0');
    expect(target, isA<DrawTarget>());
    final draw = target as DrawTarget;
    expect(draw.address, const AtomAddress(threadIndex: 0, atomIndex: 0));
    expect(draw.word, 'thread0-word'); // first atom uses the thread word
  });

  test('guess atom → Guess with previous drawingRef', () {
    // Player 0's address (t1,a1) is a GUESS; make it ready.
    final states = uniform(3, GameAtomState.notStarted);
    states[0][0] = GameAtomState.done; // p0's first
    states[1][0] = GameAtomState.done; // predecessor of (t1,a1)
    final g = baseStarted(3, states: states);
    final target = GameNavigation.deriveTarget(g, 'p0');
    expect(target, isA<GuessTarget>());
    expect((target as GuessTarget).drawingKey, 'draw-1-0');
  });

  test('not ready → WaitTurn', () {
    final states = uniform(3, GameAtomState.notStarted);
    states[0][0] = GameAtomState.done; // p0 done first; (t1,a1) not ready
    final g = baseStarted(3, states: states);
    expect(GameNavigation.deriveTarget(g, 'p0'), isA<WaitTurnTarget>());
  });

  test('player finished all atoms but game not done → WaitGameToEnd', () {
    // Mark all of p0's atoms done, leave others not done.
    final states = uniform(3, GameAtomState.notStarted);
    for (var i = 0; i < 4; i++) {
      final t = (i + 0) % 3; // p0's thread at index i
      states[t][i] = GameAtomState.done;
    }
    final g = baseStarted(3, states: states);
    expect(GameNavigation.deriveTarget(g, 'p0'), isA<WaitGameToEndTarget>());
  });

  test('all threads last atom done → GameResults', () {
    final g = baseStarted(3, states: uniform(3, GameAtomState.done));
    expect(GameNavigation.deriveTarget(g, 'p0'), isA<GameResultsTarget>());
  });

  test('watcher (not in usersOrder) → Unknown', () {
    final g = baseStarted(3, states: uniform(3, GameAtomState.notStarted));
    expect(GameNavigation.deriveTarget(g, 'stranger'), isA<UnknownTarget>());
  });
}
