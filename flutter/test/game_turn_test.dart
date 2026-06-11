import 'package:epyc/src/logic/game_turn.dart';
import 'package:epyc/src/logic/words.dart';
import 'package:epyc/src/models/enums.dart';
import 'package:epyc/src/models/game.dart';
import 'package:flutter_test/flutter_test.dart';

/// Builds a game with [n] players where every atom has [state].
Game gameWithState(int n, GameAtomState state) {
  final order = List.generate(n, (i) => 'p$i');
  final threads = List.generate(
    n,
    (_) => GameThread(
      word: 'word',
      atoms: List.generate(
        n + 1,
        (i) => GameAtom(
          type: i.isEven ? GameAtomType.drawing : GameAtomType.guess,
          state: state,
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

void main() {
  group('playerAtomAddresses', () {
    test('N=3, player 0 walks thread (i+0)%3 with atomIndex=i', () {
      final addrs = GameTurn.playerAtomAddresses(0, 3);
      expect(addrs.length, 4); // N + 1
      expect(addrs[0], const AtomAddress(threadIndex: 0, atomIndex: 0));
      expect(addrs[1], const AtomAddress(threadIndex: 1, atomIndex: 1));
      expect(addrs[2], const AtomAddress(threadIndex: 2, atomIndex: 2));
      expect(addrs[3], const AtomAddress(threadIndex: 0, atomIndex: 3));
    });

    test('N=3, player 1 is offset by 1', () {
      final addrs = GameTurn.playerAtomAddresses(1, 3);
      expect(addrs[0], const AtomAddress(threadIndex: 1, atomIndex: 0));
      expect(addrs[1], const AtomAddress(threadIndex: 2, atomIndex: 1));
      expect(addrs[2], const AtomAddress(threadIndex: 0, atomIndex: 2));
      expect(addrs[3], const AtomAddress(threadIndex: 1, atomIndex: 3));
    });
  });

  group('atomPlayerIndex is the inverse of playerAtomAddresses', () {
    for (final n in [2, 3, 4]) {
      test('N=$n round-trips for every player', () {
        for (var p = 0; p < n; p++) {
          for (final addr in GameTurn.playerAtomAddresses(p, n)) {
            expect(GameTurn.atomPlayerIndex(addr, n), p);
          }
        }
      });
    }
  });

  group('buildEmptyThreads', () {
    for (final n in [2, 3, 4]) {
      test('N=$n → $n threads of ${n + 1} alternating atoms', () {
        final threads = GameTurn.buildEmptyThreads(n, Words());
        expect(threads.length, n);
        for (final t in threads) {
          expect(t.atoms.length, n + 1);
          for (var i = 0; i < t.atoms.length; i++) {
            expect(t.atoms[i].type,
                i.isEven ? GameAtomType.drawing : GameAtomType.guess);
            expect(t.atoms[i].state, GameAtomState.notStarted);
          }
        }
      });
    }
  });

  group('getNextAtom', () {
    test('fresh game: first atom is ready for every player', () {
      final game = gameWithState(3, GameAtomState.notStarted);
      for (var p = 0; p < 3; p++) {
        final next = GameTurn.getNextAtom(game, 'p$p');
        expect(next.allAtomsDone, isFalse);
        expect(next.readyToPlay, isTrue);
        expect(next.address, const AtomAddress(threadIndex: 0, atomIndex: 0)
            // player p's first address is (p, 0)
            .copyAt(p));
      }
    });

    test('all done → allAtomsDone, no address', () {
      final game = gameWithState(3, GameAtomState.done);
      final next = GameTurn.getNextAtom(game, 'p0');
      expect(next.allAtomsDone, isTrue);
      expect(next.address, isNull);
      expect(next.readyToPlay, isFalse);
    });

    test('not ready when predecessor in thread is not done', () {
      // Player 0's second atom is (t1, a1); its predecessor (t1, a0) is owned
      // by player 1. Mark player 0's first atom done but leave (t1,a0) not done.
      final game = gameWithState(3, GameAtomState.notStarted);
      final threads = [...game.threads];
      // mark (t0,a0) done (player 0's first)
      final t0 = threads[0];
      final t0atoms = [...t0.atoms];
      t0atoms[0] = t0atoms[0].copyWith(state: GameAtomState.done);
      threads[0] = t0.copyWith(atoms: t0atoms);
      final g = game.copyWith(threads: threads);

      final next = GameTurn.getNextAtom(g, 'p0');
      expect(next.address, const AtomAddress(threadIndex: 1, atomIndex: 1));
      expect(next.readyToPlay, isFalse); // (t1,a0) not done yet
    });

    test('ready when predecessor in thread is done', () {
      final game = gameWithState(3, GameAtomState.notStarted);
      final threads = [...game.threads];
      // mark (t0,a0) done and (t1,a0) done
      for (final ti in [0, 1]) {
        final t = threads[ti];
        final atoms = [...t.atoms];
        atoms[0] = atoms[0].copyWith(state: GameAtomState.done);
        threads[ti] = t.copyWith(atoms: atoms);
      }
      final g = game.copyWith(threads: threads);

      final next = GameTurn.getNextAtom(g, 'p0');
      expect(next.address, const AtomAddress(threadIndex: 1, atomIndex: 1));
      expect(next.readyToPlay, isTrue);
    });
  });
}

extension on AtomAddress {
  /// Helper: player p's first address is (p, 0).
  AtomAddress copyAt(int p) => AtomAddress(threadIndex: p, atomIndex: 0);
}
