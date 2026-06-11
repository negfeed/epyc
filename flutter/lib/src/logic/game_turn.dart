import '../models/enums.dart';
import '../models/game.dart';
import 'words.dart';

/// Pure game turn/thread logic, ported verbatim from the static methods of
/// `src/providers/game-model/game-model.ts`. This is the heart of the app and
/// is covered by golden unit tests (`test/game_turn_test.dart`).
abstract class GameTurn {
  /// Which player owns the atom at [address], given [playersCount].
  ///
  /// Port of `GameModel.atomPlayerIndex` (game-model.ts:197-199):
  /// `(threadIndex - atomIndex + N) % N`.
  static int atomPlayerIndex(AtomAddress address, int playersCount) =>
      (address.threadIndex - address.atomIndex + playersCount) % playersCount;

  /// The ordered list of atom addresses a player plays, in play order.
  ///
  /// Port of `GameModel.playerAtomAddresses` (game-model.ts:201-211): for
  /// `index` in `0..playersCount` (inclusive), `threadIndex = (index +
  /// playerIndex) % N`, `atomIndex = index`.
  static List<AtomAddress> playerAtomAddresses(
      int playerIndex, int playersCount) {
    final addresses = <AtomAddress>[];
    for (var index = 0; index < playersCount + 1; index++) {
      addresses.add(AtomAddress(
        threadIndex: (index + playerIndex) % playersCount,
        atomIndex: index,
      ));
    }
    return addresses;
  }

  /// Resolves the next atom [userId] should act on.
  ///
  /// Port of `GameModel.getNextAtom` (game-model.ts:213-244). Walks the
  /// player's atom addresses in order, stopping at the first non-DONE atom.
  /// `readyToPlay` is true only when that atom is the first in its thread or
  /// its predecessor is DONE. If every atom is DONE, `allAtomsDone` is true and
  /// `address` is null.
  static NextAtom getNextAtom(Game game, String userId) {
    final playersCount = game.usersOrder.length;
    final playerIndex = game.usersOrder.indexOf(userId);
    final addresses = playerAtomAddresses(playerIndex, playersCount);

    AtomAddress? nextAddress;
    var allAtomsDone = false;
    var readyToPlay = false;

    var matched = false;
    for (final address in addresses) {
      final thread = game.threads[address.threadIndex];
      final atom = thread.atoms[address.atomIndex];
      final previous =
          address.atomIndex > 0 ? thread.atoms[address.atomIndex - 1] : null;

      if (atom.state != GameAtomState.done) {
        nextAddress = address;
        if (previous == null || previous.state == GameAtomState.done) {
          readyToPlay = true;
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      allAtomsDone = true;
    }

    return NextAtom(
      address: nextAddress,
      readyToPlay: readyToPlay,
      allAtomsDone: allAtomsDone,
    );
  }

  /// Builds one empty thread: `playerCount + 1` atoms alternating
  /// DRAWING(even idx)/GUESS(odd idx), all NOT_STARTED, seeded with a word.
  ///
  /// Port of `GameModel.buildEmptyThread` (game-model.ts:138-150).
  static GameThread buildEmptyThread(int playerCount, Words words) {
    final atoms = <GameAtom>[];
    for (var index = 0; index < playerCount + 1; index++) {
      atoms.add(GameAtom(
        type: index.isEven ? GameAtomType.drawing : GameAtomType.guess,
        state: GameAtomState.notStarted,
      ));
    }
    return GameThread(word: words.getWord(), atoms: atoms);
  }

  /// Builds `playerCount` empty threads.
  ///
  /// Port of `GameModel.buildEmptyThreads` (game-model.ts:152-158).
  static List<GameThread> buildEmptyThreads(int playerCount, Words words) =>
      List.generate(playerCount, (_) => buildEmptyThread(playerCount, words));

  /// Fisher-Yates style shuffle matching `GameModel.shuffleUsers`
  /// (game-model.ts:160-168). Mutates [users] in place.
  static void shuffleUsers(List<String> users, {required int Function(int) nextInt}) {
    final count = users.length;
    for (var index = 0; index < users.length; index++) {
      final otherIndex = nextInt(count);
      final tmp = users[index];
      users[index] = users[otherIndex];
      users[otherIndex] = tmp;
    }
  }
}
