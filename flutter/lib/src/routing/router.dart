import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/game_host_screen.dart';
import '../features/home/home_screen.dart';
import '../features/login/login_screen.dart';
import '../features/results/thread_results_screen.dart';
import '../providers/providers.dart';
import 'routes.dart';

/// App router. A top-level [GoRouter.redirect] enforces auth: signed-out users
/// land on `/login`, signed-in users are kept out of it. The router refreshes
/// whenever auth state changes.
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier<int>(0);
  ref.onDispose(refresh.dispose);
  ref.listen(authStateProvider, (_, __) => refresh.value++);

  return GoRouter(
    initialLocation: AppRoutes.login,
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authStateProvider);
      // Don't redirect until the first auth value resolves.
      if (auth.isLoading) return null;

      final loggedIn = auth.valueOrNull != null;
      final loggingIn = state.matchedLocation == AppRoutes.login;

      if (!loggedIn) return loggingIn ? null : AppRoutes.login;
      if (loggingIn) return AppRoutes.home;
      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.home,
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: AppRoutes.gamePattern, // /game/:gameId
        builder: (context, state) =>
            GameHostScreen(gameId: state.pathParameters['gameId']!),
        routes: [
          GoRoute(
            path: 'thread/:threadIndex', // → /game/:gameId/thread/:threadIndex
            builder: (context, state) => ThreadResultsScreen(
              gameId: state.pathParameters['gameId']!,
              threadIndex: int.parse(state.pathParameters['threadIndex']!),
            ),
          ),
        ],
      ),
    ],
  );
});
