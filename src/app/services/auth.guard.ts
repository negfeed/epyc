import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth as FireAuth, authState } from '@angular/fire/auth';
import { map, take } from 'rxjs/operators';

/**
 * Route guard for authenticated pages. Waits for the first real Firebase auth
 * state (which resolves restored sessions), then allows the navigation or
 * redirects to /login while preserving the originally requested URL as
 * `returnUrl`. This is what lets a shared/deep-linked game URL survive sign-in
 * instead of being bounced to /home.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const fireAuth = inject(FireAuth);
  const router = inject(Router);
  return authState(fireAuth).pipe(
    take(1),
    map((user) =>
      user
        ? true
        : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }),
    ),
  );
};
