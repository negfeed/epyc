import SwiftUI
import EpycCore

/// The home screen: shows the signed-in user, a button to start a new game, and a
/// list of recent games. Tapping a game (or creating one) enters it via the router.
struct HomeView: View {
    @EnvironmentObject private var di: DIContainer
    @EnvironmentObject private var auth: AuthService
    @EnvironmentObject private var router: AppRouter
    @StateObject private var viewModel = HomeViewModel()
    @State private var joinCode = ""

    private var trimmedJoinCode: String {
        joinCode.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        List {
            Section {
                header
            }

            Section {
                Button {
                    if let user = auth.user {
                        viewModel.newGame(games: di.games, router: router, creator: user)
                    }
                } label: {
                    Label("New Game", systemImage: "plus.circle.fill")
                }
                .disabled(viewModel.isCreatingGame || auth.user == nil)
            }

            Section("Join with Code") {
                TextField("Game code", text: $joinCode)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .onSubmit(joinByCode)
                Button(action: joinByCode) {
                    Label("Join Game", systemImage: "arrow.right.circle.fill")
                }
                .disabled(trimmedJoinCode.isEmpty)
            }

            Section("Recent Games") {
                if viewModel.recentGames.isEmpty {
                    Text("No recent games yet.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(viewModel.recentGames) { game in
                        Button {
                            router.enterGame(game.id)
                        } label: {
                            recentRow(game)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            if let errorMessage = viewModel.errorMessage {
                Section {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("EPYC")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Sign Out") {
                    viewModel.signOut(auth: auth)
                }
            }
        }
        .task {
            if let user = auth.user {
                await viewModel.refreshProfile(users: di.users, user: user)
            }
        }
        .task {
            let uid = auth.user?.uid ?? ""
            await viewModel.observeRecentGames(games: di.games, uid: uid)
        }
    }

    private func joinByCode() {
        let code = trimmedJoinCode
        guard !code.isEmpty else { return }
        joinCode = ""
        router.enterGame(code)
    }

    @ViewBuilder
    private var header: some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: auth.user?.photoURL ?? "")) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Image(systemName: "person.crop.circle.fill")
                    .resizable()
                    .foregroundStyle(.secondary)
            }
            .frame(width: 48, height: 48)
            .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(auth.user?.displayName ?? "Player")
                    .font(.headline)
                Text("Signed in")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func recentRow(_ game: Game) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Game \(game.id.prefix(6))")
                    .font(.body)
                Text(viewModel.relativeTime(forMs: game.createdAtMs))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
    }
}
