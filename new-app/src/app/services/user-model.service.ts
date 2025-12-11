import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

export interface Game {
  $key?: string;
  join_timestamp_ms: number;
}

export interface Games {
  [index: string]: Game;
}

export interface AppModelInterface {
  $key?: string;
  $value?: ( number | string | boolean );
  last_checkin_timestamp_ms?: number;
  games?: Games;
}

@Injectable({
  providedIn: 'root'
})
export class UserModel {

  private readonly INSTANCES_PATH: string = "/users";

  constructor(private db: AngularFireDatabase) {}

  public loadInstance(key: string): Observable<AppModelInterface | null> {
    const object = this.db.object<AppModelInterface>(this.INSTANCES_PATH + '/' + key);
    const appInstance: Partial<AppModelInterface> = { last_checkin_timestamp_ms: Date.now() };
    object.update(appInstance);
    return object.valueChanges();
  }

  public checkIn(key: string): Promise<void> {
    return this.db.object(`${this.INSTANCES_PATH}/${key}`)
        .update({ last_checkin_timestamp_ms: Date.now() });
  }

  public insertJoinGame(key: string, gameInstanceReference: string) {
    const path = `${this.INSTANCES_PATH}/${key}/games/${gameInstanceReference}`;
    const gameObservable = this.db.object<Game>(path);

    gameObservable.valueChanges().pipe(take(1)).subscribe((game: Game | null) => {
      if (!game || !game.join_timestamp_ms) {
        gameObservable.update({ join_timestamp_ms: Date.now() });
      }
    });
  }

  public queryLastFewGames(key: string): Observable<Game[]> {
    return this.db.list<Game>(`${this.INSTANCES_PATH}/${key}/games`, ref =>
      ref.orderByChild('join_timestamp_ms').limitToLast(3)
    ).snapshotChanges().pipe(
      map(changes =>
        changes.map(c => ({ $key: c.key, ...c.payload.val() } as Game))
      )
    );
  }
}
