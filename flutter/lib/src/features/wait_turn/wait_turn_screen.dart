import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../logic/game_turn.dart';
import '../../models/enums.dart';
import '../../models/game.dart';
import '../../providers/providers.dart';
import '../../routing/leave_game.dart';
import '../../routing/routes.dart';

/// Waiting screen shown when a player's turn in the current thread has not
/// arrived yet (the previous player is still drawing or guessing).
///
/// Mirrors the behaviour of `WaitTurnPage` (wait-turn.ts / wait-turn.html).
/// Shows a header "Waiting for your turn" and a per-atom status list for the
/// thread the current player is waiting on.
class WaitTurnScreen extends ConsumerWidget {
  const WaitTurnScreen({super.key, required this.gameId});

  final String gameId;

  // Maps a [GameAtomState] (plus the special "turn to play" case) to a human-
  // readable label and an icon, matching the original Ionic template exactly.
  static _StepDisplay _displayForState(_DisplayStepState state) {
    switch (state) {
      case _DisplayStepState.done:
        return const _StepDisplay(
          label: 'Done',
          icon: Icons.check_box_outlined,
        );
      case _DisplayStepState.turnToPlay:
        return const _StepDisplay(
          label: 'Turn to Play ...',
          icon: Icons.pause_circle_outline,
        );
      case _DisplayStepState.started:
        return const _StepDisplay(
          label: 'In Progress ...',
          icon: Icons.play_circle_outline,
        );
      case _DisplayStepState.notStarted:
        return const _StepDisplay(
          label: 'Not Started',
          icon: Icons.check_box_outline_blank,
        );
    }
  }

  Future<void> _onLeave(BuildContext context) async {
    final confirmed = await confirmLeaveGame(context);
    if (confirmed && context.mounted) {
      context.go(AppRoutes.home);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gameAsync = ref.watch(gameStreamProvider(gameId));
    final uid = ref.watch(currentUidProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Waiting for your turn'),
        leading: BackButton(
          onPressed: () => _onLeave(context),
        ),
      ),
      body: gameAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Text(
            'Error loading game: $err',
            textAlign: TextAlign.center,
          ),
        ),
        data: (game) {
          if (uid == null) {
            return const Center(child: Text('Not signed in.'));
          }

          final nextAtom = GameTurn.getNextAtom(game, uid);

          // If allAtomsDone there is nothing to wait for — this should not
          // happen in normal flow (the host screen would have navigated away),
          // but handle it gracefully.
          if (nextAtom.allAtomsDone || nextAtom.address == null) {
            return const Center(
              child: Text('All done! Waiting for the game to catch up…'),
            );
          }

          final threadIndex = nextAtom.address!.threadIndex;
          final threadNumber = threadIndex + 1;
          final thread = game.threads[threadIndex];

          final steps = _buildSteps(game, thread, threadIndex);

          return ListView(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: Text(
                  'Thread $threadNumber',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ),
              ...steps.asMap().entries.map((entry) {
                final index = entry.key;
                final step = entry.value;
                final display = _displayForState(step.state);

                // Determine the player uid for this atom.
                final playerIndex = GameTurn.atomPlayerIndex(
                  AtomAddress(
                    threadIndex: threadIndex,
                    atomIndex: index,
                  ),
                  game.usersOrder.length,
                );
                final playerUid = playerIndex < game.usersOrder.length
                    ? game.usersOrder[playerIndex]
                    : null;
                final player =
                    playerUid != null ? game.users[playerUid] : null;

                return ListTile(
                  leading: player?.photoURL != null
                      ? CircleAvatar(
                          backgroundImage:
                              NetworkImage(player!.photoURL!),
                        )
                      : CircleAvatar(
                          child: Text(
                            (player?.displayName?.isNotEmpty == true
                                    ? player!.displayName![0]
                                    : '?')
                                .toUpperCase(),
                          ),
                        ),
                  title: Text(player?.displayName ?? 'Unknown'),
                  subtitle: Text(display.label),
                  trailing: Icon(display.icon),
                );
              }),
            ],
          );
        },
      ),
    );
  }

  /// Converts each [GameAtom] in [thread] into a [_DisplayStep], replicating
  /// the state-mapping logic from wait-turn.ts lines 74-88.
  ///
  /// The "Turn to Play" state is a special case: the atom is STARTED but its
  /// predecessor (index > 1) is DONE, meaning the current player has just been
  /// handed the baton. (The original code checks `index > 1` — preserved here.)
  List<_DisplayStep> _buildSteps(
      Game game, GameThread thread, int threadIndex) {
    final steps = <_DisplayStep>[];
    for (var index = 0; index < thread.atoms.length; index++) {
      final atom = thread.atoms[index];
      _DisplayStepState state;

      switch (atom.state) {
        case GameAtomState.notStarted:
          state = _DisplayStepState.notStarted;
          break;
        case GameAtomState.started:
          // Mirror original: "Turn to Play" when predecessor is done and
          // index > 1 (the original code uses index > 1, preserving that).
          if (index > 1 &&
              thread.atoms[index - 1].state == GameAtomState.done) {
            state = _DisplayStepState.turnToPlay;
          } else {
            state = _DisplayStepState.started;
          }
          break;
        case GameAtomState.done:
          state = _DisplayStepState.done;
          break;
      }

      steps.add(_DisplayStep(state: state));
    }
    return steps;
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

enum _DisplayStepState {
  notStarted,
  turnToPlay,
  started,
  done,
}

class _DisplayStep {
  const _DisplayStep({required this.state});
  final _DisplayStepState state;
}

class _StepDisplay {
  const _StepDisplay({required this.label, required this.icon});
  final String label;
  final IconData icon;
}
