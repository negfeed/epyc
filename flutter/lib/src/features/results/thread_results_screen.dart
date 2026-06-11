import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../drawing/replaying_drawing_pad.dart';
import '../../models/enums.dart';
import '../../models/game.dart';
import '../../providers/providers.dart';

/// Shows the full replay of a single thread: the original word (attributed to
/// "Mr. Robot"), followed by every atom in sequence — drawings replay via
/// [ReplayingDrawingPad] and guesses are shown as text, each with the author's
/// name and avatar.
class ThreadResultsScreen extends ConsumerWidget {
  const ThreadResultsScreen({
    super.key,
    required this.gameId,
    required this.threadIndex,
  });

  final String gameId;
  final int threadIndex;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gameAsync = ref.watch(gameStreamProvider(gameId));

    return Scaffold(
      appBar: AppBar(
        // Back button is provided automatically for pushed routes.
        title: const Text('Thread Results'),
      ),
      body: gameAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Failed to load thread results: $err',
              textAlign: TextAlign.center,
            ),
          ),
        ),
        data: (game) {
          if (threadIndex < 0 || threadIndex >= game.threads.length) {
            return const Center(child: Text('Thread not found.'));
          }
          return _ThreadResultsBody(
            game: game,
            thread: game.threads[threadIndex],
          );
        },
      ),
    );
  }
}

class _ThreadResultsBody extends ConsumerWidget {
  const _ThreadResultsBody({required this.game, required this.thread});

  final Game game;
  final GameThread thread;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 8),
      children: [
        // ── Word card attributed to Mr. Robot ──────────────────────────────
        _AtomCard(
          avatarWidget: ClipOval(
            child: Image.asset(
              'assets/img/robot.png',
              width: 40,
              height: 40,
              fit: BoxFit.cover,
            ),
          ),
          authorLine: 'Mr. Robot selected the word',
          content: Text(
            thread.word,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w500),
          ),
        ),

        // ── Atom cards ────────────────────────────────────────────────────
        for (final atom in thread.atoms)
          _AtomCardForAtom(atom: atom, game: game),
      ],
    );
  }
}

/// Renders a single atom card, delegating drawing replay to [ReplayingDrawingPad].
class _AtomCardForAtom extends ConsumerWidget {
  const _AtomCardForAtom({
    required this.atom,
    required this.game,
  });

  final GameAtom atom;
  final Game game;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authorUid = atom.authorUid;
    final gameUser = authorUid != null ? game.users[authorUid] : null;
    final displayName = gameUser?.displayName ?? 'Unknown';
    final photoURL = gameUser?.photoURL;

    final Widget avatarWidget = photoURL != null
        ? ClipOval(
            child: Image.network(
              photoURL,
              width: 40,
              height: 40,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => _InitialAvatar(name: displayName),
            ),
          )
        : _InitialAvatar(name: displayName);

    final String actionLabel;
    final Widget contentWidget;

    if (atom.type == GameAtomType.drawing) {
      actionLabel = '$displayName drew';
      final drawingRef = atom.drawingRef;
      if (drawingRef != null) {
        final eventsAsync = ref.watch(drawingEventsProvider(drawingRef));
        final events = eventsAsync.valueOrNull ?? const [];
        contentWidget = AspectRatio(
          aspectRatio: 1,
          child: ReplayingDrawingPad(
            events: events,
            autoPlay: true,
            showProgressBar: true,
          ),
        );
      } else {
        contentWidget = const SizedBox(
          height: 80,
          child: Center(child: Text('Drawing unavailable')),
        );
      }
    } else {
      // GameAtomType.guess
      actionLabel = '$displayName guessed';
      contentWidget = Text(
        atom.guess ?? '',
        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w500),
      );
    }

    return _AtomCard(
      avatarWidget: avatarWidget,
      authorLine: actionLabel,
      content: contentWidget,
    );
  }
}

/// Generic card layout used for both the word card and atom cards.
class _AtomCard extends StatelessWidget {
  const _AtomCard({
    required this.avatarWidget,
    required this.authorLine,
    required this.content,
  });

  final Widget avatarWidget;
  final String authorLine;
  final Widget content;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ListTile(
            leading: SizedBox(width: 40, height: 40, child: avatarWidget),
            title: Text(authorLine),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: content,
          ),
        ],
      ),
    );
  }
}

/// Fallback circular avatar showing the first letter of [name].
class _InitialAvatar extends StatelessWidget {
  const _InitialAvatar({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: 20,
      child: Text(
        name.isNotEmpty ? name[0].toUpperCase() : '?',
        style: const TextStyle(fontWeight: FontWeight.bold),
      ),
    );
  }
}
