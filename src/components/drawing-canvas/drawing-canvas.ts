import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { PaperScope, Path, Point } from 'paper';

import { DrawingEvent, PointDrawingEvent } from '../../providers/drawing-model/drawing-model';
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
export class DrawingCanvas implements OnInit {

  private readonly PROGRESS_BAR_NORMALIZED_HEIGHT: number = 0.03;
  // This progress area height is used to clear the progress bar. Clearing a rectangle of the same exact height
  // as the progress bar doesn't seem to do the job. It causes thick line to accrue on the top of the progress bar.
  private readonly PROGRESS_BAR_NORMALIZED_AREA_HEIGHT: number = this.PROGRESS_BAR_NORMALIZED_HEIGHT + 0.01;

  private drawingContext: CanvasRenderingContext2D;
  private overlayContext: CanvasRenderingContext2D;
  @ViewChild('drawingCanvas') private drawingCanvasRef: ElementRef;
  @ViewChild('overlayCanvas') private overlayCanvasRef: ElementRef;
  private sideWidth: number;

  private paperScope: PaperScope = new PaperScope();
  private paths: Map<string, Path> = new Map();

  ngOnInit(): void {
    console.log('ngOnInit DrawingCanvas Component');
    this.sideWidth = this.drawingCanvasRef.nativeElement.parentElement.clientWidth;
    this.drawingCanvasRef.nativeElement.parentElement.style.height = `${this.sideWidth}px`;
    // The height and widths of the canvas components should be 2 less than the parent
    // to account for the 1px border lines.
    this.drawingCanvasRef.nativeElement.width = this.sideWidth - 2;
    this.drawingCanvasRef.nativeElement.height = this.sideWidth - 2;
    this.overlayCanvasRef.nativeElement.width = this.sideWidth - 2;
    this.overlayCanvasRef.nativeElement.height = this.sideWidth - 2;
    this.drawingContext = this.drawingCanvasRef.nativeElement.getContext('2d');
    this.overlayContext = this.overlayCanvasRef.nativeElement.getContext('2d');

    this.paperScope.setup(this.drawingCanvasRef.nativeElement);
  }

  constructor() {
    console.log('Hello DrawingCanvas Component');
  }

  private point(pointDrawingEvent: PointDrawingEvent) {
    let path: Path = null;

    // Lookup the event path.
    if (this.paths.has(pointDrawingEvent.path)) {
      path = this.paths.get(pointDrawingEvent.path);
    }

    // If it doesn't exist, create one.
    if (!path) {
      path = new Path({
        strokeColor: 'black',
        strokeWidth: 3,
        strokeCap: 'round'
      });
      path.strokeColor = 'black';
      this.paths.set(pointDrawingEvent.path, path);
    }

    // Add point to the path.
    let point = this.denormalizeCoordinates(pointDrawingEvent.point);
    path.add(new Point(point.x, point.y));

    // Call smooth.
    path.smooth();

    console.log(`Adding point (${pointDrawingEvent.point.x}, ${pointDrawingEvent.point.y}) ` + 
                `to path ${pointDrawingEvent.path}`);
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

  protected canvasPageOffset(): Offset {
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

  protected clear() {
    this.paperScope.project.activeLayer.removeChildren();
  }

  protected processDrawingEvent(drawingEvent: DrawingEvent) {
    switch(drawingEvent.type) {
      case 'point':
        this.point(drawingEvent);
        break;
      default:
        console.log('Error: This should not happen!');
        break;
    }
  }

  private clearProgressArea() {
    let progressBarNormalizedY: number = 1 - (this.PROGRESS_BAR_NORMALIZED_AREA_HEIGHT);
    let progressBarY: number = this.denormalizeDrawingValue(progressBarNormalizedY);
    this.overlayContext.clearRect(0, progressBarY, this.sideWidth, this.sideWidth);
  }

  private drawProgress(percentage: number) {
    let progressBarNormalizedY: number = 1 - this.PROGRESS_BAR_NORMALIZED_HEIGHT;
    let progressBarY: number = this.denormalizeDrawingValue(progressBarNormalizedY);

    this.clearProgressArea();
    this.overlayContext.fillStyle = 'rgba(0,0,225,0.2)';
    this.overlayContext.fillRect(
        0,
        progressBarY, 
        this.sideWidth * (percentage / 100.0),
        this.sideWidth);
  }

  protected updateProgress(percentage: number) {
    this.drawProgress(Math.floor(percentage));
  }
}
