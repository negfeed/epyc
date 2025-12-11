import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService, AuthUserInfo } from '../../services/auth.service';
import { UserModel, Game } from '../../services/user-model.service';
import { GameModelService } from '../../services/game-model.service';

interface GameLink {
  gameInstanceReference: string;
  join_timestamp_ms: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {

  public gameLinks$: Observable<Array<GameLink>> | null = null;
  public userName: string = '';
  public userPhotoUrl: string = '';

  constructor(
      private auth: AuthService,
      private userModel: UserModel,
      private gameModel: GameModelService,
      private router: Router
  ) {}

  ngOnInit() {
    try {
      let authUserInfo: AuthUserInfo = this.auth.getUserInfo();
      this.userName = authUserInfo.displayName;
      this.userPhotoUrl = authUserInfo.photoURL;
      this.gameLinks$ = this.userModel.queryLastFewGames(authUserInfo.uid)
          .pipe(
            map((gameList: Game[]) => {
              let gameLinks: Array<GameLink> = [];
              gameList.forEach((game: Game) => {
                if (game.$key) {
                  gameLinks.push({ gameInstanceReference: game.$key, join_timestamp_ms: game.join_timestamp_ms });
                }
              })
              return gameLinks;
            })
          );
    } catch (e) {
      console.log('User not logged in, redirecting...');
      this.router.navigate(['/login']);
    }
  }

  ionViewDidEnter() {
    console.log('ionViewDidEnter HomePage');
    try {
      let authUserInfo: AuthUserInfo = this.auth.getUserInfo();
      this.userModel.checkIn(authUserInfo.uid);
    } catch (e) {
      // Handle case where user refreshes page and auth state isn't ready immediately
      // In a real app, an AuthGuard should handle this.
    }
  }

  doNewGame() {
    let gameKey: string = this.gameModel.createInstance();
    this.goToGame(gameKey);
  }

  goToGame(gameKey: string) {
    // We haven't created the GamePage yet, so we'll route to a placeholder or just log it.
    // this.router.navigate(['/game', gameKey]);
    console.log('Navigate to game: ' + gameKey);
  }
}
