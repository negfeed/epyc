import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { PaperScope, Path, Point, Layer, Color } from 'paper';

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

  private drawingContext: CanvasRenderingContext2D;
  @ViewChild('drawingCanvas') private drawingCanvasRef: ElementRef;
  private sideWidth: number;

  private paperScope: PaperScope = new PaperScope();
  private paths: Map<string, Path> = new Map();
  private progressPath: Path = null;

  ngOnInit(): void {
    console.log('ngOnInit DrawingCanvas Component');
    this.sideWidth = this.drawingCanvasRef.nativeElement.parentElement.clientWidth;
    this.drawingCanvasRef.nativeElement.parentElement.style.height = `${this.sideWidth}px`;
    // The height and widths of the canvas components should be 2 less than the parent
    // to account for the 1px border lines.
    this.drawingCanvasRef.nativeElement.width = this.sideWidth - 2;
    this.drawingCanvasRef.nativeElement.height = this.sideWidth - 2;
    this.drawingContext = this.drawingCanvasRef.nativeElement.getContext('2d');

    this.paperScope.setup(this.drawingCanvasRef.nativeElement);
    this.paperScope.project.activeLayer.name = 'drawingLayer';
    let progressLayer = new Layer();
    progressLayer.name = 'progressLayer';
  }

  constructor() {
    console.log('Hello DrawingCanvas Component');
  }

  private point(pointDrawingEvent: PointDrawingEvent) {
    let path: Path = null;
    this.paperScope.project.layers['drawingLayer'].activate();

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
      this.paperScope.project.activeLayer.addChild(path);
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

  private drawProgress(percentage: number) {
    this.paperScope.project.layers['progressLayer'].activate();

    let progressBarNormalizedY: number = 1 - this.PROGRESS_BAR_NORMALIZED_HEIGHT;
    let progressBarY: number = this.denormalizeDrawingValue(progressBarNormalizedY);

    if (!this.progressPath) {
      this.progressPath = new Path({
        segments: [
          [0, progressBarY],
          [0, this.sideWidth],
          [0, this.sideWidth],
          [0, progressBarY]
        ],
        fillColor: new Color(0, 0, 225, 0.2),
      });
      this.paperScope.project.activeLayer.addChild(this.progressPath);
    }
    this.progressPath.segments[2].point.x = this.sideWidth * (percentage / 100.0);
    this.progressPath.segments[3].point.x = this.sideWidth * (percentage / 100.0);
  }

  protected updateProgress(percentage: number) {
    this.drawProgress(Math.floor(percentage));
  }
}
