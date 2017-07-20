import { Component, Input, Renderer2 } from '@angular/core';
import { Memoize } from 'typescript-memoize';
import 'rxjs/add/operator/first'

import { DrawingCanvas, Coordinates, Offset } from '../drawing-canvas/drawing-canvas'
import { DrawingModel, DrawingModelInterface, DrawingEventList, DrawingEvent } from '../../providers/drawing-model/drawing-model';

function calculateDistance(pointOne: Coordinates, pointTwo: Coordinates): number {
  return Math.abs(pointOne.x - pointTwo.x) + Math.abs(pointOne.y - pointTwo.y);
}

@Component({
  selector: 'recording-drawing-canvas',
  templateUrl: 'recording-drawing-canvas.html'
})
export class RecordingDrawingCanvas extends DrawingCanvas {

  private fingers: Array<Coordinates> = [];
  private _drawingKey: string;
  private nextEventIndex: number = 0;
  private drawingEvents: Array<DrawingEvent> = null;
  private drawingEventsList: DrawingEventList = null;

  @Input()
  set drawingKey(drawingKey: string) {
    if (drawingKey != '') {
      this._drawingKey = drawingKey;
      this.drawingModel.loadInstance(drawingKey)
          .first()
          .subscribe(
            (drawingModelInstance: DrawingModelInterface) => this.initializeDrawingState(drawingModelInstance));
      this.drawingEventsList = this.drawingModel.loadDrawingEvents(drawingKey);
    }
  }

  constructor(private drawingModel: DrawingModel, private renderer: Renderer2) {
    super();
    console.log('Hello RecordingDrawingCanvas Component');
  }

  private static _getPermutations(
      permutation: Array<number>, 
      remainingNumbers: Array<number>, 
      count): Array<Array<number>> {
    if (permutation.length == count) {
      return [permutation.slice()];
    }

    let results = [];
    for (var index = 0; index < remainingNumbers.length; index++) {
      let newRemaining = remainingNumbers.slice();
      let newPermutation = permutation.slice();
      newPermutation.push(newRemaining.splice(index, 1)[0])
      results = results.concat(RecordingDrawingCanvas._getPermutations(newPermutation, newRemaining, count))
    }
    return results;
  }

  @Memoize((upperBound: number, count: number) => {
    return upperBound + ';' + count;
  })
  private static getPermutations(upperBound: number, count: number): Array<Array<number>> {
    let remainingNumbers = []
    for (var index = 0; index < upperBound; index++) {
      remainingNumbers.push(index);
    }
    let permutations = RecordingDrawingCanvas._getPermutations([], remainingNumbers, count);
    return permutations;
  }

  private relateToFingers(touchCoordinates: Array<Coordinates>): Array<number> {
    // Calculate distance between every touch and touch.
    let distanceMatrix: Array<Array<number>> = [];
    for (var touchIndex = 0; touchIndex < touchCoordinates.length; touchIndex++) {
      distanceMatrix.push([]);
      for (var fingerIndex = 0; fingerIndex < this.fingers.length; fingerIndex++) {
        distanceMatrix[touchIndex].push(calculateDistance(this.fingers[fingerIndex], touchCoordinates[touchIndex]));
      }
    }

    // Search for the lowest sum of distances from touches to fingers.
    let minimumPermutation = null;
    let minimumDistance = Infinity;
    RecordingDrawingCanvas.getPermutations(this.fingers.length, touchCoordinates.length).forEach((permutation) => {
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
    console.log('changes to fingers: ' + minimumPermutation);
    return minimumPermutation;
  }

  private processTouchStart(coordinates: Array<Coordinates>) {
    coordinates.forEach((point) => {
      this.processDrawingEvent({
        type: 'dot',
        timestamp: Date.now(),
        location: this.normalizeCoordinates(point)
      })
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
      this.processDrawingEvent({
        type: 'line',
        timestamp: Date.now(),
        start: this.normalizeCoordinates(this.fingers[fingerIndices[index]]),
        end: this.normalizeCoordinates(coordinates[index])
      });
      this.fingers[fingerIndices[index]] = coordinates[index];
    }
  }

  private initializeDrawingState(drawingModelInstance: DrawingModelInterface) {
    this.drawingEvents = [];
    if (drawingModelInstance.drawingEvents) {
      this.drawingEvents = Object.keys(drawingModelInstance.drawingEvents).map(
          key=>drawingModelInstance.drawingEvents[key]);
    }
    this.nextEventIndex = this.drawingEvents.length;
    this.clear();
    this.drawingEvents.forEach(drawingEvent => {
      super.processDrawingEvent(drawingEvent);
    });
  }

  protected processDrawingEvent(drawingEvent: DrawingEvent) {
    this.drawingEventsList.storeDrawingEvent(drawingEvent, this.nextEventIndex++);
    super.processDrawingEvent(drawingEvent);
  }

  onTouchEvent(event: TouchEvent) {
    console.log(event.type + '|' + event.changedTouches.length);
    let offset: Offset = this.canvasPageOffset()
    let changedCoordinates: Array<Coordinates> = [];
    console.log('changes');
    for (var index = 0; index < event.changedTouches.length; index++) {
      let changeCoordinates = {
        x: event.changedTouches[index].pageX - offset.left,
        y: event.changedTouches[index].pageY - offset.top
      };
      changedCoordinates.push(changeCoordinates);
      console.log('(' + changeCoordinates.x + ', ' + changeCoordinates.y + ')');
    }
    console.log('fingers')
    for (var index = 0; index < this.fingers.length; index++) {
      console.log('(' + this.fingers[index].x + ', ' + this.fingers[index].y + ')');
    }
    switch (event.type) {
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
