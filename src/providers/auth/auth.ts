import { Injectable } from '@angular/core';
import { Facebook, FacebookLoginResponse } from 'ionic-native';
import { AngularFire, AuthProviders, FirebaseAuthState, AuthMethods } from 'angularfire2';
import * as firebase from 'firebase';

export interface AuthUserInfo {
  uid: string;
  displayName: string;
  photoURL: string;
}

@Injectable()
export class Auth {

  // Indicates whether the user is logged in. This is not an authoritative source of login information. It only acts as
  // a cache of the last login state known to the module.
  private loggedIn: boolean = false;

  // The facebook login response.
  private facebookLoginResponse: FacebookLoginResponse = null;

  // The firebase user profile that is returned after sign in.
  private firebaseAuthState: FirebaseAuthState = null;

  constructor(private af: AngularFire) {
    console.log('Hello Account Provider');
  }
  
  /**
   * Gets the login status of the user.
   * 
   * This method will call the Facebook API to check the login status of the user. If the user is logged in, then the
   * user will be logged in to firebase.
   * 
   * @return A promise that is resolved if the user is logged in to both facebook and firebase successfully. Otherwise
   *     the promise is rejected.
   */
  public getLoginStatus(): firebase.Promise<any> {
    return Facebook.getLoginStatus().then(
      (response) => this.handleLoginStatusResponse(response),
      (error) => this.handleLoginError(error)
    );
  }

  /**
   * Attempts to login the user.
   * 
   * This method will call the Facebook API to attempt a user login. This will redirect the user to a Facebook login
   * dialog box. If the facebook login is successful, then the user will be logged in to firebase.
   * 
   * @return A promise that is resolved if the user is logged in to both facebook and firebase successfully. Otherwise
   *     the promise is rejected.
   */
  public doLogin(): firebase.Promise<any> {
    if (this.loggedIn) {
      return Promise.reject('User is already logged in.');
    }
    return Facebook.login(['public_profile', 'email']).then(
      (response) => this.handleLoginStatusResponse(response));
  }

  /**
   * Attempts to logout the user.
   * 
   * This method will log out the user out of both facebook and firebase.
   * 
   * @return A promise that is resolved if the logout was successful, or rejected if the logout was not successful.
   */
  public doLogout(): Promise<any> {
    if (!this.loggedIn) {
      return Promise.reject('User is not logged in.');
    }
    return Facebook.logout().then(() => {
      this.af.auth.logout();
      this.loggedIn = false;
    });
  }

  /** 
   * Gets the current logged in user information.
   * 
   * This method will return the locally cached user authentication information.
   * 
   * @return A promise that holds a user info interface of the interface type AuthUserInfo.
   */
  public getUserInfo(): Promise<AuthUserInfo> {
    if (!this.loggedIn) {
      return Promise.reject('Cannot get user info when the user is not logged in.');
    }
    return Promise.resolve({
      uid: this.firebaseAuthState.auth.uid,
      displayName: this.firebaseAuthState.auth.displayName,
      photoURL: this.firebaseAuthState.auth.photoURL,
    });
  }

  private handleLoginStatusResponse(response: FacebookLoginResponse): firebase.Promise<any> {
    if (response.status == 'connected') {
      this.facebookLoginResponse = response;
      console.log('facebook response: ' + this.facebookLoginResponse);
      let credential = firebase.auth.FacebookAuthProvider.credential(
          this.facebookLoginResponse.authResponse.accessToken);
      let authConfiguration = {
        provider: AuthProviders.Facebook,
        method: AuthMethods.OAuthToken
      }
      return this.af.auth.login(credential, authConfiguration).then(
        (response) => this.handleAngularFireSignInResponse(response),
        (error) => this.handleLoginError(error)
      )
    } else {
      this.loggedIn = false;
      return Promise.reject('facebook: ' + response.status);
    }
  }

  private handleAngularFireSignInResponse(authState: FirebaseAuthState): firebase.Promise<string> {
    this.firebaseAuthState = authState;
    this.loggedIn = true;
    return firebase.Promise.resolve();
  }

  private handleLoginError(error): string {
    this.loggedIn = false;
    console.log('error: ' + error);
    return error;
  }
}
