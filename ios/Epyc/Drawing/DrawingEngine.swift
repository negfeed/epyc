import Foundation
import UIKit
import Combine
import EpycCore

/// One finger stroke: normalized points (0..1) plus whether it's an erase stroke.
final class Stroke {
    let pathName: String
    let isErase: Bool
    var points: [DrawingGeometry.Point] = []
    init(pathName: String, isErase: Bool) {
        self.pathName = pathName
        self.isErase = isErase
    }
}

/// Renderable, event-sourced drawing state shared by the recording and replay
/// canvases. Direct port of the abstract `drawing-canvas.ts` (paths map + undo/redo
/// stacks + Catmull-Rom smoothing). Pure UIKit so it can render into any view.
final class DrawingEngine {
    private(set) var strokes: [String: Stroke] = [:]
    private(set) var undoStack: [Stroke] = []
    private(set) var redoStack: [Stroke] = []
    private(set) var visible: [Stroke] = []   // z-order of currently shown strokes

    var onUndoAvailabilityChanged: ((Bool) -> Void)?
    var onRedoAvailabilityChanged: ((Bool) -> Void)?

    func reset() {
        strokes.removeAll(); undoStack.removeAll(); redoStack.removeAll(); visible.removeAll()
        onUndoAvailabilityChanged?(false); onRedoAvailabilityChanged?(false)
    }

    /// Apply one drawing event (ports processDrawingEvent + drawPath/undoPath/redoPath).
    func process(_ event: DrawingEvent) {
        switch event.type {
        case .point, .erase:
            guard let x = event.x, let y = event.y, let name = event.pathName else { return }
            addPoint(pathName: name, isErase: event.type == .erase, x: x, y: y)
        case .undo:
            undo()
        case .redo:
            redo()
        }
    }

    private func addPoint(pathName: String, isErase: Bool, x: Double, y: Double) {
        let stroke: Stroke
        if let existing = strokes[pathName] {
            stroke = existing
        } else {
            stroke = Stroke(pathName: pathName, isErase: isErase)
            strokes[pathName] = stroke
            visible.append(stroke)
            undoStack.append(stroke)
            onUndoAvailabilityChanged?(true)
            redoStack.removeAll()
            onRedoAvailabilityChanged?(false)
        }
        stroke.points.append(DrawingGeometry.Point(x: x, y: y))
    }

    private func undo() {
        guard let stroke = undoStack.popLast() else { return }
        if undoStack.isEmpty { onUndoAvailabilityChanged?(false) }
        visible.removeAll { $0 === stroke }
        redoStack.append(stroke)
        onRedoAvailabilityChanged?(true)
    }

    private func redo() {
        guard let stroke = redoStack.popLast() else { return }
        if redoStack.isEmpty { onRedoAvailabilityChanged?(false) }
        visible.append(stroke)
        undoStack.append(stroke)
        onUndoAvailabilityChanged?(true)
    }

    var hasContent: Bool { !visible.isEmpty }

    /// Render every visible stroke into the current UIKit context at `side` px.
    func render(side: CGFloat) {
        for stroke in visible {
            let denorm = stroke.points.map { DrawingGeometry.denormalize($0, side: Double(side)) }
            let path = Self.smoothedPath(points: denorm)
            (stroke.isErase ? UIColor.white : UIColor.black).setStroke()
            path.lineWidth = CGFloat(stroke.isErase
                ? DrawingGeometry.eraseStrokeWidth(side: Double(side))
                : DrawingGeometry.drawStrokeWidth(side: Double(side)))
            path.lineCapStyle = .round
            path.lineJoinStyle = .round
            path.stroke()
        }
    }

    /// Catmull-Rom → cubic Bezier (the equivalent of Paper.js `path.smooth()`).
    static func smoothedPath(points pts: [DrawingGeometry.Point]) -> UIBezierPath {
        let path = UIBezierPath()
        guard let first = pts.first else { return path }
        path.move(to: CGPoint(x: first.x, y: first.y))
        if pts.count == 1 {
            // A dot: tiny line so round cap renders.
            path.addLine(to: CGPoint(x: first.x + 0.01, y: first.y))
            return path
        }
        let segments = DrawingGeometry.catmullRomToBezier(pts)
        for s in segments {
            path.addCurve(to: CGPoint(x: s.end.x, y: s.end.y),
                          controlPoint1: CGPoint(x: s.c1.x, y: s.c1.y),
                          controlPoint2: CGPoint(x: s.c2.x, y: s.c2.y))
        }
        return path
    }
}

/// Draw/erase mode + undo/redo wiring (ports drawing-controller.ts). ObservableObject
/// so the SwiftUI control bar can bind to it; the recording canvas subscribes to the
/// `doEvent` subject for undo/redo requests.
@MainActor
final class DrawingController: ObservableObject {
    enum Mode { case draw, erase }
    enum DoEvent { case undo, redo }

    @Published var mode: Mode = .draw
    @Published var undoAvailable = false
    @Published var redoAvailable = false

    let doEvent = PassthroughSubject<DoEvent, Never>()

    func requestUndo() { doEvent.send(.undo) }
    func requestRedo() { doEvent.send(.redo) }
}
