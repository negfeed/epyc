import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../logic/game_navigation.dart';
import '../providers/providers.dart';
import 'draw/draw_screen.dart';
import 'guess/guess_screen.dart';
import 'results/game_results_screen.dart';
import 'wait_game_to_end/wait_game_to_end_screen.dart';
import 'wait_turn/wait_turn_screen.dart';
import 'waiting_room/waiting_room_screen.dart';

/// Hosts the reactive game state machine for a single game.
///
/// This is the Flutter equivalent of `GameNavigationController`
/// (`game-navigation-controller.ts`): it watches the live game document,
/// derives the [NavTarget] for the current user, and renders the matching
/// screen. As the game advances in Firestore, the target changes and the
/// correct screen is swapped in automatically — no imperative push/pop.
class GameHostScreen extends ConsumerWidget {
  const GameHostScreen({super.key, required this.gameId});

  final String gameId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Side effect ported from the original: when the user transitions away from
    // the waiting room (game started), record their join timestamp.
    ref.listen<NavTarget?>(navTargetProvider(gameId), (prev, next) {
      final uid = ref.read(currentUidProvider);
      if (uid != null &&
          prev is WaitingRoomTarget &&
          next != null &&
          next is! WaitingRoomTarget) {
        ref.read(userRepositoryProvider).insertJoinGame(uid, gameId);
      }
    });

    final gameAsync = ref.watch(gameStreamProvider(gameId));

    return gameAsync.when(
      loading: () => const _Loading(),
      error: (e, _) => _Error(message: '$e'),
      data: (_) {
        final target = ref.watch(navTargetProvider(gameId));
        return switch (target) {
          WaitingRoomTarget() =>
            WaitingRoomScreen(key: const ValueKey('waiting'), gameId: gameId),
          WaitTurnTarget() =>
            WaitTurnScreen(key: const ValueKey('wait-turn'), gameId: gameId),
          WaitGameToEndTarget() => WaitGameToEndScreen(
              key: const ValueKey('wait-end'), gameId: gameId),
          GameResultsTarget() =>
            GameResultsScreen(key: const ValueKey('results'), gameId: gameId),
          DrawTarget(:final address, :final word) => DrawScreen(
              // Key by atom so a new atom remounts, but the same atom keeps
              // its in-progress drawing state across game-snapshot rebuilds.
              key: ValueKey('draw-${address.threadIndex}-${address.atomIndex}'),
              gameId: gameId,
              address: address,
              word: word,
            ),
          GuessTarget(:final address, :final drawingKey) => GuessScreen(
              key: ValueKey('guess-${address.threadIndex}-${address.atomIndex}'),
              gameId: gameId,
              address: address,
              drawingKey: drawingKey,
            ),
          UnknownTarget() || null => const _Loading(),
        };
      },
    );
  }
}

class _Loading extends StatelessWidget {
  const _Loading();

  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: Center(child: CircularProgressIndicator()));
}

class _Error extends StatelessWidget {
  const _Error({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) =>
      Scaffold(body: Center(child: Text('Something went wrong.\n$message')));
}
