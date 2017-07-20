import { Injectable, Inject } from '@angular/core';
import { Facebook, FacebookLoginResponse } from '@ionic-native/facebook';
import { AngularFireAuth } from 'angularfire2/auth';
import { FirebaseApp } from 'angularfire2';
import { Observable } from 'rxjs/Observable';
import * as firebase from 'firebase/app';

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
  private currentUser: firebase.User;

  // Indicates whether a user is logged in or not.
  private signedIn: Observable<boolean>;

  constructor(
      private afa: AngularFireAuth, 
      private facebook: Facebook,
      @Inject(FirebaseApp) firebaseApp: any) {
    console.log('Hello Account Provider');
    this.signedIn = Observable.create((observer) => {
      return firebaseApp.auth().onAuthStateChanged(
        user => observer.next(user != null),
        err => observer.error(err),
        () => observer.complete());
    })
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
    return this.facebook.getLoginStatus().then(
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
    return this.facebook.login(['public_profile', 'email']).then(
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
    return this.facebook.logout().then(() => {
      this.afa.auth.signOut();
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
      uid: this.currentUser.uid,
      displayName: this.currentUser.displayName,
      photoURL: this.currentUser.providerData[0].photoURL,
    });
  }

  private handleLoginStatusResponse(response: FacebookLoginResponse): firebase.Promise<any> {
    if (response.status == 'connected') {
      this.facebookLoginResponse = response;
      console.log('facebook response: ' + this.facebookLoginResponse);
      let credential = firebase.auth.FacebookAuthProvider.credential(
          this.facebookLoginResponse.authResponse.accessToken);
      return this.afa.auth.signInWithCredential(credential).then(
        (response) => this.handleAngularFireSignInResponse(response),
        (error) => this.handleLoginError(error)
      )
    } else {
      this.loggedIn = false;
      return Promise.reject('facebook: ' + response.status);
    }
  }

  private handleAngularFireSignInResponse(user: firebase.User): firebase.Promise<string> {
    this.currentUser = user;
    this.loggedIn = true;
    return firebase.Promise.resolve();
  }

  private handleLoginError(error): string {
    this.loggedIn = false;
    console.log('error: ' + error);
    return error;
  }

  public getSignedIn(): Observable<boolean> {
    return this.signedIn;
  }
}
