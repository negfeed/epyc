import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';

import { DrawingEvent, DotDrawingEvent, LineDrawingEvent } from '../../providers/drawing-model/drawing-model';
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

  private drawingContext: CanvasRenderingContext2D;
  @ViewChild('drawingCanvas') private drawingCanvasRef: ElementRef;
  @ViewChild('overlayCanvas') private overlayCanvasRef: ElementRef;
  private sideWidth: number;

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
    this.drawingContext.lineWidth = 1;
  }

  constructor() {
    console.log('Hello DrawingCanvas Component');
  }

  private dot(dotDrawingEvent: DotDrawingEvent) {
    let pointLocation = this.denormalizeCoordinates(dotDrawingEvent.location);
    this.drawingContext.beginPath();
    this.drawingContext.arc(pointLocation.x, pointLocation.y, 0.5, 0, Math.PI * 2, true);
    this.drawingContext.closePath();
    this.drawingContext.fill();
  }

  private line(lineDrawingEvent: LineDrawingEvent) {
    let start = this.denormalizeCoordinates(lineDrawingEvent.start);
    let end = this.denormalizeCoordinates(lineDrawingEvent.end);
    console.log('stroke from (' + start.x + ', ' + start.y + ') to (' + end.x + ', ' + end.y + ')' );
    this.drawingContext.moveTo(start.x, start.y);
    this.drawingContext.lineTo(end.x, end.y);
    this.drawingContext.stroke();
  }

  protected normalizeCoordinates(point: Coordinates): NormalizedCoordinates {
    return {
      x: point.x / this.sideWidth,
      y: point.y / this.sideWidth
    };
  }

  protected denormalizeCoordinates(point: NormalizedCoordinates): Coordinates {
    return {
      x: point.x * this.sideWidth,
      y: point.y * this.sideWidth
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
    this.drawingContext.clearRect(0, 0, this.sideWidth, this.sideWidth);
  }

  protected processDrawingEvent(drawingEvent: DrawingEvent) {
    switch(drawingEvent.type) {
      case 'dot':
        this.dot(drawingEvent);
        break;
      case 'line':
        this.line(drawingEvent);
        break;
      default:
        console.log('Error: This should not happen!');
        break;
    }
  }
}
