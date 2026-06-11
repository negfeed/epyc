import SwiftUI
import UIKit
import Combine
import EpycCore

/// Multi-touch recording surface (port of recording-drawing-canvas.ts). Each active
/// UITouch is one finger/path; events are emitted normalized with millisecond
/// timestamps and a monotonic path name, exactly like the legacy component.
final class RecordingCanvasUIView: UIView {
    private let engine = DrawingEngine()
    private weak var controller: DrawingController?
    private var cancellables = Set<AnyCancellable>()

    private var touchPaths: [UITouch: String] = [:]
    private var lastProcessed: [UITouch: CGPoint] = [:]
    private var biggestFingerKey = 0
    private var nextEventIndex = 0

    /// (seq, event) for the parent to persist. Returns nothing.
    var onEvent: ((Int, DrawingEvent) -> Void)?
    var onSomethingDrawn: ((Bool) -> Void)?

    init(controller: DrawingController, initialEvents: [DrawingEvent]) {
        super.init(frame: .zero)
        self.controller = controller
        backgroundColor = .white
        isMultipleTouchEnabled = true
        isExclusiveTouch = true
        layer.borderWidth = 1
        layer.borderColor = UIColor.separator.cgColor

        engine.onUndoAvailabilityChanged = { [weak controller] in controller?.undoAvailable = $0 }
        engine.onRedoAvailabilityChanged = { [weak controller] in controller?.redoAvailable = $0 }

        // Seed any previously-recorded events (re-entry to the draw page).
        for event in initialEvents {
            engine.process(event)
            if event.type == .point || event.type == .erase {
                onSomethingDrawn?(true)
                if let name = event.pathName, let n = Int(name), n > biggestFingerKey { biggestFingerKey = n }
            }
        }
        nextEventIndex = initialEvents.count

        // Undo/redo requests from the control bar (blocked mid-stroke, like the legacy code).
        controller.doEvent
            .sink { [weak self] event in
                guard let self, self.touchPaths.isEmpty else { return }
                let e = DrawingEvent(type: event == .undo ? .undo : .redo,
                                     ts: Self.nowMs())
                self.store(e)
            }
            .store(in: &cancellables)
    }

    @available(*, unavailable) required init?(coder: NSCoder) { fatalError() }

    private static func nowMs() -> Double { Date().timeIntervalSince1970 * 1000 }
    private var side: CGFloat { bounds.width }

    private func nextFingerKey() -> String { biggestFingerKey += 1; return String(biggestFingerKey) }

    private func normalized(_ p: CGPoint) -> DrawingGeometry.Point {
        DrawingGeometry.normalize(.init(x: Double(p.x), y: Double(p.y)), side: Double(side))
    }

    private func store(_ event: DrawingEvent) {
        onEvent?(nextEventIndex, event)
        nextEventIndex += 1
        engine.process(event)
        onSomethingDrawn?(true)
        setNeedsDisplay()
    }

    private func emitPoint(for touch: UITouch, at point: CGPoint) {
        let name = touchPaths[touch] ?? nextFingerKey()
        touchPaths[touch] = name
        let isErase = controller?.mode == .erase
        let n = normalized(point)
        store(DrawingEvent(type: isErase ? .erase : .point, ts: Self.nowMs(), pathName: name, x: n.x, y: n.y))
        lastProcessed[touch] = point
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        for touch in touches { emitPoint(for: touch, at: touch.location(in: self)) }
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        for touch in touches {
            let p = touch.location(in: self)
            let last = lastProcessed[touch] ?? p
            if DrawingGeometry.isBeyondMinProcessingDistance(
                last: .init(x: Double(last.x), y: Double(last.y)),
                current: .init(x: Double(p.x), y: Double(p.y))) {
                emitPoint(for: touch, at: p)
            }
        }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        for touch in touches {
            emitPoint(for: touch, at: touch.location(in: self))
            touchPaths[touch] = nil
            lastProcessed[touch] = nil
        }
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        touchesEnded(touches, with: event)
    }

    override func draw(_ rect: CGRect) {
        UIColor.white.setFill()
        UIBezierPath(rect: rect).fill()
        engine.render(side: side)
    }
}

/// SwiftUI wrapper for the recording canvas. Square; the parent supplies the
/// controller and a persistence closure.
struct RecordingCanvasView: UIViewRepresentable {
    let controller: DrawingController
    var initialEvents: [DrawingEvent] = []
    let onEvent: (Int, DrawingEvent) -> Void
    let onSomethingDrawn: (Bool) -> Void

    func makeUIView(context: Context) -> RecordingCanvasUIView {
        let view = RecordingCanvasUIView(controller: controller, initialEvents: initialEvents)
        view.onEvent = onEvent
        view.onSomethingDrawn = onSomethingDrawn
        return view
    }

    func updateUIView(_ uiView: RecordingCanvasUIView, context: Context) {}
}
