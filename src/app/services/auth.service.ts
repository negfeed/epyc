import { Injectable, inject } from '@angular/core';
import {
  Auth as FireAuth,
  authState,
  signInWithPopup,
  signInWithCredential,
  signOut,
  GoogleAuthProvider,
  OAuthProvider,
  User,
} from '@angular/fire/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { BehaviorSubject, Observable } from 'rxjs';
import { first } from 'rxjs/operators';

export type AuthProviderId = 'google' | 'apple';

export interface AuthUserInfo {
  uid: string;
  displayName: string;
  photoURL: string;
}

/**
 * Authentication service backed by Firebase Auth.
 *
 * The legacy app authenticated via the (now abandoned) Facebook Cordova plugin.
 * Per the migration plan, social login moved to Google + Apple:
 *  - On the web, the Firebase JS SDK popup flow is used.
 *  - On native (iOS/Android), @capacitor-firebase/authentication performs the
 *    native sign-in and the resulting credential is synced into the JS SDK so
 *    the rest of the app (which reads @angular/fire auth state) keeps working.
 */
@Injectable({ providedIn: 'root' })
export class Auth {
  private fireAuth = inject(FireAuth);

  // Cache of the last known auth state (mirrors the legacy `loggedIn` flag).
  private loggedIn = false;
  private currentUser: User | null = null;

  // Single source of truth for the signed-in state. Fed by the one authState
  // subscription below so that `currentUser`/`loggedIn` are always updated
  // before subscribers are notified (avoids cross-subscription ordering races).
  private signedIn$ = new BehaviorSubject<boolean>(false);

  constructor() {
    authState(this.fireAuth).subscribe((user) => {
      this.currentUser = user;
      this.loggedIn = user != null;
      this.signedIn$.next(this.loggedIn);
    });
  }

  /** Emits whether a user is currently signed in. */
  public getSignedIn(): Observable<boolean> {
    return this.signedIn$.asObservable();
  }

  /**
   * Resolves if a session is already active (used on app startup to restore the
   * previous session), and rejects otherwise.
   */
  public getLoginStatus(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      authState(this.fireAuth)
        .pipe(first())
        .subscribe({
          next: (user) => {
            if (user) {
              this.currentUser = user;
              this.loggedIn = true;
              resolve();
            } else {
              this.loggedIn = false;
              reject('No active session.');
            }
          },
          error: (err) => reject(err),
        });
    });
  }

  /** Attempts to sign the user in with the given provider. */
  public doLogin(providerId: AuthProviderId): Promise<void> {
    if (this.loggedIn) {
      return Promise.reject('User is already logged in.');
    }
    if (Capacitor.isNativePlatform()) {
      return this.nativeLogin(providerId);
    }
    return this.webLogin(providerId);
  }

  private webLogin(providerId: AuthProviderId): Promise<void> {
    const provider =
      providerId === 'google' ? new GoogleAuthProvider() : new OAuthProvider('apple.com');
    if (providerId === 'apple') {
      (provider as OAuthProvider).addScope('email');
      (provider as OAuthProvider).addScope('name');
    }
    return signInWithPopup(this.fireAuth, provider).then((credential) => {
      this.currentUser = credential.user;
      this.loggedIn = true;
    });
  }

  private async nativeLogin(providerId: AuthProviderId): Promise<void> {
    const result =
      providerId === 'google'
        ? await FirebaseAuthentication.signInWithGoogle()
        : await FirebaseAuthentication.signInWithApple();

    const idToken = result.credential?.idToken;
    let credential;
    if (providerId === 'google') {
      credential = GoogleAuthProvider.credential(idToken);
    } else {
      const provider = new OAuthProvider('apple.com');
      credential = provider.credential({ idToken, rawNonce: result.credential?.nonce });
    }
    const userCredential = await signInWithCredential(this.fireAuth, credential);
    this.currentUser = userCredential.user;
    this.loggedIn = true;
  }

  /** Signs the user out of both the native layer (if any) and the JS SDK. */
  public doLogout(): Promise<void> {
    if (!this.loggedIn) {
      return Promise.reject('User is not logged in.');
    }
    const tasks: Array<Promise<void>> = [signOut(this.fireAuth)];
    if (Capacitor.isNativePlatform()) {
      tasks.push(FirebaseAuthentication.signOut());
    }
    return Promise.all(tasks).then(() => {
      this.loggedIn = false;
      this.currentUser = null;
    });
  }

  /** Returns the locally cached user info, throwing if not signed in. */
  public getUserInfo(): AuthUserInfo {
    if (!this.loggedIn || !this.currentUser) {
      throw new Error('Cannot get user info when the user is not logged in.');
    }
    return {
      uid: this.currentUser.uid,
      displayName: this.currentUser.displayName,
      photoURL: this.currentUser.photoURL,
    };
  }
}
