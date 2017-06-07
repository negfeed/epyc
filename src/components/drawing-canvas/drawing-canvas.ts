import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';

interface Offset {
  top: number;
  left: number;
}

interface Coordinates {
  x: number;
  y: number;
}

function calculateDistance(pointOne: Coordinates, pointTwo: Coordinates): number {
  return Math.abs(pointOne.x - pointTwo.x) + Math.abs(pointOne.y - pointTwo.y);
}

function getPermutations(upperBound: number, count: number): Array<Array<number>> {
  // TODO
  return [];
}

@Component({
  selector: 'drawing-canvas',
  templateUrl: 'drawing-canvas.html'
})
export class DrawingCanvas implements OnInit {

  fingers: Array<Coordinates> = [];
  context:CanvasRenderingContext2D;
  @ViewChild('drawingCanvas') canvasRef: ElementRef;

  ngOnInit(): void {
    this.canvasRef.nativeElement.width = this.canvasRef.nativeElement.parentElement.offsetWidth;
    this.canvasRef.nativeElement.height = this.canvasRef.nativeElement.width;
    this.context = this.canvasRef.nativeElement.getContext('2d');
  }

  constructor() {
    console.log('Hello DrawingCanvas Component');
  }

  private canvasPageOffset(): Offset {
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

  private relateToFingers(touchCoordinates: Array<Coordinates>): Array<number> {
    // Calculate distance between every touch and touch.
    let distanceMatrix: Array<Array<number>> = [[], []];
    for (var touchIndex = 0; touchIndex < touchCoordinates.length; touchIndex++) {
      for (var fingerIndex = 0; fingerIndex < this.fingers.length; fingerIndex++) {
        distanceMatrix[touchIndex].push(calculateDistance(this.fingers[fingerIndex], touchCoordinates[touchIndex]));
      }
    }

    // Search for the lowest sum of distances from touches to fingers.
    let minimumPermutation = [0];
    let minimumDistance = Infinity;
    getPermutations(this.fingers.length, touchCoordinates.length).forEach((permutation) => {
      let distance = 0;
      for (var touchIndex = 0; touchIndex < permutation.length; touchIndex++) {
        let fingerIndex = permutation[touchIndex];
        distance += distanceMatrix[touchIndex][fingerIndex];
      }
      if (distance < minimumDistance) {
        minimumDistance = distance;
        minimumPermutation = permutation.slice();
      }
    })
    return minimumPermutation;
  }

  private dot(point: Coordinates) {
    // TODO
  }

  private stroke(start: Coordinates, finish: Coordinates) {
    console.log('stroke from (' + start.x + ', ' + start.y + ') to (' + finish.x + ', ' + finish.y + ')' );
    this.context.moveTo(start.x, start.y);
    this.context.lineTo(finish.x, finish.y);
    this.context.stroke();
  }

  private processTouchStart(coordinates: Array<Coordinates>) {
    coordinates.forEach((point) => {
      this.dot(point);
    })
    this.fingers = this.fingers.concat(coordinates);
  }

  private processTouchEnd(coordinates: Array<Coordinates>) {
    let fingerIndices = this.relateToFingers(coordinates).sort();
    for (var index = fingerIndices.length - 1; index >= 0; index--) {
      this.fingers.splice(fingerIndices[index], 1);
    }
  }

  private processTouchMove(coordinates: Array<Coordinates>) {
    let fingerIndices = this.relateToFingers(coordinates);
    for (var index = 0; index < fingerIndices.length; index++) {
      this.stroke(this.fingers[fingerIndices[index]], coordinates[index]);
      this.fingers[fingerIndices[index]] = coordinates[index];
    }
  }

  onTouchEvent(event: TouchEvent) {
    console.log(event.type + '|' + event.changedTouches.length);
    let offset: Offset =  this.canvasPageOffset()
    let changedCoordinates: Array<Coordinates> = [];
    for (var index = 0; index < event.changedTouches.length; index++) {
      let changeCoordinates = {
        x: event.changedTouches[index].pageX - offset.left,
        y: event.changedTouches[index].pageY - offset.top
      };
      changedCoordinates.push(changeCoordinates);
      console.log('(' + changeCoordinates.x + ', ' + changeCoordinates.y + ')');
    }
    for (var index = 0; index < this.fingers.length; index++) {
      console.log('(' + this.fingers[index].x + ', ' + this.fingers[index].y + ')');
    }
    switch(event.type) {
      case 'touchstart':
        this.processTouchStart(changedCoordinates);
        break;
      case 'touchend':
      case 'touchcancel':
        this.processTouchEnd(changedCoordinates);
        break;
      case 'touchmove':
        this.processTouchMove(changedCoordinates);
        break;
    }
  }
}
