import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../models/enums.dart';
import '../../models/game.dart';
import '../../providers/providers.dart';
import '../../routing/leave_game.dart';
import '../../routing/routes.dart';
import '../../theme/app_theme.dart';

/// Waiting Room screen — users gather here before the creator starts the game.
///
/// Mirrors the behaviour of `src/pages/waiting-room/waiting-room.ts` and
/// `waiting-room.html`.
class WaitingRoomScreen extends ConsumerWidget {
  const WaitingRoomScreen({super.key, required this.gameId});

  final String gameId;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  Future<void> _onLeavePressed(BuildContext context) async {
    final confirmed = await confirmLeaveGame(context);
    if (confirmed && context.mounted) {
      context.go(AppRoutes.home);
    }
  }

  Future<void> _doShare(String? code) async {
    final text = code != null
        ? 'Hey, wanna join me for an EPYC game? Open EPYC, tap '
            '"Join with code", and enter:  $code'
        : 'Hey, wanna join me for an EPYC game?';
    await SharePlus.instance.share(
      ShareParams(text: text, subject: 'EPYC game invitation!'),
    );
  }

  Future<void> _doStart(WidgetRef ref) async {
    await ref.read(gameRepositoryProvider).start(gameId);
    // The stream will update game.state; the router / host screen reacts
    // automatically — no manual navigation needed here.
  }

  Future<void> _doJoin(WidgetRef ref, String uid, String? displayName,
      String? photoURL) async {
    await ref.read(gameRepositoryProvider).upsertGameUser(
          gameId,
          GameUser(
            uid: uid,
            displayName: displayName,
            photoURL: photoURL,
            joined: true,
          ),
        );
  }

