import SwiftUI
import EpycCore

/// Shown once the player has completed all of their atoms — it waits for the rest of
/// the players to finish, displaying per-thread progress. The router pushes results
/// automatically when the game finishes.
struct WaitGameToEndView: View {
    let gameId: String

    @EnvironmentObject private var di: DIContainer
    @EnvironmentObject private var router: AppRouter

    @StateObject private var vm = WaitGameToEndViewModel()

    init(gameId: String) {
        self.gameId = gameId
    }

    var body: some View {
        VStack(spacing: 24) {
            Text("Waiting for everyone to finish.")
                .font(.headline)
                .padding(.top, 24)

            List {
                ForEach(Array(vm.threads.enumerated()), id: \.offset) { index, thread in
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Thread \(index + 1): \(vm.doneCount(for: thread))/\(vm.totalCount(for: thread))")
                            .font(.subheadline)
                        ProgressView(value: vm.progress(for: thread))
                    }
                    .padding(.vertical, 4)
                }
            }
            .listStyle(.insetGrouped)
        }
        .task {
            vm.start(gameId: gameId, games: di.games)
        }
        .onAppear {
            router.observe(gameId: gameId, from: .waitGameToEnd)
        }
        .onDisappear {
            router.stopObserving(from: .waitGameToEnd)
            vm.stop()
        }
        .navigationTitle("Almost Done")
        .navigationBarTitleDisplayMode(.inline)
    }
}
