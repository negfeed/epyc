import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.negfeed.epyc',
  appName: 'EPYC',
  webDir: 'www',
  plugins: {
    // Native auth providers the @capacitor-firebase/authentication plugin should
    // initialise. Without this list the plugin reports "provider is not enabled".
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com', 'apple.com'],
    },
  },
};

export default config;
