// Vitest setup file - defines global mocks and variables for tests

// Define __DEV__ globally for React Native
(globalThis as any).__DEV__ = true;

// Define ExpoGlobal for expo-modules-core (must be set before any expo modules load)
const EventEmitterClass = class EventEmitter {
  on() {}
  off() {}
  emit() {}
  addListener() { return this; }
  removeListener() { return this; }
  removeAllListeners() { return this; }
};

// expo-modules-core accesses via globalThis.expo or globalThis.ExpoGlobal
const expoGlobalObj = {
  EventEmitter: EventEmitterClass,
  SharedRef: class SharedRef {},
};

(globalThis as any).ExpoGlobal = expoGlobalObj;
(globalThis as any).expo = expoGlobalObj;

// Also set it on global for compatibility
if (typeof global !== 'undefined') {
  (global as any).ExpoGlobal = expoGlobalObj;
  (global as any).expo = expoGlobalObj;
}

// Define process.env.EXPO_OS if not already defined
if (!process.env.EXPO_OS) {
  process.env.EXPO_OS = 'web';
}
