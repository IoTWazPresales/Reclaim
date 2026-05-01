declare module 'expo-background-fetch' {
  export const BackgroundFetchResult: {
    NoData: string;
    NewData: string;
    Failed: string;
  };
  export const BackgroundFetchStatus: {
    Restricted: string;
    Denied: string;
    Available: string;
  };
  export function getStatusAsync(): Promise<string>;
  export function registerTaskAsync(taskName: string, options?: any): Promise<void>;
  export function unregisterTaskAsync(taskName: string): Promise<void>;
}

declare module 'expo-task-manager' {
  export function defineTask(taskName: string, task: (...args: any[]) => any): void;
  export function getRegisteredTasksAsync(): Promise<Array<{ taskName: string }>>;
}

