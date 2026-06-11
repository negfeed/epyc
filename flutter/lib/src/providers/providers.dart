import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../logic/game_navigation.dart';
import '../models/app_user.dart';
import '../models/drawing_event.dart';
import '../models/game.dart';
import '../services/auth/auth_repository.dart';
import '../services/firestore/drawing_repository.dart';
import '../services/firestore/game_repository.dart';
import '../services/firestore/user_repository.dart';

/// Central Riverpod wiring. Screens depend only on these providers.

// --- Infrastructure ---------------------------------------------------------

final firestoreProvider =
    Provider<FirebaseFirestore>((ref) => FirebaseFirestore.instance);

final firebaseAuthProvider =
    Provider<FirebaseAuth>((ref) => FirebaseAuth.instance);

// --- Repositories -----------------------------------------------------------

final authRepositoryProvider = Provider<AuthRepository>(
    (ref) => AuthRepository(ref.watch(firebaseAuthProvider)));

final gameRepositoryProvider = Provider<GameRepository>(
    (ref) => GameRepository(ref.watch(firestoreProvider)));

final userRepositoryProvider = Provider<UserRepository>(
    (ref) => UserRepository(ref.watch(firestoreProvider)));

final drawingRepositoryProvider = Provider<DrawingRepository>(
    (ref) => DrawingRepository(ref.watch(firestoreProvider)));

// --- Auth state -------------------------------------------------------------

/// Streams the signed-in user (null when signed out).
final authStateProvider = StreamProvider<AuthUserInfo?>(
    (ref) => ref.watch(authRepositoryProvider).authStateChanges());

/// Convenience: the current user info, or null.
final currentUserProvider = Provider<AuthUserInfo?>(
    (ref) => ref.watch(authStateProvider).valueOrNull);

/// Convenience: the current uid, or null.
final currentUidProvider =
    Provider<String?>((ref) => ref.watch(currentUserProvider)?.uid);

// --- Game streams -----------------------------------------------------------

/// Live game document, keyed by gameId.
final gameStreamProvider = StreamProvider.family<Game, String>(
    (ref, gameId) => ref.watch(gameRepositoryProvider).watch(gameId));

/// The derived navigation target for the current user in a given game.
/// Mirrors `GameNavigationController.getNavigationTargetFromGameState`.
final navTargetProvider = Provider.family<NavTarget?, String>((ref, gameId) {
  final game = ref.watch(gameStreamProvider(gameId)).valueOrNull;
  final uid = ref.watch(currentUidProvider);
  if (game == null || uid == null) return null;
  return GameNavigation.deriveTarget(game, uid);
});

/// The current user's last 3 joined games (for Home).
final lastFewGamesProvider = StreamProvider<List<UserGameRef>>((ref) {
  final uid = ref.watch(currentUidProvider);
  if (uid == null) return const Stream.empty();
  return ref.watch(userRepositoryProvider).watchLastFewGames(uid);
});

/// Live drawing events for a drawing id (replay).
final drawingEventsProvider =
    StreamProvider.family<List<DrawingEvent>, String>(
        (ref, drawingId) =>
            ref.watch(drawingRepositoryProvider).watchEvents(drawingId));
