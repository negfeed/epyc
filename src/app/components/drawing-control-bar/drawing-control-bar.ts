import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  IonToolbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';

import {
  DrawingController,
  DrawingMode,
  DoEvent,
} from '../../services/drawing-controller.service';

@Component({
  selector: 'drawing-control-bar',
  templateUrl: 'drawing-control-bar.html',
  imports: [
    FormsModule,
    IonToolbar,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonButtons,
    IonButton,
    IonIcon,
  ],
})
export class DrawingControlBarComponent implements OnInit, OnDestroy {
  undoEnabled = false;
  redoEnabled = false;
  drawingMode = 'draw';

  private ngUnsubscribe: Subject<void> = null;

  constructor(private drawingController: DrawingController) {
    console.log('Hello DrawingControlBarComponent Component');
  }

  ngOnInit() {
    this.ngUnsubscribe = new Subject<void>();
    this.drawingController.updateDrawingMode(
      DrawingControlBarComponent.convertDrawingModeToEnum(this.drawingMode),
    );
    this.drawingController.undoAvailable$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((undoAvailable: boolean) => (this.undoEnabled = undoAvailable));
    this.drawingController.redoAvailable$
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((redoAvailable: boolean) => (this.redoEnabled = redoAvailable));
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
    this.drawingController.updateDrawingMode(
      DrawingControlBarComponent.convertDrawingModeToEnum(drawingMode),
    );
  }

  onUndoClick() {
    this.drawingController.emitDoEvent(DoEvent.UNDO);
  }

  onRedoClick() {
    this.drawingController.emitDoEvent(DoEvent.REDO);
  }
}
