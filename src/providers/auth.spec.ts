import { Auth } from './auth';
import { Facebook, FacebookLoginResponse } from 'ionic-native';
import { AngularFire, AngularFireAuth } from 'angularfire2';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

let ACCESS_TOKEN: string = 'kgkh3g42kh4g23kh4g2kh34g2kg4k2h4gkh3g4k2h4gk23h4gk2h34gk234gk2h34AndSoOn';
let USER_ID: string = '1234567';

let FACEBOOK_LOGIN_STATUS_CONNECTED: FacebookLoginResponse = {
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
  auth: {
    displayName: 'Mohammad Shamma',
    photoURL: 'http://fake.com/photo/12345'
  }
}

describe('An auth service', () => {

  let auth: Auth = null;
  let angularFireMock = null;

  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting())
  });

  beforeEach(() => {
    angularFireMock = {
      auth: jasmine.createSpyObj('auth', ['login', 'logout'])
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AngularFire, useValue: angularFireMock },
        Auth
      ]
    });
    auth = TestBed.get(Auth);
  });

  it('should report a connected status.', (done) => {
    spyOn(Facebook, 'getLoginStatus').and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_CONNECTED));
    angularFireMock.auth.login.and.returnValue(firebase.Promise.resolve(FIREBASE_AUTH_STATE));
    auth.getLoginStatus().then(
      (status) => {
        done();
      }
    );
  });

  describe('of a connected user', () => {
    beforeEach((done) => {
      spyOn(Facebook, 'getLoginStatus').and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_CONNECTED));
      spyOn(Facebook, 'logout').and.returnValue(Promise.resolve());
      spyOn(Facebook, 'login').and.throwError('Should not be called');
      angularFireMock.auth.login.and.returnValue(firebase.Promise.resolve(FIREBASE_AUTH_STATE));
      auth.getLoginStatus().then(
        (status) => {
          done();
        }
      );
    });

    it('should provide user info.', (done) => {
      auth.getUserInfo().then((userInfo) => {
        expect(userInfo.accessToken).toEqual(ACCESS_TOKEN);
        expect(userInfo.userId).toEqual(USER_ID);
        done();
      });
    });

    it('should logout', (done) => {
      auth.doLogout().then(
        () => { 
          expect(Facebook.logout).toHaveBeenCalledTimes(1);
          done(); 
        }
      )
    });

    it('should fail to login', (done) => {
      auth.doLogin().catch(
        (error) => {
          expect(Facebook.login).toHaveBeenCalledTimes(0);
          done();
        }
      )
    });
  });

  it('should report a not_authorized status.', (done) => {
    spyOn(Facebook, 'getLoginStatus').and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_NOT_AUTHORIZED));
    auth.getLoginStatus().catch((error) => {
      done();
    });
  });

  describe('of a not_authorized user', () => {

    beforeEach((done) => {
      spyOn(Facebook, 'getLoginStatus').and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_NOT_AUTHORIZED));
      spyOn(Facebook, 'login').and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_CONNECTED));
      spyOn(Facebook, 'logout').and.throwError('Should not be called');
      angularFireMock.auth.login.and.returnValue(firebase.Promise.resolve(FIREBASE_AUTH_STATE));
      auth.getLoginStatus().catch((error) => {
        done();
      });
    })

    it('should not provide user info.', (done) => {
      auth.getUserInfo().catch(
        (error) => {
          done();
        });
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
    spyOn(Facebook, 'getLoginStatus').and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_UNKNOWN));
    auth.getLoginStatus().catch((error) => {
      done();
    });
  });

  describe('of an unknown user', () => {

    beforeEach((done) => {
      spyOn(Facebook, 'getLoginStatus').and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_UNKNOWN));
      spyOn(Facebook, 'login').and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_CONNECTED));
      spyOn(Facebook, 'logout').and.throwError('Should not be called');
      angularFireMock.auth.login.and.returnValue(firebase.Promise.resolve(FIREBASE_AUTH_STATE));
      auth.getLoginStatus().catch((error) => {
        done();
      });
    });

    it('should not provide user info.', (done) => {
      auth.getUserInfo().catch(
        (error) => {
          done();
        });
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
      spyOn(Facebook, 'getLoginStatus').and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_CONNECTED));
      spyOn(Facebook, 'login').and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_CONNECTED));
      spyOn(Facebook, 'logout').and.returnValue(Promise.resolve());
      angularFireMock.auth.login.and.returnValue(firebase.Promise.resolve(FIREBASE_AUTH_STATE));
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

    it('should not return user info', (done) => {
      auth.getUserInfo().catch(() => {
        done();
      })
    })
  });

  describe('that has been logged in', () => {
    beforeEach((done) => {
      spyOn(Facebook, 'getLoginStatus').and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_NOT_AUTHORIZED));
      spyOn(Facebook, 'login').and.returnValue(Promise.resolve(FACEBOOK_LOGIN_STATUS_CONNECTED));
      spyOn(Facebook, 'logout').and.returnValue(Promise.resolve());
      angularFireMock.auth.login.and.returnValue(firebase.Promise.resolve(FIREBASE_AUTH_STATE));
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

    it('should return user info', (done) => {
      auth.getUserInfo().then((userInfo) => {
        expect(userInfo.userId).toEqual(USER_ID);
        expect(userInfo.accessToken).toEqual(ACCESS_TOKEN);
        done();
      })
    })
  });
});
