declare module 'react-native-background-actions' {
  export type BackgroundTaskOptions = {
    taskName: string;
    taskTitle: string;
    taskDesc: string;
    taskIcon: { name: string; type: string; package?: string };
    color?: string;
    linkingURI?: string;
    parameters?: Record<string, unknown>;
    foregroundServiceType?: string[];
    progressBar?: { max: number; value: number; indeterminate?: boolean };
  };

  type BackgroundTask = (args: any) => Promise<void>;

  const BackgroundService: {
    start(task: BackgroundTask, options: BackgroundTaskOptions): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
    updateNotification(options: Partial<BackgroundTaskOptions>): Promise<void>;
  };

  export default BackgroundService;
}
