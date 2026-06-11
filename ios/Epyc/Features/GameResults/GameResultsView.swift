import SwiftUI
import EpycCore

/// The final results overview: a list of every thread's starting word. Tapping a row
/// drills into that thread's full draw/guess chain.
struct GameResultsView: View {
    let gameId: String

    @EnvironmentObject private var di: DIContainer
    @EnvironmentObject private var router: AppRouter

    @StateObject private var vm = GameResultsViewModel()

    init(gameId: String) {
        self.gameId = gameId
    }

    var body: some View {
        List {
            ForEach(Array(vm.threads.enumerated()), id: \.offset) { index, thread in
                NavigationLink(value: Route.threadResults(gameId: gameId, threadIndex: index)) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(thread.word)
                            .font(.headline)
                        Text("Thread \(index + 1)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .task {
            vm.start(gameId: gameId, games: di.games)
        }
        .onDisappear {
            vm.stop()
        }
        .navigationTitle("Results")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Home") {
                    router.leaveGame()
                }
            }
        }
    }
}
