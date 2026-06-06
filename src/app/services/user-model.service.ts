import { Injectable, inject } from '@angular/core';
import {
  Database,
  ref,
  objectVal,
  listVal,
  update,
  query,
  orderByChild,
  limitToLast,
} from '@angular/fire/database';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';

export interface Game {
  $key?: string;
  join_timestamp_ms: number;
}

export interface Games {
  [index: string]: Game;
}

export interface AppModelInterface {
  $key?: string;
  $value?: number | string | boolean;
  last_checkin_timestamp_ms?: number;
  games?: Games;
}

@Injectable({ providedIn: 'root' })
export class UserModel {
  private readonly INSTANCES_PATH = '/users';
  private db = inject(Database);

  public loadInstance(key: string): Observable<AppModelInterface> {
    const path = `${this.INSTANCES_PATH}/${key}`;
    // Touch the check-in timestamp as a side effect (matches legacy behaviour).
    update(ref(this.db, path), { last_checkin_timestamp_ms: Date.now() });
    return objectVal<AppModelInterface>(ref(this.db, path), { keyField: '$key' });
  }

  public checkIn(key: string): Promise<void> {
    return update(ref(this.db, `${this.INSTANCES_PATH}/${key}`), {
      last_checkin_timestamp_ms: Date.now(),
    });
  }

  public insertJoinGame(key: string, gameInstanceReference: string): void {
    const path = `${this.INSTANCES_PATH}/${key}/games/${gameInstanceReference}`;
    objectVal<Game>(ref(this.db, path))
      .pipe(first())
      .subscribe((game: Game | null) => {
        if (!game || !game.join_timestamp_ms) {
          update(ref(this.db, path), { join_timestamp_ms: Date.now() });
        }
      });
  }

  public queryLastFewGames(key: string): Observable<Game[]> {
    return listVal<Game>(
      query(
        ref(this.db, `${this.INSTANCES_PATH}/${key}/games`),
        orderByChild('join_timestamp_ms'),
        limitToLast(3),
      ),
      { keyField: '$key' },
    );
  }
}
