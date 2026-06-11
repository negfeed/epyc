import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/app_user.dart';
import '../../providers/providers.dart';
import '../../routing/routes.dart';

/// Home screen — mirrors `HomePage` from `src/pages/home/home.ts`.
///
/// On entry it calls `userRepository.checkIn(uid)` (mirrors `ionViewDidEnter`).
/// Shows a greeting, the last few games, and a "New Game" button.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  bool _creatingGame = false;

  @override
  void initState() {
    super.initState();
    // Run after the first frame so that providers are fully ready.
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkIn());
  }

  Future<void> _checkIn() async {
    final uid = ref.read(currentUidProvider);
    if (uid == null) return;
    try {
      await ref.read(userRepositoryProvider).checkIn(uid);
    } catch (_) {
      // Non-fatal — silently swallow check-in failures.
    }
  }

  Future<void> _createNewGame() async {
    final currentUser = ref.read(currentUserProvider);
    if (currentUser == null) return;
    setState(() => _creatingGame = true);
    try {
      final id =
          await ref.read(gameRepositoryProvider).createInstance(currentUser);
      if (mounted) context.go(AppRoutes.game(id));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not create game: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _creatingGame = false);
    }
  }

  void _goToGame(String gameId) => context.go(AppRoutes.game(gameId));

  Future<void> _joinWithCode() async {
    final controller = TextEditingController();
    final entered = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Join with code'),
        content: TextField(
          controller: controller,
          autofocus: true,
          textCapitalization: TextCapitalization.characters,
          maxLength: 6,
          decoration: const InputDecoration(
            hintText: 'Enter game code',
            counterText: '',
          ),
          onSubmitted: (value) => Navigator.of(dialogContext).pop(value),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(controller.text),
            child: const Text('Join'),
          ),
        ],
      ),
    );
    controller.dispose();

    final code = entered?.trim() ?? '';
    if (code.isEmpty) return;
    try {
      final gameId =
          await ref.read(gameRepositoryProvider).findGameIdByCode(code);
      if (!mounted) return;
      if (gameId == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No joinable game found for that code.')),
        );
        return;
      }
      context.go(AppRoutes.game(gameId));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not join: $e')),
        );
      }
    }
  }

  Future<void> _signOut() async {
    try {
      await ref.read(authRepositoryProvider).signOut();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sign out failed: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = ref.watch(currentUserProvider);
    final gamesAsync = ref.watch(lastFewGamesProvider);

    final label = currentUser?.label ?? 'Player';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: _signOut,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // --- Profile card ---
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: Theme.of(context).colorScheme.primary,
                        foregroundImage: currentUser?.photoURL != null
                            ? NetworkImage(currentUser!.photoURL!)
                            : null,
                        child: Text(
                          currentUser?.initial ?? '?',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Hello $label!',
                          style: Theme.of(context).textTheme.headlineSmall,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // --- Last few games ---
          Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: Text(
                    'Last Few Games',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
                gamesAsync.when(
                  loading: () => const Padding(
                    padding: EdgeInsets.all(16),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  error: (err, _) => Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'Could not load games: $err',
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.error),
                    ),
                  ),
                  data: (games) {
                    if (games.isEmpty) {
                      return const Padding(
                        padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
                        child: Text('No games yet. Start one below!'),
                      );
                    }
                    return Column(
                      children: [
                        ...games.map((game) => _GameTile(
                              game: game,
                              onTap: () => _goToGame(game.gameId),
                            )),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // --- New Game button ---
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _creatingGame ? null : _createNewGame,
              child: _creatingGame
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('New Game'),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _joinWithCode,
              icon: const Icon(Icons.tag),
              label: const Text('Join with code'),
            ),
          ),
        ],
      ),
    );
  }
}

/// A tappable list tile for a single game entry.
class _GameTile extends StatelessWidget {
  const _GameTile({required this.game, required this.onTap});

  final UserGameRef game;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final joinDate =
        DateTime.fromMillisecondsSinceEpoch(game.joinTimestampMs);
    // Format mirrors the original: y/M/d h:mm a
    final label =
        '${joinDate.year}/${joinDate.month}/${joinDate.day} '
        '${_hour12(joinDate)}:${_twoDigit(joinDate.minute)} '
        '${joinDate.hour < 12 ? 'AM' : 'PM'}';

    return ListTile(
      title: Text(label),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }

  int _hour12(DateTime dt) {
    final h = dt.hour % 12;
    return h == 0 ? 12 : h;
  }

  String _twoDigit(int n) => n.toString().padLeft(2, '0');
}
