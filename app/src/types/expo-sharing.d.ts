declare module 'expo-sharing' {
  export function shareAsync(url: string, options?: any): Promise<void>;
  export function isAvailableAsync(): Promise<boolean>;
}

