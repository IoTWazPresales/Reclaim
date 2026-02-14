import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

type Props = {
  children: ReactNode;
  screenName?: string;
  onReset?: () => void;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Error boundary for screens. Catches render errors and shows a fallback UI
 * instead of a blank crash. Users can tap "Try again" to attempt recovery.
 */
export class ScreenErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (__DEV__) {
      console.error('[ScreenErrorBoundary]', this.props.screenName ?? 'Screen', error, errorInfo.componentStack);
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback screenName={this.props.screenName} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ screenName, onReset }: { screenName?: string; onReset: () => void }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: theme.colors.background,
      }}
    >
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8, textAlign: 'center' }}>
        Something went wrong
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24, textAlign: 'center' }}>
        {screenName ? `${screenName} ran into an issue.` : 'This screen ran into an issue.'} Try again or go back.
      </Text>
      <Button mode="contained" onPress={onReset}>
        Try again
      </Button>
    </View>
  );
}

/** Wraps a screen component with an error boundary. */
export function withScreenErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  screenName: string,
): React.ComponentType<P> {
  function WrappedWithBoundary(props: P) {
    return (
      <ScreenErrorBoundary screenName={screenName}>
        <WrappedComponent {...props} />
      </ScreenErrorBoundary>
    );
  }
  WrappedWithBoundary.displayName = `WithErrorBoundary(${screenName})`;
  return WrappedWithBoundary;
}
