import { Injectable, EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  docData,
  setDoc,
  updateDoc,
  arrayUnion,
} from '@angular/fire/firestore';
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
 * Appends drawing events to a drawing's single Firestore document. Each drawing
 * is one `drawings/{id}` document whose `drawingEvents` array grows as the user
 * draws (well within Firestore's 1MB/document limit for this game's drawings).
 */
export class DrawingEventList {
  constructor(
    private db: Firestore,
    private drawingId: string,
    private run: <T>(fn: () => T) => T,
  ) {}

  public storeDrawingEvent(drawingEvent: DrawingEvent) {
    this.run(() =>
      updateDoc(doc(this.db, 'drawings', this.drawingId), {
        drawingEvents: arrayUnion(drawingEvent),
      }),
    );
  }
}

@Injectable({ providedIn: 'root' })
export class DrawingModel {
  private readonly COLLECTION = 'drawings';
  private db = inject(Firestore);
  private injector = inject(EnvironmentInjector);

  // See GameModel.run — keeps @angular/fire observables/promises on the Angular zone.
  private run = <T>(fn: () => T): T => runInInjectionContext(this.injector, fn);

  public createInstance(): string {
    const ref = doc(collection(this.db, this.COLLECTION));
    this.run(() => setDoc(ref, { drawingEvents: [] }));
    return ref.id;
  }

  public loadInstance(key: string): Observable<DrawingModelInterface> {
    return this.run(
      () => docData(doc(this.db, this.COLLECTION, key)) as Observable<DrawingModelInterface>,
    ).pipe(map((instance) => instance ?? { drawingEvents: [] }));
  }

  public loadDrawingEvents(key: string): DrawingEventList {
    return new DrawingEventList(this.db, key, this.run);
  }
}
