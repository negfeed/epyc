import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Memoize } from 'typescript-memoize';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/first'

import { DrawingCanvas, Coordinates, Offset } from '../drawing-canvas/drawing-canvas'
import { DrawingModel, DrawingModelInterface, DrawingEventList, DrawingEvent, PointDrawingEvent } from '../../providers/drawing-model/drawing-model';
import { DrawingController, DrawingMode, DoEvent } from '../../providers/drawing-controller/drawing-controller'
import { DrawingControlBarComponent } from '../drawing-control-bar/drawing-control-bar';

function calculateDistance(pointOne: Coordinates, pointTwo: Coordinates): number {
  return Math.abs(pointOne.x - pointTwo.x) + Math.abs(pointOne.y - pointTwo.y);
}

interface FingerState {
  lastKnownCoordinates: Coordinates;
  lastProcessedCoordinates: Coordinates;
  drawingMode: DrawingMode;
}

@Component({
  selector: 'recording-drawing-canvas',
  templateUrl: 'recording-drawing-canvas.html'
})
export class RecordingDrawingCanvas extends DrawingCanvas implements OnInit, OnDestroy {

  private readonly MINIMUM_PROCESSING_DISTANCE = 6;

  private fingersState: Map<string, FingerState> = new Map();
  private biggestFingerKey: number = 0;
  private _drawingKey: string;
  private nextEventIndex: number = 0;

  // The drawing events array as extracted from the drawing model at the time of loading the component.
  // This list is often empty, unless the user re-navigates to the recording canvas after having drawn
  // something.
  private drawingEvents: Array<DrawingEvent> = null;

  // The drawing event list as read from Angularfire list() method. This is used for recording drawing
  // events. Lists retrieved with the list() method can have items appended to it without overriding
  // pre-existing elements in the list.
  private drawingEventsList: DrawingEventList = null;

  private drawingMode: DrawingMode = DrawingMode.DRAW;

  private ngUnsubscribe: Subject<void> = null;

  // Indicates whether the user drew something. This is used in the drawing page to control whether the
  // user could proceed to the next step.
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

  constructor(
      private drawingModel: DrawingModel,
      private drawingController: DrawingController) {
    super();
    console.log('Hello RecordingDrawingCanvas Component');
  }

