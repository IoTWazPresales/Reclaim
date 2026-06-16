import React from 'react';
import { Snackbar } from 'react-native-paper';

type DashboardSnackbarProps = {
  visible: boolean;
  message: string;
  onDismiss: () => void;
};

export function DashboardSnackbar({ visible, message, onDismiss }: DashboardSnackbarProps) {
  return (
    <Snackbar visible={visible} duration={3000} onDismiss={onDismiss}>
      {message}
    </Snackbar>
  );
}
