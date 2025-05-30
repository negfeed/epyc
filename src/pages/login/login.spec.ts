import { LoginPage } from './login';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NavController, Events, LoadingController, AlertController, Platform } from 'ionic-angular';
import { UserDataService } from '../../providers/user-data-service/user-data-service';
import { Facebook } from '@ionic-native/facebook';

// Mocks for Ionic services
class MockNavController {
  setRoot = jest.fn();
}
class MockEvents {
  publish = jest.fn();
}
class MockLoadingController {
  create = jest.fn(() => ({
    present: jest.fn(),
    dismiss: jest.fn(),
  }));
}
class MockAlertController {
  create = jest.fn(() => ({
    present: jest.fn(),
  }));
}
class MockPlatform {
  ready = jest.fn(() => Promise.resolve());
  // Add other Platform methods if used
}

// Mocks for providers
class MockUserDataService {
  login = jest.fn(() => Promise.resolve());
  loginWithFacebook = jest.fn(() => Promise.resolve());
}
class MockFacebook {
  login = jest.fn(() => Promise.resolve({ status: 'connected', authResponse: { accessToken: 'fbToken' } }));
  // Add other Facebook methods if used
}

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let mockNavController: MockNavController;
  let mockUserDataService: MockUserDataService;
  let mockEvents: MockEvents;
  let mockLoadingController: MockLoadingController;
  let mockAlertController: MockAlertController;
  let mockFacebook: MockFacebook;

  beforeEach(async () => {
    mockNavController = new MockNavController();
    mockUserDataService = new MockUserDataService();
    mockEvents = new MockEvents();
    mockLoadingController = new MockLoadingController();
    mockAlertController = new MockAlertController();
    mockFacebook = new MockFacebook();

    await TestBed.configureTestingModule({
      declarations: [LoginPage],
      providers: [
        { provide: NavController, useValue: mockNavController },
        { provide: UserDataService, useValue: mockUserDataService },
        { provide: Events, useValue: mockEvents },
        { provide: LoadingController, useValue: mockLoadingController },
        { provide: AlertController, useValue: mockAlertController },
        { provide: Facebook, useValue: mockFacebook },
        { provide: Platform, useClass: MockPlatform },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    // fixture.detectChanges(); // Call in tests if needed
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have loginCredentials defined', () => {
    expect(component.loginCredentials).toBeDefined();
    expect(component.loginCredentials.name).toEqual('');
    expect(component.loginCredentials.password).toEqual('');
  });

  it('login method should call UserDataService.login and navigate on success', async () => {
    component.loginCredentials.name = 'testuser';
    component.loginCredentials.password = 'password';
    (mockUserDataService.login as jest.Mock).mockResolvedValueOnce({ name: 'testuser' });

    await component.login();

    expect(mockUserDataService.login).toHaveBeenCalledWith('testuser', 'password');
    expect(mockLoadingController.create().present).toHaveBeenCalled();
    expect(mockNavController.setRoot).toHaveBeenCalledWith('HomePage'); // Or whatever the main page is
    expect(mockEvents.publish).toHaveBeenCalledWith('user:login');
    expect(mockLoadingController.create().dismiss).toHaveBeenCalled();
  });

  it('login method should show error alert on UserDataService.login failure', async () => {
    component.loginCredentials.name = 'testuser';
    component.loginCredentials.password = 'password';
    (mockUserDataService.login as jest.Mock).mockRejectedValueOnce('Login failed');

    await component.login();

    expect(mockUserDataService.login).toHaveBeenCalledWith('testuser', 'password');
    expect(mockLoadingController.create().present).toHaveBeenCalled();
    expect(mockAlertController.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Login Failed!',
      subTitle: 'Login failed',
      buttons: ['OK'],
    }));
    expect(mockLoadingController.create().dismiss).toHaveBeenCalled();
    expect(mockNavController.setRoot).not.toHaveBeenCalled();
  });

  it('loginWithFacebook method should call Facebook.login and UserDataService.loginWithFacebook', async () => {
    (mockFacebook.login as jest.Mock).mockResolvedValueOnce({ status: 'connected', authResponse: { accessToken: 'fbTestToken' } });
    (mockUserDataService.loginWithFacebook as jest.Mock).mockResolvedValueOnce({ name: 'fbUser' });

    await component.loginWithFacebook();

    expect(mockFacebook.login).toHaveBeenCalledWith(['public_profile', 'email']);
    expect(mockUserDataService.loginWithFacebook).toHaveBeenCalledWith('fbTestToken');
    expect(mockLoadingController.create().present).toHaveBeenCalled();
    expect(mockNavController.setRoot).toHaveBeenCalledWith('HomePage');
    expect(mockEvents.publish).toHaveBeenCalledWith('user:login');
    expect(mockLoadingController.create().dismiss).toHaveBeenCalled();
  });

  it('loginWithFacebook method should show error if Facebook login status is not "connected"', async () => {
    (mockFacebook.login as jest.Mock).mockResolvedValueOnce({ status: 'not_authorized' });

    await component.loginWithFacebook();

    expect(mockFacebook.login).toHaveBeenCalled();
    expect(mockUserDataService.loginWithFacebook).not.toHaveBeenCalled();
    expect(mockAlertController.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Facebook Login Failed',
      subTitle: 'Could not connect to Facebook.',
    }));
    expect(mockLoadingController.create().dismiss).toHaveBeenCalled(); // Ensure loading is dismissed
  });


  it('signup method should navigate to SignupPage', () => {
    component.signup();
    // Assuming 'SignupPage' is the string key for the signup page
    expect(mockNavController.setRoot).toHaveBeenCalledWith('SignupPage');
  });
});
