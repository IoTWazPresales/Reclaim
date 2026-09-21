import type { AccountDeletionResult } from './dataPrivacy';

export const ACCOUNT_DELETION_COPY = {
  title: 'Delete account?',
  confirm: 'Delete account',
  description: 'Permanently deletes your Reclaim account and personal data, clears data on this device, and signs you out. This cannot be undone. Export your data first if you want to keep a copy.',
};

export function accountDeletionOutcome(result: AccountDeletionResult): { title: string; message: string } {
  if (result.cleanupWarnings.length) {
    return {
      title: 'Account deleted — device cleanup needed',
      message: `Your account was deleted. Some on-device cleanup could not finish: ${result.cleanupWarnings.join(', ')}. Clear Reclaim's app storage in your device settings before using it again. Do not retry account deletion.`,
    };
  }
  return {
    title: 'Account deleted',
    message: 'Your Reclaim account and personal data have been deleted. You are signed out. To use Reclaim again, create a new account.',
  };
}
