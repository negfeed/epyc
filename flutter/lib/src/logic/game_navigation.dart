import '../models/enums.dart';
import '../models/game.dart';
import 'game_turn.dart';

/// Where the navigation state machine wants the player to be, given a game
/// snapshot. Pure port of `getNavigationTargetFromGameState`
/// (`game-navigation-controller.ts:52-124`).
sealed class NavTarget {
  const NavTarget(this.gameId);
  final String gameId;
}

class WaitingRoomTarget extends NavTarget {
  const WaitingRoomTarget(super.gameId);
}

class WaitTurnTarget extends NavTarget {
  const WaitTurnTarget(super.gameId);
}

class WaitGameToEndTarget extends NavTarget {
  const WaitGameToEndTarget(super.gameId);
}

class GameResultsTarget extends NavTarget {
  const GameResultsTarget(super.gameId);
}

class DrawTarget extends NavTarget {
  const DrawTarget(super.gameId, this.address, this.word);
  final AtomAddress address;
  final String word;
}

class GuessTarget extends NavTarget {
  const GuessTarget(super.gameId, this.address, this.drawingKey);
  final AtomAddress address;

  /// The previous atom's drawing reference, replayed while guessing.
  final String? drawingKey;
}

/// The player is not a participant in this started game (a watcher), or the
/// state is otherwise unresolved. The original logged "should never reach".
class UnknownTarget extends NavTarget {
  const UnknownTarget(super.gameId);
}

abstract class GameNavigation {
  /// Port of `isGameDone` (game-navigation-controller.ts:41-50): every thread's
  /// last atom is DONE.
  static bool isGameDone(Game game) {
    if (game.threads.isEmpty) return false;
    for (final thread in game.threads) {
      final last = thread.atoms[thread.atoms.length - 1];
      if (last.state != GameAtomState.done) return false;
    }
    return true;
  }

  /// Derives the navigation target for [uid] from a [game] snapshot.
  static NavTarget deriveTarget(Game game, String uid) {
    if (game.state == GameState.created) {
      return WaitingRoomTarget(game.id);
    }

    if (game.state == GameState.started && game.usersOrder.contains(uid)) {
      if (isGameDone(game)) {
        return GameResultsTarget(game.id);
      }

      final nextAtom = GameTurn.getNextAtom(game, uid);

      if (nextAtom.allAtomsDone) {
        return WaitGameToEndTarget(game.id);
      }

      if (!nextAtom.readyToPlay) {
        return WaitTurnTarget(game.id);
      }

      final address = nextAtom.address;
      if (address != null) {
        final thread = game.threads[address.threadIndex];
        final atom = thread.atoms[address.atomIndex];
        final previous =
            address.atomIndex > 0 ? thread.atoms[address.atomIndex - 1] : null;

        if (atom.type == GameAtomType.drawing) {
          final word =
              address.atomIndex == 0 ? thread.word : (previous?.guess ?? '');
          return DrawTarget(game.id, address, word);
        } else if (atom.type == GameAtomType.guess) {
          return GuessTarget(game.id, address, previous?.drawingRef);
        }
      }
    }

    return UnknownTarget(game.id);
  }
}