  ngOnInit() {
    super.ngOnInit();
    this.ngUnsubscribe = new Subject<void>();
    this.drawingController.drawingMode$
        .takeUntil(this.ngUnsubscribe)
        .subscribe((drawingMode: DrawingMode) => {
          this.drawingMode = drawingMode;
        })
    this.drawingController.doEvent$
        .takeUntil(this.ngUnsubscribe)
        .subscribe((doEvent: DoEvent) => {
          if (doEvent == DoEvent.UNKNOWN) return;
          // Undos/Redos mid-path drawing is not supported.
          if (this.fingersState.size > 0) return;
          if (doEvent == DoEvent.UNDO) {
            this.storeAndProcessDrawingEvent({
              type: 'undo',
              timestamp: Date.now()
            });              
          } else if (doEvent == DoEvent.REDO) {
            this.storeAndProcessDrawingEvent({
              type: 'redo',
              timestamp: Date.now()
            });              
          }
        });
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
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
      if (this.drawingMode == DrawingMode.DRAW) {
        this.storeAndProcessDrawingEvent({
          type: 'point',
          timestamp: Date.now(),
          pathName: fingerKey,
          point: this.normalizeCoordinates(point)
        });  
      } else if (this.drawingMode == DrawingMode.ERASE) {
        this.storeAndProcessDrawingEvent({
          type: 'erase',
          timestamp: Date.now(),
          pathName: fingerKey,
          point: this.normalizeCoordinates(point)
        });
      }
      this.fingersState.set(
          fingerKey,
          {
            lastKnownCoordinates: point,
            lastProcessedCoordinates: point,
            drawingMode: this.drawingMode,
          });
    });
  }

  private processTouchEnd(coordinates: Array<Coordinates>) {
    let fingerKeys: Array<string> = this.relateToFingers(coordinates);
    fingerKeys.forEach((fingerKey: string, index: number) => {
      let drawingMode: DrawingMode = this.fingersState.get(fingerKey).drawingMode;
      if (drawingMode == DrawingMode.DRAW) {
        this.storeAndProcessDrawingEvent({
          type: 'point',
          timestamp: Date.now(),
          pathName: fingerKey,
          point: this.normalizeCoordinates(coordinates[index])
        });  
      } else if (drawingMode == DrawingMode.ERASE) {
        this.storeAndProcessDrawingEvent({
          type: 'erase',
          timestamp: Date.now(),
          pathName: fingerKey,
          point: this.normalizeCoordinates(coordinates[index])
        });  
      }
      this.fingersState.delete(fingerKey);
    });
  }

  private isTouchBeyondMinimumProcessingDistance(
      lastProcessedCoordinates: Coordinates,
      currentCoordinates: Coordinates): boolean {
    let xDelta = lastProcessedCoordinates.x - currentCoordinates.x;
    let yDelta = lastProcessedCoordinates.y - currentCoordinates.y;
    return Math.pow(this.MINIMUM_PROCESSING_DISTANCE, 2) < Math.pow(xDelta, 2) + Math.pow(yDelta, 2);    
  }

  private processTouchMove(coordinates: Array<Coordinates>) {
    let fingerKeys: Array<string> = this.relateToFingers(coordinates);
    fingerKeys.forEach((fingerKey: string, index: number) => {
      let drawingMode: DrawingMode = this.fingersState.get(fingerKey).drawingMode;
      if (this.isTouchBeyondMinimumProcessingDistance(
              this.fingersState.get(fingerKey).lastProcessedCoordinates,
              coordinates[index])) {
        let type: string = null;
        if (drawingMode == DrawingMode.DRAW) {
          this.storeAndProcessDrawingEvent({
            type: 'point',
            timestamp: Date.now(),
            pathName: fingerKey,
            point: this.normalizeCoordinates(coordinates[index])
          });  
        } else if (drawingMode == DrawingMode.ERASE) {
          this.storeAndProcessDrawingEvent({
            type: 'erase',
            timestamp: Date.now(),
            pathName: fingerKey,
            point: this.normalizeCoordinates(coordinates[index])
          });            
        }
        this.fingersState.get(fingerKey).lastProcessedCoordinates = coordinates[index];
      }
      this.fingersState.get(fingerKey).lastKnownCoordinates = coordinates[index];
    });
  }

  private initializeDrawingState(drawingModelInstance: DrawingModelInterface) {
    this.drawingEvents = [];
    if (drawingModelInstance.drawingEvents) {
      this.drawingEvents = Object.keys(drawingModelInstance.drawingEvents).map(
          key=>drawingModelInstance.drawingEvents[key]);
    }
    this.nextEventIndex = this.drawingEvents.length;
    this.clearDrawing();
    this.drawingEvents.forEach(drawingEvent => {
      if (drawingEvent.type == 'point') {
        let pointDrawingEvent: PointDrawingEvent = drawingEvent;
        // TODO(mshamma): Replace the emit condition to take into account undo events.
        this.onSomethingIsDrawn.emit(true);
        this.updateHighestReplayedPath(pointDrawingEvent.pathName);
      }
      super.processDrawingEvent(drawingEvent);
    });
  }

  private storeAndProcessDrawingEvent(drawingEvent: DrawingEvent) {
    this.drawingEventsList.storeDrawingEvent(drawingEvent, this.nextEventIndex++);
    super.processDrawingEvent(drawingEvent);
    this.onSomethingIsDrawn.emit(true);
  }

  onTouchEvent(event: TouchEvent) {
    console.log(event.type + '|' + event.changedTouches.length);
    let offset: Offset = this.getCanvasPageOffset()
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

  protected setUndoAvailability(undoAvailable: boolean) {
    this.drawingController.updateUndoAvailability(undoAvailable);
  }

  protected setRedoAvailability(redoAvailable: boolean) {
    this.drawingController.updateRedoAvailability(redoAvailable);
  }
}
