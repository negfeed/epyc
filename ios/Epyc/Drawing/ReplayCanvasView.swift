import SwiftUI
import UIKit
import EpycCore

/// Replays a recorded drawing on a 33 ms timeline (port of replaying-drawing-canvas.ts):
/// timestamps normalized (gaps capped at 1 s), events drawn when their normalized
/// timestamp ≤ elapsed, a bottom progress bar, and touch-and-hold fast-forward (5×).
final class ReplayCanvasUIView: UIView {
    private let engine = DrawingEngine()
    private var events: [DrawingEvent] = []
    private var normalizedTs: [Double] = []
    private var drawingIndex = 0
    private var replayPeriodCounter = 0
    private var totalReplayPeriods = 0
    private var touchCount = 0
    private var timer: Timer?
    private var progress: Double = 0   // 0..100

    var onFinished: ((Bool) -> Void)?

    init(events: [DrawingEvent]) {
        super.init(frame: .zero)
        backgroundColor = .white
        isMultipleTouchEnabled = true
        layer.borderWidth = 1
        layer.borderColor = UIColor.separator.cgColor
        load(events)
    }

    @available(*, unavailable) required init?(coder: NSCoder) { fatalError() }

    private var side: CGFloat { bounds.width }

    /// Number of events currently loaded (used by the representable to detect when
    /// the asynchronously-fetched events have arrived and a reload is needed).
    var loadedEventCount: Int { events.count }

    /// Restart the replay with a new set of events (e.g. once they finish loading).
    func reload(_ newEvents: [DrawingEvent]) {
        timer?.invalidate(); timer = nil
        engine.reset()
        drawingIndex = 0
        replayPeriodCounter = 0
        touchCount = 0
        progress = 0
        load(newEvents)
    }

    private func load(_ events: [DrawingEvent]) {
        self.events = events
        normalizedTs = DrawingGeometry.normalizedTimestamps(events.map { $0.ts })
        replayPeriodCounter = 0
        let last = normalizedTs.last ?? 0
        totalReplayPeriods = Int(ceil(last / DrawingGeometry.replayPeriodMs))
        start()
    }

    private func start() {
        guard !events.isEmpty else {
            progress = 100; setNeedsDisplay(); onFinished?(false); return
        }
        tick()
    }

    private func tick() {
        let currentTs = Double(replayPeriodCounter) * DrawingGeometry.replayPeriodMs
        while drawingIndex < events.count && normalizedTs[drawingIndex] <= currentTs {
            engine.process(events[drawingIndex]); drawingIndex += 1
        }
        setNeedsDisplay()

        if replayPeriodCounter >= totalReplayPeriods {
            progress = 100; setNeedsDisplay(); onFinished?(true); return
        }
        progress = totalReplayPeriods > 0 ? 100.0 * Double(replayPeriodCounter) / Double(totalReplayPeriods) : 100
        replayPeriodCounter += (touchCount == 0 ? 1 : 5)

        timer = Timer.scheduledTimer(withTimeInterval: DrawingGeometry.replayPeriodMs / 1000.0,
                                     repeats: false) { [weak self] _ in self?.tick() }
    }

    func stop() { timer?.invalidate(); timer = nil }
    deinit { timer?.invalidate() }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) { touchCount += touches.count }
    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) { touchCount = max(0, touchCount - touches.count) }
    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) { touchesEnded(touches, with: event) }

    override func draw(_ rect: CGRect) {
        UIColor.white.setFill()
        UIBezierPath(rect: rect).fill()
        engine.render(side: side)

        // Progress bar across the bottom 3% (port of drawProgress).
        let h = side * CGFloat(DrawingGeometry.progressBarHeightFraction)
        let barRect = CGRect(x: 0, y: side - h, width: side * CGFloat(progress / 100.0), height: h)
        UIColor.systemBlue.withAlphaComponent(0.2).setFill()
        UIBezierPath(rect: barRect).fill()
    }
}

/// SwiftUI wrapper for the replay canvas (square).
struct ReplayCanvasView: UIViewRepresentable {
    let events: [DrawingEvent]
    let onFinished: (Bool) -> Void

    func makeUIView(context: Context) -> ReplayCanvasUIView {
        let view = ReplayCanvasUIView(events: events)
        view.onFinished = onFinished
        return view
    }

    func updateUIView(_ uiView: ReplayCanvasUIView, context: Context) {
        // Events are fetched asynchronously; when they arrive (count changes), restart
        // the replay with the loaded data. Without this the canvas keeps the empty
        // array it was created with and nothing plays.
        uiView.onFinished = onFinished
        if uiView.loadedEventCount != events.count {
            uiView.reload(events)
        }
    }
}
