import { Component, Input, Output, EventEmitter } from '@angular/core';

import { DrawingCanvas } from '../drawing-canvas/drawing-canvas'
import { DrawingModel, DrawingModelInterface, DrawingEvent } from '../../providers/drawing-model/drawing-model';

@Component({
  selector: 'replaying-drawing-canvas',
  templateUrl: 'replaying-drawing-canvas.html'
})
export class ReplayingDrawingCanvas extends DrawingCanvas {

  private readonly MAXIMUM_EVENT_TIME_DIFFERENCE_IN_MILLIS: number = 1000;  // 1 second.
  private readonly REPLAY_PERIOD_IN_MILLIS: number = 33; // 33 milliseconds.

  private drawingEvents: Array<DrawingEvent> = null;
  private drawingIndex = 0;
  @Output() onFinishedDrawing = new EventEmitter<boolean>();

  private totalReplayPeriods: number;
  private replayPeriodCounter: number;

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
        if (timestampDifference > this.MAXIMUM_EVENT_TIME_DIFFERENCE_IN_MILLIS) {
          timestampDifference = this.MAXIMUM_EVENT_TIME_DIFFERENCE_IN_MILLIS;
        }
        processedDrawingEvents[index].timestamp = processedDrawingEvents[index - 1].timestamp + timestampDifference;
      }
    });
    this.drawingEvents = processedDrawingEvents;
  }

  private initializePeriodicReplayer() {
    let lastTimestamp = 0;
    if (this.drawingEvents && this.drawingEvents.length > 0) {
      lastTimestamp = this.drawingEvents[this.drawingEvents.length - 1].timestamp;
    }
    this.replayPeriodCounter = 0;
    this.totalReplayPeriods = Math.ceil(lastTimestamp / this.REPLAY_PERIOD_IN_MILLIS);
  }

  private initializeDrawingState(drawingModelInstance: DrawingModelInterface) {
    this.drawingEvents = Object.keys(drawingModelInstance.drawingEvents)
        .map(key=>drawingModelInstance.drawingEvents[key]);
    this.preprocessDrawingEvents();
    this.initializePeriodicReplayer();
    this.startDrawing();
  }

  private startDrawing() {
    if (!this.drawingEvents || this.drawingEvents.length == 0) {
      this.updateProgress(100);
      this.onFinishedDrawing.emit(false);
      return;
    }
    this.processNextDrawingPeriod();
  }

  private processNextDrawingPeriod() {

    let currentTimestamp = this.replayPeriodCounter * this.REPLAY_PERIOD_IN_MILLIS;

    for (; this.drawingIndex < this.drawingEvents.length; this.drawingIndex++) {
      if (this.drawingEvents[this.drawingIndex].timestamp <= currentTimestamp) {
        super.processDrawingEvent(this.drawingEvents[this.drawingIndex]);
      } else {
        break;
      }
    }

    if (this.replayPeriodCounter == this.totalReplayPeriods) {
      this.updateProgress(100);
      this.onFinishedDrawing.emit(true);
      return;
    }

    this.replayPeriodCounter++;
    this.updateProgress(100 * (this.replayPeriodCounter / this.totalReplayPeriods));
    
    setTimeout(
        () => this.processNextDrawingPeriod(),
        this.REPLAY_PERIOD_IN_MILLIS);
  }
}
