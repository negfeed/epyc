/// Centralized route paths. The `/game/:gameId` route hosts the reactive
/// game state machine (see `GameHostScreen`); thread results are a nested push.
abstract class AppRoutes {
  static const login = '/login';
  static const home = '/';

  /// Path pattern for go_router definitions.
  static const gamePattern = '/game/:gameId';
  static const threadResultsPattern = '/game/:gameId/thread/:threadIndex';

  /// Builders for navigation.
  static String game(String gameId) => '/game/$gameId';
  static String threadResults(String gameId, int threadIndex) =>
      '/game/$gameId/thread/$threadIndex';
}
