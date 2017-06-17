import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';

export interface Coordinates {
  x: number;
  y: number;
}

export interface DotDrawingEvent {
  type: 'dot';
  location: Coordinates;
}

export interface LineDrawingEvent {
  type: 'line';
  start: Coordinates;
  end: Coordinates;
}

type DrawingEvent = DotDrawingEvent | LineDrawingEvent;

@Component({
  selector: 'drawing-canvas',
  templateUrl: 'drawing-canvas.html'
})
export class DrawingCanvas implements OnInit {

  context:CanvasRenderingContext2D;
  @ViewChild('drawingCanvas') canvasRef: ElementRef;

  ngOnInit(): void {
    this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.parentElement.clientWidth;
    this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.width;
    this.context = this.canvasRef.nativeElement.getContext('2d');
    this.context.lineWidth = 1;
  }

  constructor() {
    console.log('Hello DrawingCanvas Component');
  }

  private dot(dotDrawingEvent: DotDrawingEvent) {
    this.context.beginPath();
    this.context.arc(dotDrawingEvent.location.x, dotDrawingEvent.location.y, 0.5, 0, Math.PI * 2, true);
    this.context.closePath();
    this.context.fill();
  }

  private line(lineDrawingEvent: LineDrawingEvent) {
    let start = lineDrawingEvent.start;
    let end = lineDrawingEvent.end;
    console.log('stroke from (' + start.x + ', ' + start.y + ') to (' + end.x + ', ' + end.y + ')' );
    this.context.moveTo(start.x, start.y);
    this.context.lineTo(end.x, end.y);
    this.context.stroke();
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
