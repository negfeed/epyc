import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';

export interface Coordinates {
  x: number;
  y: number;
}

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

  protected dot(point: Coordinates) {
    this.context.beginPath();
    this.context.arc(point.x, point.y, 0.5, 0, Math.PI * 2, true);
    this.context.closePath();
    this.context.fill();
  }

  protected stroke(start: Coordinates, finish: Coordinates) {
    console.log('stroke from (' + start.x + ', ' + start.y + ') to (' + finish.x + ', ' + finish.y + ')' );
    this.context.moveTo(start.x, start.y);
    this.context.lineTo(finish.x, finish.y);
    this.context.stroke();
  }
}
