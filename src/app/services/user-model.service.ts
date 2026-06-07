import { Injectable, EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  docData,
  collectionData,
  setDoc,
  getDoc,
  query,
  orderBy,
  limit,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Game {
  $key?: string;
  join_timestamp_ms: number;
}

export interface AppModelInterface {
  $key?: string;
  last_checkin_timestamp_ms?: number;
}

/**
 * Per-user data in Firestore: a `users/{uid}` document holding the last check-in,
 * plus a `users/{uid}/games` subcollection recording when the user joined each
 * game (used for the "Last Few Games" list).
 */
@Injectable({ providedIn: 'root' })
export class UserModel {
  private readonly COLLECTION = 'users';
  private db = inject(Firestore);
  private injector = inject(EnvironmentInjector);

  // See GameModel.run — keeps @angular/fire observables/promises on the Angular zone.
  private run<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  public loadInstance(key: string): Observable<AppModelInterface> {
    const ref = doc(this.db, this.COLLECTION, key);
    this.run(() => setDoc(ref, { last_checkin_timestamp_ms: Date.now() }, { merge: true }));
    return this.run(() => docData(ref, { idField: '$key' }) as Observable<AppModelInterface>);
  }

  public checkIn(key: string): Promise<void> {
    return this.run(() =>
      setDoc(
        doc(this.db, this.COLLECTION, key),
        { last_checkin_timestamp_ms: Date.now() },
        { merge: true },
      ),
    );
  }

  public insertJoinGame(key: string, gameInstanceReference: string): void {
    const ref = doc(this.db, this.COLLECTION, key, 'games', gameInstanceReference);
    this.run(() => getDoc(ref)).then((snapshot) => {
      const game = snapshot.data() as Game | undefined;
      if (!game || !game.join_timestamp_ms) {
        this.run(() => setDoc(ref, { join_timestamp_ms: Date.now() }, { merge: true }));
      }
    });
  }

  public queryLastFewGames(key: string): Observable<Game[]> {
    return this.run(
      () =>
        collectionData(
          query(
            collection(this.db, this.COLLECTION, key, 'games'),
            orderBy('join_timestamp_ms', 'desc'),
            limit(3),
          ),
          { idField: '$key' },
        ) as Observable<Game[]>,
    );
  }
}
