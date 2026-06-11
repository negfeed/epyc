import SwiftUI
import EpycCore

/// The guessing screen: replays the previous player's drawing and lets the user
/// type a guess. Submit is enabled only once the replay finishes and the guess is
/// non-empty. Navigation forward is driven by `AppRouter`.
struct GuessView: View {
    @EnvironmentObject private var di: DIContainer
    @EnvironmentObject private var auth: AuthService
    @EnvironmentObject private var router: AppRouter

    @StateObject private var vm: GuessViewModel

    private let gameId: String

    init(gameId: String, threadIndex: Int, atomIndex: Int, drawingKey: String) {
        self.gameId = gameId
        _vm = StateObject(wrappedValue: GuessViewModel(
            gameId: gameId,
            threadIndex: threadIndex,
            atomIndex: atomIndex,
            drawingKey: drawingKey))
    }

    var body: some View {
        VStack(spacing: 16) {
            Text("What is this?")
                .font(.title2.weight(.semibold))
                .padding(.top)

            if vm.loaded {
                ReplayCanvasView(
                    events: vm.events,
                    onFinished: { _ in vm.drawingFinished = true })
                    .aspectRatio(1, contentMode: .fit)
                    .id(vm.drawingKey)
            } else {
                Color(.secondarySystemBackground)
                    .aspectRatio(1, contentMode: .fit)
                    .overlay(ProgressView())
            }

            TextField("Your guess", text: $vm.guess)
                .textFieldStyle(.roundedBorder)
                .autocorrectionDisabled()
                .submitLabel(.done)

            Button {
                vm.submit(di: di, auth: auth)
            } label: {
                Text("Submit")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(!vm.canSubmit)

            Spacer()
        }
        .padding()
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Leave") { vm.confirmLeave() }
            }
        }
        .alert("Leave game?", isPresented: $vm.showLeaveConfirmation) {
            Button("Leave", role: .destructive) { router.leaveGame() }
            Button("Stay", role: .cancel) {}
        } message: {
            Text("Your guess will be lost if you leave.")
        }
        .task {
            await vm.load(di: di)
        }
        .onAppear {
            router.observe(gameId: gameId, from: .guess)
        }
        .onDisappear {
            router.stopObserving(from: .guess)
        }
    }
}
