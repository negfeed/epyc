import SwiftUI

/// Draw/erase toggle + undo/redo (port of drawing-control-bar.ts). Binds to the
/// shared DrawingController. Buttons are compact and never wrap their labels.
struct DrawingControlBar: View {
    @ObservedObject var controller: DrawingController

    var body: some View {
        HStack(spacing: 8) {
            modeButton(title: "Draw", icon: "pencil.tip", mode: .draw)
            modeButton(title: "Erase", icon: "eraser", mode: .erase)

            Spacer(minLength: 8)

            Button { controller.requestUndo() } label: {
                Image(systemName: "arrow.uturn.backward")
            }
            .buttonStyle(.bordered)
            .disabled(!controller.undoAvailable)

            Button { controller.requestRedo() } label: {
                Image(systemName: "arrow.uturn.forward")
            }
            .buttonStyle(.bordered)
            .disabled(!controller.redoAvailable)
        }
        .controlSize(.small)
        .font(.subheadline)
        .padding(.horizontal)
    }

    private func modeButton(title: String, icon: String, mode: DrawingController.Mode) -> some View {
        Button {
            controller.mode = mode
        } label: {
            Label(title, systemImage: icon)
                .lineLimit(1)
                .fixedSize(horizontal: true, vertical: false)
        }
        .buttonStyle(.bordered)
        .tint(controller.mode == mode ? .accentColor : .secondary)
    }
}
