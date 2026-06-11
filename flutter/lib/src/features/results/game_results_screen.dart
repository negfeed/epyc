import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/game.dart';
import '../../providers/providers.dart';
import '../../routing/routes.dart';

/// Shows the list of threads (one per word) for a completed game.
///
/// Tapping a thread navigates to [ThreadResultsScreen]. The "Go back to home"
/// button pops the entire stack back to the home route.
class GameResultsScreen extends ConsumerWidget {
  const GameResultsScreen({super.key, required this.gameId});

  final String gameId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gameAsync = ref.watch(gameStreamProvider(gameId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Game Results'),
      ),
      body: gameAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Failed to load game results: $err',
              textAlign: TextAlign.center,
            ),
          ),
        ),
        data: (game) => _GameResultsBody(game: game, gameId: gameId),
      ),
    );
  }
}

class _GameResultsBody extends StatelessWidget {
  const _GameResultsBody({required this.game, required this.gameId});

  final Game game;
  final String gameId;

  String _capitalizeFirstLetter(String word) {
    if (word.isEmpty) return word;
    return word[0].toUpperCase() + word.substring(1);
  }

  @override
  Widget build(BuildContext context) {
    final threads = game.threads;

    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            itemCount: threads.length,
            itemBuilder: (context, i) {
              final word = _capitalizeFirstLetter(threads[i].word);
              return ListTile(
                title: Text(word),
                trailing: const Icon(Icons.chevron_right),
                onTap: () =>
                    context.push(AppRoutes.threadResults(gameId, i)),
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => context.go(AppRoutes.home),
              child: const Text('Go back to home'),
            ),
          ),
        ),
      ],
    );
  }
}
