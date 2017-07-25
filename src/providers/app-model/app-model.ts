import { Injectable } from '@angular/core';
import { AngularFireDatabase, FirebaseObjectObservable } from 'angularfire2/database';
import { Observable } from 'rxjs/Observable';
import * as firebase from 'firebase/app';

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

@Injectable()
export class AppModel {

  private readonly INSTANCES_PATH: string = "/users";

  constructor(private AngularFireDatabase: AngularFireDatabase) {}

  public loadInstance(key: string): FirebaseObjectObservable<AppModelInterface> {
    const object = this.AngularFireDatabase.object(this.INSTANCES_PATH + '/' + key);
    const appInstance: AppModelInterface = { last_checkin_timestamp_ms: Date.now() };
    object.update(appInstance);
    return object;
  }

  public checkIn(key: string): firebase.Promise<any> {
    return this.AngularFireDatabase.object(`${this.INSTANCES_PATH}/${key}`)
        .update({ last_checkin_timestamp_ms: Date.now() });
  }

  public insertJoinGame(key: string, gameInstanceReference: string) {
    let gameObservable: FirebaseObjectObservable<Game> = this.AngularFireDatabase.object(
        `${this.INSTANCES_PATH}/${key}/games/${gameInstanceReference}`);
    gameObservable.first().subscribe((game: Game) => {
      if (!game.join_timestamp_ms) {
        gameObservable.update({ join_timestamp_ms: Date.now() });
      }
    });
  }

  public queryLastFewGames(key: string): Observable<Game[]> {
    return this.AngularFireDatabase.list(`${this.INSTANCES_PATH}/${key}/games`, {
      query: {
        orderByChild: 'join_timestamp_ms',
        limitToLast: 3
      }
    });
  }
}
