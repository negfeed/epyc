import { Injectable } from '@angular/core';
import { AngularFireDatabase, FirebaseObjectObservable } from 'angularfire2/database';

export interface AppModelInterface {
  $key?: string;
  $value?: ( number | string | boolean );
  last_checkin_timestamp_ms?: number;
}

@Injectable()
export class AppModel {

  private readonly INSTANCES_PATH: string = "/instances";

  constructor(private AngularFireDatabase: AngularFireDatabase) {}

  public loadInstance(key: string): FirebaseObjectObservable<AppModelInterface> {
    const object = this.AngularFireDatabase.object(this.INSTANCES_PATH + '/' + key);
    const appInstance: AppModelInterface = {last_checkin_timestamp_ms: Date.now()};
    object.update(appInstance);
    return object;
  }
}
