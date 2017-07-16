import { Component, Input, Output, EventEmitter } from '@angular/core';

import { DrawingCanvas } from '../drawing-canvas/drawing-canvas'
import { DrawingModel, DrawingModelInterface, DrawingEvent } from '../../providers/drawing-model/drawing-model';

@Component({
  selector: 'replaying-drawing-canvas',
  templateUrl: 'replaying-drawing-canvas.html'
})
export class ReplayingDrawingCanvas extends DrawingCanvas {

  private drawingEvents: Array<DrawingEvent> = null;
  private drawingIndex = 0;
  @Output() onFinishedDrawing = new EventEmitter<boolean>();

  @Input()
  set drawingKey(drawingKey: string) {
    if (drawingKey != '') {
      this.drawingModel.loadInstance(drawingKey)
          .first()
          .subscribe(
            (drawingModelInstance: DrawingModelInterface) => this.initializeDrawingState(drawingModelInstance));
    }
  }
  
  constructor(private drawingModel: DrawingModel) {
    super();
    console.log('Hello ReplayingDrawingCanvas Component');
  }

  private initializeDrawingState(drawingModelInstance: DrawingModelInterface) {
    this.drawingEvents = Object.keys(drawingModelInstance.drawingEvents)
        .map(key=>drawingModelInstance.drawingEvents[key]);
    this.startDrawing();
  }

  private startDrawing() {
    if (!this.drawingEvents || this.drawingEvents.length == 0) {
      this.onFinishedDrawing.emit(false);
      return;
    }
    this.processNextDrawingEvent();
  }

  private processNextDrawingEvent() {
    super.processDrawingEvent(this.drawingEvents[this.drawingIndex]);
    this.drawingIndex++;
    if (this.drawingIndex >= this.drawingEvents.length) {
      this.onFinishedDrawing.emit(true);
      return;
    }
    setTimeout(
        () => this.processNextDrawingEvent(),
        this.drawingEvents[this.drawingIndex].timestamp - this.drawingEvents[this.drawingIndex - 1].timestamp);
  }
}
