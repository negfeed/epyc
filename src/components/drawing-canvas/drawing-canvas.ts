import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { PaperScope, Path, Point, Layer, Color } from 'paper';

import { DrawingEvent, PointDrawingEvent, EraseDrawingEvent, UndoDrawingEvent, RedoDrawingEvent } from '../../providers/drawing-model/drawing-model';
import { NormalizedCoordinates } from '../../providers/drawing-model/drawing-model';

export interface Coordinates {
  x: number;
  y: number;
}

export interface Offset {
  top: number;
  left: number;
}

@Component({
  selector: 'drawing-canvas',
  templateUrl: 'drawing-canvas.html'
})
export abstract class DrawingCanvas implements OnInit {

  private readonly PROGRESS_BAR_NORMALIZED_HEIGHT: number = 0.03;

  @ViewChild('drawingCanvas') private drawingCanvasRef: ElementRef;
  private sideWidth: number;

  private paperScope: PaperScope = new PaperScope();

  // A map of paperjs paths that represent the drawing. Each path is represents a finger stroke on the screen.
  private drawingPaths: Map<string, Path> = new Map();

  // The undo stack holds references to all paperjs paths that have been added to the drawing layer in the order
  // of insertion. The redo stack holds references to detached paths that have been undone (naturally in reverse
  // chronological order).
  private undoStack: Array<Path> = [];
  private redoStack: Array<Path> = [];

  // The paperjs path that represents the progress bar (replay mode).
  private progressBarPath: Path = null;

  ngOnInit(): void {
    console.log('ngOnInit DrawingCanvas Component');
    this.sideWidth = this.drawingCanvasRef.nativeElement.parentElement.clientWidth;
    this.drawingCanvasRef.nativeElement.parentElement.style.height = `${this.sideWidth}px`;
    // The height and widths of the canvas components should be 2 less than the parent
    // to account for the 1px border lines.
    this.drawingCanvasRef.nativeElement.width = this.sideWidth - 2;
    this.drawingCanvasRef.nativeElement.height = this.sideWidth - 2;

    this.paperScope.setup(this.drawingCanvasRef.nativeElement);
    this.paperScope.project.activeLayer.name = 'drawingLayer';
    let progressBarLayer = new Layer();
    progressBarLayer.name = 'progressBarLayer';
  }

  constructor() {
    console.log('Hello DrawingCanvas Component');
  }

  // Processes drawing a point or erase event. Either type of event can be emitted on touch start,
  // end or move.
  private drawPath(drawingEvent: PointDrawingEvent | EraseDrawingEvent) {
    let path: Path = null;
    this.paperScope.project.layers['drawingLayer'].activate();

    // Lookup the event path.
    if (this.drawingPaths.has(drawingEvent.pathName)) {
      path = this.drawingPaths.get(drawingEvent.pathName);
    }

    // If it doesn't exist, create one.
    if (!path) {
      if (drawingEvent.type == 'point') {
        path = new Path({
          strokeColor: 'black',
          strokeWidth: 0.01 * this.sideWidth,
          strokeCap: 'round'
        });  
      } else if (drawingEvent.type == 'erase') {
        path = new Path({
          strokeColor: 'white',
          strokeWidth: 0.03 * this.sideWidth,
          strokeCap: 'round'
        });  
      }
      this.drawingPaths.set(drawingEvent.pathName, path);
      this.paperScope.project.activeLayer.addChild(path);

      // Add the path to the undo stack.
      this.undoStack.push(path);
      this.setUndoAvailability(true);

      // Make sure the redo stack is clear.
      this.redoStack = [];
      this.setRedoAvailability(false);
    }

    // Add point to the path.
    let point = this.denormalizeCoordinates(drawingEvent.point);
    path.add(new Point(point.x, point.y));
    path.smooth();
  }

  private undoPath(undoDrawingEvent: UndoDrawingEvent) {
    // Pop out the last path added to the undo stack.
    let path: Path = this.undoStack.pop();
    if (this.undoStack.length == 0) {
      this.setUndoAvailability(false);
    }

    // Remove the path from the drawing layer.
    path.remove();

    // Push the path to the redo stack.
    this.redoStack.push(path);
    this.setRedoAvailability(true);
  }

  private redoPath(redoDrawingEvent: RedoDrawingEvent) {
    // Pop out the last path added to the redo stack.
    let path: Path = this.redoStack.pop();
    if (this.redoStack.length == 0) {
      this.setRedoAvailability(false);
    }

    // Add the path to the drawing layer.
    this.paperScope.project.layers['drawingLayer'].addChild(path);

    // Push the path to the undo stack.
    this.undoStack.push(path);
    this.setUndoAvailability(true);
  }

  private normalizeDrawingValue(value: number): number {
    return value / this.sideWidth;
  }

  private denormalizeDrawingValue(value: number): number {
    return value * this.sideWidth;
  }

  protected normalizeCoordinates(point: Coordinates): NormalizedCoordinates {
    return {
      x: this.normalizeDrawingValue(point.x),
      y: this.normalizeDrawingValue(point.y)
    };
  }

  protected denormalizeCoordinates(point: NormalizedCoordinates): Coordinates {
    return {
      x: this.denormalizeDrawingValue(point.x),
      y: this.denormalizeDrawingValue(point.y)
    };
  }

  protected getCanvasPageOffset(): Offset {
    let element = this.drawingCanvasRef.nativeElement;
    var top = 0, left = 0;
    do {
      top += element.offsetTop  || 0;
      left += element.offsetLeft || 0;
      element = element.offsetParent;
    } while(element);
    return {
      top: top,
      left: left
    };
  };

  protected clearDrawing() {
    this.paperScope.project.layers['drawingLayer'].activate();
    this.paperScope.project.activeLayer.removeChildren();
  }

  protected processDrawingEvent(drawingEvent: DrawingEvent) {
    switch(drawingEvent.type) {
      case 'point':
      case 'erase':
        this.drawPath(drawingEvent);
        break;
      case 'undo':
        this.undoPath(drawingEvent);
        break;
      case 'redo':
        this.redoPath(drawingEvent);
        break;
      default:
        console.log('Error: This should not happen!');
        break;
    }
  }

  private drawProgress(percentage: number) {
    this.paperScope.project.layers['progressBarLayer'].activate();

    let progressBarNormalizedY: number = 1 - this.PROGRESS_BAR_NORMALIZED_HEIGHT;
    let progressBarY: number = this.denormalizeDrawingValue(progressBarNormalizedY);

    if (!this.progressBarPath) {
      this.progressBarPath = new Path({
        segments: [
          [0, progressBarY],
          [0, this.sideWidth],
          [0, this.sideWidth],
          [0, progressBarY]
        ],
        fillColor: new Color(0, 0, 225, 0.2),
      });
      this.paperScope.project.activeLayer.addChild(this.progressBarPath);
    }
    this.progressBarPath.segments[2].point.x = this.sideWidth * (percentage / 100.0);
    this.progressBarPath.segments[3].point.x = this.sideWidth * (percentage / 100.0);
  }

  protected updateProgress(percentage: number) {
    this.drawProgress(Math.floor(percentage));
  }

  protected setUndoAvailability(undoAvailable: boolean) {}

  protected setRedoAvailability(redoAvailable: boolean) {}
}
