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

  private context:CanvasRenderingContext2D;
  @ViewChild('drawingCanvas') private canvasRef: ElementRef;
  private sideWidth: number;

  ngOnInit(): void {
    console.log('ngOnInit DrawingCanvas Component');
    this.sideWidth = this.canvasRef.nativeElement.parentElement.clientWidth;
    this.canvasRef.nativeElement.width = this.sideWidth;
    this.canvasRef.nativeElement.height = this.sideWidth;
    this.context = this.canvasRef.nativeElement.getContext('2d');
    this.context.lineWidth = 1;
  }

  constructor() {
    console.log('Hello DrawingCanvas Component');
  }

  private dot(dotDrawingEvent: DotDrawingEvent) {
    let pointLocation = this.denormalizeCoordinates(dotDrawingEvent.location);
    this.context.beginPath();
    this.context.arc(pointLocation.x, pointLocation.y, 0.5, 0, Math.PI * 2, true);
    this.context.closePath();
    this.context.fill();
  }

  private line(lineDrawingEvent: LineDrawingEvent) {
    let start = this.denormalizeCoordinates(lineDrawingEvent.start);
    let end = this.denormalizeCoordinates(lineDrawingEvent.end);
    console.log('stroke from (' + start.x + ', ' + start.y + ') to (' + end.x + ', ' + end.y + ')' );
    this.context.moveTo(start.x, start.y);
    this.context.lineTo(end.x, end.y);
    this.context.stroke();
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
    let element = this.canvasRef.nativeElement;
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
    this.context.clearRect(0, 0, this.sideWidth, this.sideWidth);
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
