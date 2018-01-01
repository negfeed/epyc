import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';

export enum DrawingMode {
  UNKNOWN = 0,
  DRAW = 1,
  ERASE = 2
}

export enum DoEvent {
  UNKNOWN = 0,
  UNDO = 1,
  REDO = 2
}

@Injectable()
export class DrawingController {

  // Observable sources
  private undoAvailabilitySource = new Subject<boolean>();
  private redoAvailabilitySource = new Subject<boolean>();
  private drawingModeSource = new Subject<DrawingMode>();
  private doEvenSource = new Subject<DoEvent>();
 
  // Observable string streams
  undoAvailable$ = this.undoAvailabilitySource.asObservable();
  redoAvailable$ = this.redoAvailabilitySource.asObservable();
  drawingMode$ = this.drawingModeSource.asObservable();
  doEvent$ = this.doEvenSource.asObservable();
 
  constructor() {
    console.log('Hello DrawingController');
  }

  updateUndoAvailability(undoAvailable: boolean) {
    this.undoAvailabilitySource.next(undoAvailable);
  }
 
  updateRedoAvailability(redoAvailable: boolean) {
    this.redoAvailabilitySource.next(redoAvailable);
  }

  updateDrawingMode(drawingMode: DrawingMode) {
    this.drawingModeSource.next(drawingMode);
  }

  emitDoEvent(doEvent: DoEvent) {
    this.doEvenSource.next(doEvent);
  }
}
