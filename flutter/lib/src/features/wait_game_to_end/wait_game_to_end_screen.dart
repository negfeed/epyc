import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/enums.dart';
import '../../providers/providers.dart';
import '../../routing/leave_game.dart';
import '../../routing/routes.dart';

/// Waiting screen shown when the current player has completed all their turns
/// but other players are still playing.
///
/// Mirrors the behaviour of `WaitGameToEndPage`
/// (wait-game-to-end.ts / wait-game-to-end.html).
/// Lists every thread as "Thread {N}: {completed} out of {total} turns
/// completed."
class WaitGameToEndScreen extends ConsumerWidget {
  const WaitGameToEndScreen({super.key, required this.gameId});

  final String gameId;

  Future<void> _onLeave(BuildContext context) async {
    final confirmed = await confirmLeaveGame(context);
    if (confirmed && context.mounted) {
      context.go(AppRoutes.home);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gameAsync = ref.watch(gameStreamProvider(gameId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Waiting for game to end'),
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
          final threads = game.threads;

          return ListView(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: Text(
                  'Waiting for others to complete their turns.',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ),
              ...List.generate(threads.length, (index) {
                final thread = threads[index];
                final threadNumber = index + 1;
                final totalStepsCount = thread.atoms.length;
                final completedStepsCount = thread.atoms
                    .where((atom) => atom.state == GameAtomState.done)
                    .length;

                return ListTile(
                  title: Text('Thread $threadNumber'),
                  subtitle: Text(
                    '$completedStepsCount out of $totalStepsCount turns completed.',
                  ),
                );
              }),
            ],
          );
        },
      ),
    );
  }
}
