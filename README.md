# EPYC
A multiplayer Pictionary game implemented using Ionic 3 and Firebase.

## Demo
Below you can find a video demoing this app.
Apologies for the many grammatical, spelling and pronunciation mistakes.
I'm not a native speaker and it was my first screen recording and too much was going on my mind.

[![EPYC DEMO](https://img.youtube.com/vi/N2DJ9mAKROw/0.jpg)](https://www.youtube.com/watch?v=N2DJ9mAKROw)

## Running Unit Tests

The unit tests for this project were written using Jest. Due to the age of the project and significant challenges with its original dependency tree (e.g., `node-sass` build failures, Angular version incompatibilities for Karma), the existing Karma-based test runner (`karma.conf.js`) is not currently functional with these tests.

To run the Jest tests, you would typically follow these steps:

1.  **Install Jest:**
    If Jest is not already a development dependency in `package.json`, you might need to add it:
    ```bash
    npm install --save-dev jest @types/jest ts-jest
    # or
    yarn add --dev jest @types/jest ts-jest
    ```
    *Note: This step was intentionally avoided during the initial test creation to prevent further conflicts with the project's fragile dependencies.*

2.  **Configure Jest (Optional but Recommended):**
    You might need to create a Jest configuration file (e.g., `jest.config.js`) to specify transformations (e.g., using `ts-jest` for TypeScript files) and other settings. A basic configuration for Ionic/Angular projects might look like:

    ```javascript
    // jest.config.js
    module.exports = {
      preset: 'jest-preset-angular',
      setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'], // Optional setup file
      transformIgnorePatterns: ['node_modules/(?!@ionic|@angular|@firebase|firebase|rxjs|zone.js|@stencil/core|ionicons)'],
      moduleNameMapper: {
        // Handle module name aliases if any
      },
      globals: {
        'ts-jest': {
          tsconfig: '<rootDir>/tsconfig.spec.json', // Ensure you have a tsconfig for tests
        },
      },
    };
    ```
    You would also need `jest-preset-angular` and a `tsconfig.spec.json`.

3.  **Update `package.json`:**
    Add a test script to your `package.json`:
    ```json
    "scripts": {
      // ... other scripts
      "test": "jest",
      "test:watch": "jest --watch"
    }
    ```

4.  **Run Tests:**
    Execute the tests using:
    ```bash
    npm test
    # or
    yarn test
    ```
    Or directly using `npx jest`.

**Important Considerations:**
*   The spec files (`*.spec.ts`) have been created in the respective component, page, and provider directories.
*   Successfully running these tests will likely require further effort to either:
    *   Resolve the existing dependency conflicts to make a modern Jest setup work.
    *   Adapt the generated Jest tests to work with the older, existing Karma/Jasmine setup if the environment issues with that can be resolved.
*   The primary goal of adding these tests was to provide a foundational set of unit tests. Executing them is a separate challenge due to the project's current state.
