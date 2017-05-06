import { Injectable } from '@angular/core';
import { AngularFireDatabase } from 'angularfire2/database';
import { Observable } from 'rxjs/Observable';

export interface GameModelInterface {
  $key?: string;
  $value?: ( number | string | boolean );
  creation_timestamp_ms?: number;
}

@Injectable()
export class GameModel {

  private readonly INSTANCES_PATH: string = "/games";

  constructor(private angularFireDatabase: AngularFireDatabase) {}

  public createInstance(): string {
    const instances = this.angularFireDatabase.list(this.INSTANCES_PATH);
    var gameInstance: GameModelInterface = {creation_timestamp_ms: Date.now()};
    return instances.push(gameInstance).key;
  }

  public loadInstance(key: string): Observable<GameModelInterface> {
    return this.angularFireDatabase.object(this.INSTANCES_PATH + '/' + key);
  }
}