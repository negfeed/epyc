import SwiftUI
import EpycCore

/// The drawing screen: shows the word to draw, a recording canvas, the draw/erase
/// control bar, and a "Done" button that runs a 5-second countdown before
/// finalizing. Navigation forward is driven by `AppRouter`.
struct DrawView: View {
    @EnvironmentObject private var di: DIContainer
    @EnvironmentObject private var auth: AuthService
    @EnvironmentObject private var router: AppRouter

    @StateObject private var vm: DrawViewModel
    @StateObject private var controller = DrawingController()

    private let gameId: String

    init(gameId: String, threadIndex: Int, atomIndex: Int, word: String) {
        self.gameId = gameId
        _vm = StateObject(wrappedValue: DrawViewModel(
            gameId: gameId,
            threadIndex: threadIndex,
            atomIndex: atomIndex,
            word: word))
    }

    var body: some View {
        VStack(spacing: 16) {
            Text("Draw: \(vm.word)")
                .font(.title2.weight(.semibold))
                .multilineTextAlignment(.center)
                .padding(.top)

            if vm.isPrepared, let key = vm.drawingKey {
                RecordingCanvasView(
                    controller: controller,
                    initialEvents: vm.initialEvents,
                    onEvent: { seq, event in vm.appendEvent(seq: seq, event: event, di: di) },
                    onSomethingDrawn: { vm.somethingDrawn = $0 })
                    .aspectRatio(1, contentMode: .fit)
                    .id(key)

                DrawingControlBar(controller: controller)

                doneButton
            } else {
                Spacer()
                ProgressView()
                Spacer()
            }
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
            Text("Your progress on this drawing will be lost if you leave.")
        }
        .task {
            await vm.prepare(di: di, auth: auth)
        }
        .onAppear {
            router.observe(gameId: gameId, from: .draw)
        }
        .onDisappear {
            vm.onDisappearCleanup()
            router.stopObserving(from: .draw)
        }
    }

    @ViewBuilder
    private var doneButton: some View {
        Button {
            vm.toggleCountdown(di: di, auth: auth)
        } label: {
            Group {
                if let remaining = vm.countdownRemaining {
                    Text("Finishing in \(remaining)… (tap to cancel)")
                } else {
                    Text("Done")
                }
            }
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .disabled((!vm.somethingDrawn && !vm.isCountingDown) || vm.didFinish)
    }
}
