import { Component, Input, Output, EventEmitter } from '@angular/core';

import { DrawingCanvas } from '../drawing-canvas/drawing-canvas'
import { DrawingModel, DrawingModelInterface, DrawingEvent } from '../../providers/drawing-model/drawing-model';

@Component({
  selector: 'replaying-drawing-canvas',
  templateUrl: 'replaying-drawing-canvas.html'
})
export class ReplayingDrawingCanvas extends DrawingCanvas {

  private readonly MAXIMUM_EVENT_TIME_DIFFERENCE: number = 1000;  // 1 second.

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

  private preprocessDrawingEvents() {
    let processedDrawingEvents: Array<DrawingEvent> = [];
    let initialTimestamp: number;
    this.drawingEvents.forEach((drawingEvent: DrawingEvent, index: number, drawingEvents: Array<DrawingEvent>) => {
      processedDrawingEvents[index] = Object.assign({}, drawingEvent);
      if (index == 0) {
        processedDrawingEvents[index].timestamp = 0;
        initialTimestamp = drawingEvent.timestamp;
      } else {
        let timestampDifference = drawingEvent.timestamp - drawingEvents[index - 1].timestamp;
        if (timestampDifference > this.MAXIMUM_EVENT_TIME_DIFFERENCE) {
          timestampDifference = this.MAXIMUM_EVENT_TIME_DIFFERENCE;
        }
        processedDrawingEvents[index].timestamp = processedDrawingEvents[index - 1].timestamp + timestampDifference;
      }
    });
    this.drawingEvents = processedDrawingEvents;
  }

  private initializeDrawingState(drawingModelInstance: DrawingModelInterface) {
    this.drawingEvents = Object.keys(drawingModelInstance.drawingEvents)
        .map(key=>drawingModelInstance.drawingEvents[key]);
    this.preprocessDrawingEvents();
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
