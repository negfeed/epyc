import { TestBed } from '@angular/core/testing';
import { Auth as FireAuth } from '@angular/fire/auth';

import { Auth } from './auth.service';

/**
 * These tests exercise the provider-agnostic logic of the Auth service (state
 * tracking, guards, logout) by mocking the injected Firebase `Auth` instance.
 *
 * rxfire's `authState(auth)` calls `auth.onAuthStateChanged(next, ...)` and the
 * modular `signOut(auth)` calls `auth.signOut()`, so a plain object mock is
 * enough — no real Firebase app is initialised. The mock mirrors Firebase by
 * firing the current user immediately on registration, which keeps it robust
 * against @angular/fire's async (subscribeOn/observeOn) scheduling of authState.
 *
 * The actual Google/Apple sign-in flows (signInWithPopup /
 * @capacitor-firebase/authentication) depend on external module functions and
 * are validated manually rather than unit-tested.
 */
describe('An auth service', () => {
  let auth: Auth;
  let authStateCallbacks: Array<(user: unknown) => void>;
  let currentMockUser: unknown;
  let signOutSpy: jasmine.Spy;
  let fireAuthMock: { onAuthStateChanged: unknown; signOut: jasmine.Spy };

  const FIREBASE_USER = {
    uid: 'f2if24k2xksdfw',
    displayName: 'Mohammad Shamma',
    photoURL: 'http://fake.com/photo/12345',
  };

  // Simulates an auth-state change: updates the cached value and notifies all
  // currently-registered listeners.
  function setUser(user: unknown) {
    currentMockUser = user;
    authStateCallbacks.forEach((cb) => cb(user));
  }

  beforeEach(() => {
    authStateCallbacks = [];
    currentMockUser = null;
    signOutSpy = jasmine.createSpy('signOut').and.returnValue(Promise.resolve());
    fireAuthMock = {
      onAuthStateChanged: (next: (user: unknown) => void) => {
        authStateCallbacks.push(next);
        // Firebase fires the current state immediately upon registration.
        next(currentMockUser);
        return () => {
          const index = authStateCallbacks.indexOf(next);
          if (index >= 0) authStateCallbacks.splice(index, 1);
        };
      },
      signOut: signOutSpy,
    };
    TestBed.configureTestingModule({
      providers: [{ provide: FireAuth, useValue: fireAuthMock }, Auth],
    });
    auth = TestBed.inject(Auth);
  });

  it('should throw when getting user info while signed out.', () => {
    expect(() => auth.getUserInfo()).toThrowError(
      'Cannot get user info when the user is not logged in.',
    );
  });

  it('should report signed-in state and expose user info after an auth change.', (done) => {
    auth.getSignedIn().subscribe((signedIn) => {
      if (signedIn) {
        expect(auth.getUserInfo().uid).toEqual(FIREBASE_USER.uid);
        done();
      }
    });
    setUser(FIREBASE_USER);
  });

  it('should reject doLogin when already logged in.', (done) => {
    auth.getSignedIn().subscribe((signedIn) => {
      if (signedIn) {
        auth.doLogin('google').catch((error) => {
          expect(error).toEqual('User is already logged in.');
          done();
        });
      }
    });
    setUser(FIREBASE_USER);
  });

  it('should reject doLogout when not logged in.', (done) => {
    auth.doLogout().catch((error) => {
      expect(error).toEqual('User is not logged in.');
      done();
    });
  });

  it('should log out via the JS SDK when signed in.', (done) => {
    auth.getSignedIn().subscribe((signedIn) => {
      if (signedIn) {
        auth.doLogout().then(() => {
          expect(signOutSpy).toHaveBeenCalledTimes(1);
          expect(() => auth.getUserInfo()).toThrowError(
            'Cannot get user info when the user is not logged in.',
          );
          done();
        });
      }
    });
    setUser(FIREBASE_USER);
  });

  it('should resolve getLoginStatus when a session is active.', (done) => {
    currentMockUser = FIREBASE_USER; // simulate an existing session
    auth.getLoginStatus().then(() => {
      expect(auth.getUserInfo().uid).toEqual(FIREBASE_USER.uid);
      done();
    });
  });

  it('should reject getLoginStatus when there is no session.', (done) => {
    auth.getLoginStatus().catch((error) => {
      expect(error).toEqual('No active session.');
      done();
    });
  });
});