  Future<void> _doLeaveGame(WidgetRef ref, String uid, String? displayName,
      String? photoURL) async {
    await ref.read(gameRepositoryProvider).upsertGameUser(
          gameId,
          GameUser(
            uid: uid,
            displayName: displayName,
            photoURL: photoURL,
            joined: false,
          ),
        );
  }

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gameAsync = ref.watch(gameStreamProvider(gameId));
    final currentUser = ref.watch(currentUserProvider);
    final currentUid = currentUser?.uid;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Waiting Room'),
        leading: BackButton(
          onPressed: () => _onLeavePressed(context),
        ),
      ),
      body: gameAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Error loading game: $error',
              style: const TextStyle(color: AppColors.danger),
              textAlign: TextAlign.center,
            ),
          ),
        ),
        data: (game) => _WaitingRoomBody(
          game: game,
          currentUid: currentUid,
          currentDisplayName: currentUser?.displayName,
          currentPhotoURL: currentUser?.photoURL,
          onShare: () => _doShare(game.code),
          onStart: () => _doStart(ref),
          onJoin: () => _doJoin(
            ref,
            currentUid!,
            currentUser?.displayName,
            currentUser?.photoURL,
          ),
          onLeaveGame: () => _doLeaveGame(
            ref,
            currentUid!,
            currentUser?.displayName,
            currentUser?.photoURL,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Body widget — extracted so the data path is visually clean.
// ---------------------------------------------------------------------------

class _WaitingRoomBody extends StatelessWidget {
  const _WaitingRoomBody({
    required this.game,
    required this.currentUid,
    required this.currentDisplayName,
    required this.currentPhotoURL,
    required this.onShare,
    required this.onStart,
    required this.onJoin,
    required this.onLeaveGame,
  });

  final Game game;
  final String? currentUid;
  final String? currentDisplayName;
  final String? currentPhotoURL;
  final VoidCallback onShare;
  final VoidCallback onStart;
  final VoidCallback onJoin;
  final VoidCallback onLeaveGame;

  bool get _isJoinable => game.state == GameState.created;
  bool get _isHost => currentUid != null && currentUid == game.creator;
  bool get _isJoined =>
      currentUid != null &&
      game.users.containsKey(currentUid) &&
      game.users[currentUid]!.joined;

  /// canJoin: not yet joined, not the host, and game is still open.
  bool get _canJoin => !_isJoined && !_isHost && _isJoinable;

  /// canLeave (the game, not the page): joined, not the host, game is open.
  bool get _canLeaveGame => _isJoined && !_isHost && _isJoinable;

  List<GameUser> get _joinedUsers =>
      game.users.values.where((u) => u.joined).toList();

  List<GameUser> get _watchingUsers =>
      game.users.values.where((u) => !u.joined).toList();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ---- Join code ---------------------------------------------------
          if (game.code != null) ...[
            _JoinCodeCard(code: game.code!),
            const SizedBox(height: 16),
          ],

          // ---- Joined list ------------------------------------------------
          _UserSection(
            title: 'Joined (${_joinedUsers.length})',
            users: _joinedUsers,
            creatorUid: game.creator,
          ),
          const SizedBox(height: 16),

          // ---- Watching list -----------------------------------------------
          _UserSection(
            title: 'Watching (${_watchingUsers.length})',
            users: _watchingUsers,
            creatorUid: game.creator,
          ),
          const SizedBox(height: 24),

          // ---- Action buttons ----------------------------------------------
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _isJoinable ? onShare : null,
              child: const Text('Share'),
            ),
          ),
          if (_isHost && _isJoinable) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.secondary,
                ),
                onPressed: onStart,
                child: const Text('Start Game'),
              ),
            ),
          ],
          if (_canJoin) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: onJoin,
                child: const Text('Join Game'),
              ),
            ),
          ],
          if (_canLeaveGame) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.danger,
                ),
                onPressed: onLeaveGame,
                child: const Text('Leave Game'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Join-code card with copy-to-clipboard.
// ---------------------------------------------------------------------------

class _JoinCodeCard extends StatelessWidget {
  const _JoinCodeCard({required this.code});

  final String code;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.primary.withValues(alpha: 0.08),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          children: [
            Text(
              'JOIN CODE',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: AppColors.primary,
                    letterSpacing: 1.5,
                    fontWeight: FontWeight.bold,
                  ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(width: 40), // balances the copy button
                SelectableText(
                  code,
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 6,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.copy, size: 20),
                  tooltip: 'Copy code',
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: code));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Code copied')),
                    );
                  },
                ),
              ],
            ),
            Text(
              'Share this code so others can join.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Reusable user-list section.
// ---------------------------------------------------------------------------

class _UserSection extends StatelessWidget {
  const _UserSection({
    required this.title,
    required this.users,
    required this.creatorUid,
  });

  final String title;
  final List<GameUser> users;
  final String creatorUid;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                ),
          ),
        ),
        if (users.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 4),
            child: Text(
              'Nobody here yet.',
              style: TextStyle(fontStyle: FontStyle.italic),
            ),
          )
        else
          ...users.map((user) => _UserTile(user: user, creatorUid: creatorUid)),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Single user row.
// ---------------------------------------------------------------------------

class _UserTile extends StatelessWidget {
  const _UserTile({required this.user, required this.creatorUid});

  final GameUser user;
  final String creatorUid;

  bool get _isHost => user.uid == creatorUid;

  @override
  Widget build(BuildContext context) {
    final photoURL = user.photoURL;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        backgroundImage:
            photoURL != null && photoURL.isNotEmpty ? NetworkImage(photoURL) : null,
        backgroundColor: AppColors.primary.withValues(alpha: 0.15),
        child: photoURL == null || photoURL.isEmpty
            ? const Icon(Icons.person, color: AppColors.primary)
            : null,
      ),
      title: Text(user.displayName ?? '(anonymous)'),
      trailing: _isHost
          ? const Text(
              'host',
              style: TextStyle(
                color: AppColors.primary,
                fontStyle: FontStyle.italic,
              ),
            )
          : null,
    );
  }
}
