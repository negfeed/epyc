import SwiftUI
import EpycCore

/// Shown while the player has no playable atom yet but the game is not finished —
/// the router will push the next screen automatically once the state changes.
struct WaitTurnView: View {
    let gameId: String

    @EnvironmentObject private var di: DIContainer
    @EnvironmentObject private var auth: AuthService
    @EnvironmentObject private var router: AppRouter

    @StateObject private var vm = WaitTurnViewModel()

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 12) {
                ProgressView()
                    .progressViewStyle(.circular)
                Text("Waiting for your turn…")
                    .font(.headline)
            }
            .padding(.top, 24)

            if vm.trackedAtoms.isEmpty {
                Spacer()
            } else {
                List {
                    Section {
                        ForEach(Array(vm.trackedAtoms.enumerated()), id: \.offset) { index, atom in
                            HStack {
                                Text("\(index + 1).")
                                    .foregroundStyle(.secondary)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(atom.type.label)
                                        .font(.body)
                                    Text(vm.displayName(forAuthor: atom.authorUid))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(atom.state.label)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
        .task {
            vm.start(gameId: gameId, games: di.games, auth: auth)
        }
        .onAppear {
            router.observe(gameId: gameId, from: .waitTurn)
        }
        .onDisappear {
            router.stopObserving(from: .waitTurn)
            vm.stop()
        }
        .navigationTitle("Your Turn Soon")
        .navigationBarTitleDisplayMode(.inline)
    }
}
