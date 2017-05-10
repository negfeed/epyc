import { Component } from '@angular/core';
import { NavParams } from 'ionic-angular';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map'

import { GameModel, GameModelInterface } from '../../providers/game-model/game-model';

interface DisplayUser {
  name: string;
  photoURL: string;
  joined: boolean;
  host: boolean;
}

interface DisplayUsers {
  [index: number]: DisplayUser;
}

@Component({
  selector: 'waiting-room-login',
  templateUrl: 'waiting-room.html'
})
export class WaitingRoomPage {

  private gameKey = '';
  private joinedUsers: Observable<DisplayUsers> = null;
  private watchingUsers: Observable<DisplayUsers> = null;

  constructor(
    navParams: NavParams,
    gameModel: GameModel) {
      this.gameKey = navParams.get('gameKey');
      let users = gameModel.loadInstance(this.gameKey).map(
        (gameInstance: GameModelInterface) => {
          let users = new Array<DisplayUser>();
          for (let uid in gameInstance.users) {
            let gameUser = gameInstance.users[uid];
            users.push({
              name: gameUser.displayName,
              photoURL: gameUser.photoURL,
              joined: gameUser.joined,
              host: uid == gameInstance.creator
            })
          }
          return users;
        });
      this.joinedUsers = users.map((displayUsers: DisplayUsers) => {
        return Object.keys(displayUsers).map((value, index, array) => {
          return displayUsers[value];
        }).filter((value: DisplayUser, index, array) => {
          return value.joined;
        })
      });
      this.watchingUsers = users.map((displayUsers: DisplayUsers) => {
        return Object.keys(displayUsers).map((value, index, array) => {
          return displayUsers[value];
        }).filter((value: DisplayUser, index, array) => {
          return !value.joined;
        })
      });
  }
}
