import { Injectable } from '@angular/core';
import { AngularFireDatabase, FirebaseObjectObservable, FirebaseListObservable } from 'angularfire2/database';
import { Observable } from 'rxjs/Observable';

import { Auth } from '../auth/auth';

export interface NormalizedCoordinates {
  x: number;
  y: number;
}

export interface PauseEvent {
  type: 'pause';
  timestamp: number;
}

export interface ResumeEvent {
  type: 'resume';
  timestamp: number;
}

export interface DotDrawingEvent {
  type: 'dot';
  timestamp: number;
  location: NormalizedCoordinates;
}

export interface LineDrawingEvent {
  type: 'line';
  timestamp: number;
  start: NormalizedCoordinates;
  end: NormalizedCoordinates;
}

export type DrawingEvent = DotDrawingEvent | LineDrawingEvent | PauseEvent | ResumeEvent;

export interface DrawingEvents extends Array<DrawingEvent> {}

export interface DrawingModelInterface {
  drawingEvents: DrawingEvents
}

export class DrawingEventList {
  constructor(private drawingEventList: FirebaseListObservable<DrawingEvents>) {}

  public storeDrawingEvent(drawingEvent: DrawingEvent, index: number) {
    this.drawingEventList.update(index.toString(), drawingEvent);
  }
}

@Injectable()
export class DrawingModel {

  private readonly INSTANCES_PATH: string = "/drawings";

  constructor(private angularFireDatabase: AngularFireDatabase, private auth: Auth) {
    console.log('Hello DrawingModel Provider');
  }

  public createInstance(): string {
    var drawingInstance: DrawingModelInterface = {
      drawingEvents: []
    };
    return this.angularFireDatabase.list(this.INSTANCES_PATH).push(drawingInstance).key;
  }

  private _loadInstance(key: string): FirebaseObjectObservable<DrawingModelInterface> {
    return this.angularFireDatabase.object(this.INSTANCES_PATH + '/' + key);
  }

  public loadInstance(key: string): Observable<DrawingModelInterface> {
    return this._loadInstance(key);
  }

  public loadDrawingEvents(key: string): DrawingEventList {
    return new DrawingEventList(this.angularFireDatabase.list(`${this.INSTANCES_PATH }/${key}/drawingEvents/`));
  }
}
