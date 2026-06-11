import SwiftUI
import EpycCore

/// Lobby for a game: lists joined players and watchers, lets people join/leave,
/// share an invite, and (for the host) start the game. The router observes game
/// state and pushes the next screen when play begins.
struct WaitingRoomView: View {
    @EnvironmentObject private var di: DIContainer
    @EnvironmentObject private var auth: AuthService
    @EnvironmentObject private var router: AppRouter
    @StateObject private var viewModel: WaitingRoomViewModel

    private let gameId: String

    init(gameId: String) {
        self.gameId = gameId
        _viewModel = StateObject(wrappedValue: WaitingRoomViewModel(gameId: gameId))
    }

    private var uid: String { auth.user?.uid ?? "" }
    // Universal Link invite. Opens the app once the domain hosts the
    // apple-app-site-association file AND the app has the associated-domains
    // entitlement (requires a paid Apple Developer account — see Epyc.entitlements).
    // Until then the link opens in Safari; the com.negfeed.epycnative:// custom scheme
    // (registered in Info.plist) remains the no-domain fallback that always opens the app.
    private var inviteURL: URL { URL(string: "https://epycnative.negfeed.com/game/\(gameId)")! }

    var body: some View {
        List {
            Section("Players") {
                if viewModel.joinedUsers.isEmpty {
                    Text("No players have joined yet.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(viewModel.joinedUsers) { user in
                        userRow(user)
                    }
                }
            }

            Section("Watching") {
                if viewModel.watchingUsers.isEmpty {
                    Text("No one is watching.")
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(viewModel.watchingUsers) { user in
                        userRow(user)
                    }
                }
            }

            Section("Invite") {
                HStack {
                    Text("Code")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(gameId)
                        .font(.callout.monospaced())
                        .textSelection(.enabled)
                }
                ShareLink(item: inviteURL) {
                    Label("Share link", systemImage: "square.and.arrow.up")
                }

                if !viewModel.isJoined(uid: uid) && !viewModel.isHost(uid: uid) {
                    Button {
                        viewModel.setJoined(games: di.games, uid: uid, joined: true)
                    } label: {
                        Label("Join", systemImage: "person.badge.plus")
                    }
                }

                if viewModel.isJoined(uid: uid) && !viewModel.isHost(uid: uid) {
                    Button(role: .destructive) {
                        viewModel.setJoined(games: di.games, uid: uid, joined: false)
                    } label: {
                        Label("Leave", systemImage: "person.badge.minus")
                    }
                }

                if viewModel.isHost(uid: uid) {
                    Button {
                        viewModel.startGame(games: di.games)
                    } label: {
                        Label("Start Game", systemImage: "play.fill")
                    }
                }
            }

            if let errorMessage = viewModel.errorMessage {
                Section {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("Waiting Room")
        .task {
            await viewModel.observe(games: di.games, user: auth.user)
        }
        .onAppear {
            router.observe(gameId: gameId, from: .waitingRoom)
        }
        .onDisappear {
            router.stopObserving(from: .waitingRoom)
        }
    }

    @ViewBuilder
    private func userRow(_ user: GameUser) -> some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: user.photoURL ?? "")) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Image(systemName: "person.crop.circle.fill")
                    .resizable()
                    .foregroundStyle(.secondary)
            }
            .frame(width: 36, height: 36)
            .clipShape(Circle())

            Text(user.displayName)

            Spacer()

            if viewModel.isHost(uid: user.uid) {
                Text("Host")
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.accentColor.opacity(0.15), in: Capsule())
                    .foregroundStyle(Color.accentColor)
            }
        }
    }
}
