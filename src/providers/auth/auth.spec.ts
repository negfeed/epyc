import { Auth } from './auth';
import { Facebook } from '@ionic-native/facebook';
import { AngularFireAuth } from 'angularfire2/auth';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import * as firebase from 'firebase/app';

let ACCESS_TOKEN: string = 'kgkh3g42kh4g23kh4g2kh34g2kg4k2h4gkh3g4k2h4gk23h4gk2h34gk234gk2h34AndSoOn';
let USER_ID: string = '1234567';

let FIREBASE_UID: string = 'f2if24k2xksdfw';

let FACEBOOK_LOGIN_STATUS_CONNECTED = {
  authResponse: {
    userID: USER_ID,
    accessToken: ACCESS_TOKEN,
    session_key: true,
    expiresIn: 5183738,
    sig: '...',
    secret: 'fake_secret'
  },
  status: 'connected'
}

let FACEBOOK_LOGIN_STATUS_NOT_AUTHORIZED: any = {
  status: 'not_authorized'
}

let FACEBOOK_LOGIN_STATUS_UNKNOWN: any = {
  status: 'unknown'
}

let FIREBASE_AUTH_STATE: any = {
  uid: FIREBASE_UID,
  displayName: 'Mohammad Shamma',
  photoURL: 'http://fake.com/photo/12345'
}

describe('An auth service', () => {

  let auth: Auth = null;
  let angularFireAuthMock = null;
  let facebookMock = null;

  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting())
  });

  beforeEach(() => {
    angularFireAuthMock = {
      auth: jasmine.createSpyObj('auth', ['signInWithCredential', 'signOut'])
    };
    facebookMock = jasmine.createSpyObj('facebook', ['getLoginStatus', 'logout', 'login']);
    TestBed.configureTestingModule({
      providers: [
        { provide: AngularFireAuth, useValue: angularFireAuthMock },
        { provide: Facebook, useValue: facebookMock},
        Auth,
      ]
    });
    auth = TestBed.get(Auth);
  });

  it('should report a connected status.', (done) => {    
    facebookMock.getLoginStatus.and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_CONNECTED));
    angularFireAuthMock.auth.signInWithCredential.and.returnValue(firebase.Promise.resolve(FIREBASE_AUTH_STATE));
    auth.getLoginStatus().then(
      (status) => {
        done();
      }
    );
  });

  describe('of a connected user', () => {
    beforeEach((done) => {
      facebookMock.getLoginStatus.and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_CONNECTED));
      facebookMock.logout.and.returnValue(Promise.resolve());
      facebookMock.login.and.throwError('Should not be called');
      angularFireAuthMock.auth.signInWithCredential.and.returnValue(firebase.Promise.resolve(FIREBASE_AUTH_STATE));
      auth.getLoginStatus().then(
        (status) => {
          done();
        }
      );
    });

    it('should provide user info.', () => {
      expect(auth.getUserInfo().uid).toEqual(FIREBASE_UID);
    });

    it('should logout', (done) => {
      auth.doLogout().then(
        () => { 
          expect(facebookMock.logout).toHaveBeenCalledTimes(1);
          done(); 
        }
      )
    });

    it('should fail to login', (done) => {
      auth.doLogin().catch(
        (error) => {
          expect(facebookMock.login).toHaveBeenCalledTimes(0);
          done();
        }
      )
    });
  });

  it('should report a not_authorized status.', (done) => {
    facebookMock.getLoginStatus.and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_NOT_AUTHORIZED));
    auth.getLoginStatus().catch((error) => {
      done();
    });
  });

  describe('of a not_authorized user', () => {

    beforeEach((done) => {
      facebookMock.getLoginStatus.and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_NOT_AUTHORIZED));
      facebookMock.login.and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_CONNECTED));
      facebookMock.logout.and.throwError('Should not be called');
      angularFireAuthMock.auth.signInWithCredential.and.returnValue(firebase.Promise.resolve(FIREBASE_AUTH_STATE));
      auth.getLoginStatus().catch((error) => {
        done();
      });
    })

    it('should not provide user info.', () => {
      expect(auth.getUserInfo()).toThrowError(Error, 'Cannot get user info when the user is not logged in.')
    });

    it('should login.', (done) => {
      auth.doLogin().then(() => {
        done();
      });
    });

    it('should fail to logout', (done) => {
      auth.doLogout().catch((error) => {
        done();
      });
    });
  });

  it('should report an unknown status.', (done) => {
    facebookMock.getLoginStatus.and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_UNKNOWN));
    auth.getLoginStatus().catch((error) => {
      done();
    });
  });

  describe('of an unknown user', () => {

    beforeEach((done) => {
      facebookMock.getLoginStatus.and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_UNKNOWN));
      facebookMock.login.and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_CONNECTED));
      facebookMock.logout.and.throwError('Should not be called');
      angularFireAuthMock.auth.signInWithCredential.and.returnValue(firebase.Promise.resolve(FIREBASE_AUTH_STATE));
      auth.getLoginStatus().catch((error) => {
        done();
      });
    });

    it('should not provide user info.', (done) => {
      expect(auth.getUserInfo()).toThrowError(Error, 'Cannot get user info when the user is not logged in.')
    });

    it('should login.', (done) => {
      auth.doLogin().then(() => {
        done();
      });
    });

    it('should fail to logout', (done) => {
      auth.doLogout().catch((error) => {
        done();
      });
    });
  });

  describe('that has been logged off', () => {

    beforeEach((done) => {
      facebookMock.getLoginStatus.and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_CONNECTED));
      facebookMock.login.and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_CONNECTED));
      facebookMock.logout.and.returnValue(Promise.resolve());
      angularFireAuthMock.auth.signInWithCredential.and.returnValue(firebase.Promise.resolve(FIREBASE_AUTH_STATE));
      auth.getLoginStatus().then(
        (status) => {
          auth.doLogout().then(() => {
            done();
          })
        }
      );
    });

    it('shoud login', (done) => {
      auth.doLogin().then(() => {
        done();
      })
    });

    it('should not logout', (done) => {
      auth.doLogout().catch(() => {
        done();
      })
    })

    it('should not return user info', () => {
      expect(auth.getUserInfo()).toThrowError(Error, 'Cannot get user info when the user is not logged in.');
    })
  });

  describe('that has been logged in', () => {
    beforeEach((done) => {
      facebookMock.getLoginStatus.and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_NOT_AUTHORIZED));
      facebookMock.login.and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_CONNECTED));
      facebookMock.logout.and.returnValue(Promise.resolve());
      angularFireAuthMock.auth.signInWithCredential.and.returnValue(firebase.Promise.resolve(FIREBASE_AUTH_STATE));
      auth.doLogin().then(() => {
        done();
      });
    });

    it('should not login', (done) => {
      auth.doLogin().catch(() => {
        done();
      })
    });

    it('should log out', (done) => {
      auth.doLogout().then(() => {
        done();
      })
    });

    it('should return user info', () => {
      expect(auth.getUserInfo().uid).toEqual(FIREBASE_UID);
    })
  });
});
