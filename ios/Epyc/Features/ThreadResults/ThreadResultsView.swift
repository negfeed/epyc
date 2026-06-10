import SwiftUI
import EpycCore

/// Renders one thread's full chain: the starting word, then each atom in order — a
/// replayed drawing or a guess — each attributed to its author.
struct ThreadResultsView: View {
    let gameId: String
    let threadIndex: Int

    @EnvironmentObject private var di: DIContainer
    @EnvironmentObject private var router: AppRouter

    @StateObject private var vm = ThreadResultsViewModel()

    init(gameId: String, threadIndex: Int) {
        self.gameId = gameId
        self.threadIndex = threadIndex
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let word = vm.word {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Word")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(word)
                            .font(.title2.bold())
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                ForEach(Array(vm.atoms.enumerated()), id: \.offset) { _, atom in
                    atomView(atom)
                }
            }
            .padding()
        }
        .task {
            vm.start(gameId: gameId, threadIndex: threadIndex, games: di.games, drawings: di.drawings)
        }
        .onDisappear {
            vm.stop()
        }
        .navigationTitle("Thread \(threadIndex + 1)")
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private func atomView(_ atom: GameAtom) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            authorLabel(for: atom)

            switch atom.type {
            case .drawing:
                if let ref = atom.drawingRef {
                    if let events = vm.events(forRef: ref) {
                        ReplayCanvasView(events: events, onFinished: { _ in })
                            .aspectRatio(1, contentMode: .fit)
                            .frame(maxWidth: .infinity)
                    } else {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 120)
                    }
                } else {
                    Text("No drawing")
                        .foregroundStyle(.secondary)
                }
            case .guess:
                Text(atom.guess ?? "")
                    .font(.title3)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(.vertical, 8)
    }

    @ViewBuilder
    private func authorLabel(for atom: GameAtom) -> some View {
        let author = vm.author(for: atom)
        HStack(spacing: 8) {
            AsyncImage(url: URL(string: author?.photoURL ?? "")) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Image(systemName: "person.crop.circle.fill")
                    .resizable()
                    .foregroundStyle(.secondary)
            }
            .frame(width: 28, height: 28)
            .clipShape(Circle())

            Text(author?.displayName ?? "—")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}
