import { Injectable } from '@angular/core';
import { Facebook, FacebookLoginResponse } from 'ionic-native';

export interface AuthUserInfo {
  userId: string;
  accessToken: string;
}

@Injectable()
export class Auth {

  // Indicates whether the user is logged in. This is not an authoritative source of login information. It only acts as
  // a cache of the last login state known to the module.
  private loggedIn: boolean = false;

  // User information.
  private userInfo: AuthUserInfo = {
    userId: null,
    accessToken: null,
  };

  constructor() {    
    console.log('Hello Account Provider');
  }
  
  /**
   * Gets the login status of the user.
   * 
   * This method will call the Facebook API to check the login status of the user. It will return the status of the
   * user login in the returned promise.
   * 
   * @return A promise of a status string that describes the user login status. The following are the possible outcomes:
   *     'connected': If the user is logged in.
   *     'not_authorized': If the user is not logged in.
   *     'unknown': If the user is logged out of facebook.
   */
  public getLoginStatus(): Promise<string> {
    return Facebook.getLoginStatus().then(
      (response) => this.handleLoginStatusResponse(response),
      (error) => this.handleGetLoginStatusError(error)
    );
  }

  /**
   * Attempts to login the user.
   * 
   * This method will call the Facebook API to attempt a user login. This will redirect the user to a Facebook login
   * box.
   * 
   * @return A promise that is resolved if the login was successful, or rejected if the login was not successful.
   */
  public doLogin(): Promise<any> {
    if (this.loggedIn) {
      return Promise.reject('User is already logged in.');
    }
    return Facebook.login(['public_profile']).then(
      (response) => this.handleLoginStatusResponse(response));
  }

  /**
   * Attempts to logout the user.
   * 
   * This method will call the Facebook API to attempt to logout the user.
   * 
   * @return A promise that is resolved if the logout was successful, or rejected if the logout was not successful.
   */
  public doLogout(): Promise<string> {
    if (!this.loggedIn) {
      return Promise.reject('User is not logged in.');
    }
    return Facebook.logout().then(() => {
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
    return Promise.resolve(this.userInfo);
  }

  private handleLoginStatusResponse(response: FacebookLoginResponse): string {
    if (response.status == 'connected') {
      this.userInfo.userId = response.authResponse.userID;
      this.userInfo.accessToken = response.authResponse.accessToken;
      this.loggedIn = true;
      console.log('userInfo: ' + this.userInfo);
    } else {
      this.loggedIn = false;
    }
    return response.status;
  }

  private handleGetLoginStatusError(error): string {
    this.loggedIn = false;
    console.log('error: ' + error);
    return error;
  }
}
