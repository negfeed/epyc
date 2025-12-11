import { Injectable } from '@angular/core';
import { FacebookLogin, FacebookLoginResponse } from '@capacitor-community/facebook-login';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import firebase from 'firebase/compat/app';

export interface AuthUserInfo {
  uid: string;
  displayName: string;
  photoURL: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private loggedIn: boolean = false;
  private currentUser: firebase.User | null = null;
  private signedIn: Observable<boolean>;

  constructor(private afa: AngularFireAuth) {
    this.signedIn = this.afa.authState.pipe(
      map(user => {
        this.currentUser = user;
        this.loggedIn = !!user;
        return !!user;
      })
    );
  }

  public getLoginStatus(): Promise<any> {
    // Check internal firebase auth state first
    return this.afa.currentUser.then(user => {
      if (user) {
        this.currentUser = user;
        this.loggedIn = true;
        return user;
      } else {
        return Promise.reject('Not logged in');
      }
    });
  }

  public async doLogin(): Promise<any> {
    if (this.loggedIn) {
      return Promise.reject('User is already logged in.');
    }

    try {
      const result = await FacebookLogin.login({ permissions: ['public_profile', 'email'] });

      if (result.accessToken) {
        // Build Firebase credential with the Facebook access token.
        const credential = firebase.auth.FacebookAuthProvider.credential(result.accessToken.token);

        // Sign in with credential from the Facebook user.
        return this.afa.signInWithCredential(credential).then(userCredential => {
            this.currentUser = userCredential.user;
            this.loggedIn = true;
            return userCredential;
        });
      } else {
        return Promise.reject('Facebook login failed');
      }
    } catch (error) {
      console.error(error);
      return Promise.reject(error);
    }
  }

  public doLogout(): Promise<any> {
    return this.afa.signOut().then(() => {
        return FacebookLogin.logout().then(() => {
            this.loggedIn = false;
            this.currentUser = null;
        });
    });
  }

  public getUserInfo(): AuthUserInfo {
    if (!this.loggedIn || !this.currentUser) {
      throw new Error('Cannot get user info when the user is not logged in.');
    }
    return {
      uid: this.currentUser.uid,
      displayName: this.currentUser.displayName || '',
      photoURL: this.currentUser.photoURL || '',
    };
  }

  public getSignedIn(): Observable<boolean> {
    return this.signedIn;
  }
}
