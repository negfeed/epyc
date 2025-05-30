// Import the functions/modules to be tested
// The way main.ts is structured (immediately invoking platformBrowserDynamic)
// means we need to be careful about when it's imported.
// We'll use jest.isolateModules to control its execution.

import { environment } from './environments/environment';

// Mock Angular core services and platform-browser-dynamic
// These mocks will prevent actual Angular bootstrapping and calls.
jest.mock('@angular/core', () => ({
  enableProdMode: jest.fn(),
  // Mock other @angular/core items if main.ts uses them directly, though unlikely for a simple main.ts
}));

jest.mock('@angular/platform-browser-dynamic', () => ({
  platformBrowserDynamic: jest.fn(() => ({
    bootstrapModule: jest.fn(() => {
      // console.log('Mock bootstrapModule called'); // For debugging mocks
      return Promise.resolve(); // Simulate successful bootstrap
    }),
  })),
}));

jest.mock('./app.module', () => ({
  // Mock AppModule if it's referenced.
  // For main.ts, it's typically passed to bootstrapModule.
  AppModule: class MockAppModule {}, // Simple class mock
}));


describe('main.ts execution', () => {
  let originalEnvProduction: boolean;
  let mockPlatformBrowserDynamic: any;
  let mockEnableProdMode: any;
  let MockAppModule: any;


  beforeEach(() => {
    // Store original environment state
    originalEnvProduction = environment.production;

    // Dynamically require inside beforeEach to get fresh mocks for each test
    mockPlatformBrowserDynamic = require('@angular/platform-browser-dynamic').platformBrowserDynamic;
    mockEnableProdMode = require('@angular/core').enableProdMode;
    MockAppModule = require('./app.module').AppModule;

    // Reset mocks for each test to ensure test isolation
    mockPlatformBrowserDynamic.mockClear();
    (mockPlatformBrowserDynamic().bootstrapModule as jest.Mock).mockClear();
    mockEnableProdMode.mockClear();
  });

  afterEach(() => {
    // Restore original environment state
    environment.production = originalEnvProduction;
    // Reset modules to ensure clean state for next test if main.ts is re-imported
    jest.resetModules();
  });

  it('should call platformBrowserDynamic().bootstrapModule with AppModule', (done) => {
    // Set environment for this test case
    environment.production = false;

    // Import and execute main.ts within a context where modules are isolated
    jest.isolateModules(() => {
      require('./main'); // This will execute the main.ts script
    });

    // Check that bootstrapModule was called with AppModule
    expect(mockPlatformBrowserDynamic().bootstrapModule).toHaveBeenCalledWith(MockAppModule);
    expect(mockPlatformBrowserDynamic().bootstrapModule).toHaveBeenCalledTimes(1);
    done();
  });

  it('should call enableProdMode() if environment.production is true', (done) => {
    environment.production = true;

    jest.isolateModules(() => {
      require('./main');
    });

    expect(mockEnableProdMode).toHaveBeenCalled();
    expect(mockEnableProdMode).toHaveBeenCalledTimes(1);
    done();
  });

  it('should not call enableProdMode() if environment.production is false', (done) => {
    environment.production = false;

    jest.isolateModules(() => {
      require('./main');
    });

    expect(mockEnableProdMode).not.toHaveBeenCalled();
    done();
  });

  it('should log an error if bootstrapModule fails', (done) => {
    environment.production = false;
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error output

    const testError = new Error('Bootstrap failed');
    (mockPlatformBrowserDynamic().bootstrapModule as jest.Mock).mockImplementationOnce(() => Promise.reject(testError));

    jest.isolateModules(async () => {
      // Wrap require in an async function if main.ts itself is async, though typically it's not.
      // The Promise.catch in main.ts handles the rejection.
      require('./main');
    });

    // Allow microtasks (like Promise resolution) to complete
    process.nextTick(() => {
      expect(mockPlatformBrowserDynamic().bootstrapModule).toHaveBeenCalledWith(MockAppModule);
      expect(consoleErrorSpy).toHaveBeenCalledWith(testError);
      consoleErrorSpy.mockRestore();
      done();
    });
  });
});
