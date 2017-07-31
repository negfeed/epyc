import { Component, Input, Renderer2, Output, EventEmitter } from '@angular/core';
import { Memoize } from 'typescript-memoize';
import 'rxjs/add/operator/first'

import { DrawingCanvas, Coordinates, Offset } from '../drawing-canvas/drawing-canvas'
import { DrawingModel, DrawingModelInterface, DrawingEventList, DrawingEvent } from '../../providers/drawing-model/drawing-model';

function calculateDistance(pointOne: Coordinates, pointTwo: Coordinates): number {
  return Math.abs(pointOne.x - pointTwo.x) + Math.abs(pointOne.y - pointTwo.y);
}

interface FingerState {
  lastKnownCoordinates: Coordinates;
  lastProcessedCoordinates: Coordinates;
}

@Component({
  selector: 'recording-drawing-canvas',
  templateUrl: 'recording-drawing-canvas.html'
})
export class RecordingDrawingCanvas extends DrawingCanvas {

  private fingersState: Map<string, FingerState> = new Map();
  private biggestFingerKey: number = 0;
  private _drawingKey: string;
  private nextEventIndex: number = 0;
  private drawingEvents: Array<DrawingEvent> = null;
  private drawingEventsList: DrawingEventList = null;
  @Output() onSomethingIsDrawn = new EventEmitter<boolean>();

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

  private updateHighestReplayedPath(path: string) {
    let pathAsNumber: number = parseInt(path)
    if (pathAsNumber > this.biggestFingerKey) {
      this.biggestFingerKey = pathAsNumber;
    }
  }

  private nextFingerKey(): string {
    this.biggestFingerKey++;
    return this.biggestFingerKey.toString();
  }

  private relateToFingers(touchCoordinates: Array<Coordinates>): Array<string> {
    // Calculate distance between every touch and finger.
    let distanceMatrix: Array<Map<string, number>> = [];
    for (var touchIndex = 0; touchIndex < touchCoordinates.length; touchIndex++) {
      distanceMatrix.push(new Map());
      this.fingersState.forEach((fingerState: FingerState, fingerKey: string) => {
        distanceMatrix[touchIndex].set(
            fingerKey, 
            calculateDistance(this.fingersState.get(fingerKey).lastKnownCoordinates, touchCoordinates[touchIndex]));
      });
    }

    // Search for the lowest sum of distances from touches to fingers.
    let minimumPermutation: Array<number> = null;
    let minimumDistance = Infinity;
    let fingerKeys = Array.from(this.fingersState.keys());
    RecordingDrawingCanvas.getPermutations(fingerKeys.length, touchCoordinates.length).forEach((permutation) => {
      let distance = 0;
      for (var touchIndex = 0; touchIndex < permutation.length; touchIndex++) {
        let fingerKeyIndex: number = permutation[touchIndex];
        distance += distanceMatrix[touchIndex].get(fingerKeys[fingerKeyIndex]);
      }
      if (distance < minimumDistance) {
        minimumDistance = distance;
        minimumPermutation = permutation.slice();
      }
    });
    
    // Convert the minimum permutation from finger key index values to finger keys.
    let minimumPermutationAsFingerKeys = []
    minimumPermutation.forEach((fingerKeyIndex: number) => {
      minimumPermutationAsFingerKeys.push(fingerKeys[fingerKeyIndex]);
    });
    console.log('changes to fingers: ' + minimumPermutationAsFingerKeys);
    return minimumPermutationAsFingerKeys;
  }

  private processTouchStart(coordinates: Array<Coordinates>) {
    coordinates.forEach((point: Coordinates) => {
      let fingerKey = this.nextFingerKey();
      this.processDrawingEvent({
        type: 'dot',
        timestamp: Date.now(),
        path: fingerKey,
        location: this.normalizeCoordinates(point)
      });
      this.fingersState.set(
          fingerKey,
          {
            lastKnownCoordinates: point,
            lastProcessedCoordinates: point
          });
    });
  }

  private processTouchEnd(coordinates: Array<Coordinates>) {
    let fingerKeys = this.relateToFingers(coordinates);
    fingerKeys.forEach((fingerKey: string) => {
      this.fingersState.delete(fingerKey);
    });
  }

  private processTouchMove(coordinates: Array<Coordinates>) {
    let fingerKeys: Array<string> = this.relateToFingers(coordinates);
    fingerKeys.forEach((fingerKey: string, index: number) => {
      this.processDrawingEvent({
        type: 'line',
        timestamp: Date.now(),
        path: fingerKey,
        start: this.normalizeCoordinates(this.fingersState.get(fingerKey).lastProcessedCoordinates),
        end: this.normalizeCoordinates(coordinates[index])
      });
      this.fingersState.get(fingerKey).lastKnownCoordinates = coordinates[index];
      this.fingersState.get(fingerKey).lastProcessedCoordinates = coordinates[index];
    });
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
      this.onSomethingIsDrawn.emit(true);
      this.updateHighestReplayedPath(drawingEvent.path);
      super.processDrawingEvent(drawingEvent);
    });
  }

  protected processDrawingEvent(drawingEvent: DrawingEvent) {
    this.drawingEventsList.storeDrawingEvent(drawingEvent, this.nextEventIndex++);
    super.processDrawingEvent(drawingEvent);
    this.onSomethingIsDrawn.emit(true);
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
    console.log('finger states:');
    this.fingersState.forEach((fingerState: FingerState, key: string) => {
      console.log(`finger key: ${key}`);
      console.log(`last known coordinates: (${fingerState.lastKnownCoordinates.x}, ${fingerState.lastKnownCoordinates.y})`);
    })

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
