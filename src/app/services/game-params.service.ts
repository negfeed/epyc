import { Injectable } from '@angular/core';

/**
 * Replacement for Ionic 3's `NavParams`.
 *
 * Ionic 3 navigation passed arbitrary objects between pages via
 * `NavController.push('PageName', params)`. Angular Router only carries
 * serialisable values in the URL, so transient/complex parameters
 * (atomAddress, word, drawingKey, the loaded gameInstance, threadIndex) are
 * stashed here by the GameNavigationController right before navigation and read
 * back by the destination page. `gameKey` itself travels in the route URL.
 */
@Injectable({ providedIn: 'root' })
export class GameParams {
  private store: { [key: string]: any } = {};

  set(params: { [key: string]: any }): void {
    this.store = { ...this.store, ...params };
  }

  get<T = any>(key: string): T {
    return this.store[key] as T;
  }

  clear(): void {
    this.store = {};
  }
}
