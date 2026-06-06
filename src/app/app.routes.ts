import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'game/:gameKey/waiting-room',
    loadComponent: () =>
      import('./pages/waiting-room/waiting-room.page').then((m) => m.WaitingRoomPage),
  },
  {
    path: 'game/:gameKey/wait-turn',
    loadComponent: () => import('./pages/wait-turn/wait-turn.page').then((m) => m.WaitTurnPage),
  },
  {
    path: 'game/:gameKey/draw',
    loadComponent: () => import('./pages/draw/draw.page').then((m) => m.DrawPage),
  },
  {
    path: 'game/:gameKey/guess',
    loadComponent: () => import('./pages/guess/guess.page').then((m) => m.GuessPage),
  },
  {
    path: 'game/:gameKey/wait-game-to-end',
    loadComponent: () =>
      import('./pages/wait-game-to-end/wait-game-to-end.page').then((m) => m.WaitGameToEndPage),
  },
  {
    path: 'game/:gameKey/results',
    loadComponent: () =>
      import('./pages/game-results/game-results.page').then((m) => m.GameResultsPage),
  },
  {
    path: 'game/:gameKey/results/:threadIndex',
    loadComponent: () =>
      import('./pages/thread-results/thread-results.page').then((m) => m.ThreadResultsPage),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
