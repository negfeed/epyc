import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs/Subject';

import { DrawingController, DrawingMode, DoEvent } from '../../providers/drawing-controller/drawing-controller'

@Component({
  selector: 'drawing-control-bar',
  templateUrl: 'drawing-control-bar.html'
})
export class DrawingControlBarComponent implements OnInit, OnDestroy {

  undoEnabled: boolean = false;
  redoEnabled: boolean = false;
  drawingMode: string = 'draw';

  private ngUnsubscribe: Subject<void> = null;

  constructor(private drawingController: DrawingController) {
    console.log('Hello DrawingControlBarComponent Component');
  }

  ngOnInit() {
    this.ngUnsubscribe = new Subject<void>();
    this.drawingController.updateDrawingMode(DrawingControlBarComponent.convertDrawingModeToEnum(this.drawingMode));
    this.drawingController.undoAvailable$
        .takeUntil(this.ngUnsubscribe)
        .subscribe((undoAvailable: boolean) => this.undoEnabled = undoAvailable);
    this.drawingController.redoAvailable$
        .takeUntil(this.ngUnsubscribe)
        .subscribe((redoAvailable: boolean) => this.redoEnabled = redoAvailable);
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private static convertDrawingModeToEnum(drawingModeString: string): DrawingMode {
    let drawingMode: DrawingMode = DrawingMode.UNKNOWN;
    switch (drawingModeString) {
      case 'draw': 
        drawingMode = DrawingMode.DRAW;
        break;
      case 'erase':
        drawingMode = DrawingMode.ERASE;
        break;
    }
    return drawingMode;
  }

  onDrawingModeChange(drawingMode: string) {
    console.log(`drawing mode changed: ${drawingMode}`);
    this.drawingController.updateDrawingMode(DrawingControlBarComponent.convertDrawingModeToEnum(drawingMode));
  }

  onUndoClick() {
    this.drawingController.emitDoEvent(DoEvent.UNDO);
  }

  onRedoClick() {
    this.drawingController.emitDoEvent(DoEvent.REDO);
  }
}
