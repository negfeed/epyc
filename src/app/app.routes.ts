import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'game/:gameKey/waiting-room',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/waiting-room/waiting-room.page').then((m) => m.WaitingRoomPage),
  },
  {
    // Thread index in the URL keeps each wait-turn a distinct page instance, so
    // revisiting it across turns gets a fresh component instead of a stale cache.
    path: 'game/:gameKey/wait-turn/:threadIndex',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/wait-turn/wait-turn.page').then((m) => m.WaitTurnPage),
  },
  {
    // Atom address in the URL makes every draw round a distinct page instance
    // (a player draws more than once per game), avoiding stale reuse of an
    // earlier round's page/canvas/word.
    path: 'game/:gameKey/draw/:threadIndex/:atomIndex',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/draw/draw.page').then((m) => m.DrawPage),
  },
  {
    path: 'game/:gameKey/guess/:threadIndex/:atomIndex',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/guess/guess.page').then((m) => m.GuessPage),
  },
  {
    path: 'game/:gameKey/wait-game-to-end',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/wait-game-to-end/wait-game-to-end.page').then((m) => m.WaitGameToEndPage),
  },
  {
    path: 'game/:gameKey/results',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/game-results/game-results.page').then((m) => m.GameResultsPage),
  },
  {
    path: 'game/:gameKey/results/:threadIndex',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/thread-results/thread-results.page').then((m) => m.ThreadResultsPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
