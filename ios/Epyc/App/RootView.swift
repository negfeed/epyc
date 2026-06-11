import SwiftUI

/// Auth gate + the single NavigationStack that the router drives. The
/// `navigationDestination` switch is the canonical screen contract: each feature
/// View is constructed here with its parameters.
struct RootView: View {
    @EnvironmentObject private var auth: AuthService
    @EnvironmentObject private var router: AppRouter

    var body: some View {
        Group {
            if auth.isSignedIn {
                NavigationStack(path: $router.path) {
                    HomeView()
                        .navigationDestination(for: Route.self) { route in
                            destination(for: route)
                        }
                }
            } else {
                LoginView()
            }
        }
        .animation(.default, value: auth.isSignedIn)
    }

    @ViewBuilder
    private func destination(for route: Route) -> some View {
        switch route {
        case let .waitingRoom(gameId):
            WaitingRoomView(gameId: gameId)
        case let .draw(gameId, threadIndex, atomIndex, word):
            DrawView(gameId: gameId, threadIndex: threadIndex, atomIndex: atomIndex, word: word)
        case let .guess(gameId, threadIndex, atomIndex, drawingKey):
            GuessView(gameId: gameId, threadIndex: threadIndex, atomIndex: atomIndex, drawingKey: drawingKey)
        case let .waitTurn(gameId):
            WaitTurnView(gameId: gameId)
        case let .waitGameToEnd(gameId):
            WaitGameToEndView(gameId: gameId)
        case let .gameResults(gameId):
            GameResultsView(gameId: gameId)
        case let .threadResults(gameId, threadIndex):
            ThreadResultsView(gameId: gameId, threadIndex: threadIndex)
        }
    }
}
