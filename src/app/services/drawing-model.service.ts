import { Injectable, inject } from '@angular/core';
import { Database, ref, objectVal, push, set } from '@angular/fire/database';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface NormalizedCoordinates {
  x: number;
  y: number;
}

export interface PointDrawingEvent {
  type: 'point';
  timestamp: number;
  pathName: string;
  point: NormalizedCoordinates;
}

export interface EraseDrawingEvent {
  type: 'erase';
  timestamp: number;
  pathName: string;
  point: NormalizedCoordinates;
}

export interface UndoDrawingEvent {
  type: 'undo';
  timestamp: number;
}

export interface RedoDrawingEvent {
  type: 'redo';
  timestamp: number;
}

export type DrawingEvent = PointDrawingEvent | EraseDrawingEvent | UndoDrawingEvent | RedoDrawingEvent;

export interface DrawingEvents extends Array<DrawingEvent> {}

export interface DrawingModelInterface {
  drawingEvents: DrawingEvents;
}

/**
 * Appends individual drawing events to a drawing's `drawingEvents` list. Under
 * the modular SDK each indexed child is written with `set()` (the legacy
 * FirebaseListObservable.update(index, value) had the same semantics).
 */
export class DrawingEventList {
  constructor(
    private db: Database,
    private basePath: string,
  ) {}

  public storeDrawingEvent(drawingEvent: DrawingEvent, index: number) {
    set(ref(this.db, `${this.basePath}/${index}`), drawingEvent);
  }
}

@Injectable({ providedIn: 'root' })
export class DrawingModel {
  private readonly INSTANCES_PATH = '/drawings';
  private db = inject(Database);

  public createInstance(): string {
    const drawingInstance: DrawingModelInterface = { drawingEvents: [] };
    return push(ref(this.db, this.INSTANCES_PATH), drawingInstance).key as string;
  }

  public loadInstance(key: string): Observable<DrawingModelInterface> {
    return objectVal<DrawingModelInterface>(ref(this.db, `${this.INSTANCES_PATH}/${key}`)).pipe(
      // A freshly created drawing has no `drawingEvents` node yet (RTDB drops
      // empty collections), so objectVal emits null. Normalise to a safe shape.
      map((instance) => instance ?? { drawingEvents: [] }),
    );
  }

  public loadDrawingEvents(key: string): DrawingEventList {
    return new DrawingEventList(this.db, `${this.INSTANCES_PATH}/${key}/drawingEvents`);
  }
}
