import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';

import '../../logic/game_turn.dart';
import '../../logic/words.dart';
import '../../models/app_user.dart';
import '../../models/enums.dart';
import '../../models/game.dart';

/// Firestore-backed port of `src/providers/game-model/game-model.ts`.
///
/// Schema: `games/{gameId}` documents (see MIGRATION_PLAN.md §3). Atom updates
/// run in a transaction because Firestore cannot patch an array element by
/// index (unlike the original RTDB path update).
class GameRepository {
  GameRepository(this._db, {Words? words, Random? random})
      : _words = words ?? Words(),
        _random = random ?? Random();

  final FirebaseFirestore _db;
  final Words _words;
  final Random _random;

  CollectionReference<Map<String, dynamic>> get _games =>
      _db.collection('games');

  /// Alphabet for join codes — omits visually ambiguous characters
  /// (no I/L/O/0/1) so codes are easy to read aloud and type.
  static const String _codeAlphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  static const int _codeLength = 6;

  String _generateCode() => List.generate(
        _codeLength,
        (_) => _codeAlphabet[_random.nextInt(_codeAlphabet.length)],
      ).join();

  /// Port of `createInstance` (game-model.ts:111-128). Creates a CREATED game
  /// with the creator auto-joined and a short join code, returns the game id.
  Future<String> createInstance(AuthUserInfo creator) async {
    final ref = _games.doc();
    final game = Game(
      id: ref.id,
      state: GameState.created,
      creator: creator.uid,
      creationTimestampMs: DateTime.now().millisecondsSinceEpoch,
      code: _generateCode(),
      users: {
        creator.uid: GameUser(
          uid: creator.uid,
          displayName: creator.displayName,
          photoURL: creator.photoURL,
          joined: true,
        ),
      },
    );
    await ref.set(game.toMap());
    return ref.id;
  }

  /// Looks up a game id by its join [code] (case-insensitive). Returns null if
  /// no game matches. Only joinable (CREATED) games are considered.
  Future<String?> findGameIdByCode(String code) async {
    final normalized = code.trim().toUpperCase();
    if (normalized.isEmpty) return null;
    // Single-field equality (auto-indexed); state is checked client-side to
    // avoid needing a composite index.
    final query =
        await _games.where('code', isEqualTo: normalized).limit(1).get();
    if (query.docs.isEmpty) return null;
    final doc = query.docs.first;
    final state = (doc.data()['state'] as num?)?.toInt();
    if (state != GameState.created.value) return null; // not joinable anymore
    return doc.id;
  }

  /// Streams a live game document. Port of `loadInstance`.
  Stream<Game> watch(String gameId) => _games.doc(gameId).snapshots().map(
        (snap) => Game.fromMap(snap.id, snap.data() ?? const {}),
      );

  Future<Game> get(String gameId) async {
    final snap = await _games.doc(gameId).get();
    return Game.fromMap(snap.id, snap.data() ?? const {});
  }

  /// Port of `upsertGameUser` (game-model.ts:188-195). Merges a user entry into
  /// the `users` map (used by join/leave).
  Future<void> upsertGameUser(String gameId, GameUser user) =>
      _games.doc(gameId).set(
        {
          'users': {user.uid: user.toMap()},
        },
        SetOptions(merge: true),
      );

  /// Port of `start` (game-model.ts:170-186). Collects joined users, shuffles
  /// them, then writes STARTED + usersOrder + empty threads.
  Future<void> start(String gameId) async {
    final game = await get(gameId);
    final order = <String>[
      for (final entry in game.users.entries)
        if (entry.value.joined) entry.key,
    ];
    GameTurn.shuffleUsers(order, nextInt: _random.nextInt);
    await _games.doc(gameId).update({
      'state': GameState.started.value,
      'usersOrder': order,
      'playerCount': order.length,
      'threads':
          GameTurn.buildEmptyThreads(order.length, _words).map((t) => t.toMap()).toList(),
    });
  }

  /// Port of `upsertAtom` (game-model.ts:258-261). Merges the supplied fields
  /// into the atom at [address]. Runs in a transaction to safely mutate the
  /// nested threads array.
  Future<void> updateAtom(
    String gameId,
    AtomAddress address, {
    GameAtomState? state,
    String? drawingRef,
    String? guess,
    String? authorUid,
  }) async {
    final ref = _games.doc(gameId);
    await _db.runTransaction((tx) async {
      final snap = await tx.get(ref);
      final game = Game.fromMap(snap.id, snap.data() ?? const {});
      final threads = [...game.threads];
      final thread = threads[address.threadIndex];
      final atoms = [...thread.atoms];
      atoms[address.atomIndex] = atoms[address.atomIndex].copyWith(
        state: state,
        drawingRef: drawingRef,
        guess: guess,
        authorUid: authorUid,
      );
      threads[address.threadIndex] = thread.copyWith(atoms: atoms);
      tx.update(ref, {
        'threads': threads.map((t) => t.toMap()).toList(),
      });
    });
  }
}
