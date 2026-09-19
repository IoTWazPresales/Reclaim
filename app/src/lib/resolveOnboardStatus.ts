export type ResolvedOnboardStatus = 'yes' | 'no' | 'retry';

export type RemoteOnboardQuery = {
  data: { has_onboarded?: boolean | null } | null;
  error: { message?: string } | null;
};

/**
 * Routing SoT after the local-true short-circuit.
 * Timeout/error must not dump a signed-in user onto Welcome.
 */
export function resolveOnboardStatusFromRemote(remote: RemoteOnboardQuery): ResolvedOnboardStatus {
  if (remote.error) return 'retry';
  if (remote.data?.has_onboarded === true) return 'yes';
  return 'no';
}
